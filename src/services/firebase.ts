import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDoNu-ospd7GK0b1w0-cOR_qiwXglYx3D0",
  authDomain: "constellation-couple.firebaseapp.com",
  projectId: "constellation-couple",
  storageBucket: "constellation-couple.firebasestorage.app",
  messagingSenderId: "272767182752",
  appId: "1:272767182752:web:14946c5e2e2fc1566526c5",
  measurementId: "G-2Q1Z861M6R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Set persistence to local for web
if (Platform.OS === 'web') {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error("Error setting auth persistence:", error);
    });
}

const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { 
  db, 
  storage, 
  auth, 
  googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged
};
