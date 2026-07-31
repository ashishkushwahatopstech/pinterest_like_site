import { createClient } from '@supabase/supabase-js';
import { getIdToken } from './auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
}

// Public client for anonymous operations (like viewing public galleries)
export const supabasePublic = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

let cachedClient = null;
let cachedToken = null;

// Returns a Supabase client authenticated with the current Firebase JWT
export const getSupabase = async () => {
  const token = await getIdToken();
  
  // If not logged in, return the public client
  if (!token) {
    cachedClient = null;
    cachedToken = null;
    return supabasePublic;
  }

  // If token is unchanged, reuse the client
  if (token === cachedToken && cachedClient) {
    return cachedClient;
  }

  // Create a new client with the fresh Firebase JWT
  cachedToken = token;
  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false, // Turn off Supabase own session storage (Firebase is single source of truth)
      storageKey: `foliodrive-sb-auth-${Math.random().toString(36).substring(7)}` // Silence multiple GoTrueClient warnings
    }
  });

  return cachedClient;
};

// Helper for administrative check
export const isUserAdmin = async () => {
  try {
    const supabase = await getSupabase();
    
    // 1. Primary: Call the database RPC check_is_admin (highly secure, runs DB-side)
    const { data: isAdmin, error: rpcError } = await supabase.rpc('check_is_admin');
    if (!rpcError && typeof isAdmin === 'boolean') {
      return isAdmin;
    }

    // 2. Fallback: Parse the Firebase ID Token locally to query users table with UID filter
    const token = await getIdToken();
    if (!token) return false;

    // JWT payload is the second segment of the token
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    const uid = payload.sub; // Firebase UID is stored in the sub claim

    if (!uid) return false;

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', uid)
      .single();

    if (error) {
      console.warn("Fallback admin check failed:", error);
      return false;
    }
    return !!userProfile?.is_admin;
  } catch (err) {
    console.error("Error checking admin status:", err);
    return false;
  }
};
