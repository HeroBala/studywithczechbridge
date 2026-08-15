# Backend — Firebase

The backend of StudyCzechBridge is **Firebase** (Google's app platform, free Spark plan):

| Piece | Service | What it stores |
|---|---|---|
| Login system | Firebase **Authentication** (Email/Password) | user accounts |
| Database | **Cloud Firestore** | profiles, applications + statuses, document files (base64 chunks), contact messages |
| Contact form email | **Formspree** (separate free service) | forwards contact-form submissions to your email inbox |

There is no server code to deploy — the frontend talks to Firebase directly, and
**`firestore.rules`** (in this folder) is what enforces security on Google's servers:

- students can only read/write **their own** profile, application and documents;
- students can edit an application only while its status is **"Pending Review"**, and can never touch `status`/`adminNotes`;
- only **admins** (users whose `role` is `admin` in the `users` collection) can list all applications, change statuses, and read contact messages;
- nobody can self-register as admin — you promote your own account once, manually, in the Firebase console.

## Files

- `firestore.rules` — copy-paste into **Firebase Console → Firestore Database → Rules → Publish**.

Full step-by-step setup: see [`../SETUP.md`](../SETUP.md).
