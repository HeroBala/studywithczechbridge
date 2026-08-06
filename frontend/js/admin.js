/* Admin panel: stats, application list with search/filter,
   detail modal with status control + document management, messages,
   two-stage Task Board, and User/Agent assignment panels. */

(function () {
  var sess = requireAdmin();
  if (!sess) return;

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

  var DETAIL_FIELDS = [
    ["email", "Email"], ["phone", "Phone"], ["dob", "Date of Birth"], ["gender", "Gender"],
    ["nationality", "Nationality"], ["passportNo", "Passport No."], ["address", "Address"],
    ["city", "City"], ["guardianName", "Guardian"], ["guardianPhone", "Guardian Phone"],
    ["sscResult", "SSC Result"], ["sscYear", "SSC Year"], ["hscResult", "HSC Result"],
    ["hscYear", "HSC Year"], ["bachelor", "Bachelor"], ["bachelorCgpa", "Bachelor CGPA"],
    ["englishTest", "English Test"], ["englishScore", "English Score"],
    ["program", "Program"], ["level", "Level"], ["intake", "Intake"], ["notes", "Student Notes"],
    ["submittedAt", "Submitted"], ["updatedAt", "Last Update"]
  ];

  var allApps = [];
  var statuses = [];
  var currentApp = null;
  
  // New role-based variables
  var allUsers = [];
  var allTasks = [];
  var activeTab = "applications";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Render current role in subtitle
    var roleLabel = sess.role === "super_admin" ? "Super Admin" : (sess.role === "agent" ? "Brno Agent" : "Admin");
    var roleDisplayEl = document.getElementById("admin-role-display");
    if (roleDisplayEl) {
      roleDisplayEl.textContent = roleLabel;
      // Style appropriately
      roleDisplayEl.className = "badge-role " + sess.role;
    }

    // Enforce role-based access to the Users tab
    var isFullAdmin = sess.role === "super_admin" || sess.role === "admin";
    var tabUsersBtn = document.getElementById("tab-users-btn");
    if (tabUsersBtn && !isFullAdmin) {
      tabUsersBtn.style.display = "none";
    }

    // Set up click handlers on Tab buttons
    var tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var targetTab = this.getAttribute("data-tab");
        switchTab(targetTab);
      });
    });

    loadAll();
    initAlerts();

    document.getElementById("refresh-btn").addEventListener("click", loadAll);
    document.getElementById("f-search").addEventListener("input", renderApps);
    document.getElementById("f-status").addEventListener("change", renderApps);
    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("modal-back").addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });
    document.getElementById("m-save").addEventListener("click", saveStatus);

    var headerAddTaskBtn = document.getElementById("header-add-task-btn");
    if (headerAddTaskBtn) {
      headerAddTaskBtn.addEventListener("click", function () {
        switchTab("taskboard");
        if (typeof TaskBoardComponent !== "undefined" && TaskBoardComponent.assignTaskToUser) {
          TaskBoardComponent.assignTaskToUser("");
        }
      });
    }

    var adminAddTaskBtn = document.getElementById("btn-admin-add-task");
    if (adminAddTaskBtn) {
      adminAddTaskBtn.addEventListener("click", function () {
        switchTab("taskboard");
        if (typeof TaskBoardComponent !== "undefined" && TaskBoardComponent.assignTaskToUser) {
          TaskBoardComponent.assignTaskToUser("");
        }
      });
    }

    var docsAddTaskBtn = document.getElementById("btn-docs-add-task");
    if (docsAddTaskBtn) {
      docsAddTaskBtn.addEventListener("click", function () {
        switchTab("taskboard");
        if (typeof TaskBoardComponent !== "undefined" && TaskBoardComponent.assignTaskToUser) {
          TaskBoardComponent.assignTaskToUser("");
        }
      });
    }

    var modalAssignTaskBtn = document.getElementById("m-assign-task");
    if (modalAssignTaskBtn) {
      modalAssignTaskBtn.addEventListener("click", function () {
        if (!currentApp) return;
        closeModal();
        switchTab("taskboard");
        if (typeof TaskBoardComponent !== "undefined" && TaskBoardComponent.assignTaskToUser) {
          TaskBoardComponent.assignTaskToUser(currentApp.userId || currentApp.id);
        }
      });
    }

    var userDocsClose = document.getElementById("user-docs-close");
    if (userDocsClose) {
      userDocsClose.addEventListener("click", function () {
        document.getElementById("user-docs-modal").classList.remove("show");
      });
    }

    var refreshDocsBtn = document.getElementById("btn-refresh-all-docs");
    if (refreshDocsBtn) {
      refreshDocsBtn.addEventListener("click", loadAllDocumentsRepository);
    }
  });

  function switchTab(tabName) {
    activeTab = tabName;
    
    // Deactivate all tab headers
    var tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(function (t) { t.classList.remove("active"); });

    // Activate selected tab header
    var activeBtn = document.querySelector('.admin-tab[data-tab="' + tabName + '"]');
    if (activeBtn) activeBtn.classList.add("active");

    // Hide all panel sections
    var panels = document.querySelectorAll(".admin-tab-panel");
    panels.forEach(function (p) { p.classList.add("hidden"); });

    // Show active panel
    var activePanel = document.getElementById("panel-" + tabName);
    if (activePanel) activePanel.classList.remove("hidden");

    // Context-specific loads
    if (tabName === "taskboard") {
      loadTasks();
    } else if (tabName === "users") {
      loadUsers();
    } else if (tabName === "ops") {
      loadOpsPanel();
    } else if (tabName === "journey") {
      initJourneyTab();
    } else if (tabName === "email") {
      initEmailTab();
    } else if (tabName === "extract") {
      initExtractTab();
    } else if (tabName === "counselor") {
      initCounselorTab();
    } else if (tabName === "packages") {
      initPackagesTab();
    } else if (tabName === "superdocs") {
      initSuperDocsTab();
    }
  }

  /* ============================================================
     1. 20-Step Journey Management
     ============================================================ */
  function initJourneyTab() {
    var select = document.getElementById("journey-student-select");
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose a student application --</option>';
    allApps.forEach(function (app) {
      var opt = document.createElement("option");
      opt.value = app.id;
      opt.textContent = (app.fullName || app.email) + " (" + (app.program || "No program") + " — " + app.status + ")";
      select.appendChild(opt);
    });

    select.removeEventListener("change", onJourneyStudentChange);
    select.addEventListener("change", onJourneyStudentChange);

    var saveBtn = document.getElementById("btn-save-all-steps");
    if (saveBtn) {
      saveBtn.removeEventListener("click", saveJourneySteps);
      saveBtn.addEventListener("click", saveJourneySteps);
    }
  }

  var selectedJourneyApp = null;

  function onJourneyStudentChange() {
    var appId = document.getElementById("journey-student-select").value;
    var infoBox = document.getElementById("journey-student-info");
    var grid = document.getElementById("journey-steps-container");

    if (!appId) {
      infoBox.style.display = "none";
      grid.innerHTML = '<div class="muted center py-4" style="grid-column: 1 / -1;">Select a student from the dropdown above to view and update their 20 admission steps.</div>';
      selectedJourneyApp = null;
      return;
    }

    selectedJourneyApp = allApps.filter(function (a) { return a.id === appId; })[0];
    if (!selectedJourneyApp) return;

    infoBox.style.display = "block";
    document.getElementById("j-student-name").textContent = selectedJourneyApp.fullName || "Student";
    document.getElementById("j-student-email").textContent = "(" + selectedJourneyApp.email + ")";
    document.getElementById("j-student-prog").textContent = selectedJourneyApp.program || "Not selected";
    var stBadge = document.getElementById("j-student-status");
    stBadge.textContent = selectedJourneyApp.status;
    stBadge.className = "badge " + (BADGE_CLASS[selectedJourneyApp.status] || "st-pending");

    renderJourneyStepsGrid(selectedJourneyApp);
  }

  function renderJourneyStepsGrid(appObj) {
    var grid = document.getElementById("journey-steps-container");
    if (!grid) return;

    var steps = typeof ADMISSION_20_STEPS !== "undefined" ? ADMISSION_20_STEPS : [];
    var custom = appObj.stepCustomData || {};

    grid.innerHTML = "";
    steps.forEach(function (s) {
      var sData = custom[s.step] || {};
      var curStatus = sData.status || "Pending";
      var notesVal = sData.notes || "";

      var card = document.createElement("div");
      card.className = "panel";
      card.style.margin = "0";
      card.style.padding = "1rem";
      card.style.border = "1px solid var(--line)";
      card.style.borderRadius = "8px";

      card.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">' +
          '<strong style="color:var(--blue-900); font-size:0.85rem; background:#f0f7ff; padding:2px 8px; border-radius:12px;">Step ' + s.step + '/20</strong>' +
          '<span class="muted" style="font-size:0.75rem;">' + esc(s.category) + '</span>' +
        '</div>' +
        '<div style="font-weight:700; font-size:0.95rem; color:var(--blue-900); margin-bottom:0.3rem;">' + esc(s.title) + '</div>' +
        '<p style="font-size:0.8rem; color:var(--muted); margin-bottom:0.8rem; line-height:1.35;">' + esc(s.desc) + '</p>' +
        '<div class="field mb-2">' +
          '<label style="font-size:0.78rem; font-weight:700;">Status</label>' +
          '<select class="j-step-status" data-step="' + s.step + '" style="width:100%; padding:0.35rem; border-radius:6px; font-size:0.85rem;">' +
            '<option value="Pending" ' + (curStatus === "Pending" ? "selected" : "") + '>⏳ Pending</option>' +
            '<option value="In Progress" ' + (curStatus === "In Progress" ? "selected" : "") + '>🔄 In Progress</option>' +
            '<option value="Action Required" ' + (curStatus === "Action Required" ? "selected" : "") + '>⚠️ Action Required (Doc Requested)</option>' +
            '<option value="Done" ' + (curStatus === "Done" ? "selected" : "") + '>✅ Done &amp; Verified</option>' +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label style="font-size:0.78rem; font-weight:700;">Counselor Note for Student</label>' +
          '<input type="text" class="j-step-notes" data-step="' + s.step + '" value="' + esc(notesVal) + '" placeholder="e.g. Sworn translation ready..." style="width:100%; padding:0.35rem; border-radius:6px; font-size:0.82rem; border:1px solid var(--line);">' +
        '</div>';

      grid.appendChild(card);
    });
  }

  function saveJourneySteps() {
    if (!selectedJourneyApp) return;

    var saveBtn = document.getElementById("btn-save-all-steps");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving & Notifying...";

    var stepCustomData = {};
    var statusSelects = document.querySelectorAll(".j-step-status");
    var noteInputs = document.querySelectorAll(".j-step-notes");

    statusSelects.forEach(function (sel) {
      var stepNum = sel.getAttribute("data-step");
      stepCustomData[stepNum] = stepCustomData[stepNum] || {};
      stepCustomData[stepNum].status = sel.value;
    });

    noteInputs.forEach(function (inp) {
      var stepNum = inp.getAttribute("data-step");
      stepCustomData[stepNum] = stepCustomData[stepNum] || {};
      stepCustomData[stepNum].notes = inp.value;
    });

    selectedJourneyApp.stepCustomData = stepCustomData;

    // Trigger email update notification to student
    fetch('/api/notify-admission-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail: selectedJourneyApp.email,
        studentName: selectedJourneyApp.fullName || 'Student',
        stepTitle: '20-Step Admission Journey Updated',
        newStatus: 'Milestones Updated',
        adminNotes: 'Your 20-step European admission roadmap has been updated by your advisor.'
      })
    }).catch(function(e) { console.warn("Journey notify email error:", e); });

    setTimeout(function () {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save Step Updates & Notify Student";
      alert("✅ 20-Step Admission Journey updated successfully and notification email dispatched to " + selectedJourneyApp.email);
    }, 400);
  }

  /* ============================================================
     2. Private Email & SMTP Settings
     ============================================================ */
  function initEmailTab() {
    fetch('/api/email-config')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) return;
        var cfg = data.config || {};
        document.getElementById("smtp-host").value = cfg.host || "";
        document.getElementById("smtp-port").value = cfg.port || 587;
        document.getElementById("smtp-secure").checked = !!cfg.secure;
        document.getElementById("smtp-user").value = cfg.user || "";
        document.getElementById("smtp-pass").value = cfg.pass || "";
        document.getElementById("smtp-from-name").value = cfg.fromName || "StudyCzechBridge Admissions";
        document.getElementById("smtp-from-email").value = cfg.fromEmail || "info@studywithczechbridge.com";
        document.getElementById("smtp-admin-email").value = cfg.adminEmail || "1997herobala@gmail.com";

        document.getElementById("notify-login").checked = cfg.notifyOnLogin !== false;
        document.getElementById("notify-admission").checked = cfg.notifyOnAdmissionUpdate !== false;
        document.getElementById("notify-doc").checked = cfg.notifyOnDocumentUpload !== false;

        renderEmailLogs(data.logs || []);
      })
      .catch(function (err) { console.warn("Load SMTP config error:", err); });

    var form = document.getElementById("form-smtp-config");
    if (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        var saveBtn = document.getElementById("btn-save-smtp");
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        var body = {
          host: document.getElementById("smtp-host").value,
          port: document.getElementById("smtp-port").value,
          secure: document.getElementById("smtp-secure").checked,
          user: document.getElementById("smtp-user").value,
          pass: document.getElementById("smtp-pass").value,
          fromName: document.getElementById("smtp-from-name").value,
          fromEmail: document.getElementById("smtp-from-email").value,
          adminEmail: document.getElementById("smtp-admin-email").value,
          notifyOnLogin: document.getElementById("notify-login").checked,
          notifyOnAdmissionUpdate: document.getElementById("notify-admission").checked,
          notifyOnDocumentUpload: document.getElementById("notify-doc").checked
        };

        fetch('/api/email-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          saveBtn.disabled = false;
          saveBtn.textContent = "💾 Save Email Configuration";
          if (res.ok) alert("✅ Private SMTP settings saved successfully!");
        })
        .catch(function (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = "💾 Save Email Configuration";
          alert("Error saving SMTP settings: " + err.message);
        });
      };
    }

    var testBtn = document.getElementById("btn-test-smtp");
    if (testBtn) {
      testBtn.onclick = function () {
        var recipient = prompt("Enter email address to send test email to:", document.getElementById("smtp-admin-email").value || "1997herobala@gmail.com");
        if (!recipient) return;

        testBtn.disabled = true;
        testBtn.textContent = "Sending Test...";

        fetch('/api/test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: recipient })
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          testBtn.disabled = false;
          testBtn.textContent = "🧪 Send Test Email";
          if (res.ok) {
            alert("✅ Test email dispatched!\nStatus: " + (res.result ? res.result.statusMessage : 'Success'));
            initEmailTab(); // refresh logs
          }
        })
        .catch(function (err) {
          testBtn.disabled = false;
          testBtn.textContent = "🧪 Send Test Email";
          alert("Test email error: " + err.message);
        });
      };
    }
  }

  function renderEmailLogs(logs) {
    var container = document.getElementById("email-log-list");
    if (!container) return;

    if (!logs.length) {
      container.innerHTML = '<div class="muted center py-2">No email activity logged yet.</div>';
      return;
    }

    var html = logs.map(function (log) {
      var dateStr = fmtDate(log.timestamp) + " " + new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return (
        '<div style="padding: 0.4rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start;">' +
          '<div>' +
            '<strong>' + esc(log.subject) + '</strong>' +
            '<div class="muted" style="font-size: 0.75rem;">To: ' + esc(log.to) + ' | Status: ' + esc(log.statusMessage) + '</div>' +
          '</div>' +
          '<div style="font-size: 0.7rem; color: #888; text-align: right;">' + dateStr + '</div>' +
        '</div>'
      );
    }).join("");

    container.innerHTML = html;
  }

  /* ============================================================
     3. Super Admin Data Extraction Center
     ============================================================ */
  function initExtractTab() {
    var btns = document.querySelectorAll(".btn-export");
    btns.forEach(function (btn) {
      btn.onclick = function () {
        var dataType = this.getAttribute("data-type");
        var format = this.getAttribute("data-format");
        exportData(dataType, format);
      };
    });
  }

  function exportData(dataType, format) {
    var filename = "study_czech_bridge_" + dataType + "_" + new Date().toISOString().slice(0, 10);
    var exportPayload = [];

    if (dataType === "users") {
      exportPayload = allUsers.map(function (u) {
        return {
          ID: u.id,
          FullName: u.fullName,
          Email: u.email,
          Role: u.role,
          Phone: u.phone || "",
          AssignedAgent: u.assignedAgentName || "None",
          CreatedAt: u.createdAt
        };
      });
    } else if (dataType === "matrix") {
      var steps = typeof ADMISSION_20_STEPS !== "undefined" ? ADMISSION_20_STEPS : [];
      exportPayload = allApps.map(function (app) {
        var row = {
          StudentName: app.fullName,
          Email: app.email,
          Program: app.program || "",
          OverallStatus: app.status
        };
        steps.forEach(function (s) {
          var sData = app.stepCustomData && app.stepCustomData[s.step] ? app.stepCustomData[s.step] : {};
          row["Step_" + s.step + "_" + s.id] = sData.status || "Pending";
        });
        return row;
      });
    } else if (dataType === "docs") {
      api("adminListUserDocuments", { userId: "" }).then(function (res) {
        var docs = res.documents || [];
        var docExport = docs.map(function (d) {
          return {
            DocID: d.id,
            UserID: d.userId,
            DocType: d.docType,
            FileName: d.fileName,
            SizeKB: d.sizeKb,
            UploadedAt: d.uploadedAt,
            LegalizationState: d.legalizationState || "None"
          };
        });
        triggerDownload(docExport, filename, format);
      }).catch(function (err) {
        alert("Error exporting docs: " + err.message);
      });
      return;
    } else if (dataType === "financials") {
      exportPayload = allApps.map(function (app) {
        return {
          StudentName: app.fullName,
          Email: app.email,
          Program: app.program || "",
          ContractServiceFeeEUR: app.serviceFee || "0",
          AdvisorCommissionEUR: app.advisorCommission || "0",
          PayoutStatus: app.payoutStatus || "Pending",
          LastUpdated: app.updatedAt
        };
      });
    }

    triggerDownload(exportPayload, filename, format);
  }

  function triggerDownload(dataArray, filename, format) {
    if (!dataArray || !dataArray.length) {
      alert("No records found to export.");
      return;
    }

    var content = "";
    var mimeType = "";

    if (format === "json") {
      content = JSON.stringify(dataArray, null, 2);
      mimeType = "application/json";
      filename += ".json";
    } else {
      // CSV format
      var headers = Object.keys(dataArray[0]);
      var csvRows = [headers.join(",")];

      dataArray.forEach(function (row) {
        var values = headers.map(function (h) {
          var val = row[h] == null ? "" : String(row[h]);
          val = val.replace(/"/g, '""');
          if (val.search(/("|,|\n)/g) >= 0) val = '"' + val + '"';
          return val;
        });
        csvRows.push(values.join(","));
      });

      content = csvRows.join("\n");
      mimeType = "text/csv;charset=utf-8;";
      filename += ".csv";
    }

    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  function loadAll() {
    loadStats();
    loadApps();
    loadMessages();
    loadTasks();
    loadUsers();
  }

  function loadStats() {
    api("adminStats").then(function (res) {
      document.getElementById("s-users").textContent = res.stats.users;
      document.getElementById("s-apps").textContent = res.stats.applications;
      document.getElementById("s-docs").textContent = res.stats.documents;
      document.getElementById("s-msgs").textContent = res.stats.messages;
    }).catch(function (err) {
      showNotice("admin-notice", "error", err.message);
    });
  }

  function loadApps() {
    api("adminListApplications").then(function (res) {
      allApps = res.applications || [];
      statuses = res.statuses || [];
      var sel = document.getElementById("f-status");
      sel.innerHTML = '<option value="">All statuses</option>' +
        statuses.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");
      renderApps();
    }).catch(function (err) {
      document.getElementById("apps-body").innerHTML =
        '<tr><td colspan="7" class="muted">Error: ' + esc(err.message) + "</td></tr>";
    });
  }

  function renderApps() {
    var q = document.getElementById("f-search").value.trim().toLowerCase();
    var st = document.getElementById("f-status").value;
    var body = document.getElementById("apps-body");

    var rows = allApps.filter(function (a) {
      if (st && a.status !== st) return false;
      if (q && (String(a.fullName).toLowerCase().indexOf(q) === -1 &&
                String(a.email).toLowerCase().indexOf(q) === -1)) return false;
      return true;
    });

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" class="muted">No applications found.</td></tr>';
      return;
    }

    body.innerHTML = "";
    rows.forEach(function (a) {
      var tr = document.createElement("tr");
      var agentInfo = a.assignedAgentName 
        ? "<strong>" + esc(a.assignedAgentName) + "</strong>" 
        : "<span class='muted' style='font-size:.8rem;'>Unassigned</span>";

      tr.innerHTML =
        "<td><strong>" + esc(a.fullName) + "</strong><br><span class='muted' style='font-size:.8rem;'>" + esc(a.email) + "</span></td>" +
        "<td>" + agentInfo + "</td>" +
        "<td>" + esc(a.program) + "<br><span class='muted' style='font-size:.8rem;'>" + esc(a.level) + "</span></td>" +
        "<td>" + esc(a.intake) + "</td>" +
        "<td><span class='badge " + (BADGE_CLASS[a.status] || "st-pending") + "'>" + esc(a.status) + "</span></td>" +
        "<td>" + fmtDate(a.submittedAt) + "</td>" +
        "<td></td>";
      
      var btn = document.createElement("button");
      btn.className = "btn btn-dark btn-sm";
      btn.textContent = "Manage";
      btn.addEventListener("click", function () { openModal(a.id); });
      tr.lastElementChild.appendChild(btn);
      body.appendChild(tr);
    });
  }

  /* ---------- Detail modal ---------- */

  function openModal(appId) {
    document.getElementById("modal-back").classList.add("show");
    document.getElementById("m-title").textContent = "Loading...";
    document.getElementById("m-details").innerHTML = "";
    document.getElementById("m-docs").innerHTML = '<li class="muted">Loading...</li>';
    document.getElementById("m-save-state").textContent = "";

    api("adminGetApplication", { appId: appId }).then(function (res) {
      currentApp = res.application;
      document.getElementById("m-title").textContent = currentApp.fullName + " — Application";

      var sel = document.getElementById("m-status");
      sel.innerHTML = (res.statuses || statuses).map(function (s) {
        return '<option' + (s === currentApp.status ? " selected" : "") + ">" + esc(s) + "</option>";
      }).join("");
      document.getElementById("m-note").value = currentApp.adminNotes || "";

      // Populate counselor select
      var agentSel = document.getElementById("m-agent");
      if (agentSel) {
        var agentsList = allUsers.filter(function (u) {
          return u.role === "agent" || u.role === "admin" || u.role === "super_admin";
        });
        agentSel.innerHTML = '<option value="">-- No Counselor Assigned --</option>' +
          agentsList.map(function (ag) {
            var selected = ag.id === currentApp.assignedAgentId ? " selected" : "";
            return '<option value="' + ag.id + '"' + selected + '>' + esc(ag.fullName || ag.email) + ' (' + ag.role + ')</option>';
          }).join("");
      }

      var dl = document.getElementById("m-details");
      dl.innerHTML = DETAIL_FIELDS.map(function (f) {
        var v = currentApp[f[0]];
        if (f[0] === "submittedAt" || f[0] === "updatedAt") v = fmtDate(v);
        return "<dt>" + f[1] + "</dt><dd>" + (esc(v) || "—") + "</dd>";
      }).join("");

      renderModalDocs(res.documents || []);
    }).catch(function (err) {
      document.getElementById("m-title").textContent = "Error";
      document.getElementById("m-details").innerHTML = "<dd>" + esc(err.message) + "</dd>";
    });
  }

  function renderModalDocs(docs) {
    var ul = document.getElementById("m-docs");
    if (!docs.length) {
      ul.innerHTML = '<li class="muted">This student has not uploaded any documents yet.</li>';
      return;
    }
    ul.innerHTML = "";
    docs.forEach(function (d) {
      var li = document.createElement("li");
      var left = document.createElement("div");
      left.innerHTML = "<strong>" + esc(d.docType) + "</strong> — " + esc(d.fileName) +
        '<div class="doc-meta">' + (d.sizeKb || "?") + " KB · " + fmtDate(d.uploadedAt) + "</div>";
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
        if (!confirm("Delete " + d.fileName + " permanently?")) return;
        del.disabled = true;
        api("adminDeleteDocument", { docId: d.id }).then(function () {
          return api("adminGetApplication", { appId: currentApp.id });
        }).then(function (res) {
          renderModalDocs(res.documents || []);
        }).catch(function (err) {
          alert(err.message);
          del.disabled = false;
        });
      });
      actions.appendChild(del);
      li.appendChild(left);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  }

  function saveStatus() {
    if (!currentApp) return;
    var btn = document.getElementById("m-save");
    var state = document.getElementById("m-save-state");
    btn.disabled = true;
    state.textContent = "Saving...";

    var agentSel = document.getElementById("m-agent");
    var selectedAgentId = agentSel ? agentSel.value : "";
    var selectedAgentName = (agentSel && agentSel.selectedIndex >= 0 && selectedAgentId) ? agentSel.options[agentSel.selectedIndex].text.split(" (")[0] : "";

    // First assign counselor if changed
    var assignPromise = (selectedAgentId !== currentApp.assignedAgentId) 
      ? api("adminAssignAgent", { studentId: currentApp.userId, agentId: selectedAgentId, agentName: selectedAgentName })
      : Promise.resolve();

    assignPromise.then(function () {
      return api("adminSetStatus", {
        appId: currentApp.id,
        status: document.getElementById("m-status").value,
        adminNotes: document.getElementById("m-note").value.trim()
      });
    }).then(function () {
      state.textContent = "✅ Saved & email notification sent.";
      loadApps();
      loadUsers();
      loadStats();
    }).catch(function (err) {
      state.textContent = "❌ " + err.message;
    }).finally(function () {
      btn.disabled = false;
    });
  }

  function closeModal() {
    document.getElementById("modal-back").classList.remove("show");
    currentApp = null;
  }

  /* ---------- Task Management Board ---------- */

  function loadTasks() {
    TaskBoardComponent.init("role-taskboard-container", sess);
  }

  /* ---------- User & Agent Assignment Panel ---------- */

  function loadUsers() {
    api("adminListUsers").then(function (res) {
      allUsers = res.users || [];
      renderUsers();
    }).catch(function (err) {
      console.error("Users list fail:", err);
    });
  }

  function renderUsers() {
    var body = document.getElementById("users-body");
    if (!body) return;

    if (!allUsers.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">No users found.</td></tr>';
      return;
    }

    // Gather agents for dropdown list
    var agents = allUsers.filter(function (u) { return u.role === "agent"; });

    body.innerHTML = "";
    allUsers.forEach(function (u) {
      var tr = document.createElement("tr");

      // Setup actions
      var actionsTd = document.createElement("td");
      actionsTd.style.whiteSpace = "nowrap";

      // Role Update dropdown
      var roleSelect = document.createElement("select");
      roleSelect.style.padding = "0.25rem";
      roleSelect.style.borderRadius = "4px";
      roleSelect.style.border = "1px solid var(--line)";
      roleSelect.style.fontSize = "0.8rem";
      roleSelect.style.marginRight = "0.5rem";
      
      var roles = ["student", "agent", "admin", "super_admin"];
      roles.forEach(function (r) {
        var opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r === "student" ? "Student" : (r === "agent" ? "Agent" : (r === "super_admin" ? "Super Admin" : "Admin"));
        if (u.role === r) opt.selected = true;
        roleSelect.appendChild(opt);
      });

      var saveRoleBtn = document.createElement("button");
      saveRoleBtn.className = "btn btn-dark btn-sm";
      saveRoleBtn.textContent = "Save Role";
      saveRoleBtn.style.padding = "0.2rem 0.5rem";
      saveRoleBtn.style.fontSize = "0.75rem";
      
      saveRoleBtn.addEventListener("click", function () {
        saveRoleBtn.disabled = true;
        api("adminUpdateUserRole", { userId: u.id, role: roleSelect.value }).then(function () {
          alert("Role updated successfully!");
          loadUsers();
          loadApps(); // reload app assignee details
        }).catch(function (err) {
          alert("Error: " + err.message);
          saveRoleBtn.disabled = false;
        });
      });

      var assignTaskBtn = document.createElement("button");
      assignTaskBtn.className = "btn btn-outline btn-sm";
      assignTaskBtn.textContent = "📌 Assign Task";
      assignTaskBtn.style.padding = "0.2rem 0.5rem";
      assignTaskBtn.style.fontSize = "0.75rem";
      assignTaskBtn.style.marginLeft = "0.4rem";
      assignTaskBtn.style.borderColor = "var(--blue-700)";
      assignTaskBtn.style.color = "var(--blue-700)";
      
      assignTaskBtn.addEventListener("click", function () {
        switchTab("taskboard");
        if (typeof TaskBoardComponent !== "undefined" && TaskBoardComponent.assignTaskToUser) {
          TaskBoardComponent.assignTaskToUser(u.id);
        }
      });

      actionsTd.appendChild(roleSelect);
      actionsTd.appendChild(saveRoleBtn);
      actionsTd.appendChild(assignTaskBtn);

      // Documents Column
      var docsTd = document.createElement("td");
      var viewDocsBtn = document.createElement("button");
      viewDocsBtn.className = "btn btn-outline btn-sm";
      viewDocsBtn.style.fontSize = "0.75rem";
      viewDocsBtn.style.padding = "0.2rem 0.55rem";
      viewDocsBtn.style.borderColor = "var(--purple-600)";
      viewDocsBtn.style.color = "var(--purple-700)";
      viewDocsBtn.style.fontWeight = "700";
      viewDocsBtn.textContent = "📄 View Documents";
      viewDocsBtn.addEventListener("click", function () {
        openUserDocsModal(u);
      });
      docsTd.appendChild(viewDocsBtn);

      // Agent Assignee Dropdown for Students
      var assignedAgentDisplay = "";
      if (u.role === "student") {
        var agentSelect = document.createElement("select");
        agentSelect.style.padding = "0.25rem";
        agentSelect.style.borderRadius = "4px";
        agentSelect.style.border = "1px solid var(--line)";
        agentSelect.style.fontSize = "0.8rem";
        agentSelect.style.marginTop = "0.4rem";
        agentSelect.style.display = "block";

        agentSelect.innerHTML = '<option value="">-- Assign Brno Agent --</option>' +
          agents.map(function (ag) {
            var sel = ag.id === u.assignedAgentId ? " selected" : "";
            return '<option value="' + ag.id + '"' + sel + '>' + esc(ag.fullName) + '</option>';
          }).join("");

        agentSelect.addEventListener("change", function () {
          var selId = this.value;
          var selName = selId ? this.options[this.selectedIndex].text : "";
          api("adminAssignAgent", { studentId: u.id, agentId: selId, agentName: selName }).then(function () {
            loadUsers();
            loadApps();
          }).catch(function (err) {
            alert("Could not assign agent: " + err.message);
          });
        });

        assignedAgentDisplay = u.assignedAgentName 
          ? "<strong>" + esc(u.assignedAgentName) + "</strong>" 
          : "<span class='muted' style='font-size:0.8rem;'>None assigned</span>";
          
        assignedAgentDisplay += "<div>" + agentSelect.outerHTML + "</div>";
      } else {
        assignedAgentDisplay = "<span class='muted' style='font-size:0.8rem;'>Not applicable</span>";
      }

      tr.innerHTML =
        "<td><strong>" + esc(u.fullName) + "</strong></td>" +
        "<td>" + esc(u.email) + "</td>" +
        "<td><span class='badge-role " + u.role + "'>" + u.role + "</span></td>" +
        "<td>" + assignedAgentDisplay + "</td>" +
        "<td></td>" +
        "<td></td>";

      tr.children[4].appendChild(viewDocsBtn);
      tr.lastElementChild.appendChild(actionsTd);
      
      // Bind inline dynamically compiled select events since we used outerHTML above
      var inlineAgentSelect = tr.querySelector("select[style*='display: block']");
      if (inlineAgentSelect) {
        inlineAgentSelect.addEventListener("change", function () {
          var selId = this.value;
          var selName = selId ? this.options[this.selectedIndex].text : "";
          api("adminAssignAgent", { studentId: u.id, agentId: selId, agentName: selName }).then(function () {
            loadUsers();
            loadApps();
          }).catch(function (err) {
            alert("Could not assign agent: " + err.message);
          });
        });
      }

      body.appendChild(tr);
    });
  }

  function openUserDocsModal(u) {
    var modal = document.getElementById("user-docs-modal");
    if (!modal) return;

    modal.classList.add("show");
    document.getElementById("ud-title").textContent = "📄 User Document Vault: " + (u.fullName || u.email);
    document.getElementById("ud-subtitle").textContent = "Email: " + u.email + " | Role: " + (u.role || "student") + " | ID: " + u.id;

    var body = document.getElementById("ud-list-body");
    body.innerHTML = '<tr><td colspan="5" class="muted">Fetching user documents...</td></tr>';

    api("adminListUserDocuments", { userId: u.id }).then(function (res) {
      var docs = res.documents || [];
      if (!docs.length) {
        body.innerHTML = '<tr><td colspan="5" class="muted">No documents uploaded or assigned for this user yet.</td></tr>';
        return;
      }

      body.innerHTML = docs.map(function (d) {
        var fileLink = d.fileUrl || d.url || "#";
        var fileName = d.fileName ? esc(d.fileName) : "View File";
        var dateStr = fmtDate(d.uploadedAt || d.createdAt);
        var legState = d.legalizationState || "None";

        return '<tr>' +
          '<td><strong>' + esc(d.docType || "Official Document") + '</strong></td>' +
          '<td><a href="' + esc(fileLink) + '" target="_blank" style="color:var(--blue-700); font-weight:600;">📄 ' + fileName + '</a></td>' +
          '<td>' + dateStr + '</td>' +
          '<td><span class="badge" style="font-size:0.75rem;">' + esc(legState) + '</span></td>' +
          '<td><a href="' + esc(fileLink) + '" target="_blank" class="btn btn-dark btn-sm" style="padding:0.2rem 0.5rem; font-size:0.75rem;">⬇ Download / View</a></td>' +
        '</tr>';
      }).join("");
    }).catch(function (err) {
      body.innerHTML = '<tr><td colspan="5" class="muted error">Error loading documents: ' + esc(err.message) + '</td></tr>';
    });
  }

  /* ---------- Messages ---------- */

  function loadMessages() {
    api("adminListMessages").then(function (res) {
      var body = document.getElementById("msgs-body");
      var msgs = res.messages || [];
      if (!msgs.length) {
        body.innerHTML = '<tr><td colspan="5" class="muted">No messages yet.</td></tr>';
        return;
      }
      body.innerHTML = msgs.map(function (m) {
        return "<tr>" +
          "<td>" + fmtDate(m.createdAt) + "</td>" +
          "<td>" + esc(m.name) + "</td>" +
          "<td>" + esc(m.email) + (m.phone ? "<br>" + esc(m.phone) : "") + "</td>" +
          "<td>" + esc(m.program) + "</td>" +
          "<td style='max-width:340px;'>" + esc(m.message) + "</td>" +
          "</tr>";
      }).join("");
    }).catch(function (err) {
      document.getElementById("msgs-body").innerHTML =
        '<tr><td colspan="5" class="muted">Error: ' + esc(err.message) + "</td></tr>";
    });
  }

  /* ---------- Solo Ops & Finance Panel ---------- */

  var opsStudentsList = [];

  function loadOpsPanel() {
    api("adminListApplications").then(function (res) {
      allApps = res.applications || [];
      opsStudentsList = allApps;
      renderOpsMetrics();
      renderOpsDropdowns();
      renderOpsBudgetTable();
      renderOpsGlobalDistribution();
    }).catch(function (err) {
      console.error("Ops Panel failed to load apps:", err);
    });

    // Bind event listeners once
    setupOpsEventListeners();
  }

  function renderOpsMetrics() {
    var totalGross = 0;
    var totalComm = 0;
    var activeCount = opsStudentsList.length;

    opsStudentsList.forEach(function (app) {
      var fee = parseFloat(app.serviceFee || "1200");
      var comm = parseFloat(app.advisorCommission || "300");
      if (isNaN(fee)) fee = 1200;
      if (isNaN(comm)) comm = 300;

      totalGross += fee;
      totalComm += comm;
    });

    var netProfit = totalGross - totalComm;

    document.getElementById("ops-gross-fees").textContent = "€" + totalGross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById("ops-commissions").textContent = "€" + totalComm.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById("ops-net-profit").textContent = "€" + netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    // Multiplier leverage: 1 operator to active students count
    document.getElementById("ops-leverage").textContent = "1 : " + activeCount;
  }

  function renderOpsDropdowns() {
    var selectNotes = document.getElementById("ops-notes-student");
    var selectLegal = document.getElementById("ops-legal-student");

    var currentNotesSel = selectNotes.value;
    var currentLegalSel = selectLegal.value;

    var optionsHTML = '<option value="">-- Choose a student --</option>' +
      opsStudentsList.map(function (a) {
        return '<option value="' + a.id + '">' + esc(a.fullName) + ' (' + esc(a.nationality || "Unknown") + ')</option>';
      }).join("");

    selectNotes.innerHTML = optionsHTML;
    selectLegal.innerHTML = optionsHTML;

    // Preserve selection if possible
    if (currentNotesSel) selectNotes.value = currentNotesSel;
    if (currentLegalSel) selectLegal.value = currentLegalSel;
  }

  function renderOpsGlobalDistribution() {
    var distEl = document.getElementById("ops-global-distribution");
    if (!opsStudentsList.length) {
      distEl.innerHTML = '<div class="muted">No student applications recorded.</div>';
      return;
    }

    var counts = {};
    opsStudentsList.forEach(function (app) {
      var nat = app.nationality || "Other";
      counts[nat] = (counts[nat] || 0) + 1;
    });

    var total = opsStudentsList.length;
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });

    distEl.innerHTML = keys.map(function (k) {
      var count = counts[k];
      var pct = Math.round((count / total) * 100);
      return '<div style="margin-bottom:0.5rem;">' +
        '<div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:0.15rem;">' +
          '<strong>🌍 ' + esc(k) + '</strong>' +
          '<span>' + count + ' ' + (count === 1 ? 'student' : 'students') + ' (' + pct + '%)</span>' +
        '</div>' +
        '<div style="background:var(--blue-100); height:6px; border-radius:3px; overflow:hidden;">' +
          '<div style="background:var(--blue-700); width:' + pct + '%; height:100%;"></div>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function renderOpsBudgetTable() {
    var tbody = document.getElementById("ops-budget-body");
    if (!opsStudentsList.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted center py-3">No active students found in your client base.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    opsStudentsList.forEach(function (app) {
      var tr = document.createElement("tr");

      var serviceFee = app.serviceFee || "1200";
      var advComm = app.advisorCommission || "300";
      var payoutStatus = app.payoutStatus || "Pending";

      var isPaid = payoutStatus === "Paid";
      var statusSelectClass = isPaid ? "st-approved" : "st-pending";

      tr.innerHTML = 
        '<td><strong>' + esc(app.fullName) + '</strong><br><span class="muted" style="font-size:0.75rem;">' + esc(app.email) + '</span></td>' +
        '<td>' + esc(app.program) + '<br><span class="muted" style="font-size:0.75rem;">' + esc(app.level || "Bachelor's") + '</span></td>' +
        '<td><span class="badge" style="background:rgba(29,78,137,0.1); color:var(--blue-700); font-size:0.75rem; font-weight:600;">🌍 ' + esc(app.nationality || "Global") + '</span></td>' +
        '<td><input type="number" id="fee-input-' + app.id + '" value="' + serviceFee + '" style="width:80px; padding:0.2rem 0.4rem; border-radius:4px; border:1px solid var(--line); font-size:0.85rem; text-align:right;"></td>' +
        '<td><input type="number" id="comm-input-' + app.id + '" value="' + advComm + '" style="width:80px; padding:0.2rem 0.4rem; border-radius:4px; border:1px solid var(--line); font-size:0.85rem; text-align:right;"></td>' +
        '<td>' +
          '<select id="payout-select-' + app.id + '" class="' + statusSelectClass + '" style="padding:0.2rem 0.4rem; border-radius:4px; border:none; font-size:0.8rem; font-weight:700; cursor:pointer;">' +
            '<option value="Pending"' + (payoutStatus === "Pending" ? " selected" : "") + '>Pending</option>' +
            '<option value="Paid"' + (payoutStatus === "Paid" ? " selected" : "") + '>Paid</option>' +
          '</select>' +
        '</td>' +
        '<td>' +
          '<button class="btn btn-primary btn-sm btn-save-budget" data-id="' + app.id + '" style="padding:0.25rem 0.6rem; font-size:0.8rem;">Save</button>' +
          '<span id="budget-saved-' + app.id + '" style="display:block; font-size:0.75rem; color:var(--green); font-weight:700; margin-top:0.2rem; text-align:center;"></span>' +
        '</td>';

      // Attach dynamic color-changing event to the select
      var select = tr.querySelector("#payout-select-" + app.id);
      select.addEventListener("change", function () {
        if (this.value === "Paid") {
          this.className = "st-approved";
        } else {
          this.className = "st-pending";
        }
      });

      tbody.appendChild(tr);
    });

    // Bind save budget events
    var saveButtons = tbody.querySelectorAll(".btn-save-budget");
    saveButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var appId = this.getAttribute("data-id");
        var feeInput = document.getElementById("fee-input-" + appId);
        var commInput = document.getElementById("comm-input-" + appId);
        var payoutSelect = document.getElementById("payout-select-" + appId);
        var feedback = document.getElementById("budget-saved-" + appId);

        this.disabled = true;
        this.textContent = "Saving...";
        feedback.textContent = "";

        api("adminUpdateBudget", {
          appId: appId,
          serviceFee: feeInput.value.trim(),
          advisorCommission: commInput.value.trim(),
          payoutStatus: payoutSelect.value
        }).then(function () {
          feedback.textContent = "Saved ✓";
          loadOpsPanel(); // refresh data
        }).catch(function (err) {
          alert("Error: " + err.message);
        }).finally(function () {
          btn.disabled = false;
          btn.textContent = "Save";
        });
      });
    });
  }

  var _opsEventsInitialized = false;
  function setupOpsEventListeners() {
    if (_opsEventsInitialized) return;
    _opsEventsInitialized = true;

    // Student selection for private operational memos
    var notesStudentSelect = document.getElementById("ops-notes-student");
    var notesTextArea = document.getElementById("ops-notes-text");
    notesStudentSelect.addEventListener("change", function () {
      var selectedId = this.value;
      if (!selectedId) {
        notesTextArea.value = "";
        return;
      }
      var foundApp = opsStudentsList.filter(function (a) { return a.id === selectedId; })[0];
      notesTextArea.value = foundApp ? (foundApp.adminPrivateNotes || "") : "";
    });

    // Save notes
    document.getElementById("btn-ops-save-notes").addEventListener("click", function () {
      var selectedId = notesStudentSelect.value;
      var notesText = notesTextArea.value.trim();
      var statusEl = document.getElementById("ops-notes-status");

      if (!selectedId) {
        alert("Please select a student to attach private notes.");
        return;
      }

      this.disabled = true;
      statusEl.textContent = "Saving memo...";

      api("adminUpdatePrivateNotes", {
        appId: selectedId,
        adminPrivateNotes: notesText
      }).then(function () {
        statusEl.textContent = "Saved memo!";
        // update memory
        var memoApp = opsStudentsList.filter(function (a) { return a.id === selectedId; })[0];
        if (memoApp) memoApp.adminPrivateNotes = notesText;
        setTimeout(function () { statusEl.textContent = ""; }, 3000);
      }).catch(function (err) {
        alert("Could not save private memo: " + err.message);
      }).finally(function () {
        document.getElementById("btn-ops-save-notes").disabled = false;
      });
    });

    // Student selection for Legalization pipeline
    var legalStudentSelect = document.getElementById("ops-legal-student");
    legalStudentSelect.addEventListener("change", function () {
      var selectedId = this.value;
      var docsListEl = document.getElementById("ops-legal-docs-list");

      if (!selectedId) {
        docsListEl.innerHTML = '<div class="muted center py-2" style="font-size:0.85rem;">Select a student above to inspect paper-trail legalizations.</div>';
        return;
      }

      var selectedApp = opsStudentsList.filter(function (a) { return a.id === selectedId; })[0];
      if (!selectedApp) return;

      docsListEl.innerHTML = '<div class="muted center py-2" style="font-size:0.85rem;">Fetching student document registry...</div>';

      api("adminListUserDocuments", { userId: selectedApp.userId }).then(function (res) {
        var docs = res.documents || [];
        if (!docs.length) {
          docsListEl.innerHTML = '<div class="muted center py-2" style="font-size:0.85rem;">This applicant has not uploaded any documents yet.</div>';
          return;
        }

        docsListEl.innerHTML = "";
        docs.forEach(function (doc) {
          var row = document.createElement("div");
          row.style.display = "flex";
          row.style.justify = "space-between";
          row.style.alignItems = "center";
          row.style.padding = "0.3rem 0.1rem";
          row.style.borderBottom = "1px solid var(--blue-50)";
          row.style.fontSize = "0.8rem";

          var state = doc.legalizationState || "None";

          var labelText = '📁 ' + esc(doc.docType);
          if (doc.fileName) {
            labelText += ' <span class="muted" style="font-size:0.7rem;">(' + esc(doc.fileName) + ')</span>';
          }

          row.innerHTML = 
            '<div style="flex-grow:1; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">' + labelText + '</div>' +
            '<div style="display:flex; gap:0.4rem; align-items:center;">' +
              '<select class="ops-legal-select" data-docid="' + doc.id + '" style="font-size:0.75rem; padding:0.1rem; border-radius:4px; border:1px solid var(--line);">' +
                '<option value="None"' + (state === "None" ? " selected" : "") + '>Not Legalized</option>' +
                '<option value="MFA"' + (state === "MFA" ? " selected" : "") + '>MFA Legalized</option>' +
                '<option value="Embassy"' + (state === "Embassy" ? " selected" : "") + '>Czech Superlegalized</option>' +
                '<option value="Nostrif"' + (state === "Nostrif" ? " selected" : "") + '>Nostrificated</option>' +
              '</select>' +
              '<span id="legal-saved-' + doc.id + '" style="font-size:0.7rem; color:var(--green); font-weight:700;"></span>' +
            '</div>';

          var sel = row.querySelector(".ops-legal-select");
          sel.addEventListener("change", function () {
            var selectVal = this.value;
            var docId = this.getAttribute("data-docid");
            var fd = row.querySelector("#legal-saved-" + docId);
            
            this.disabled = true;
            fd.textContent = "⏳";

            api("adminUpdateDocLegalization", {
              docId: docId,
              legalizationState: selectVal
            }).then(function () {
              fd.textContent = "✓";
              setTimeout(function () { fd.textContent = ""; }, 2000);
            }).catch(function (err) {
              alert("Error updating legalization state: " + err.message);
              fd.textContent = "✕";
            }).finally(function () {
              sel.disabled = false;
            });
          });

          docsListEl.appendChild(row);
        });
      }).catch(function (err) {
        docsListEl.innerHTML = '<div class="muted center py-2" style="color:var(--red); font-size:0.85rem;">Could not load papers: ' + esc(err.message) + '</div>';
      });
    });

    // CSV Data Exporter for analysts
    document.getElementById("btn-export-csv").addEventListener("click", function () {
      if (!opsStudentsList.length) {
        alert("No student data available to export.");
        return;
      }

      var headers = [
        "Full Name",
        "Email Address",
        "Nationality/Country",
        "Desired Program",
        "Workflow Stage",
        "Service Fee Paid (€)",
        "Advisor Commission (€)",
        "Payout Status",
        "Private Notes Memo"
      ];

      var csvRows = [headers.join(",")];

      opsStudentsList.forEach(function (app) {
        var row = [
          '"' + String(app.fullName || "").replace(/"/g, '""') + '"',
          '"' + String(app.email || "").replace(/"/g, '""') + '"',
          '"' + String(app.nationality || "").replace(/"/g, '""') + '"',
          '"' + String(app.program || "").replace(/"/g, '""') + '"',
          '"' + String(app.status || "").replace(/"/g, '""') + '"',
          '"' + String(app.serviceFee || "1200").replace(/"/g, '""') + '"',
          '"' + String(app.advisorCommission || "300").replace(/"/g, '""') + '"',
          '"' + String(app.payoutStatus || "Pending").replace(/"/g, '""') + '"',
          '"' + String(app.adminPrivateNotes || "None").replace(/\n/g, " ").replace(/"/g, '""') + '"'
        ];
        csvRows.push(row.join(","));
      });

      var csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      var encodedUri = encodeURI(csvContent);
      var link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "StudyCzechBridge-GlobalPipeline-Export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // JSON Data Exporter for developers
    document.getElementById("btn-export-json").addEventListener("click", function () {
      if (!opsStudentsList.length) {
        alert("No student data available to export.");
        return;
      }

      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(opsStudentsList, null, 2));
      var link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", "StudyCzechBridge-GlobalPipeline-Export.json");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // Seed/Wipe button
    document.getElementById("btn-ops-reseed").addEventListener("click", function () {
      if (!confirm("⚠️ WARNING: This will completely wipe the current local storage database and restore the default global mock student list. Active sessions will be kept. Proceed?")) {
        return;
      }

      var self = this;
      self.disabled = true;
      self.textContent = "Re-seeding database...";

      api("adminReseedDemoData").then(function () {
        alert("🎉 Database successfully re-seeded with 4 global student records and default commission tracking sheets!");
        loadAll();
        loadOpsPanel();
      }).catch(function (err) {
        alert("Reseed failed: " + err.message);
      }).finally(function () {
        self.disabled = false;
        self.textContent = "⚠️ Re-seed Demo Data";
      });
    });
  }

  // Real-time Alerts Logic
  var loadedAlertIds = new Set();
  var firstAlertsLoad = true;

  function initAlerts() {
    var wrapper = document.getElementById("admin-alerts-wrapper");
    var btn = document.getElementById("alerts-toggle-btn");
    var dropdown = document.getElementById("alerts-dropdown");
    var btnClearAll = document.getElementById("btn-clear-all-alerts");

    if (!btn || !dropdown) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isVisible = dropdown.style.display === "block";
      dropdown.style.display = isVisible ? "none" : "block";
      
      if (!isVisible) {
        // Mark all as read when dropdown is opened (best-effort)
        api("adminMarkAllAlertsRead").then(function () {
          var badge = document.getElementById("alerts-count-badge");
          if (badge) badge.style.display = "none";
        }).catch(function (err) {
          console.warn("Error marking alerts as read:", err);
        });
      }
    });

    document.addEventListener("click", function (e) {
      if (!wrapper.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    if (btnClearAll) {
      btnClearAll.addEventListener("click", function (e) {
        e.stopPropagation();
        api("adminMarkAllAlertsRead").then(function() {
          loadAlerts();
        }).catch(function (err) {
          console.warn("Error clearing alerts:", err);
        });
      });
    }

    // Start polling alerts
    loadAlerts();
    setInterval(loadAlerts, 5000);
  }

  function loadAlerts() {
    api("adminListAlerts").then(function (res) {
      var alerts = res.alerts || [];
      renderAlertsList(alerts);
    }).catch(function (err) {
      console.warn("Failed to load alerts:", err);
    });
  }

  function renderAlertsList(alerts) {
    var container = document.getElementById("alerts-list-container");
    var badge = document.getElementById("alerts-count-badge");
    if (!container) return;

    // Filter unread alerts for the badge
    var unreadCount = alerts.filter(function (a) { return !a.read; }).length;
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }

    // Trigger toast notification for any new alert IDs we haven't seen yet
    alerts.forEach(function (alert) {
      if (!loadedAlertIds.has(alert.id)) {
        loadedAlertIds.add(alert.id);
        if (!firstAlertsLoad) {
          showAlertToast(alert);
        }
      }
    });

    firstAlertsLoad = false;

    if (alerts.length === 0) {
      container.innerHTML = '<div class="muted center py-2" style="font-size: 0.8rem; text-align: center;">No alerts right now.</div>';
      return;
    }

    var html = alerts.map(function (alert) {
      var icon = "🔔";
      var color = "var(--blue-700)";
      if (alert.type === "document_uploaded") {
        icon = "📄";
        color = "var(--teal-600)";
      } else if (alert.type === "document_deleted") {
        icon = "🗑️";
        color = "var(--red-500)";
      } else if (alert.type === "status_changed") {
        icon = "⚡";
        color = "var(--blue-600)";
      }

      var dotHtml = !alert.read ? '<span style="display:inline-block; width: 6px; height: 6px; background: var(--red-500); border-radius: 50%; margin-left: auto;"></span>' : '';
      var dateStr = fmtDate(alert.timestamp) + " " + new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return (
        '<div class="alert-item" style="display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.5rem; border-radius: 6px; background: ' + (!alert.read ? '#f0f7ff' : '#fafafa') + '; border: 1px solid ' + (!alert.read ? '#d0e7ff' : '#eee') + '; font-size: 0.8rem; transition: background 0.2s;">' +
          '<span style="font-size: 1.1rem; color: ' + color + ';">' + icon + '</span>' +
          '<div style="flex: 1; min-width: 0;">' +
            '<div style="font-weight: 700; color: var(--text-dark); display: flex; align-items: center; gap: 0.25rem;">' + esc(alert.studentName) + ' ' + dotHtml + '</div>' +
            '<div style="color: var(--text-muted); word-break: break-word; margin: 0.15rem 0;">' + esc(alert.details) + '</div>' +
            '<div style="font-size: 0.7rem; color: #999;">' + dateStr + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    container.innerHTML = html;
  }

  function showAlertToast(alert) {
    var container = document.getElementById("toast-container");
    if (!container) return;

    var toast = document.createElement("div");
    toast.style.background = "white";
    toast.style.borderLeft = "4px solid var(--blue-600)";
    toast.style.borderRadius = "6px";
    toast.style.boxShadow = "var(--shadow-lg)";
    toast.style.padding = "0.75rem 1rem";
    toast.style.display = "flex";
    toast.style.alignItems = "flex-start";
    toast.style.gap = "0.6rem";
    toast.style.transform = "translateX(120%)";
    toast.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    toast.style.fontSize = "0.85rem";
    toast.style.width = "320px";

    var icon = "🔔";
    if (alert.type === "document_uploaded") {
      icon = "📄";
      toast.style.borderLeftColor = "var(--teal-600)";
    } else if (alert.type === "document_deleted") {
      icon = "🗑️";
      toast.style.borderLeftColor = "var(--red-500)";
    } else if (alert.type === "status_changed") {
      icon = "⚡";
      toast.style.borderLeftColor = "var(--blue-600)";
    }

    toast.innerHTML = (
      '<span style="font-size: 1.2rem;">' + icon + '</span>' +
      '<div style="flex: 1; min-width: 0;">' +
        '<div style="font-weight: bold; color: var(--text-dark);">' + esc(alert.studentName) + '</div>' +
        '<div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.1rem;">' + esc(alert.details) + '</div>' +
      '</div>' +
      '<button style="background: none; border: none; font-size: 1.2rem; color: #999; cursor: pointer; padding: 0; line-height: 1; margin-left: 0.5rem;">&times;</button>'
    );

    toast.querySelector("button").addEventListener("click", function () {
      toast.style.transform = "translateX(120%)";
      setTimeout(function () { toast.remove(); }, 300);
    });

    container.appendChild(toast);

    setTimeout(function () {
      toast.style.transform = "translateX(0)";
    }, 50);

    setTimeout(function () {
      if (toast.parentNode) {
        toast.style.transform = "translateX(120%)";
        setTimeout(function () { toast.remove(); }, 300);
      }
    }, 6000);
  }

  /* ============================================================
     Counselor Workspace Tab
     ============================================================ */
  function initCounselorTab() {
    var filterSel = document.getElementById("counselor-student-filter");
    if (filterSel) {
      filterSel.removeEventListener("change", renderCounselorWorkspace);
      filterSel.addEventListener("change", renderCounselorWorkspace);
    }
    renderCounselorWorkspace();
    renderCounselorPackagesSummary();
  }

  function renderCounselorWorkspace() {
    var body = document.getElementById("counselor-students-body");
    if (!body) return;

    var filterVal = document.getElementById("counselor-student-filter") ? document.getElementById("counselor-student-filter").value : "mine";
    var currentUser = getCurrentUser(); // from session or token

    var filteredApps = allApps.filter(function (a) {
      if (filterVal === "all") return true;
      if (!a.assignedAgentId && !a.assignedAgentName) return false;
      if (currentUser && (a.assignedAgentId === currentUser.uid || a.assignedAgentId === currentUser.id || a.assignedAgentName === currentUser.fullName || currentUser.role === "admin" || currentUser.role === "super_admin")) {
        return true;
      }
      return false;
    });

    // Stats
    document.getElementById("c-stat-assigned").textContent = filteredApps.length;
    var activeCount = filteredApps.filter(function (a) { return a.status !== "Completed" && a.status !== "Rejected"; }).length;
    document.getElementById("c-stat-active").textContent = activeCount;
    var totalComm = filteredApps.reduce(function (sum, a) { return sum + (Number(a.advisorCommission) || 0); }, 0);
    document.getElementById("c-stat-commission").textContent = "€" + totalComm;

    if (!filteredApps.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted py-4">No students assigned to you yet. Super Admin can assign students in the "Users & Roles" tab.</td></tr>';
      return;
    }

    body.innerHTML = "";
    filteredApps.forEach(function (a) {
      var tr = document.createElement("tr");
      var currentStepNum = a.stepProgress ? a.stepProgress : 1;
      var currentStepTitle = JOURNEY_20_STEPS[currentStepNum - 1] ? JOURNEY_20_STEPS[currentStepNum - 1].title : "Application Initiated";

      tr.innerHTML =
        "<td><strong>" + esc(a.fullName) + "</strong><br><span class='muted' style='font-size:.8rem;'>" + esc(a.email) + "</span></td>" +
        "<td>" + esc(a.program) + "<br><span class='muted' style='font-size:.8rem;'>" + esc(a.level) + " (" + esc(a.intake) + ")</span></td>" +
        "<td><span class='badge " + (BADGE_CLASS[a.status] || "st-pending") + "'>" + esc(a.status) + "</span></td>" +
        "<td><strong style='color:var(--blue-800);'>Step " + currentStepNum + "/20:</strong> " + esc(currentStepTitle) + "</td>" +
        "<td>" + (a.assignedAgentName ? "<strong>" + esc(a.assignedAgentName) + "</strong>" : "<span class='muted'>Unassigned</span>") + "</td>" +
        "<td></td>";

      var actionsTd = tr.lastElementChild;
      var btnJourney = document.createElement("button");
      btnJourney.className = "btn btn-outline btn-sm mr-1";
      btnJourney.style.fontSize = "0.75rem";
      btnJourney.style.borderColor = "var(--blue-700)";
      btnJourney.style.color = "var(--blue-700)";
      btnJourney.textContent = "🎓 Update 20 Steps";
      btnJourney.addEventListener("click", function () {
        switchTab("journey");
        var sel = document.getElementById("journey-student-select");
        if (sel) {
          sel.value = a.id;
          sel.dispatchEvent(new Event("change"));
        }
      });

      var btnManage = document.createElement("button");
      btnManage.className = "btn btn-dark btn-sm";
      btnManage.style.fontSize = "0.75rem";
      btnManage.textContent = "Manage App";
      btnManage.addEventListener("click", function () {
        openModal(a);
      });

      actionsTd.appendChild(btnJourney);
      actionsTd.appendChild(btnManage);
      body.appendChild(tr);
    });
  }

  function renderCounselorPackagesSummary() {
    var container = document.getElementById("counselor-packages-summary");
    if (!container) return;

    api("getPackages").then(function (res) {
      var pkgs = res.packages || [];
      if (!pkgs.length) {
        container.innerHTML = '<div class="muted">No packages configured yet.</div>';
        return;
      }
      container.innerHTML = pkgs.map(function (p) {
        var inclList = Array.isArray(p.inclusions) ? p.inclusions : String(p.inclusions || "").split("\n").filter(Boolean);
        return (
          '<div style="background: white; border: 1px solid var(--line); border-radius: 8px; padding: 1rem; box-shadow: var(--shadow-sm);">' +
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">' +
              '<strong style="font-size: 1rem; color: var(--blue-900);">' + esc(p.name) + '</strong>' +
              '<span class="badge" style="background: #e6fffa; color: #234e52; font-weight: 700;">€' + p.priceEur + ' Fee</span>' +
            '</div>' +
            '<div style="font-size: 0.82rem; color: var(--text-dark); margin-bottom: 0.5rem;">Target: <strong>' + esc(p.targetProgram) + '</strong> | Commission: <strong style="color:var(--green);">€' + p.advisorCommission + '</strong></div>' +
            '<p class="muted" style="font-size: 0.8rem; margin-bottom: 0.75rem;">' + esc(p.description) + '</p>' +
            '<ul style="margin: 0; padding-left: 1.2rem; font-size: 0.78rem; color: var(--text-muted); line-height: 1.5;">' +
              inclList.slice(0, 4).map(function (inc) { return '<li>' + esc(inc) + '</li>'; }).join("") +
              (inclList.length > 4 ? '<li style="font-weight:700; color:var(--blue-700);">+ ' + (inclList.length - 4) + ' more inclusions</li>' : '') +
            '</ul>' +
          '</div>'
        );
      }).join("");
    }).catch(function (err) {
      container.innerHTML = '<div class="muted">Error loading packages: ' + esc(err.message) + '</div>';
    });
  }

  /* ============================================================
     Package System & Service Charges Tab
     ============================================================ */
  function initPackagesTab() {
    var addBtn = document.getElementById("btn-add-package-modal");
    var modal = document.getElementById("package-editor-modal");
    var closeBtn = document.getElementById("pkg-modal-close");
    var cancelBtn = document.getElementById("pkg-modal-cancel");
    var saveBtn = document.getElementById("pkg-modal-save");

    if (addBtn) {
      addBtn.onclick = function () {
        document.getElementById("pkg-modal-title").textContent = "Add New Service Package";
        document.getElementById("pkg-edit-id").value = "";
        document.getElementById("pkg-name").value = "";
        document.getElementById("pkg-price").value = "";
        document.getElementById("pkg-commission").value = "";
        document.getElementById("pkg-program").value = "All Degrees (Bachelor & Master)";
        document.getElementById("pkg-desc").value = "";
        document.getElementById("pkg-inclusions").value = "";
        modal.style.display = "flex";
      };
    }

    if (closeBtn) closeBtn.onclick = function () { modal.style.display = "none"; };
    if (cancelBtn) cancelBtn.onclick = function () { modal.style.display = "none"; };

    if (saveBtn) {
      saveBtn.onclick = function () {
        saveBtn.disabled = true;
        var pkgData = {
          id: document.getElementById("pkg-edit-id").value,
          name: document.getElementById("pkg-name").value.trim(),
          priceEur: Number(document.getElementById("pkg-price").value) || 0,
          advisorCommission: Number(document.getElementById("pkg-commission").value) || 0,
          targetProgram: document.getElementById("pkg-program").value.trim(),
          description: document.getElementById("pkg-desc").value.trim(),
          inclusions: document.getElementById("pkg-inclusions").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
        };

        api("adminSavePackage", pkgData).then(function () {
          saveBtn.disabled = false;
          modal.style.display = "none";
          renderPackagesCards();
          renderCounselorPackagesSummary();
        }).catch(function (err) {
          saveBtn.disabled = false;
          alert("Error saving package: " + err.message);
        });
      };
    }

    renderPackagesCards();
  }

  function renderPackagesCards() {
    var grid = document.getElementById("packages-cards-grid");
    if (!grid) return;

    api("getPackages").then(function (res) {
      var pkgs = res.packages || [];
      if (!pkgs.length) {
        grid.innerHTML = '<div class="muted py-4">No packages defined. Click "+ Add New Package" to create one.</div>';
        return;
      }

      grid.innerHTML = pkgs.map(function (p) {
        var inclList = Array.isArray(p.inclusions) ? p.inclusions : String(p.inclusions || "").split("\n").filter(Boolean);
        return (
          '<div style="background: white; border: 1px solid var(--line); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow-md); display: flex; flex-direction: column; justify-content: space-between;">' +
            '<div>' +
              '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">' +
                '<h3 style="margin: 0; font-size: 1.15rem; color: var(--blue-900);">' + esc(p.name) + '</h3>' +
                '<span class="badge" style="background: #e6fffa; color: #234e52; font-size: 0.9rem; font-weight: 800; padding: 0.3rem 0.6rem;">€' + p.priceEur + '</span>' +
              '</div>' +
              '<div style="font-size: 0.85rem; color: var(--text-dark); margin-bottom: 0.75rem; background: #fafafa; padding: 0.5rem; border-radius: 6px; border: 1px solid #eee;">' +
                '🎯 Target: <strong>' + esc(p.targetProgram) + '</strong><br>' +
                '💼 Counselor Commission: <strong style="color:var(--green);">€' + p.advisorCommission + '</strong>' +
              '</div>' +
              '<p class="muted" style="font-size: 0.88rem; margin-bottom: 1rem; line-height: 1.5;">' + esc(p.description) + '</p>' +
              '<strong style="font-size: 0.82rem; text-transform: uppercase; color: var(--blue-800); display: block; margin-bottom: 0.4rem;">Included Services (' + inclList.length + '):</strong>' +
              '<ul style="margin: 0 0 1.25rem 0; padding-left: 1.25rem; font-size: 0.82rem; color: var(--text-dark); line-height: 1.6;">' +
                inclList.map(function (inc) { return '<li>' + esc(inc) + '</li>'; }).join("") +
              '</ul>' +
            '</div>' +
            '<div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--line); padding-top: 1rem;">' +
              '<button class="btn btn-outline btn-sm btn-edit-pkg" data-id="' + p.id + '" style="flex: 1;">✏️ Edit</button>' +
              '<button class="btn btn-outline btn-sm btn-delete-pkg" data-id="' + p.id + '" style="border-color: var(--red-500); color: var(--red-500);">🗑️ Delete</button>' +
            '</div>' +
          '</div>'
        );
      }).join("");

      // Bind Edit & Delete buttons
      grid.querySelectorAll(".btn-edit-pkg").forEach(function (btn) {
        btn.onclick = function () {
          var pkgId = this.getAttribute("data-id");
          var pkg = pkgs.filter(function (x) { return x.id === pkgId; })[0];
          if (!pkg) return;
          document.getElementById("pkg-modal-title").textContent = "Edit Package: " + pkg.name;
          document.getElementById("pkg-edit-id").value = pkg.id;
          document.getElementById("pkg-name").value = pkg.name;
          document.getElementById("pkg-price").value = pkg.priceEur;
          document.getElementById("pkg-commission").value = pkg.advisorCommission;
          document.getElementById("pkg-program").value = pkg.targetProgram;
          document.getElementById("pkg-desc").value = pkg.description;
          document.getElementById("pkg-inclusions").value = Array.isArray(pkg.inclusions) ? pkg.inclusions.join("\n") : pkg.inclusions;
          document.getElementById("package-editor-modal").style.display = "flex";
        };
      });

      grid.querySelectorAll(".btn-delete-pkg").forEach(function (btn) {
        btn.onclick = function () {
          var pkgId = this.getAttribute("data-id");
          if (!confirm("Are you sure you want to delete this package?")) return;
          api("adminDeletePackage", { packageId: pkgId }).then(function () {
            renderPackagesCards();
            renderCounselorPackagesSummary();
          }).catch(function (err) {
            alert("Error deleting package: " + err.message);
          });
        };
      });
    }).catch(function (err) {
      grid.innerHTML = '<div class="muted py-4">Error loading packages: ' + esc(err.message) + '</div>';
    });
  }

  /* ============================================================
     Super Admin Document Assignment Hub
     ============================================================ */
  function loadAllDocumentsRepository() {
    var tbody = document.getElementById("all-docs-body");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="muted">Loading document repository...</td></tr>';

    api("adminListAllDocuments").then(function (res) {
      var docs = res.documents || [];
      if (!docs.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="muted">No documents recorded in repository.</td></tr>';
        return;
      }

      var userMap = {};
      allUsers.forEach(function (u) { userMap[u.id] = u; });

      tbody.innerHTML = docs.map(function (d) {
        var u = userMap[d.userId] || { fullName: d.userName || "Student User", email: d.userEmail || d.userId || "", role: "student" };
        var fileLink = d.fileUrl || d.url || "#";
        var fileName = d.fileName ? esc(d.fileName) : "View Document";
        var dateStr = fmtDate(d.uploadedAt || d.createdAt);

        return '<tr>' +
          '<td><strong>' + esc(u.fullName) + '</strong></td>' +
          '<td><span class="muted" style="font-size:0.8rem;">' + esc(u.email) + '</span></td>' +
          '<td><span class="badge-role ' + esc(u.role) + '" style="font-size:0.7rem;">' + esc(u.role) + '</span></td>' +
          '<td><strong>' + esc(d.docType || "Official Document") + '</strong></td>' +
          '<td><a href="' + esc(fileLink) + '" target="_blank" style="color:var(--blue-700); font-weight:600;">📄 ' + fileName + '</a></td>' +
          '<td>' + dateStr + '</td>' +
          '<td><span class="badge" style="font-size:0.75rem;">' + esc(d.legalizationState || "None") + '</span></td>' +
        '</tr>';
      }).join("");
    }).catch(function (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted error">Error loading documents: ' + esc(err.message) + '</td></tr>';
    });
  }

  function initSuperDocsTab() {
    var select = document.getElementById("asgn-student-select");
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose target student / user --</option>';
    allUsers.forEach(function (u) {
      var opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = (u.fullName || u.email) + " (" + (u.role || "user") + " — " + u.email + ")";
      select.appendChild(opt);
    });

    loadAllDocumentsRepository();

    var submitBtn = document.getElementById("btn-assign-doc-submit");
    if (submitBtn) {
      submitBtn.onclick = function () {
        var targetUserId = select.value;
        if (!targetUserId) {
          alert("Please select a target student first.");
          return;
        }
        var docType = document.getElementById("asgn-doc-type").value;
        var notes = document.getElementById("asgn-notes").value.trim();
        var fileInput = document.getElementById("asgn-file-input");
        var stateSpan = document.getElementById("asgn-doc-state");

        submitBtn.disabled = true;
        stateSpan.textContent = "Uploading and assigning document...";

        if (fileInput.files && fileInput.files[0]) {
          var file = fileInput.files[0];
          var reader = new FileReader();
          reader.onload = function (e) {
            var rawBase64 = e.target.result.split(",")[1] || "";
            api("adminAssignDocumentToUser", {
              targetUserId: targetUserId,
              docType: docType,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              base64: rawBase64,
              notes: notes
            }).then(function () {
              submitBtn.disabled = false;
              stateSpan.textContent = "✅ Document assigned successfully!";
              fileInput.value = "";
              document.getElementById("asgn-notes").value = "";
              loadAllDocumentsRepository();
              setTimeout(function () { stateSpan.textContent = ""; }, 4000);
            }).catch(function (err) {
              submitBtn.disabled = false;
              stateSpan.textContent = "❌ Error: " + err.message;
            });
          };
          reader.readAsDataURL(file);
        } else {
          // Fallback sample document
          api("adminAssignDocumentToUser", {
            targetUserId: targetUserId,
            docType: docType,
            fileName: docType.replace(/\s+/g, "_").toLowerCase() + "_official.pdf",
            mimeType: "application/pdf",
            base64: "RGVtbyBvZmZpY2lhbCBkb2N1bWVudCBhc3NpZ25lZCBieSBTdXBlciBBZG1pbi4=",
            notes: notes
          }).then(function () {
            submitBtn.disabled = false;
            stateSpan.textContent = "✅ Sample official document assigned successfully!";
            document.getElementById("asgn-notes").value = "";
            loadAllDocumentsRepository();
            setTimeout(function () { stateSpan.textContent = ""; }, 4000);
          }).catch(function (err) {
            submitBtn.disabled = false;
            stateSpan.textContent = "❌ Error: " + err.message;
          });
        }
      };
    }
  }

})();

