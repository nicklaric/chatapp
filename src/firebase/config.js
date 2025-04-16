import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Firebase configuration - Replace with your config
const firebaseConfig = {
  apiKey: "AIzaSyA_As1IWcs3kRoXKeTG7PNF0wxMs6_etJI",
  authDomain: "llm-group-chat.firebaseapp.com",
  projectId: "llm-group-chat",
  storageBucket: "llm-group-chat.firebasestorage.app",
  messagingSenderId: "678550205299",
  appId: "1:678550205299:web:8ea74ad9473e5a33dd8b06"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions }; 