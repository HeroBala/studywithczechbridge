# 🚀 Deployment Guide — StudyCzechBridge

Architecture: **GitHub Pages (frontend) → Firebase (auth + database) → Formspree (contact form → email)**.
You need a **Google account** (for Firebase), a **GitHub account**, and an **email address** (for Formspree).
Total time: about 30 minutes. Everything runs on free tiers.

---

## Part 1 — Create the Firebase backend

1. Go to **https://console.firebase.google.com** → **Add project**
   (e.g. `czechbridge`). Google Analytics is optional — you can turn it off.
2. **Enable login:** in the left menu → **Build → Authentication → Get started →**
   **Sign-in method → Email/Password → Enable → Save**.
3. **Create the database:** **Build → Firestore Database → Create database →**
   choose location `europe-west3 (Frankfurt)` → start in **production mode**.
4. **Set the security rules:** in Firestore → **Rules** tab → delete everything and paste the
   full contents of **`backend/firestore.rules`** from this project → **Publish**.
5. **Register the web app:** click the ⚙️ **Project settings → General → Your apps →**
   **`</>` (Web)** → nickname `czechbridge-web` → **Register app**.
   Firebase shows a `firebaseConfig = { ... }` block — keep it open for Part 3.

---

## Part 2 — Create the Formspree form (contact form → your inbox)

1. Go to **https://formspree.io** → sign up free with the email address where you want
   to receive consultation requests (e.g. info@studywithczechbridge.com).
2. **New form** → name it `CzechBridge Contact` → copy the form's endpoint URL,
   which looks like `https://formspree.io/f/abcdwxyz`.

---

## Part 3 — Connect the frontend

Open **`frontend/js/config.js`** and fill in your values:

```js
var MOCK_MODE = false;                    // turn off the local test backend

var FIREBASE_CONFIG = {
  apiKey: "AIza...",                      // ← from Part 1, step 5
  authDomain: "czechbridge.firebaseapp.com",
  projectId: "czechbridge"
};

var FORMSPREE_URL = "https://formspree.io/f/abcdwxyz";   // ← from Part 2
```

(Only `apiKey`, `authDomain` and `projectId` are needed — you can paste the whole
config object Firebase gives you, extra fields do no harm.)

---

## Part 4 — Publish on GitHub Pages

1. Create a new **public** repository at https://github.com/new (e.g. `studywithczechbridge`).
2. Push this project (from the project root folder):
   ```
   git init
   git add .
   git commit -m "StudyCzechBridge website"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/studywithczechbridge.git
   git push -u origin main
   ```
3. In the repository: **Settings → Pages → Source: GitHub Actions**.
   The included workflow (`.github/workflows/deploy.yml`) automatically publishes the
   **`frontend/`** folder on every push to `main`.
4. After ~1 minute the site is live at
   `https://YOUR_USERNAME.github.io/studywithczechbridge/`.
5. **Authorize the domain in Firebase:** Firebase Console → **Authentication →
   Settings → Authorized domains → Add domain** → add `YOUR_USERNAME.github.io`.
   (Without this, login on the live site is blocked.)

> 🌐 **Custom domain (optional):** Settings → Pages lets you attach e.g.
> `studywithczechbridge.com`; add that domain in Firebase Authorized domains too.

---

## Part 5 — Create your admin account

1. On the live site, **register normally** with your team's email address.
2. In **Firebase Console → Firestore Database → Data → `users` collection**, open the
   document for that account and change the field **`role`** from `student` to **`admin`**.
3. Log out and log back in on the website → you now land in the **Admin Panel**.

(Nobody can make themselves admin — the security rules only allow role changes from the console
or by an existing admin.)

---

## Part 6 — Test everything

1. Register a **test student** account, submit an application, upload a test document.
2. Check **Firestore → Data**: you'll see `users`, `applications` and `documents` entries.
3. Send a message via the **Contact** page → it arrives in your **email inbox** (Formspree)
   and in the admin panel's Messages list.
4. Log in as **admin** → open the test application → change status → add a note → **Save**.
5. Log in as the student again → the dashboard shows the new status and note. ✅

---

## Where your data lives

| Data | Location |
|---|---|
| User accounts / passwords | Firebase Authentication (passwords are hashed by Google) |
| Profiles, applications + statuses | Firestore `users` / `applications` collections |
| Uploaded documents | Firestore `documents` collection (file content stored in chunks) |
| Contact messages | Your email inbox (Formspree) + Firestore `messages` |

## Limits & notes

- **File size:** max ~10 MB per uploaded document (enforced in the app).
- **Free tiers:** Firestore Spark plan = 1 GiB storage, 50k reads / 20k writes per day —
  plenty for this scale. Formspree free = 50 submissions/month.
- Because documents are stored inside Firestore, total document storage should stay
  under ~1 GB; delete old files from the admin panel when applications are finished.
- Security is enforced by `backend/firestore.rules` on Google's servers — even if someone
  reads the frontend code, they can only access their own data. The `apiKey` in config.js
  is **not a secret** (it only identifies the project; the rules do the protecting).
