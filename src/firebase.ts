import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCukpI-dN911WtmnTeM3pX7j5hmV65wHAo',
  authDomain: 'workout-tracker-bf2bb.firebaseapp.com',
  projectId: 'workout-tracker-bf2bb',
  storageBucket: 'workout-tracker-bf2bb.firebasestorage.app',
  messagingSenderId: '607267302776',
  appId: '1:607267302776:web:361ee9de48d01b6b1fec8d',
  measurementId: 'G-15C3DVLBLE',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
