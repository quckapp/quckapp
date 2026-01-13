import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBbhS_4ATUQ4y54ze2Lp133gMMqTA_Fsu0",
  authDomain: "quckchat-dev-ed7a0.firebaseapp.com",
  projectId: "quckchat-dev-ed7a0",
  storageBucket: "quckchat-dev-ed7a0.firebasestorage.app",
  messagingSenderId: "785904681848",
  appId: "1:785904681848:web:84ca2d0df42783e0263e8d",
  measurementId: "G-GBGDP1BBPB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// OAuth Providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Configure provider scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');
githubProvider.addScope('user:email');
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

export default app;
