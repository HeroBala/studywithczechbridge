# StudyCzechBridge 🌉

A complete website for a study-abroad consultancy based in **Brno, Czech Republic**, providing
remote guidance to students in **Bangladesh** who plan to study in Europe.

## Architecture

```
Frontend (GitHub Pages — static HTML/CSS/JS)
        ↓
API / Backend (Firebase: Authentication + Firestore database)
        ↓
Contact form → Formspree → Email inbox
```

- **`frontend/`** — the whole website; hosted free on GitHub Pages (deployed automatically
  by `.github/workflows/deploy.yml`).
- **`backend/`** — Firebase configuration: security rules + docs. No server code to run.

> 📖 **To deploy, follow [SETUP.md](SETUP.md) step by step.**

## Features

- 6 public pages: Home, About, Services, Programs, Process, Contact — **red brand theme**
  matching the official logo (crimson `#c8102e` + navy `#14315e`), logo included as crisp SVG
  (`frontend/assets/logo.svg`, `logo-mark.svg`)
- Student accounts: register / login with Firebase Authentication (each student sees only their own data)
- Online application form (editable while status is "Pending Review")
- Document upload (passport, certificates, transcripts, IELTS, photos — max 10 MB each),
  stored in Firestore; view/delete from the dashboard
- Live status tracking on the student dashboard, with notes from the team
- Contact form → **Formspree** → lands directly in your email inbox (plus a copy for the admin panel)
- **Admin panel**: stats, application list with search & filter, status control
  (Pending Review → Documents Requested → Under Review → Applied to University →
  Offer Received → Visa Processing → Approved / Rejected), full document management,
  and contact-message inbox
- Security enforced server-side by Firestore rules (`backend/firestore.rules`)

## Page map (all in `frontend/`)

| Page | Purpose |
|---|---|
| `index.html` | Homepage: logo hero, stats, services, programs, 7-step process, testimonials |
| `about.html` | Team, mission, why us |
| `services.html` | All 8 services in detail |
| `programs.html` | Six program fields + intake/requirement info |
| `process.html` | 7-step application journey + status badges |
| `contact.html` | Contact form (→ Formspree → email) + contact info |
| `register.html` / `login.html` | Student account creation and login |
| `dashboard.html` | Student area: status tracker + document upload/manage |
| `apply.html` | Full online application form |
| `admin.html` | Admin panel (admin accounts only) |

## Project structure

```
├── frontend/                    # ← everything GitHub Pages serves
│   ├── index.html … admin.html
│   ├── assets/logo.svg, logo-mark.svg
│   ├── css/style.css            # red theme
│   └── js/
│       ├── config.js            # ← paste Firebase config + Formspree URL here
│       ├── api.js               # Firebase API layer + local mock backend
│       ├── auth.js, layout.js, dashboard.js, apply.js, admin.js
├── backend/
│   ├── firestore.rules          # ← paste into Firebase console
│   └── README.md
├── .github/workflows/deploy.yml # auto-deploys frontend/ to GitHub Pages
└── SETUP.md                     # deployment guide
```

## Local testing (before creating Firebase)

`frontend/js/config.js` ships with `MOCK_MODE = true`: the whole flow runs against a fake
in-browser backend (localStorage), so you can test everything locally:

1. Serve the frontend: `cd frontend` then `python -m http.server 8000` (or VS Code Live Server)
2. Open http://localhost:8000
3. Register a test student, apply, upload a document
4. Log out, log in as the mock admin — **admin@test.com / admin123** — and manage the application

When Firebase is configured, set `MOCK_MODE = false` in `frontend/js/config.js`.
