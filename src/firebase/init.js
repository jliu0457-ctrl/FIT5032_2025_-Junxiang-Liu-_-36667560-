import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore"
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcv7Xk9CQNeOdmtApemxII39rEdRv8yLc",
  authDomain: "auth-w6.firebaseapp.com",
  projectId: "auth-w6",
  storageBucket: "auth-w6.firebasestorage.app",
  messagingSenderId: "69737616928",
  appId: "1:69737616928:web:30fd81e9525c5429170e45"
};

// Initialize Firebase
initializeApp(firebaseConfig);
const db = getFirestore()
export default db