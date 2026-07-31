/* ============================================================
   StudyCzechBridge — frontend configuration
   ============================================================
   Architecture:
     Frontend (GitHub Pages)
         ↓
     Firebase (Authentication + Firestore database + documents)
         ↓
     Contact form → Formspree → your email inbox

   SETUP (see SETUP.md for the full guide):
   1. Create a Firebase project → add a Web App → copy its
      config object over FIREBASE_CONFIG below.
   2. Create a (free) Formspree form → paste its endpoint URL
      into FORMSPREE_URL below.
   3. Set MOCK_MODE to false.

   While MOCK_MODE is true, the site runs on a fake in-browser
   backend (localStorage) so you can test everything locally.
   Mock admin login:  admin@test.com  /  admin123
   ============================================================ */

var MOCK_MODE = false;

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyD8pySoZr2nXtXOtmR7SYTzNldqLJ_6m-8",
  authDomain: "studywithczechbridge.firebaseapp.com",
  projectId: "studywithczechbridge",
  appId: "1:1001510473659:web:b90d725215b85635dafe9e"
};

var FORMSPREE_URL = ""; // e.g. "https://formspree.io/f/abcdwxyz" — Formspree form banale ekhane URL boshan
