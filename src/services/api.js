import { getIdToken } from './auth';

const workerUrl = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export const connectGoogleDrive = async (code, redirectUri) => {
  const token = await getIdToken();
  if (!token) throw new Error("User must be signed in to connect Google Drive.");

  const res = await fetch(`${workerUrl}/api/auth/google-connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ code, redirectUri })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to connect Google Drive.");
  }

  // Cache access token temporarily in localStorage
  localStorage.setItem("drive_access_token", data.access_token);
  const expiresAt = Date.now() + (data.expires_in * 1000);
  localStorage.setItem("drive_token_expires_at", expiresAt.toString());

  return data.access_token;
};

export const getGoogleDriveToken = async () => {
  // Check if we have a valid, cached token
  const cachedToken = localStorage.getItem("drive_access_token");
  const expiresAt = localStorage.getItem("drive_token_expires_at");

  if (cachedToken && expiresAt && Date.now() < parseInt(expiresAt) - 60000) {
    // Return cached token if it has more than 1 minute of life left
    return cachedToken;
  }

  const token = await getIdToken();
  if (!token) return null;

  try {
    const res = await fetch(`${workerUrl}/api/auth/google-token`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 404) {
      // Google Drive is not connected yet for this user
      return null;
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to refresh Google Drive token.");
    }

    localStorage.setItem("drive_access_token", data.access_token);
    const newExpiresAt = Date.now() + (data.expires_in * 1000);
    localStorage.setItem("drive_token_expires_at", newExpiresAt.toString());

    return data.access_token;
  } catch (err) {
    console.error("Error fetching Google Drive token:", err);
    return null;
  }
};
