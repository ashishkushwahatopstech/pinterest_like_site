// Cloudflare Worker: Google OAuth Refresh Token Secure Store & Firebase JWT Verifier

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+/g, '/'); // Collapse multiple slashes

      if (path === "/api/auth/google-connect" && request.method === "POST") {
        return await handleGoogleConnect(request, env);
      }

      if (path === "/api/auth/google-token" && request.method === "GET") {
        return await handleGoogleToken(request, env);
      }

      return corsResponse(JSON.stringify({ error: "Not Found" }), 404);
    } catch (err) {
      console.error(err);
      return corsResponse(JSON.stringify({ error: err.message }), 500);
    }
  }
};

// CORS Helper
function corsResponse(body, status = 200, contentType = "application/json") {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// -------------------------------------------------------------
// FIREBASE TOKEN VERIFICATION
// -------------------------------------------------------------
async function verifyFirebaseToken(idToken, firebaseProjectId) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  
  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  
  // Validate claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) {
    throw new Error('Invalid issuer');
  }
  if (payload.aud !== firebaseProjectId) {
    throw new Error('Invalid audience');
  }
  if (payload.exp < now) {
    throw new Error('Token expired');
  }
  
  // Fetch JWK
  const jwkResponse = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken-system@system.gserviceaccount.com');
  const jwks = await jwkResponse.json();
  const jwk = jwks.keys.find(key => key.kid === header.kid);
  if (!jwk) {
    throw new Error('Public key not found for kid');
  }
  
  // Import JWK
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  // Verify signature
  const encoder = new TextEncoder();
  const data = encoder.encode(parts[0] + '.' + parts[1]);
  const signatureBytes = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signatureBytes,
    data
  );
  
  if (!isValid) {
    throw new Error('Invalid token signature');
  }
  
  return payload;
}

// -------------------------------------------------------------
// AES-GCM ENCRYPTION & DECRYPTION HELPERS
// -------------------------------------------------------------
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function getEncryptionKey(keyHex) {
  const rawKey = hexToBytes(keyHex);
  return await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(text, keyHex) {
  const key = await getEncryptionKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedText
  );
  
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...result));
}

async function decryptText(encryptedBase64, keyHex) {
  const key = await getEncryptionKey(keyHex);
  const binary = atob(encryptedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// -------------------------------------------------------------
// REQUEST HANDLERS
// -------------------------------------------------------------

// POST /api/auth/google-connect
// Body: { code: "...", redirectUri: "..." }
// Headers: Authorization: Bearer <FirebaseIdToken>
async function handleGoogleConnect(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return corsResponse(JSON.stringify({ error: "Missing Firebase Authorization token" }), 401);
  }
  const idToken = authHeader.substring(7);
  
  // Verify user identity
  const claims = await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
  const userId = claims.sub;

  const { code, redirectUri } = await request.json();
  if (!code) {
    return corsResponse(JSON.stringify({ error: "Missing authorization code" }), 400);
  }

  // Exchange auth code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri || "postmessage",
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok) {
    return corsResponse(JSON.stringify({ error: "Failed to exchange auth code", details: tokens }), 400);
  }

  const { access_token, refresh_token, expires_in } = tokens;
  if (!refresh_token) {
    // Note: Google only sends the refresh_token on the first consent prompt.
    // If they already authorized it, they might not send it.
    // We should return the access token, but notify the user if we don't have a stored refresh token.
    const checkRes = await fetch(`${env.SUPABASE_URL}/rest/v1/user_credentials?user_id=eq.${encodeURIComponent(userId)}&select=user_id`, {
      method: "GET",
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });
    const checkData = await checkRes.json();
    if (checkData.length === 0) {
      return corsResponse(JSON.stringify({ 
        error: "Consent required to store refresh token. Please revoke access and try again with consent prompt." 
      }), 400);
    }
  } else {
    // Encrypt refresh token
    const encryptedToken = await encryptText(refresh_token, env.ENCRYPTION_KEY);

    // Save to Supabase using service_role API
    const dbResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/user_credentials`, {
      method: "POST",
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: userId,
        encrypted_refresh_token: encryptedToken,
      }),
    });

    if (!dbResponse.ok) {
      const dbErr = await dbResponse.text();
      return corsResponse(JSON.stringify({ error: "Failed to save credentials in database", details: dbErr }), 500);
    }
  }

  return corsResponse(JSON.stringify({
    message: "Google Drive connected successfully",
    access_token,
    expires_in
  }));
}

// GET /api/auth/google-token
// Headers: Authorization: Bearer <FirebaseIdToken>
async function handleGoogleToken(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return corsResponse(JSON.stringify({ error: "Missing Firebase Authorization token" }), 401);
  }
  const idToken = authHeader.substring(7);
  
  // Verify user identity
  const claims = await verifyFirebaseToken(idToken, env.FIREBASE_PROJECT_ID);
  const userId = claims.sub;

  // Retrieve encrypted refresh token from Supabase
  const dbResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/user_credentials?user_id=eq.${encodeURIComponent(userId)}&select=encrypted_refresh_token`, {
    method: "GET",
    headers: {
      "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    }
  });

  const data = await dbResponse.json();
  if (!dbResponse.ok || data.length === 0) {
    return corsResponse(JSON.stringify({ error: "Google Drive not connected for this user" }), 404);
  }

  const encryptedToken = data[0].encrypted_refresh_token;

  // Decrypt refresh token
  const refresh_token = await decryptText(encryptedToken, env.ENCRYPTION_KEY);

  // Refresh access token with Google
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok) {
    return corsResponse(JSON.stringify({ error: "Failed to refresh access token", details: tokens }), 400);
  }

  return corsResponse(JSON.stringify({
    access_token: tokens.access_token,
    expires_in: tokens.expires_in
  }));
}
