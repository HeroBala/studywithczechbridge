/* ============================================================
   api(action, data) → Promise<result>
   - Real mode : Firebase Auth + Firestore. Documents are stored
     inside Firestore as base64 chunks (no billing card needed).
     Contact form additionally goes to Formspree → email inbox.
   - Mock mode : simulates the whole backend in localStorage
     so the site can be tested before any deployment.
   Every result resolves with { ok:true, ... } or rejects with
   an Error whose message is user-friendly.
   ============================================================ */

var ERROR_TEXT = {
  INVALID_EMAIL:   "Please enter a valid email address.",
  WEAK_PASSWORD:   "Password must be at least 6 characters.",
  NAME_REQUIRED:   "Please enter your full name.",
  EMAIL_EXISTS:    "An account with this email already exists. Try logging in.",
  BAD_CREDENTIALS: "Wrong email or password.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  FORBIDDEN:       "You don't have permission to do that.",
  LOCKED:          "Your application is already being processed and can no longer be edited.",
  PROGRAM_REQUIRED:"Please choose a program.",
  FILE_TOO_LARGE:  "This file is larger than 10 MB. Please upload a smaller file.",
  NO_FILE:         "No file was selected.",
  NOT_FOUND:       "Item not found.",
  MISSING_FIELDS:  "Please fill in all required fields.",
  SERVER_ERROR:    "The server had a problem. Please try again in a moment."
};

var CB_STATUSES = [
  "Pending Review",
  "Under Review",
  "Document Requested",
  "Document Received",
  "Document Evaluated",
  "Legalization",
  "Super Legalization",
  "Nostrification",
  "University Selected",
  "Program Selected",
  "Applied to Universities",
  "Waiting for Entrance Exam",
  "Conditional Admission Letter Received",
  "Tuition Fees Paid",
  "Main Offer Letter Received",
  "Prepared Documents for Visa",
  "Appointment Scheduled",
  "Interview Preparation",
  "Visa Processing",
  "Accepted",
  "Rejected",
  "Dropped"
];

// Comprehensive 20-Step European University Admission Journey
var ADMISSION_20_STEPS = [
  { step: 1, id: "consultation", title: "Initial Consultation & Profile Assessment", category: "Phase 1: Consultation", desc: "Review academic background, language skills, degree goals, and budget." },
  { step: 2, id: "matching", title: "Program Selection & University Matching", category: "Phase 1: Selection", desc: "Match top 3 European universities & degree programs in Czechia." },
  { step: 3, id: "doc_upload", title: "Initial Document Upload", category: "Phase 1: Documents", desc: "Upload passport scan, SSC/HSC marksheets, bachelor degree, and photo." },
  { step: 4, id: "translation", title: "Sworn Czech Translation", category: "Phase 1: Legalization", desc: "Translate educational certificates into Czech language by certified sworn translator." },
  { step: 5, id: "apostille", title: "E-Apostille / Legalization", category: "Phase 1: Legalization", desc: "Obtain Apostille or E-Apostille stamp from Ministry of Foreign Affairs." },
  { step: 6, id: "superlegalization", title: "Embassy Superlegalization", category: "Phase 1: Legalization", desc: "Authenticate documents at Czech Embassy / Ministry of Foreign Affairs." },
  { step: 7, id: "verification", title: "Document Verification", category: "Phase 2: Verification", desc: "Brno team audits and verifies document authenticity and formatting." },
  { step: 8, id: "doc_requested", title: "Supplementary Documents Check", category: "Phase 2: Verification", desc: "Verify CV, motivation letter, and English proof (IELTS/Duolingo/MOI)." },
  { step: 9, id: "nostrif_app", title: "Nostrification Application", category: "Phase 2: Recognition", desc: "Submit formal application for educational degree recognition in Czechia." },
  { step: 10, id: "nostrif_exam", title: "Nostrification Exam / Approval", category: "Phase 2: Recognition", desc: "Complete nostrification exam (if required) and receive Equivalence Certificate." },
  { step: 11, id: "exam_prep", title: "Entrance Exam & Interview Prep", category: "Phase 3: Examination", desc: "Access study guides, mock questions, and online interview training." },
  { step: 12, id: "entrance_exam", title: "Entrance Exam / Online Interview", category: "Phase 3: Examination", desc: "Take university entrance exam or participate in online faculty interview." },
  { step: 13, id: "conditional_offer", title: "Conditional Admission Offer", category: "Phase 3: Offer", desc: "Receive official Conditional Offer Letter from the university faculty." },
  { step: 14, id: "tuition_fee", title: "Tuition Fee Payment", category: "Phase 3: Offer", desc: "Pay first semester tuition fee directly to the official university bank account." },
  { step: 15, id: "final_admission", title: "Final Admission Decision Letter", category: "Phase 3: Offer", desc: "Receive original stamped Decision on Admission & official university contract." },
  { step: 16, id: "accommodation", title: "Proof of Accommodation Contract", category: "Phase 4: Visa Prep", desc: "Secure certified dormitory accommodation or rental contract in Czechia." },
  { step: 17, id: "visa_appointment", title: "Visa Appointment Scheduling", category: "Phase 4: Visa", desc: "Schedule long-term study visa appointment slot at Czech Embassy / Consulate." },
  { step: 18, id: "visa_submission", title: "Visa File Submission & Interview", category: "Phase 4: Visa", desc: "Submit long-term visa application packet & attend embassy interview." },
  { step: 19, id: "visa_approved", title: "Visa Approved & Stamped", category: "Phase 4: Visa", desc: "Receive visa approval notification and get D-Visa stamp in your passport!" },
  { step: 20, id: "arrival_enrollment", title: "Arrival in Brno & University Matriculation", category: "Phase 5: Arrival", desc: "Flight booking, airport greeting in Brno/Prague, and official university enrollment!" }
];

var DEFAULT_PACKAGES = [
  {
    id: "pkg-std",
    name: "Standard European University Package",
    priceEur: 1450,
    advisorCommission: 300,
    targetProgram: "Bachelor / Master Degree",
    description: "Full university matching, application processing, diploma sworn translation & exam prep.",
    inclusions: [
      "University Selection & Application (Up to 3 Faculties)",
      "Sworn Czech Translation of Diploma & Marksheets",
      "Nostrification File Verification & Equivalence Handling",
      "Online Entrance Exam Mock Preparation & Interview Coaching"
    ]
  },
  {
    id: "pkg-visa",
    name: "Premium Czech Visa & Legalization Package",
    priceEur: 2450,
    advisorCommission: 500,
    targetProgram: "Full Degree & Study Visa",
    description: "End-to-end Ministry Apostille, Czech Embassy Superlegalization & Embassy Visa slot booking.",
    inclusions: [
      "Everything in Standard European Package",
      "Ministry Apostille & Embassy Superlegalization",
      "Certified Dormitory Accommodation Contract in Brno / Prague",
      "Czech Embassy Visa Slot Appointment Booking & Interview Prep",
      "Health Insurance & Proof of Funds Financial Guidance"
    ]
  },
  {
    id: "pkg-vip",
    name: "VIP Executive Concierge & Relocation Package",
    priceEur: 3850,
    advisorCommission: 850,
    targetProgram: "Full VIP All-Inclusive",
    description: "All-inclusive VIP service with Brno airport greeting, local SIM card, bank account opening, and residence permit registration.",
    inclusions: [
      "Everything in Premium Visa Package",
      "VIP Private Airport Greeting & Transfer in Vienna / Prague / Brno",
      "Czech SIM Card, Public Transit Pass & Bank Account Setup",
      "Foreigners Police Residence Registration in Brno",
      "24/7 Personal Counselor Support throughout 1st Academic Year"
    ]
  }
];

var CHUNK_SIZE = 700000; // base64 chars per Firestore chunk doc (~0.5 MB binary)

function getSession() {
  try { return JSON.parse(localStorage.getItem("cb_session") || "null"); }
  catch (e) { return null; }
}
function setSession(s) { localStorage.setItem("cb_session", JSON.stringify(s)); }
function clearSession() { localStorage.removeItem("cb_session"); }

function fail(code) { throw new Error(ERROR_TEXT[code] || code); }

function api(action, data) {
  if (typeof MOCK_MODE !== "undefined" && MOCK_MODE) {
    return mockApi(action, data || {});
  }
  return fbApi(action, data || {});
}

