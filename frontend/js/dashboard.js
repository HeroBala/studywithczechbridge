/* Student dashboard: application status tracker + document manager. */

(function () {
  var sess = requireLogin();
  if (!sess) return;

  var TRACK_STEPS = [
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
    "Accepted"
  ];

  var BADGE_CLASS = {
    "Pending Review": "st-pending",
    "Under Review": "st-review",
    "Document Requested": "st-docs",
    "Document Received": "st-received",
    "Document Evaluated": "st-evaluated",
    "Legalization": "st-legal",
    "Super Legalization": "st-super",
    "Nostrification": "st-nostrif",
    "University Selected": "st-univ-sel",
    "Program Selected": "st-prog-sel",
    "Applied to Universities": "st-applied",
    "Waiting for Entrance Exam": "st-waiting-exam",
    "Conditional Admission Letter Received": "st-conditional",
    "Tuition Fees Paid": "st-fees-paid",
    "Main Offer Letter Received": "st-offer",
    "Prepared Documents for Visa": "st-visa-docs",
    "Appointment Scheduled": "st-appt",
    "Interview Preparation": "st-interview",
    "Visa Processing": "st-visa",
    "Accepted": "st-approved",
    "Rejected": "st-rejected",
    "Dropped": "st-dropped"
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("hello").textContent =
      "Welcome, " + (sess.fullName || "Student") + " 👋";
    loadApplication();
    loadDocuments();
    loadTasks();
    wireUpload();
  });

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------- Checklist & Steps ---------- */

  function loadTasks() {
    TaskBoardComponent.init("role-taskboard-container", sess);
  }

  /* ---------- Application ---------- */

  function loadApplication() {
    api("getMe").then(function (meRes) {
      var user = meRes.user || {};
      renderCounselorCard(user);
    }).catch(function (err) { console.warn("getMe error:", err); });

    api("getMyApplication").then(function (res) {
      document.getElementById("app-loading").classList.add("hidden");
      if (!res.application) {
        document.getElementById("app-none").classList.remove("hidden");
        render20StepsGrid("Pending Review", null);
        return;
      }
      var a = res.application;
      document.getElementById("app-view").classList.remove("hidden");

      var badge = document.getElementById("app-status");
      badge.textContent = a.status;
      badge.className = "badge " + (BADGE_CLASS[a.status] || "st-pending");

      renderTracker(a.status);
      render20StepsGrid(a.status, a);
      renderCounselorCard(a);

      if (a.adminNotes) {
        var note = document.getElementById("admin-note-box");
        note.style.display = "block";
        note.textContent = "📌 Note from our team: " + a.adminNotes;
      }

      document.getElementById("v-program").textContent = a.program || "—";
      document.getElementById("v-level").textContent = a.level || "—";
      document.getElementById("v-intake").textContent = a.intake || "—";
      document.getElementById("v-submitted").textContent = fmtDate(a.submittedAt);
      document.getElementById("v-updated").textContent = fmtDate(a.updatedAt);

      if (a.status === "Pending Review") {
        document.getElementById("edit-wrap").style.display = "block";
      }
    }).catch(function (err) {
      showNotice("dash-notice", "error", err.message);
    });
  }

  function renderCounselorCard(dataObj) {
    var nameEl = document.getElementById("counselor-name");
    var descEl = document.getElementById("counselor-desc");
    var emailBtn = document.getElementById("counselor-email-btn");
    var emailTxt = document.getElementById("counselor-email-text");

    if (!nameEl) return;

    var cName = dataObj ? (dataObj.assignedAgentName || dataObj.assignedAgentId) : "";
    var cEmail = dataObj ? dataObj.assignedAgentEmail : "";

    if (cName) {
      nameEl.textContent = cName + " (Brno Admissions Counselor)";
      descEl.textContent = "Your counselor oversees your document translation, university submission, nostrification, and Czech visa appointment.";
      if (emailBtn) {
        emailBtn.href = "mailto:" + (cEmail || "info@studywithczechbridge.com");
        emailBtn.textContent = "✉️ Message " + cName;
      }
      if (emailTxt) emailTxt.textContent = cEmail || "info@studywithczechbridge.com";
    } else {
      nameEl.textContent = "StudyCzechBridge Senior Admissions Counselor (Brno HQ)";
      descEl.textContent = "Your application is under initial review. A dedicated counselor in Brno will be assigned shortly.";
      if (emailBtn) {
        emailBtn.href = "mailto:info@studywithczechbridge.com";
        emailBtn.textContent = "✉️ Contact Admissions Desk";
      }
      if (emailTxt) emailTxt.textContent = "info@studywithczechbridge.com";
    }
  }

  function render20StepsGrid(currentStatus, appObj) {
    var grid = document.getElementById("student-20-steps-grid");
    if (!grid) return;

    var steps = typeof ADMISSION_20_STEPS !== "undefined" ? ADMISSION_20_STEPS : [];
    if (!steps.length) return;

    // Map current overall application status to approximate step index
    var statusStepMap = {
      "Pending Review": 1,
      "Under Review": 2,
      "Document Requested": 3,
      "Document Received": 4,
      "Document Evaluated": 7,
      "Legalization": 5,
      "Super Legalization": 6,
      "Nostrification": 9,
      "University Selected": 2,
      "Program Selected": 2,
      "Applied to Universities": 8,
      "Waiting for Entrance Exam": 11,
      "Conditional Admission Letter Received": 13,
      "Tuition Fees Paid": 14,
      "Main Offer Letter Received": 15,
      "Prepared Documents for Visa": 16,
      "Appointment Scheduled": 17,
      "Interview Preparation": 18,
      "Visa Processing": 18,
      "Accepted": 20
    };

    var currentStepNum = statusStepMap[currentStatus] || 1;
    var customStepData = appObj && appObj.stepCustomData ? appObj.stepCustomData : {};

    grid.innerHTML = "";
    steps.forEach(function (sObj) {
      var sNum = sObj.step;
      var custom = customStepData[sNum] || {};
      
      var isCompleted = sNum < currentStepNum || custom.status === "Done";
      var isCurrent = sNum === currentStepNum || custom.status === "In Progress";
      var isActionReq = custom.status === "Action Required";
      
      var badgeText = custom.status ? custom.status : (isCompleted ? "Completed" : (isCurrent ? "In Progress" : "Pending"));
      var badgeBg = isCompleted ? "#1e8e5a" : (isActionReq ? "#dc2626" : (isCurrent ? "#14315e" : "#e2e8f0"));
      var badgeColor = isCompleted || isCurrent || isActionReq ? "#ffffff" : "#475569";

      var card = document.createElement("div");
      card.style.cssText = "background:#ffffff; border:1px solid " + (isCurrent ? "var(--blue-700)" : "var(--line)") +
        "; border-radius:8px; padding:0.85rem; display:flex; flex-direction:column; justify-content:space-between;" +
        (isCurrent ? "box-shadow: 0 4px 12px rgba(20,49,94,0.12);" : "");

      card.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem;">' +
          '<span style="font-size:0.75rem; font-weight:800; color:var(--blue-800); background:#f0f7ff; padding:2px 8px; border-radius:12px;">Step ' + sNum + '/20</span>' +
          '<span style="font-size:0.75rem; font-weight:700; background:' + badgeBg + '; color:' + badgeColor + '; padding:2px 8px; border-radius:12px;">' + badgeText + '</span>' +
        '</div>' +
        '<div style="font-weight:700; font-size:0.92rem; color:var(--blue-900); margin-bottom:0.25rem;">' + escapeHtml(sObj.title) + '</div>' +
        '<div style="font-size:0.8rem; color:var(--muted); line-height:1.35; margin-bottom:0.5rem;">' + escapeHtml(sObj.desc) + '</div>' +
        (custom.notes ? '<div style="margin-top:auto; background:#fffbeb; border-left:3px solid #f59e0b; padding:0.4rem; border-radius:4px; font-size:0.78rem; color:#92400e;"><strong>Brno Advisor Note:</strong> ' + escapeHtml(custom.notes) + '</div>' : '');

      grid.appendChild(card);
    });
  }

  function renderTracker(status) {
    var wrap = document.getElementById("tracker");
    wrap.innerHTML = "";
    var idx = TRACK_STEPS.indexOf(status);
    var isTerminalFailure = status === "Rejected" || status === "Dropped";
    var activeEl = null;
    TRACK_STEPS.forEach(function (label, i) {
      var el = document.createElement("div");
      el.className = "t-step" +
        (isTerminalFailure ? (i === 0 ? " rejected" : "") :
          i < idx ? " done" : i === idx ? " current" : "");
      el.textContent = label;
      wrap.appendChild(el);
      if (!isTerminalFailure && i === idx) {
        activeEl = el;
      }
    });
    if (isTerminalFailure) {
      var el = document.createElement("div");
      el.className = "t-step current rejected";
      el.textContent = status;
      wrap.appendChild(el);
      activeEl = el;
    }

    // Auto-scroll the active element into view horizontally within the scrollable tracker
    if (activeEl) {
      setTimeout(function () {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 300);
    }
  }

  /* ---------- Documents ---------- */

  function loadDocuments() {
    api("listMyDocuments").then(function (res) {
      renderDocs(res.documents || []);
    }).catch(function (err) {
      document.getElementById("doc-list").innerHTML =
        '<li class="muted">Could not load documents: ' + err.message + "</li>";
    });
  }

  function renderDocs(docs) {
    var list = document.getElementById("doc-list");
    if (!docs.length) {
      list.innerHTML = '<li class="muted">No documents uploaded yet.</li>';
      return;
    }
    list.innerHTML = "";
    docs.forEach(function (d) {
      var li = document.createElement("li");
      var left = document.createElement("div");
      left.innerHTML = "<strong>" + escapeHtml(d.docType) + "</strong> — " + escapeHtml(d.fileName) +
        '<div class="doc-meta">' + (d.sizeKb || "?") + " KB · uploaded " + fmtDate(d.uploadedAt) + "</div>";
      var actions = document.createElement("div");
      actions.className = "doc-actions";
      var view = document.createElement("button");
      view.className = "btn btn-outline btn-sm";
      view.textContent = "View";
      view.addEventListener("click", function () {
        view.disabled = true;
        view.textContent = "Loading...";
        cbOpenDocument(d.id).catch(function (err) { alert(err.message); }).finally(function () {
          view.disabled = false;
          view.textContent = "View";
        });
      });
      actions.appendChild(view);
      var del = document.createElement("button");
      del.className = "btn btn-danger btn-sm";
      del.textContent = "Delete";
      del.addEventListener("click", function () {
        if (!confirm("Delete " + d.fileName + "?")) return;
        del.disabled = true;
        api("deleteMyDocument", { docId: d.id }).then(loadDocuments).catch(function (err) {
          alert(err.message);
          del.disabled = false;
        });
      });
      actions.appendChild(del);
      li.appendChild(left);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function wireUpload() {
    var fileInput = document.getElementById("doc-file");
    var dz = document.getElementById("dropzone");

    dz.addEventListener("click", function () { fileInput.click(); });
    dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("drag"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("drag"); });
    dz.addEventListener("drop", function (e) {
      e.preventDefault();
      dz.classList.remove("drag");
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        showPicked();
      }
    });
    fileInput.addEventListener("change", showPicked);

    function showPicked() {
      var f = fileInput.files[0];
      if (f) dz.querySelector("strong").textContent = "Selected: " + f.name;
    }

    document.getElementById("upload-btn").addEventListener("click", function () {
      var f = fileInput.files[0];
      var state = document.getElementById("upload-state");
      if (!f) { state.textContent = "Please choose a file first."; return; }
      if (f.size > 10 * 1024 * 1024) { state.textContent = "File is over 10 MB — please compress it."; return; }

      var btn = this;
      btn.disabled = true;
      state.textContent = "Uploading " + f.name + "... (this can take a moment)";

      var reader = new FileReader();
      reader.onload = function () {
        var base64 = String(reader.result).split(",")[1];
        api("uploadDocument", {
          docType: document.getElementById("doc-type").value,
          fileName: f.name,
          mimeType: f.type || "application/octet-stream",
          base64: base64
        }).then(function () {
          state.textContent = "✅ Uploaded successfully.";
          fileInput.value = "";
          dz.querySelector("strong").textContent = "Click to choose a file";
          loadDocuments();
        }).catch(function (err) {
          state.textContent = "❌ " + err.message;
        }).finally(function () {
          btn.disabled = false;
        });
      };
      reader.onerror = function () {
        state.textContent = "Could not read the file.";
        btn.disabled = false;
      };
      reader.readAsDataURL(f);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  window.cbEscapeHtml = escapeHtml;
})();
