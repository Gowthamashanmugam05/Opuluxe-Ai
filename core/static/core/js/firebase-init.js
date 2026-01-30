
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyBN-fD1ZzHLfpXLwm32rL2N5ikvGUH7c5g",
    authDomain: "opuluxe-ai.firebaseapp.com",
    projectId: "opuluxe-ai",
    storageBucket: "opuluxe-ai.firebasestorage.app",
    messagingSenderId: "573970774904",
    appId: "1:573970774904:web:a43f294729d5a7d98f268d",
    measurementId: "G-KFRXZPEVYC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Make available globally if needed
window.firebaseApp = app;
window.firebaseAnalytics = analytics;

console.log("Firebase initialized");
