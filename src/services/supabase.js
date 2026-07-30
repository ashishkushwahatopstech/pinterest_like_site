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

// Returns a Supabase client authenticated with the current Firebase JWT
export const getSupabase = async () => {
  const token = await getIdToken();
  
  // If not logged in, return the public client
  if (!token) {
    return supabasePublic;
  }

  // Create single instance if it doesn't exist
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    });
  }

  // Inject fresh token dynamically into the postgrest client headers
  cachedClient.rest.headers['Authorization'] = `Bearer ${token}`;

  return cachedClient;
};

// Helper for administrative check
export const isUserAdmin = async () => {
  try {
    const supabase = await getSupabase();
    // This calls check_is_admin() implicitly via the database or we can check the user record
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('is_admin')
      .single();
    if (error) {
      // If error occurs, check if it's just that the user doesn't exist yet
      return false;
    }
    return !!userProfile?.is_admin;
  } catch (err) {
    console.error("Error checking admin status:", err);
    return false;
  }
};
