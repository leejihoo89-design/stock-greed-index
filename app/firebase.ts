// app/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 👇 여기에 본인의 파이어베이스 설정값을 넣어야 합니다!
const firebaseConfig = {
  apiKey: "AIzaSyDn7zy4TNESfZpwQViHI_ShkXZQD6TWmyY",
  authDomain: "animated-splice-481002-k4.firebaseapp.com",
  projectId: "animated-splice-481002-k4",
  storageBucket: "animated-splice-481002-k4.firebasestorage.app",
  messagingSenderId: "927895212246",
  appId: "1:927895212246:web:03ef83b81ace98041e7977",
  measurementId: "G-5P4K7R4E1D"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

