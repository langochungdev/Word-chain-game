import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCkWsUjE4VNbL-hMbYWF4MQjr8z5Pik7Hk",
  authDomain: "wordchain-727be.firebaseapp.com",
  projectId: "wordchain-727be",
  storageBucket: "wordchain-727be.firebasestorage.app",
  messagingSenderId: "307329632248",
  appId: "1:307329632248:web:1ad706b41f9dbb5858f80d",
  measurementId: "G-NSQFBV29P5"
};
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app); // export db cho webrtc.js dùng
