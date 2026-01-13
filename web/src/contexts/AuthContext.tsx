import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, AuthProvider as FirebaseAuthProvider } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  githubProvider,
  facebookProvider,
} from '../lib/firebase';

// Helper to format Firebase auth errors into user-friendly messages
function getAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email but different sign-in credentials. Try signing in with a different method.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before completing authentication.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by the browser. Please allow popups for this site.';
      case 'auth/cancelled-popup-request':
        return 'Authentication was cancelled.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact support.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use a stronger password.';
      default:
        return 'An error occurred during sign-in. Please try again.';
    }
  }
  return 'An unexpected error occurred. Please try again.';
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string, name: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  async function loginWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  async function loginWithGithub() {
    try {
      await signInWithPopup(auth, githubProvider);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  async function loginWithFacebook() {
    try {
      await signInWithPopup(auth, facebookProvider);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    loginWithGoogle,
    loginWithGithub,
    loginWithFacebook,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
