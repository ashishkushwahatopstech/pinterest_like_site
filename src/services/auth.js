import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// Google Drive scope is NOT requested here during sign-in;
// that is a separate user consent step!
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    // Clear storage related items
    localStorage.removeItem("drive_access_token");
    localStorage.removeItem("drive_token_expires_at");
  } catch (error) {
    console.error("Sign-out error:", error);
    throw error;
  }
};

export const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  // Get token, refresh if expired
  return await user.getIdToken(false);
};

export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};
