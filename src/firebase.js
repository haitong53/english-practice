// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBU3WHZ5TdoeBlgJN4cFwmPSFdnUkQfnw4",
  authDomain: "english-notes-app-3e068.firebaseapp.com",
  projectId: "english-notes-app-3e068",
  storageBucket: "english-notes-app-3e068.firebasestorage.app",
  messagingSenderId: "348403954731",
  appId: "1:348403954731:web:af1e5c0d8e07949135a66e",
  measurementId: "G-BES795G9T3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