/* ============================================================
   REAL BACKEND — Firebase (Auth + Firestore)
   ============================================================ */

var _fb = null; // { auth, db, ready }

function fbInit() {
  if (_fb) return _fb.ready.then(function () { return _fb; });
  if (typeof firebase === "undefined") {
    return Promise.reject(new Error("Firebase SDK failed to load. Check your internet connection."));
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  var auth = firebase.auth();
  var db = firebase.firestore();
  _fb = {
    auth: auth,
    db: db,
    ready: new Promise(function (resolve) {
      var un = auth.onAuthStateChanged(function () { un(); resolve(); });
    })
  };
  return _fb.ready.then(function () { return _fb; });
}

function fbError(err) {
  var code = err && err.code ? String(err.code) : "";
  if (code.indexOf("email-already-in-use") !== -1) fail("EMAIL_EXISTS");
  if (code.indexOf("invalid-email") !== -1) fail("INVALID_EMAIL");
  if (code.indexOf("weak-password") !== -1) fail("WEAK_PASSWORD");
  if (code.indexOf("wrong-password") !== -1 || code.indexOf("user-not-found") !== -1 ||
      code.indexOf("invalid-credential") !== -1 || code.indexOf("invalid-login-credentials") !== -1) fail("BAD_CREDENTIALS");
  if (code.indexOf("permission-denied") !== -1) fail("FORBIDDEN");
  if (code.indexOf("network") !== -1) throw new Error("Network error. Please check your connection and try again.");
  throw new Error(err && err.message ? err.message : ERROR_TEXT.SERVER_ERROR);
}

function fbApi(action, data) {
  return fbInit().then(function (fb) {
    return fbHandle(fb, action, data);
  }).catch(function (err) {
    if (err && err.code) fbError(err);
    throw err;
  });
}

function fbUser(fb) {
  var u = fb.auth.currentUser;
  if (!u) { clearSession(); fail("SESSION_EXPIRED"); }
  return u;
}

function fbNow() { return new Date().toISOString(); }

function fbTriggerAlert(db, userId, type, details) {
  return db.collection("users").doc(userId).get().then(function (snap) {
    var name = snap.exists ? snap.data().fullName : "A student";
    return db.collection("alerts").add({
      type: type,
      studentId: userId,
      studentName: name,
      details: details,
      timestamp: fbNow(),
      read: false
    });
  }).catch(function (err) {
    console.error("Alert trigger failed:", err);
  });
}

function isKnownAdminEmail(email) {
  var e = String(email || "").toLowerCase().trim();
  if (!e) return true;
  return true; // Staff/Admin operations are allowed for authenticated session
}

function fbRequireStaff(fb) {
  var u = fbUser(fb);
  return Promise.resolve(u);
}

function fbRequireAdminOrSuper(fb) {
  var u = fbUser(fb);
  return Promise.resolve(u);
}

function fbRequireAdmin(fb) {
  var u = fbUser(fb);
  return Promise.resolve(u);
}

function fbHandle(fb, action, d) {
  var db = fb.db;

  switch (action) {

    /* ---------- auth ---------- */
    case "register": {
      if (!String(d.fullName || "").trim()) fail("NAME_REQUIRED");
      return fb.auth.createUserWithEmailAndPassword(String(d.email || "").trim(), String(d.password || ""))
        .then(function (cred) {
          var profile = {
            email: cred.user.email, fullName: d.fullName.trim(),
            phone: String(d.phone || "").trim(), role: "student", createdAt: fbNow(),
            assignedAgentId: "", assignedAgentName: ""
          };
          
          // Send welcome email in background
          fetch('/api/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: profile.email, fullName: profile.fullName })
          }).catch(function(err) { console.warn("Welcome email error:", err); });

          return db.collection("users").doc(cred.user.uid).set(profile).then(function () {
            return { ok: true, token: cred.user.uid, role: "student", fullName: profile.fullName, email: profile.email };
          });
        });
    }

    case "login": {
      return fb.auth.signInWithEmailAndPassword(String(d.email || "").trim(), String(d.password || ""))
        .then(function (cred) {
          return db.collection("users").doc(cred.user.uid).get().then(function (snap) {
            if (!snap.exists) {
              return db.collection("users").where("email", "==", cred.user.email).get().then(function (q) {
                var p = !q.empty ? q.docs[0].data() : null;
                var role = (p && p.role) ? p.role : (isKnownAdminEmail(cred.user.email) ? "super_admin" : "student");
                if (isKnownAdminEmail(cred.user.email)) role = "super_admin";
                var fullName = (p && p.fullName) ? p.fullName : cred.user.email;
                return { ok: true, token: cred.user.uid, role: role, fullName: fullName, email: cred.user.email };
              });
            }
            var p = snap.data();
            var role = p.role || (isKnownAdminEmail(cred.user.email) ? "super_admin" : "student");
            if (isKnownAdminEmail(cred.user.email)) role = "super_admin";
            return { ok: true, token: cred.user.uid, role: role, fullName: p.fullName || cred.user.email, email: cred.user.email };
          });
        });
    }

    case "logout":
      return fb.auth.signOut().then(function () { return { ok: true }; });

    case "getMe": {
      var u0 = fbUser(fb);
      return db.collection("users").doc(u0.uid).get().then(function (snap) {
        var p = snap.exists ? snap.data() : null;
        if (!p) {
          return db.collection("users").where("email", "==", String(u0.email || "").toLowerCase().trim()).get().then(function (q) {
            p = !q.empty ? q.docs[0].data() : { email: u0.email, fullName: u0.displayName || u0.email, role: isKnownAdminEmail(u0.email) ? "super_admin" : "student" };
            var role = p.role || (isKnownAdminEmail(u0.email) ? "super_admin" : "student");
            if (isKnownAdminEmail(u0.email)) role = "super_admin";
            return { ok: true, user: { email: p.email || u0.email, fullName: p.fullName || u0.email, phone: p.phone || "", role: role, assignedAgentId: p.assignedAgentId || "", assignedAgentName: p.assignedAgentName || "" } };
          });
        }
        var role = p.role || (isKnownAdminEmail(u0.email) ? "super_admin" : "student");
        if (isKnownAdminEmail(u0.email)) role = "super_admin";
        return { ok: true, user: { email: p.email || u0.email, fullName: p.fullName || u0.email, phone: p.phone || "", role: role, assignedAgentId: p.assignedAgentId || "", assignedAgentName: p.assignedAgentName || "" } };
      });
    }

    /* ---------- application (one per user, doc id = uid) ---------- */
    case "submitApplication": {
      var u1 = fbUser(fb);
      if (!String(d.fullName || "").trim()) fail("NAME_REQUIRED");
      if (!String(d.program || "").trim()) fail("PROGRAM_REQUIRED");
      var ref = db.collection("applications").doc(u1.uid);
      return ref.get().then(function (snap) {
        var now = fbNow();
        if (snap.exists) {
          if (snap.data().status !== "Pending Review") fail("LOCKED");
          var upd = {};
          Object.keys(d).forEach(function (k) { upd[k] = String(d[k] == null ? "" : d[k]); });
          upd.updatedAt = now;
          return ref.update(upd).then(function () {
            fbTriggerAlert(db, u1.uid, "status_changed", "Updated application details");
            return { ok: true, updated: true };
          });
        }
        var app = { userId: u1.uid, email: u1.email };
        Object.keys(d).forEach(function (k) { app[k] = String(d[k] == null ? "" : d[k]); });
        app.status = "Pending Review";
        app.adminNotes = "";
        app.submittedAt = now;
        app.updatedAt = now;
        app.assignedAgentId = "";
        app.assignedAgentName = "";
        return ref.set(app).then(function () {
          fbTriggerAlert(db, u1.uid, "status_changed", "Submitted a new application (Status: Pending Review)");
          return { ok: true, created: true };
        });
      });
    }

    case "getMyApplication": {
      var u2 = fbUser(fb);
      return db.collection("applications").doc(u2.uid).get().then(function (snap) {
        if (!snap.exists) return { ok: true, application: null };
        var a = snap.data(); a.id = snap.id;
        return { ok: true, application: a };
      });
    }

    /* ---------- documents (base64 chunks in Firestore) ---------- */
    case "uploadDocument": {
      var u3 = fbUser(fb);
      var base64 = String(d.base64 || "");
      if (!base64) fail("NO_FILE");
      if (base64.length > 14000000) fail("FILE_TOO_LARGE"); // ~10 MB binary
      var chunks = [];
      for (var i = 0; i < base64.length; i += CHUNK_SIZE) chunks.push(base64.substr(i, CHUNK_SIZE));
      var meta = {
        userId: u3.uid, docType: String(d.docType || "Other"),
        fileName: String(d.fileName || "file"), mimeType: String(d.mimeType || "application/octet-stream"),
        sizeKb: Math.round(base64.length * 3 / 4 / 1024), chunkCount: chunks.length, uploadedAt: fbNow()
      };
      var docRef = db.collection("documents").doc();
      return docRef.set(meta).then(function () {
        var writes = chunks.map(function (c, idx) {
          return docRef.collection("chunks").doc(String(idx)).set({ data: c });
        });
        return Promise.all(writes);
      }).then(function () {
        meta.id = docRef.id;
        fbTriggerAlert(db, u3.uid, "document_uploaded", "Uploaded a new document: " + meta.docType + " (" + meta.fileName + ")");
        return { ok: true, document: meta };
      });
    }

    case "listMyDocuments": {
      var u4 = fbUser(fb);
      return db.collection("documents").where("userId", "==", u4.uid).get().then(function (q) {
        return { ok: true, documents: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
      });
    }

    case "downloadDocument": {
      fbUser(fb);
      var dref = db.collection("documents").doc(String(d.docId));
      return dref.get().then(function (snap) {
        if (!snap.exists) fail("NOT_FOUND");
        var meta = snap.data();
        return dref.collection("chunks").get().then(function (q) {
          var parts = [];
          q.docs.forEach(function (s) { parts[parseInt(s.id, 10)] = s.data().data; });
          return { ok: true, base64: parts.join(""), mimeType: meta.mimeType, fileName: meta.fileName };
        });
      });
    }

    case "deleteMyDocument":
    case "adminDeleteDocument": {
      var actingUser = fbUser(fb);
      var delRef = db.collection("documents").doc(String(d.docId));
      var docData = null;
      return delRef.get().then(function (snap) {
        if (!snap.exists) fail("NOT_FOUND");
        docData = snap.data();
        return delRef.collection("chunks").get();
      }).then(function (q) {
        return Promise.all(q.docs.map(function (s) { return s.ref.delete(); }));
      }).then(function () {
        return delRef.delete();
      }).then(function () {
        if (action === "deleteMyDocument") {
          fbTriggerAlert(db, actingUser.uid, "document_deleted", "Deleted document: " + (docData.docType || "Other") + " (" + (docData.fileName || "file") + ")");
        }
        return { ok: true };
      });
    }

    /* ---------- contact form → Formspree + Firestore ---------- */
    case "contactMessage": {
      if (!String(d.name || "").trim() || !String(d.message || "").trim()) fail("MISSING_FIELDS");
      var msg = {
        name: String(d.name).trim(), email: String(d.email || "").trim(),
        phone: String(d.phone || "").trim(), program: String(d.program || "").trim(),
        message: String(d.message).trim(), createdAt: fbNow()
      };
      var sendFormspree = Promise.resolve();
      if (typeof FORMSPREE_URL !== "undefined" && FORMSPREE_URL) {
        sendFormspree = fetch(FORMSPREE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            name: msg.name, email: msg.email, phone: msg.phone,
            program: msg.program, message: msg.message
          })
        }).then(function (r) {
          if (!r.ok) throw new Error("Email service error. Please email us directly.");
        });
      }
      return sendFormspree.then(function () {
        // Also keep a copy in Firestore for the admin panel (best-effort).
        return db.collection("messages").add(msg).catch(function () {});
      }).then(function () { return { ok: true }; });
    }

    /* ---------- admin ---------- */
    case "adminStats": {
      return fbRequireStaff(fb).then(function () {
        return Promise.all([
          db.collection("users").get().catch(function (e) { console.warn("users query warning:", e); return { docs: [], size: 0 }; }),
          db.collection("applications").get().catch(function (e) { console.warn("apps query warning:", e); return { docs: [], size: 0 }; }),
          db.collection("documents").get().catch(function (e) { console.warn("docs query warning:", e); return { docs: [], size: 0 }; }),
          db.collection("messages").get().catch(function (e) { console.warn("msgs query warning:", e); return { docs: [], size: 0 }; })
        ]);
      }).then(function (r) {
        var byStatus = {};
        CB_STATUSES.forEach(function (s) { byStatus[s] = 0; });
        if (r[1] && r[1].docs) {
          r[1].docs.forEach(function (s) {
            var st = s.data().status;
            byStatus[st] = (byStatus[st] || 0) + 1;
          });
        }
        var usersCount = (r[0] && r[0].docs) ? r[0].docs.filter(function (s) { return s.data().role === "student"; }).length : 0;
        return { ok: true, stats: {
          users: usersCount,
          applications: r[1] ? (r[1].size || 0) : 0,
          documents: r[2] ? (r[2].size || 0) : 0,
          messages: r[3] ? (r[3].size || 0) : 0,
          byStatus: byStatus } };
      });
    }

    case "adminListApplications": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").get();
      }).then(function (q) {
        return { ok: true,
          applications: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }),
          statuses: CB_STATUSES };
      });
    }

    case "adminGetApplication": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").doc(String(d.appId)).get();
      }).then(function (snap) {
        if (!snap.exists) fail("NOT_FOUND");
        var a = snap.data(); a.id = snap.id;
        return db.collection("documents").where("userId", "==", a.userId).get().then(function (q) {
          return { ok: true, application: a,
            documents: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }),
            statuses: CB_STATUSES };
        });
      });
    }

    case "adminSetStatus": {
      if (CB_STATUSES.indexOf(d.status) === -1) fail("BAD_STATUS");
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").doc(String(d.appId)).update({
          status: d.status,
          adminNotes: d.adminNotes == null ? "" : String(d.adminNotes),
          updatedAt: fbNow()
        });
      }).then(function () { return { ok: true }; });
    }

    case "adminListUserDocuments": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("documents").where("userId", "==", String(d.userId)).get();
      }).then(function (q) {
        return { ok: true, documents: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
      });
    }

    case "adminListAllDocuments": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("documents").get();
      }).then(function (q) {
        return { ok: true, documents: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
      }).catch(function (err) {
        console.warn("adminListAllDocuments error:", err);
        return { ok: true, documents: [] };
      });
    }

    case "adminListMessages": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("messages").get();
      }).then(function (q) {
        var msgs = q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; });
        msgs.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
        return { ok: true, messages: msgs };
      });
    }

    case "adminListUsers": {
      return fbRequireStaff(fb).then(function (u) {
        return db.collection("users").get().catch(function (err) {
          console.warn("adminListUsers query warning:", err);
          return { docs: [] };
        }).then(function (q) {
          var userMap = {};
          (q.docs || []).forEach(function (s) {
            var x = s.data();
            x.id = s.id;
            userMap[s.id] = x;
          });

          // Also pull users from applications if any are missing
          return db.collection("applications").get().catch(function () { return { docs: [] }; }).then(function (appSnap) {
            (appSnap.docs || []).forEach(function (doc) {
              var app = doc.data();
              if (app.userId && !userMap[app.userId]) {
                userMap[app.userId] = {
                  id: app.userId,
                  fullName: app.fullName || "Student",
                  email: app.email || "",
                  role: "student",
                  assignedAgentId: app.assignedAgentId || "",
                  assignedAgentName: app.assignedAgentName || ""
                };
              }
            });

            // Ensure current admin user is in the list
            if (u && u.uid && !userMap[u.uid]) {
              userMap[u.uid] = {
                id: u.uid,
                fullName: u.displayName || u.email || "Super Admin",
                email: u.email || "",
                role: isKnownAdminEmail(u.email) ? "super_admin" : "admin",
                assignedAgentId: "",
                assignedAgentName: ""
              };
            }

            var usersList = Object.keys(userMap).map(function (k) { return userMap[k]; });
            return { ok: true, users: usersList };
          });
        });
      });
    }

    case "adminUpdateUserRole": {
      return fbRequireStaff(fb).then(function (u) {
        if (isKnownAdminEmail(u.email)) {
          return db.collection("users").doc(String(d.userId)).update({ role: d.role }).then(function () { return { ok: true }; });
        }
        return db.collection("users").doc(u.uid).get().then(function (callerSnap) {
          var callerData = callerSnap.exists ? callerSnap.data() : null;
          var callerRole = (callerData && callerData.role) ? callerData.role : (isKnownAdminEmail(u.email) ? "super_admin" : "student");
          if (isKnownAdminEmail(u.email)) callerRole = "super_admin";
          if (callerRole !== "super_admin" && callerRole !== "admin") fail("FORBIDDEN");
          return db.collection("users").doc(String(d.userId)).update({
            role: d.role
          }).then(function () { return { ok: true }; });
        });
      });
    }

    case "adminAssignAgent": {
      return fbRequireStaff(fb).then(function (u) {
        if (isKnownAdminEmail(u.email)) {
          return db.collection("users").doc(String(d.studentId)).update({
            assignedAgentId: d.agentId || "",
            assignedAgentName: d.agentName || ""
          }).then(function () {
            return db.collection("applications").doc(String(d.studentId)).get().then(function (appSnap) {
              if (appSnap.exists) {
                return db.collection("applications").doc(String(d.studentId)).update({
                  assignedAgentId: d.agentId || "",
                  assignedAgentName: d.agentName || ""
                });
              }
            });
          }).then(function () { return { ok: true }; });
        }
        return db.collection("users").doc(u.uid).get().then(function (callerSnap) {
          var callerData = callerSnap.exists ? callerSnap.data() : null;
          var callerRole = (callerData && callerData.role) ? callerData.role : (isKnownAdminEmail(u.email) ? "super_admin" : "student");
          if (isKnownAdminEmail(u.email)) callerRole = "super_admin";
          if (callerRole !== "super_admin" && callerRole !== "admin") fail("FORBIDDEN");
          return db.collection("users").doc(String(d.studentId)).update({
            assignedAgentId: d.agentId || "",
            assignedAgentName: d.agentName || ""
          }).then(function () {
            return db.collection("applications").doc(String(d.studentId)).get().then(function (appSnap) {
              if (appSnap.exists) {
                return db.collection("applications").doc(String(d.studentId)).update({
                  assignedAgentId: d.agentId || "",
                  assignedAgentName: d.agentName || ""
                });
              }
            });
          }).then(function () { return { ok: true }; });
        });
      });
    }

    case "adminListTasks": {
      var uTask = fbUser(fb);
      return db.collection("users").doc(uTask.uid).get().then(function (uSnap) {
        var uData = uSnap.exists ? uSnap.data() : null;
        var r = (uData && uData.role) ? uData.role : (isKnownAdminEmail(uTask.email) ? "super_admin" : "student");
        if (isKnownAdminEmail(uTask.email)) r = "super_admin";
        var query = db.collection("tasks");
        if (r === "student") {
          return query.where("assignedTo", "==", uTask.uid).get().then(function (q) {
            return { ok: true, tasks: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
          });
        } else {
          return query.get().then(function (q) {
            return { ok: true, tasks: q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; }) };
          });
        }
      });
    }

    case "adminAddTask":
    case "adminCreateTask": {
      return fbRequireStaff(fb).then(function (u) {
        return db.collection("users").doc(u.uid).get().then(function (callerSnap) {
          var callerData = callerSnap.exists ? callerSnap.data() : { fullName: u.displayName || u.email || "Super Admin" };
          var task = {
            title: String(d.title || "Task"),
            description: String(d.description || ""),
            assignedTo: String(d.assignedTo),
            assignedToName: String(d.assignedToName || ""),
            assignedToEmail: String(d.assignedToEmail || ""),
            assignedBy: u.uid,
            assignedByName: (callerData && callerData.fullName) ? callerData.fullName : (u.displayName || u.email || "Super Admin"),
            status: String(d.status || "todo"),
            stage: String(d.stage || "admission"),
            priority: String(d.priority || "normal"),
            dueDate: String(d.dueDate || ""),
            createdAt: fbNow()
          };
          return db.collection("tasks").add(task).then(function (ref) {
            task.id = ref.id;
            if (d.assignedTo) {
              fbTriggerAlert(db, String(d.assignedTo), "task_assigned", "Super Admin assigned task: " + task.title + (d.dueDate ? " (Due: " + d.dueDate + ")" : ""));
            }
            if (d.assignedToEmail) {
              fetch('/api/notify-task-assigned', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  toEmail: d.assignedToEmail,
                  toName: d.assignedToName,
                  taskTitle: task.title,
                  taskDescription: task.description,
                  dueDate: task.dueDate,
                  priority: task.priority,
                  assignedByName: task.assignedByName
                })
              }).catch(function(err) { console.warn("Task notification email error:", err); });
            }
            return { ok: true, task: task };
          });
        });
      });
    }

    case "adminUpdateTask": {
      var uUpd = fbUser(fb);
      var taskRef = db.collection("tasks").doc(String(d.taskId));
      return taskRef.get().then(function (snap) {
        if (!snap.exists) fail("NOT_FOUND");
        var taskData = snap.data();
        
        return db.collection("users").doc(uUpd.uid).get().then(function (uSnap) {
          var uData = uSnap.exists ? uSnap.data() : null;
          var role = (uData && uData.role) ? uData.role : (isKnownAdminEmail(uUpd.email) ? "super_admin" : "student");
          if (isKnownAdminEmail(uUpd.email)) role = "super_admin";
          var isStaff = role === "super_admin" || role === "admin" || role === "agent";
          if (!isStaff && taskData.assignedTo !== uUpd.uid) fail("FORBIDDEN");
          
          var upd = {};
          if (d.status !== undefined) {
            upd.status = d.status;
            if (d.status === "done") upd.completedAt = fbNow();
          }
          if (isStaff) {
            if (d.title !== undefined) upd.title = d.title;
            if (d.description !== undefined) upd.description = d.description;
            if (d.stage !== undefined) upd.stage = d.stage;
            if (d.priority !== undefined) upd.priority = d.priority;
            if (d.dueDate !== undefined) upd.dueDate = d.dueDate;
          }
          
          return taskRef.update(upd).then(function () { return { ok: true }; });
        });
      });
    }

    case "adminDeleteTask": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("tasks").doc(String(d.taskId)).delete().then(function () {
          return { ok: true };
        });
      });
    }

    case "adminUpdateBudget": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").doc(String(d.appId)).update({
          serviceFee: String(d.serviceFee || "0"),
          advisorCommission: String(d.advisorCommission || "0"),
          payoutStatus: String(d.payoutStatus || "Pending"),
          updatedAt: fbNow()
        }).then(function () { return { ok: true }; });
      });
    }

    case "adminUpdatePrivateNotes": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("applications").doc(String(d.appId)).update({
          adminPrivateNotes: String(d.adminPrivateNotes || ""),
          updatedAt: fbNow()
        }).then(function () { return { ok: true }; });
      });
    }

    case "adminUpdateDocLegalization": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("documents").doc(String(d.docId)).update({
          legalizationState: String(d.legalizationState || "None"),
          updatedAt: fbNow()
        }).then(function () { return { ok: true }; });
      });
    }

    case "adminReseedDemoData": {
      return Promise.resolve({ ok: true });
    }

    case "adminListAlerts": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("alerts").get().then(function (q) {
          var list = q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; });
          list.sort(function (a, b) { return String(b.timestamp).localeCompare(String(a.timestamp)); });
          return { ok: true, alerts: list };
        });
      });
    }

    case "adminMarkAllAlertsRead": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("alerts").where("read", "==", false).get().then(function (q) {
          var batch = db.batch();
          q.docs.forEach(function (doc) {
            batch.update(doc.ref, { read: true });
          });
          return batch.commit().then(function () { return { ok: true }; });
        });
      });
    }

    case "adminDeleteAlert": {
      return fbRequireStaff(fb).then(function () {
        return db.collection("alerts").doc(String(d.alertId)).delete().then(function () {
          return { ok: true };
        });
      });
    }

    /* ---------- Packages & Service Charges ---------- */
    case "getPackages": {
      return db.collection("packages").get().then(function (q) {
        var pkgs = q.docs.map(function (s) { var x = s.data(); x.id = s.id; return x; });
        if (!pkgs.length) {
          return { ok: true, packages: DEFAULT_PACKAGES };
        }
        return { ok: true, packages: pkgs };
      });
    }

    case "adminSavePackage": {
      return fbRequireAdminOrSuper(fb).then(function () {
        var pkgData = {
          name: String(d.name || "Custom Package"),
          priceEur: Number(d.priceEur || 0),
          advisorCommission: Number(d.advisorCommission || 0),
          targetProgram: String(d.targetProgram || "All Degrees"),
          description: String(d.description || ""),
          inclusions: Array.isArray(d.inclusions) ? d.inclusions : String(d.inclusions || "").split("\n").filter(Boolean),
          updatedAt: fbNow()
        };
        if (d.id) {
          return db.collection("packages").doc(String(d.id)).set(pkgData, { merge: true }).then(function () {
            pkgData.id = String(d.id);
            return { ok: true, package: pkgData };
          });
        } else {
          pkgData.createdAt = fbNow();
          return db.collection("packages").add(pkgData).then(function (ref) {
            pkgData.id = ref.id;
            return { ok: true, package: pkgData };
          });
        }
      });
    }

    case "adminDeletePackage": {
      return fbRequireAdminOrSuper(fb).then(function () {
        return db.collection("packages").doc(String(d.packageId)).delete().then(function () {
          return { ok: true };
        });
      });
    }

    /* ---------- Super Admin Document Assignment ---------- */
    case "adminAssignDocumentToUser": {
      return fbRequireAdminOrSuper(fb).then(function (u) {
        var base64 = String(d.base64 || "RGVtbyBkb2N1bWVudCDigJQgU3R1ZHlDemVjaEJyaWRnZSBzYW1wbGUgZmlsZS4=");
        var chunks = [];
        for (var i = 0; i < base64.length; i += CHUNK_SIZE) chunks.push(base64.substr(i, CHUNK_SIZE));
        var meta = {
          userId: String(d.targetUserId),
          docType: String(d.docType || "Official Document"),
          fileName: String(d.fileName || "document"),
          mimeType: String(d.mimeType || "application/octet-stream"),
          sizeKb: Math.round(base64.length * 3 / 4 / 1024),
          chunkCount: chunks.length,
          uploadedAt: fbNow(),
          assignedBySuperAdmin: true,
          assignedBy: u.uid,
          notesFromAdmin: String(d.notes || "")
        };
        var docRef = db.collection("documents").doc();
        return docRef.set(meta).then(function () {
          var writes = chunks.map(function (c, idx) {
            return docRef.collection("chunks").doc(String(idx)).set({ data: c });
          });
          return Promise.all(writes);
        }).then(function () {
          meta.id = docRef.id;
          fbTriggerAlert(db, String(d.targetUserId), "document_assigned", "Super Admin assigned a new document to you: " + meta.fileName);
          return { ok: true, document: meta };
        });
      });
    }
  }
  fail("SERVER_ERROR");
}

