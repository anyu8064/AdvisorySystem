// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDMRQzqZF4PbLhk6sUdcG-oCF5EVKmYyKQ",
  authDomain: "mmcadvisorysystem.firebaseapp.com",
  projectId: "mmcadvisorysystem",
  storageBucket: "mmcadvisorysystem.firebasestorage.app",
  messagingSenderId: "59352732477",
  appId: "1:59352732477:web:a10d9afc05808a36b86b54",
  measurementId: "G-0M8HJBH5HY"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app)
export default app;