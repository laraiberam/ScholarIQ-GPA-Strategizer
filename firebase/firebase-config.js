import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBBAnURlxR0-J66ZrmBZXQdopHQMxZdTdc",
    authDomain: "scholariq-gpa-strategizer.firebaseapp.com",
    projectId: "scholariq-gpa-strategizer",
    storageBucket: "scholariq-gpa-strategizer.firebasestorage.app",
    messagingSenderId: "134867172371",
    appId: "1:134867172371:web:988b3086bb35b990d293e6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;

export { auth, db, appId };