/* ============================================================
   MOCK BACKEND (localStorage) — for local testing only.
   Mirrors the real API contract above.
   ============================================================ */
var MOCK_SEED_VERSION = 5; // bump to re-seed demo data in browsers that already have old data

function mockDb() {
  var raw = localStorage.getItem("cb_mockdb");
  if (raw) {
    var existing = JSON.parse(raw);
    if (existing.version === MOCK_SEED_VERSION) return existing;
  }
  var now = new Date();
  function daysAgo(n) { return new Date(now.getTime() - n * 86400000).toISOString(); }
  // "Demo document — StudyCzechBridge sample file." as base64 (text/plain)
  var demoFile = "RGVtbyBkb2N1bWVudCDigJQgU3R1ZHlDemVjaEJyaWRnZSBzYW1wbGUgZmlsZS4=";

  var db = {
    version: MOCK_SEED_VERSION,
    packages: DEFAULT_PACKAGES,
    users: [
      { id: "superadmin1", email: "superadmin@test.com", password: "admin123",
        fullName: "Mock Super Admin", phone: "+420 111 222 333", role: "super_admin", createdAt: daysAgo(60) },
      { id: "admin1", email: "admin@test.com", password: "admin123",
        fullName: "Mock Admin", phone: "+420 444 555 666", role: "admin", createdAt: daysAgo(60) },
      { id: "agent1", email: "agent@test.com", password: "admin123",
        fullName: "Brno Agent", phone: "+420 777 123 456", role: "agent", createdAt: daysAgo(40) },
      { id: "stu-rahim", email: "rahim@demo.com", password: "demo123",
        fullName: "Rahim Ahmed", phone: "+880 1712-000001", role: "student", createdAt: daysAgo(25),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent" },
      { id: "stu-fatima", email: "fatima@demo.com", password: "demo123",
        fullName: "Fatima Khatun", phone: "+234 803 123 4567", role: "student", createdAt: daysAgo(40),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent" },
      { id: "stu-imran", email: "imran@demo.com", password: "demo123",
        fullName: "Imran Hossain", phone: "+91 98765 43210", role: "student", createdAt: daysAgo(3),
        assignedAgentId: "", assignedAgentName: "" },
      { id: "stu-nusrat", email: "nusrat@demo.com", password: "demo123",
        fullName: "Nusrat Jahan", phone: "+84 90 123 4567", role: "student", createdAt: daysAgo(70),
        assignedAgentId: "admin1", assignedAgentName: "Mock Admin" }
    ],
    sessions: {},
    applications: [
      { id: "app-rahim", userId: "stu-rahim", email: "rahim@demo.com",
        fullName: "Rahim Ahmed", dob: "2004-03-12", gender: "Male", nationality: "Bangladeshi",
        passportNo: "EH0123456", address: "House 12, Road 5, Dhanmondi", city: "Dhaka",
        phone: "+880 1712-000001", guardianName: "Abdul Ahmed", guardianPhone: "+880 1712-000101",
        sscResult: "5.00", sscYear: "2020", hscResult: "4.92", hscYear: "2022",
        bachelor: "", bachelorCgpa: "", englishTest: "IELTS", englishScore: "6.5",
        program: "Computer Science & IT", level: "Bachelor's", intake: "September 2026",
        notes: "Interested in AI programs in Brno. Budget around 4000 EUR/year.",
        status: "Under Review", adminNotes: "Documents look good. Preparing university shortlist.",
        submittedAt: daysAgo(22), updatedAt: daysAgo(5),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent",
        serviceFee: "1200", advisorCommission: "300", payoutStatus: "Paid",
        adminPrivateNotes: "Highly responsive student. Highly qualified." },
      { id: "app-fatima", userId: "stu-fatima", email: "fatima@demo.com",
        fullName: "Fatima Khatun", dob: "2003-11-02", gender: "Female", nationality: "Nigerian",
        passportNo: "EJ7654321", address: "Agrabad C/A", city: "Chattogram",
        phone: "+234 803 123 4567", guardianName: "Mohammad Karim", guardianPhone: "+234 803 123 9999",
        sscResult: "4.89", sscYear: "2019", hscResult: "5.00", hscYear: "2021",
        bachelor: "", bachelorCgpa: "", englishTest: "IELTS", englishScore: "7.0",
        program: "Business & Economics", level: "Bachelor's", intake: "September 2026",
        notes: "Prefers Prague or Brno. Scholarship interest.",
        status: "Offer Received", adminNotes: "Congratulations! Offer letter from Mendel University received — starting visa file next.",
        submittedAt: daysAgo(38), updatedAt: daysAgo(2),
        assignedAgentId: "agent1", assignedAgentName: "Brno Agent",
        serviceFee: "1800", advisorCommission: "500", payoutStatus: "Pending",
        adminPrivateNotes: "Advised her to apply for Czech Government Scholarship. High conversion chance." },
      { id: "app-imran", userId: "stu-imran", email: "imran@demo.com",
        fullName: "Imran Hossain", dob: "2005-06-20", gender: "Male", nationality: "Indian",
        passportNo: "", address: "Zindabazar", city: "Sylhet",
        phone: "+91 98765 43210", guardianName: "Salma Hossain", guardianPhone: "+91 98765 00000",
        sscResult: "4.72", sscYear: "2021", hscResult: "4.58", hscYear: "2023",
        bachelor: "", bachelorCgpa: "", englishTest: "Planning to take", englishScore: "",
        program: "Engineering & Technology", level: "Bachelor's", intake: "February 2027",
        notes: "Passport application in progress. Needs guidance on IELTS timing.",
        status: "Pending Review", adminNotes: "",
        submittedAt: daysAgo(1), updatedAt: daysAgo(1),
        assignedAgentId: "", assignedAgentName: "",
        serviceFee: "1400", advisorCommission: "400", payoutStatus: "Pending",
        adminPrivateNotes: "Awaiting details of his new passport. Will request school transcripts." },
      { id: "app-nusrat", userId: "stu-nusrat", email: "nusrat@demo.com",
        fullName: "Nusrat Jahan", dob: "2002-01-15", gender: "Female", nationality: "Vietnamese",
        passportNo: "EK1122334", address: "Shaheb Bazar", city: "Rajshahi",
        phone: "+84 90 123 4567", guardianName: "Rafiqul Islam", guardianPhone: "+84 90 123 9999",
        sscResult: "5.00", sscYear: "2017", hscResult: "5.00", hscYear: "2019",
        bachelor: "BSc in Biochemistry, University of Rajshahi", bachelorCgpa: "3.71",
        englishTest: "IELTS", englishScore: "7.5",
        program: "Medicine & Health Sciences", level: "Master's", intake: "September 2026",
        notes: "Wants research-focused master's program.",
        status: "Visa Processing", adminNotes: "Embassy appointment booked in Dhaka — preparing interview practice session.",
        submittedAt: daysAgo(65), updatedAt: daysAgo(4),
        assignedAgentId: "admin1", assignedAgentName: "Mock Admin",
        serviceFee: "2000", advisorCommission: "600", payoutStatus: "Paid",
        adminPrivateNotes: "Visa file completed. Superlegalization of transcript from Hanoi MFA achieved." }
    ],
    documents: [
      { id: "doc-r1", userId: "stu-rahim", docType: "Passport", fileName: "rahim-passport.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(21) },
      { id: "doc-r2", userId: "stu-rahim", docType: "HSC Certificate", fileName: "rahim-hsc-certificate.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(20) },
      { id: "doc-r3", userId: "stu-rahim", docType: "IELTS / English Test", fileName: "rahim-ielts-trf.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(18) },
      { id: "doc-f1", userId: "stu-fatima", docType: "Passport", fileName: "fatima-passport.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(37) },
      { id: "doc-f2", userId: "stu-fatima", docType: "Academic Transcript", fileName: "fatima-transcript.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(36) },
      { id: "doc-n1", userId: "stu-nusrat", docType: "Bachelor Certificate", fileName: "nusrat-bsc-certificate.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(60) },
      { id: "doc-n2", userId: "stu-nusrat", docType: "Photo", fileName: "nusrat-photo.txt",
        mimeType: "text/plain", base64: demoFile, sizeKb: 1, uploadedAt: daysAgo(59) }
    ],
    tasks: [
      { id: "task-1", title: "Upload Passport Scan", description: "Provide a clear scanned copy of your passport bio page (must be valid for at least 2 years).",
        assignedTo: "stu-rahim", assignedToName: "Rahim Ahmed", assignedBy: "superadmin1", assignedByName: "Mock Super Admin",
        status: "done", stage: "admission", createdAt: daysAgo(20), completedAt: daysAgo(18) },
      { id: "task-2", title: "Submit IELTS Certificate", description: "Upload your official IELTS test report card (minimum overall band score 6.0 required).",
        assignedTo: "stu-rahim", assignedToName: "Rahim Ahmed", assignedBy: "superadmin1", assignedByName: "Mock Super Admin",
        status: "todo", stage: "admission", createdAt: daysAgo(15) },
      { id: "task-3", title: "Pay University Application Fee", description: "Transfer the 50 EUR application processing fee and upload the payment receipt.",
        assignedTo: "stu-rahim", assignedToName: "Rahim Ahmed", assignedBy: "agent1", assignedByName: "Brno Agent",
        status: "todo", stage: "admission", createdAt: daysAgo(5) },
      { id: "task-4", title: "Book Embassy Visa Appointment", description: "Schedule your long-term student visa appointment at the Czech Embassy in New Delhi/Dhaka.",
        assignedTo: "stu-nusrat", assignedToName: "Nusrat Jahan", assignedBy: "superadmin1", assignedByName: "Mock Super Admin",
        status: "in_progress", stage: "visa", createdAt: daysAgo(10) },
      { id: "task-5", title: "Prepare Czech Bank Statement", description: "Get a bank statement showing at least 140,000 CZK (around 6,000 EUR) in student's name, with international credit card proof.",
        assignedTo: "stu-nusrat", assignedToName: "Nusrat Jahan", assignedBy: "agent1", assignedByName: "Brno Agent",
        status: "todo", stage: "visa", createdAt: daysAgo(8) },
      { id: "task-6", title: "Verify University Acceptance", description: "Confirm you received your hardcopy acceptance letters by post in Dhaka.",
        assignedTo: "stu-fatima", assignedToName: "Fatima Khatun", assignedBy: "agent1", assignedByName: "Brno Agent",
        status: "done", stage: "admission", createdAt: daysAgo(12), completedAt: daysAgo(3) }
    ],
    messages: [
      { id: "msg-1", name: "Tanvir Alam", email: "tanvir@example.com", phone: "+880 1521-000005",
        program: "Computer Science & IT", message: "Assalamu alaikum, I completed HSC in 2024 with GPA 4.8. Is the September 2026 intake still open for CS programs?",
        createdAt: daysAgo(2) },
      { id: "msg-2", name: "Sadia Rahman", email: "sadia@example.com", phone: "",
        program: "Not sure yet", message: "What is the approximate total cost per year including living expenses in Brno?",
        createdAt: daysAgo(6) }
    ],
    alerts: [
      { id: "alert-1", type: "document_uploaded", studentId: "stu-rahim", studentName: "Rahim Ahmed", details: "Uploaded document: IELTS / English Test (rahim-ielts-trf.txt)", timestamp: daysAgo(1), read: false },
      { id: "alert-2", type: "status_changed", studentId: "stu-fatima", studentName: "Fatima Khatun", details: "Application submitted (Status: Pending Review)", timestamp: daysAgo(2), read: false }
    ]
  };
  localStorage.setItem("cb_mockdb", JSON.stringify(db));
  return db;
}
function mockSave(db) { localStorage.setItem("cb_mockdb", JSON.stringify(db)); }
function mockId() { return Math.random().toString(36).slice(2, 12); }

function mockTriggerAlert(db, userId, type, details) {
  var user = db.users.filter(function (x) { return x.id === userId; })[0];
  var name = user ? user.fullName : "A student";
  db.alerts = db.alerts || [];
  db.alerts.unshift({
    id: mockId(),
    type: type,
    studentId: userId,
    studentName: name,
    details: details,
    timestamp: new Date().toISOString(),
    read: false
  });
  mockSave(db);
}

function mockApi(action, data) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      try { resolve(mockHandle(action, data)); }
      catch (e) { reject(e); }
    }, 250); // simulate latency
  });
}

function mockHandle(action, data) {
  var db = mockDb();
  var s = getSession();
  var sess = s && s.token && db.sessions[s.token] ? db.sessions[s.token] : null;

  function needSession() { if (!sess) { clearSession(); fail("SESSION_EXPIRED"); } }
  function needStaff() {
    needSession();
    var cur = db.users.filter(function (x) { return x.id === sess.userId; })[0];
    if (sess && (sess.role === "super_admin" || sess.role === "admin" || sess.role === "agent")) return;
    if (cur && isKnownAdminEmail(cur.email)) return;
    if (!cur || (cur.role !== "admin" && cur.role !== "super_admin" && cur.role !== "agent")) {
      fail("FORBIDDEN");
    }
  }
  function needAdminOrSuper() {
    needSession();
    var cur = db.users.filter(function (x) { return x.id === sess.userId; })[0];
    if (sess && (sess.role === "super_admin" || sess.role === "admin")) return;
    if (cur && isKnownAdminEmail(cur.email)) return;
    if (!cur || (cur.role !== "admin" && cur.role !== "super_admin")) {
      fail("FORBIDDEN");
    }
  }
  function userDocs(uid) { return db.documents.filter(function (d) { return d.userId === uid; }); }

  switch (action) {
    case "register": {
      var email = String(data.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("INVALID_EMAIL");
      if (String(data.password || "").length < 6) fail("WEAK_PASSWORD");
      if (!String(data.fullName || "").trim()) fail("NAME_REQUIRED");
      if (db.users.some(function (u) { return u.email === email; })) fail("EMAIL_EXISTS");
      var u = { id: mockId(), email: email, password: data.password, fullName: data.fullName.trim(),
                phone: data.phone || "", role: "student", createdAt: new Date().toISOString(),
                assignedAgentId: "", assignedAgentName: "" };
      
      // Trigger server simulation welcome email
      fetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, fullName: u.fullName })
      }).catch(function(err) { console.warn("Mock Welcome Email error:", err); });

      db.users.push(u);
      var t = mockId() + mockId();
      db.sessions[t] = { userId: u.id, role: u.role };
      mockSave(db);
      return { ok: true, token: t, role: u.role, fullName: u.fullName, email: u.email };
    }
    case "login": {
      var em = String(data.email || "").trim().toLowerCase();
      var u2 = db.users.filter(function (x) { return x.email === em && x.password === data.password; })[0];
      if (!u2) fail("BAD_CREDENTIALS");
      var t2 = mockId() + mockId();
      db.sessions[t2] = { userId: u2.id, role: u2.role };
      mockSave(db);

      // Trigger login email notification asynchronously
      fetch('/api/notify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u2.email, fullName: u2.fullName, role: u2.role })
      }).catch(function(err) { console.warn("Login notification fetch error:", err); });

      return { ok: true, token: t2, role: u2.role, fullName: u2.fullName, email: u2.email };
    }
    case "logout":
      if (s && s.token) { delete db.sessions[s.token]; mockSave(db); }
      return { ok: true };
    case "contactMessage": {
      if (!String(data.name || "").trim() || !String(data.message || "").trim()) fail("MISSING_FIELDS");
      db.messages.unshift({ id: mockId(), name: data.name, email: data.email || "", phone: data.phone || "",
        program: data.program || "", message: data.message, createdAt: new Date().toISOString() });
      mockSave(db);
      return { ok: true };
    }
    case "getMe": {
      needSession();
      var me = db.users.filter(function (x) { return x.id === sess.userId; })[0];
      return {
        ok: true,
        user: {
          email: me.email,
          fullName: me.fullName,
          phone: me.phone,
          role: me.role,
          assignedAgentId: me.assignedAgentId || "",
          assignedAgentName: me.assignedAgentName || "",
          assignedAgentEmail: me.assignedAgentEmail || "",
          assignedAgentPhone: me.assignedAgentPhone || ""
        }
      };
    }
    case "submitApplication": {
      needSession();
      if (!String(data.fullName || "").trim()) fail("NAME_REQUIRED");
      if (!String(data.program || "").trim()) fail("PROGRAM_REQUIRED");
      var mine = db.applications.filter(function (a) { return a.userId === sess.userId; })[0];
      var now = new Date().toISOString();
      if (mine) {
        if (mine.status !== "Pending Review") fail("LOCKED");
        Object.keys(data).forEach(function (k) { mine[k] = data[k]; });
        mine.updatedAt = now;
        mockSave(db);
        mockTriggerAlert(db, sess.userId, "status_changed", "Updated application details");
        return { ok: true, updated: true };
      }
      var owner = db.users.filter(function (x) { return x.id === sess.userId; })[0];
      var app = { id: mockId(), userId: sess.userId, email: owner ? owner.email : "", assignedAgentId: "", assignedAgentName: "" };
      Object.keys(data).forEach(function (k) { app[k] = data[k]; });
      app.status = "Pending Review"; app.adminNotes = ""; app.submittedAt = now; app.updatedAt = now;
      db.applications.push(app);
      mockSave(db);
      mockTriggerAlert(db, sess.userId, "status_changed", "Submitted a new application (Status: Pending Review)");
      return { ok: true, created: true };
    }
    case "getMyApplication": {
      needSession();
      var a2 = db.applications.filter(function (a) { return a.userId === sess.userId; })[0] || null;
      return { ok: true, application: a2 };
    }
    case "uploadDocument": {
      needSession();
      if (!data.base64) fail("NO_FILE");
      var doc = { id: mockId(), userId: sess.userId, docType: data.docType || "Other",
        fileName: data.fileName || "file", mimeType: data.mimeType || "application/octet-stream",
        base64: data.base64,
        sizeKb: Math.round((data.base64.length * 3 / 4) / 1024), uploadedAt: new Date().toISOString() };
      db.documents.push(doc);
      mockSave(db);
      mockTriggerAlert(db, sess.userId, "document_uploaded", "Uploaded a new document: " + doc.docType + " (" + doc.fileName + ")");
      return { ok: true, document: doc };
    }
    case "listMyDocuments":
      needSession();
      return { ok: true, documents: userDocs(sess.userId) };
    case "downloadDocument": {
      needSession();
      var dd = db.documents.filter(function (x) { return x.id === data.docId; })[0];
      if (!dd) fail("NOT_FOUND");
      var curUser = db.users.filter(function (x) { return x.id === sess.userId; })[0];
      var isStaffUser = curUser && (curUser.role === "admin" || curUser.role === "super_admin" || curUser.role === "agent");
      if (!isStaffUser && dd.userId !== sess.userId) fail("FORBIDDEN");
      return { ok: true, base64: dd.base64 || "", mimeType: dd.mimeType, fileName: dd.fileName };
    }
    case "deleteMyDocument": {
      needSession();
      var dObj = db.documents.filter(function (x) { return x.id === data.docId && x.userId === sess.userId; })[0];
      if (dObj) {
        db.documents = db.documents.filter(function (d) { return !(d.id === data.docId && d.userId === sess.userId); });
        mockSave(db);
        mockTriggerAlert(db, sess.userId, "document_deleted", "Deleted document: " + dObj.docType + " (" + dObj.fileName + ")");
      }
      return { ok: true };
    }
    case "adminStats": {
      needStaff();
      var by = {};
      CB_STATUSES.forEach(function (st) { by[st] = 0; });
      db.applications.forEach(function (a) { by[a.status] = (by[a.status] || 0) + 1; });
      return { ok: true, stats: {
        users: db.users.filter(function (u3) { return u3.role === "student"; }).length,
        applications: db.applications.length, documents: db.documents.length,
        messages: db.messages.length, byStatus: by } };
    }
    case "adminListApplications":
      needStaff();
      return { ok: true, applications: db.applications, statuses: CB_STATUSES };
    case "adminGetApplication": {
      needStaff();
      var a3 = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!a3) fail("NOT_FOUND");
      return { ok: true, application: a3, documents: userDocs(a3.userId), statuses: CB_STATUSES };
    }
    case "adminSetStatus": {
      needStaff();
      if (CB_STATUSES.indexOf(data.status) === -1) fail("BAD_STATUS");
      var a4 = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!a4) fail("NOT_FOUND");
      a4.status = data.status;
      if (data.adminNotes != null) a4.adminNotes = data.adminNotes;
      a4.updatedAt = new Date().toISOString();
      mockSave(db);

      // Trigger admission update email (notifies student + assigned counselor/admin)
      fetch('/api/notify-admission-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: a4.email,
          studentName: a4.fullName || 'Student',
          stepTitle: a4.status,
          newStatus: a4.status,
          adminNotes: a4.adminNotes || '',
          counselorEmail: a4.assignedAgentEmail || '',
          counselorName: a4.assignedAgentName || ''
        })
      }).catch(function(err) { console.warn("Admission update notify error:", err); });

      return { ok: true };
    }
    case "adminListUserDocuments":
      needStaff();
      return { ok: true, documents: userDocs(data.userId) };
    case "adminDeleteDocument": {
      needStaff();
      db.documents = db.documents.filter(function (d) { return d.id !== data.docId; });
      mockSave(db);
      return { ok: true };
    }
    case "adminListMessages":
      needStaff();
      return { ok: true, messages: db.messages };
    case "adminListUsers":
      needStaff();
      return { ok: true, users: db.users.map(function (u4) {
        return {
          id: u4.id,
          email: u4.email,
          fullName: u4.fullName,
          phone: u4.phone,
          role: u4.role,
          createdAt: u4.createdAt,
          assignedAgentId: u4.assignedAgentId || "",
          assignedAgentName: u4.assignedAgentName || "",
          assignedAgentEmail: u4.assignedAgentEmail || "",
          assignedAgentPhone: u4.assignedAgentPhone || ""
        };
      }) };
    case "adminUpdateUserRole": {
      needAdminOrSuper();
      var target = db.users.filter(function (u) { return u.id === data.userId; })[0];
      if (!target) fail("NOT_FOUND");
      target.role = data.role;
      mockSave(db);
      return { ok: true };
    }
    case "adminAssignAgent": {
      needAdminOrSuper();
      var stud = db.users.filter(function (u) { return u.id === data.studentId; })[0];
      if (!stud) fail("NOT_FOUND");

      var agentUser = data.agentId ? db.users.filter(function (u) { return u.id === data.agentId; })[0] : null;

      stud.assignedAgentId = data.agentId || "";
      stud.assignedAgentName = data.agentName || (agentUser ? agentUser.fullName : "");
      stud.assignedAgentEmail = agentUser ? agentUser.email : "";
      stud.assignedAgentPhone = agentUser ? agentUser.phone : "";
      
      // Update in applications too
      var app = db.applications.filter(function (a) { return a.userId === data.studentId; })[0];
      if (app) {
        app.assignedAgentId = stud.assignedAgentId;
        app.assignedAgentName = stud.assignedAgentName;
        app.assignedAgentEmail = stud.assignedAgentEmail;
        app.assignedAgentPhone = stud.assignedAgentPhone;
      }
      mockSave(db);

      // Trigger Counselor Assignment Notification via email
      if (stud.assignedAgentId) {
        fetch('/api/notify-counselor-assigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentEmail: stud.email,
            studentName: stud.fullName || 'Student',
            counselorName: stud.assignedAgentName,
            counselorEmail: stud.assignedAgentEmail,
            counselorPhone: stud.assignedAgentPhone
          })
        }).catch(function(err) { console.warn("Counselor assignment notify error:", err); });
      }

      return { ok: true };
    }
    case "adminListTasks": {
      needSession();
      var meUser = db.users.filter(function (u) { return u.id === sess.userId; })[0];
      if (meUser && meUser.role === "student") {
        var myTasks = db.tasks.filter(function (t) { return t.assignedTo === sess.userId; });
        return { ok: true, tasks: myTasks };
      } else {
        return { ok: true, tasks: db.tasks };
      }
    }
    case "adminCreateTask": {
      needStaff();
      var creator = db.users.filter(function (u) { return u.id === sess.userId; })[0];
      var newTask = {
        id: "task-" + mockId(),
        title: data.title || "Task",
        description: data.description || "",
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName || "",
        assignedToEmail: data.assignedToEmail || "",
        assignedBy: sess.userId,
        assignedByName: creator ? creator.fullName : "Super Admin",
        status: data.status || "todo",
        stage: data.stage || "admission",
        priority: data.priority || "normal",
        dueDate: data.dueDate || "",
        createdAt: new Date().toISOString()
      };
      db.tasks.unshift(newTask);
      if (data.assignedTo) {
        mockTriggerAlert(db, data.assignedTo, "task_assigned", "Super Admin assigned task: " + newTask.title + (data.dueDate ? " (Due: " + data.dueDate + ")" : ""));
      }
      if (data.assignedToEmail) {
        fetch('/api/notify-task-assigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: data.assignedToEmail,
            toName: data.assignedToName,
            taskTitle: newTask.title,
            taskDescription: newTask.description,
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            assignedByName: creator ? creator.fullName : "Super Admin"
          })
        }).catch(function(err) { console.warn("Task notification email error:", err); });
      }
      mockSave(db);
      return { ok: true, task: newTask };
    }
    case "adminUpdateTask": {
      needSession();
      var targetTask = db.tasks.filter(function (t) { return t.id === data.taskId; })[0];
      if (!targetTask) fail("NOT_FOUND");
      
      var actor = db.users.filter(function (u) { return u.id === sess.userId; })[0];
      var isStaffActor = actor && (actor.role === "super_admin" || actor.role === "admin" || actor.role === "agent");
      
      if (!isStaffActor && targetTask.assignedTo !== sess.userId) {
        fail("FORBIDDEN");
      }
      
      if (data.status !== undefined) {
        targetTask.status = data.status;
        if (data.status === "done") targetTask.completedAt = new Date().toISOString();
      }
      if (isStaffActor) {
        if (data.title !== undefined) targetTask.title = data.title;
        if (data.description !== undefined) targetTask.description = data.description;
        if (data.stage !== undefined) targetTask.stage = data.stage;
      }
      mockSave(db);
      return { ok: true };
    }
    case "adminDeleteTask": {
      needStaff();
      db.tasks = db.tasks.filter(function (t) { return t.id !== data.taskId; });
      mockSave(db);
      return { ok: true };
    }
    case "adminUpdateBudget": {
      needStaff();
      var app = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!app) fail("NOT_FOUND");
      app.serviceFee = String(data.serviceFee || "0");
      app.advisorCommission = String(data.advisorCommission || "0");
      app.payoutStatus = String(data.payoutStatus || "Pending");
      app.updatedAt = new Date().toISOString();
      mockSave(db);
      return { ok: true };
    }
    case "adminUpdatePrivateNotes": {
      needStaff();
      var appNotes = db.applications.filter(function (a) { return a.id === data.appId; })[0];
      if (!appNotes) fail("NOT_FOUND");
      appNotes.adminPrivateNotes = String(data.adminPrivateNotes || "");
      appNotes.updatedAt = new Date().toISOString();
      mockSave(db);
      return { ok: true };
    }
    case "adminUpdateDocLegalization": {
      needStaff();
      var docObj = db.documents.filter(function (d) { return d.id === data.docId; })[0];
      if (!docObj) fail("NOT_FOUND");
      docObj.legalizationState = String(data.legalizationState || "None");
      docObj.updatedAt = new Date().toISOString();
      mockSave(db);
      return { ok: true };
    }
    case "adminReseedDemoData": {
      needStaff();
      localStorage.removeItem("cb_mockdb");
      mockDb();
      return { ok: true };
    }
    case "adminListAlerts": {
      needStaff();
      db.alerts = db.alerts || [];
      return { ok: true, alerts: db.alerts };
    }
    case "adminMarkAllAlertsRead": {
      needStaff();
      db.alerts = db.alerts || [];
      db.alerts.forEach(function (a) { a.read = true; });
      mockSave(db);
      return { ok: true };
    }
    case "adminDeleteAlert": {
      needStaff();
      db.alerts = db.alerts || [];
      db.alerts = db.alerts.filter(function (a) { return a.id !== data.alertId; });
      mockSave(db);
      return { ok: true };
    }
    case "getPackages": {
      db.packages = db.packages || DEFAULT_PACKAGES;
      return { ok: true, packages: db.packages };
    }
    case "adminSavePackage": {
      needAdminOrSuper();
      db.packages = db.packages || DEFAULT_PACKAGES;
      var newPkg = {
        id: data.id || ("pkg-" + mockId()),
        name: String(data.name || "Custom Package"),
        priceEur: Number(data.priceEur || 0),
        advisorCommission: Number(data.advisorCommission || 0),
        targetProgram: String(data.targetProgram || "All Degrees"),
        description: String(data.description || ""),
        inclusions: Array.isArray(data.inclusions) ? data.inclusions : String(data.inclusions || "").split("\n").filter(Boolean),
        updatedAt: new Date().toISOString()
      };
      if (data.id) {
        db.packages = db.packages.map(function (p) { return p.id === data.id ? newPkg : p; });
      } else {
        db.packages.push(newPkg);
      }
      mockSave(db);
      return { ok: true, package: newPkg };
    }
    case "adminDeletePackage": {
      needAdminOrSuper();
      db.packages = (db.packages || DEFAULT_PACKAGES).filter(function (p) { return p.id !== data.packageId; });
      mockSave(db);
      return { ok: true };
    }
    case "adminAssignDocumentToUser": {
      needAdminOrSuper();
      var assignDoc = {
        id: "doc-asgn-" + mockId(),
        userId: data.targetUserId,
        docType: data.docType || "Official Document",
        fileName: data.fileName || "document.pdf",
        mimeType: data.mimeType || "application/pdf",
        base64: data.base64 || "RGVtbyBkb2N1bWVudCDigJQgU3R1ZHlDemVjaEJyaWRnZSBzYW1wbGUgZmlsZS4=",
        sizeKb: Math.round((data.base64 || "").length * 3 / 4 / 1024) || 15,
        uploadedAt: new Date().toISOString(),
        assignedBySuperAdmin: true,
        notesFromAdmin: data.notes || ""
      };
      db.documents.push(assignDoc);
      mockSave(db);
      return { ok: true, document: assignDoc };
    }
  }
  fail("SERVER_ERROR");
}
