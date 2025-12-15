
//firebase.ts


import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCot5ThA-lWhGio3sRRTS2ipaskAYXgHR2Y",
  authDomain: "superpaac-app.firebaseapp.com",
  projectId: "superpaac-app",
  storageBucket: "superpaac-app.firebasestorage.app",
 // ✅ FIXED
  messagingSenderId: "341118409174",
  appId: "1:341118409174:web:c223c5b96e0e62512bec77",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
