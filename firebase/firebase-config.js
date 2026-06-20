import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBsmF_Evk36qRcWNBx-XF6X-r5VLHpSuiY",
    authDomain: "gpa-analyser.firebaseapp.com",
    databaseURL: "https://gpa-analyser-default-rtdb.firebaseio.com",
    projectId: "gpa-analyser",
    storageBucket: "gpa-analyser.firebasestorage.app",
    messagingSenderId: "636262104252",
    appId: "1:636262104252:web:806f940796bad7d49764b9",
    measurementId: "G-JZBLL59C2Z"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;

export { auth, db, appId };
