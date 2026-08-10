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

  var currentActiveRole = (sess && sess.role) ? sess.role : "super_admin";

  function normalizeRole(role) {
    var r = String(role || "").toLowerCase().trim();
    if (r === "super_admin") return "super_admin";
    if (r === "admin") return "admin";
    if (r === "counselor" || r === "councilor" || r === "agent" || r === "staff") return "counselor";
    if (r === "admission_officer" || r === "officer") return "admission_officer";
    if (r === "finance_manager" || r === "finance") return "finance_manager";
    if (r === "student" || r === "user") return "student";
    return "admin";
  }

  function getRoleLabel(role) {
    var r = normalizeRole(role);
    if (r === "super_admin") return "👑 Super Admin";
    if (r === "admin") return "🛡️ Admin";
    if (r === "counselor") return "🧭 Education Counselor";
    if (r === "admission_officer") return "🎓 Admission Officer";
    if (r === "finance_manager") return "💳 Finance Manager";
    if (r === "student") return "🎓 Student";
    return role ? String(role) : "User";
  }

  var ROLE_CONFIGS = {
    super_admin: {
      title: "🛠️ Admin Panel — Super Admin Control Center",
      label: "👑 Super Admin",
      badgeClass: "badge-role super_admin",
      defaultTab: "applications",
      allowedTabs: ["unidb", "testimonials", "applications", "counselor", "journey", "taskboard", "packages", "superdocs", "users", "email", "extract", "messages", "ops"],
      statLabels: ["Students", "Applications", "Documents", "Messages"],
      bannerHtml: '<div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: white; padding: 1.25rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: var(--shadow-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">' +
        '<div>' +
          '<div style="text-transform: uppercase; font-size: 0.72rem; letter-spacing: 1px; color: #a5b4fc; font-weight: 800;">👑 Super Admin Management Dashboard</div>' +
          '<h2 style="margin: 0.2rem 0; color: white; font-size: 1.25rem;">Full System Control & System Administration</h2>' +
          '<p style="margin: 0; color: #cbd5e1; font-size: 0.88rem;">Manage applications, assign user roles, configure private SMTP/email, adjust package fees, and manage financial operations.</p>' +
        '</div>' +
        '<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">' +
          '<button class="btn btn-primary btn-sm" onclick="switchTab(\'users\')" style="font-weight:700;">👥 Manage Users & Roles</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'ops\')" style="color:white; border-color:rgba(255,255,255,0.4); font-weight:700;">📈 Finance & Ops</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'email\')" style="color:white; border-color:rgba(255,255,255,0.4); font-weight:700;">📧 Private Email</button>' +
        '</div>' +
      '</div>'
    },
    admin: {
      title: "🛠️ Admin Panel — Administrator Portal",
      label: "🛡️ Admin",
      badgeClass: "badge-role admin",
      defaultTab: "applications",
      allowedTabs: ["applications", "counselor", "journey", "taskboard", "unidb", "testimonials", "packages", "superdocs", "users", "extract", "messages", "ops"],
      statLabels: ["Students", "Applications", "Documents", "Messages"],
      bannerHtml: '<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 1.25rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: var(--shadow-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">' +
        '<div>' +
          '<div style="text-transform: uppercase; font-size: 0.72rem; letter-spacing: 1px; color: #38bdf8; font-weight: 800;">🛡️ Administrator Workspace</div>' +
          '<h2 style="margin: 0.2rem 0; color: white; font-size: 1.25rem;">Student Applications & Operations Management</h2>' +
          '<p style="margin: 0; color: #cbd5e1; font-size: 0.88rem;">Oversee application reviews, assign counselors to students, track 20-step roadmaps, and manage task boards.</p>' +
        '</div>' +
        '<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">' +
          '<button class="btn btn-primary btn-sm" onclick="switchTab(\'applications\')" style="font-weight:700;">📋 Review Applications</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'counselor\')" style="color:white; border-color:rgba(255,255,255,0.4); font-weight:700;">🇨🇿 Counselor Workspace</button>' +
        '</div>' +
      '</div>'
    },
    counselor: {
      title: "🛠️ Admin Panel — Education Counselor Workspace",
      label: "🧭 Education Counselor",
      badgeClass: "badge-role agent",
      defaultTab: "counselor",
      allowedTabs: ["counselor", "applications", "journey", "taskboard", "superdocs", "messages", "unidb"],
      statLabels: ["Assigned Students", "Active Apps", "Pending Tasks", "Messages"],
      bannerHtml: '<div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; padding: 1.25rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: var(--shadow-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">' +
        '<div>' +
          '<div style="text-transform: uppercase; font-size: 0.72rem; letter-spacing: 1px; color: #bae6fd; font-weight: 800;">🧭 Education Counselor & Brno Advisor Workspace</div>' +
          '<h2 style="margin: 0.2rem 0; color: white; font-size: 1.25rem;">My Assigned Students & 20-Step Admission Guidance</h2>' +
          '<p style="margin: 0; color: #f0f9ff; font-size: 0.88rem;">Guide your assigned students through nostrification, visa preparation, university submissions, and document updates.</p>' +
        '</div>' +
        '<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">' +
          '<button class="btn btn-light btn-sm" onclick="switchTab(\'counselor\')" style="font-weight:800; color:#0369a1; background:white;">🇨🇿 Counselor Workspace</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'journey\')" style="color:white; border-color:rgba(255,255,255,0.6); font-weight:700;">🎓 20-Step Roadmap</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'taskboard\')" style="color:white; border-color:rgba(255,255,255,0.6); font-weight:700;">📌 Task Board</button>' +
        '</div>' +
      '</div>'
    },
    admission_officer: {
      title: "🛠️ Admin Panel — Admission & Evaluation Officer Portal",
      label: "🎓 Admission Officer",
      badgeClass: "badge-role admission_officer",
      defaultTab: "applications",
      allowedTabs: ["applications", "unidb", "journey", "superdocs", "taskboard", "messages"],
      statLabels: ["Total Applications", "Pending Review", "Legalization Apps", "Offer Letters Issued"],
      bannerHtml: '<div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 1.25rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: var(--shadow-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">' +
        '<div>' +
          '<div style="text-transform: uppercase; font-size: 0.72rem; letter-spacing: 1px; color: #ddd6fe; font-weight: 800;">🎓 Admission & Academic Evaluation Desk</div>' +
          '<h2 style="margin: 0.2rem 0; color: white; font-size: 1.25rem;">Application Credential Evaluation & Offer Issuance</h2>' +
          '<p style="margin: 0; color: #f5f3ff; font-size: 0.88rem;">Verify student transcripts, process nostrification and super-legalization status, and update official university offer stage.</p>' +
        '</div>' +
        '<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">' +
          '<button class="btn btn-light btn-sm" onclick="switchTab(\'applications\')" style="font-weight:800; color:#5b21b6; background:white;">📋 Applications Queue</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'unidb\')" style="color:white; border-color:rgba(255,255,255,0.6); font-weight:700;">🏛️ Universities DB</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'superdocs\')" style="color:white; border-color:rgba(255,255,255,0.6); font-weight:700;">📄 Assign Docs</button>' +
        '</div>' +
      '</div>'
    },
    finance_manager: {
      title: "🛠️ Admin Panel — Financial & Operations Portal",
      label: "💳 Finance Manager",
      badgeClass: "badge-role finance_manager",
      defaultTab: "ops",
      allowedTabs: ["ops", "packages", "applications", "extract", "taskboard"],
      statLabels: ["Package Revenue (€)", "Tuition Deposits (€)", "Active Packages", "Advisor Commissions (€)"],
      bannerHtml: '<div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 1.25rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: var(--shadow-md); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">' +
        '<div>' +
          '<div style="text-transform: uppercase; font-size: 0.72rem; letter-spacing: 1px; color: #a7f3d0; font-weight: 800;">💳 Financial & Operations Portal</div>' +
          '<h2 style="margin: 0.2rem 0; color: white; font-size: 1.25rem;">Service Packages, Deposits & Counselor Payouts</h2>' +
          '<p style="margin: 0; color: #ecfdf5; font-size: 0.88rem;">Monitor package revenues, track tuition fee deposits, manage service charge pricing, and execute advisor payouts.</p>' +
        '</div>' +
        '<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">' +
          '<button class="btn btn-light btn-sm" onclick="switchTab(\'ops\')" style="font-weight:800; color:#047857; background:white;">📈 Finance Overview</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'packages\')" style="color:white; border-color:rgba(255,255,255,0.6); font-weight:700;">🏷️ Service Packages</button>' +
          '<button class="btn btn-outline btn-sm" onclick="switchTab(\'extract\')" style="color:white; border-color:rgba(255,255,255,0.6); font-weight:700;">📊 Export Financials</button>' +
        '</div>' +
      '</div>'
    }
  };

  function runOnReady(fn) {
    if (document.readyState !== "loading") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  function renderRoleUI(role) {
    var normRole = normalizeRole(role);
    currentActiveRole = normRole;
    var cfg = ROLE_CONFIGS[normRole] || ROLE_CONFIGS["admin"];

    // Update Header Page Title
    var titleEl = document.querySelector(".app-head h1");
    if (titleEl) titleEl.textContent = cfg.title;

    // Update Subhead Logged in display
    var roleDisplayEl = document.getElementById("admin-role-display");
    if (roleDisplayEl) {
      var userLabel = (sess && (sess.fullName || sess.email)) ? (sess.fullName || sess.email) : "";
      roleDisplayEl.textContent = userLabel ? (userLabel + " (" + cfg.label + ")") : cfg.label;
      roleDisplayEl.className = cfg.badgeClass;
    }

    // Render Role Banner
    var bannerContainer = document.getElementById("role-banner-container");
    if (bannerContainer) {
      bannerContainer.innerHTML = cfg.bannerHtml;
    }

    // Update Stat Card Labels
    if (cfg.statLabels) {
      var l1 = document.getElementById("s-lbl-1"); if (l1) l1.textContent = cfg.statLabels[0];
      var l2 = document.getElementById("s-lbl-2"); if (l2) l2.textContent = cfg.statLabels[1];
      var l3 = document.getElementById("s-lbl-3"); if (l3) l3.textContent = cfg.statLabels[2];
      var l4 = document.getElementById("s-lbl-4"); if (l4) l4.textContent = cfg.statLabels[3];
    }

    // Filter Visible Tabs
    var tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(function (t) {
      var tabKey = t.getAttribute("data-tab");
      if (cfg.allowedTabs.indexOf(tabKey) !== -1) {
        t.style.display = "inline-block";
      } else {
        t.style.display = "none";
      }
    });

    // Check if current active tab is allowed; if not, switch to default allowed tab
    if (cfg.allowedTabs.indexOf(activeTab) === -1) {
      switchTab(cfg.defaultTab);
    }

    // Configure role switcher dropdown sync
    var previewSelect = document.getElementById("preview-role-select");
    if (previewSelect) {
      previewSelect.value = normRole;
    }
  }

  // Attempt immediate render if DOM element already exists
  if (sess) {
    renderRoleUI(sess.role);
  }

  runOnReady(function () {
    // Render current role in subtitle & banner
    if (sess) {
      renderRoleUI(sess.role);
    }

    // Set up preview role switcher
    var previewSelect = document.getElementById("preview-role-select");
    if (previewSelect) {
      previewSelect.addEventListener("change", function () {
        var selectedRole = this.value;
        renderRoleUI(selectedRole);
        loadStats();
      });
    }

    // Fetch fresh profile from Firestore
    api("getMe").then(function (meRes) {
      if (meRes && meRes.user) {
        var freshRole = meRes.user.role || "super_admin";
        var isStaffRole = (typeof isStaffRole === "function" && isStaffRole(freshRole)) || freshRole === "admin" || freshRole === "super_admin" || freshRole === "staff" || freshRole === "agent" || (typeof isKnownAdminEmail === "function" && isKnownAdminEmail(meRes.user.email || sess.email));
        if (!isStaffRole) {
          location.href = "dashboard.html";
          return;
        }
        sess.role = freshRole;
        if (meRes.user.fullName) sess.fullName = meRes.user.fullName;
        if (meRes.user.email) sess.email = meRes.user.email;
        setSession(sess);

        renderRoleUI(freshRole);
      }
    }).catch(function (err) {
      console.warn("Could not refresh user role from Firestore:", err);
    });

    // Set up click handlers on Tab buttons
    var tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var targetTab = this.getAttribute("data-tab");
        switchTab(targetTab);
      });
    });

    // Check URL parameters or hash for target tab (e.g. ?tab=counselor or #consultant)
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var initialTab = urlParams.get("tab") || window.location.hash.replace("#", "");
      if (initialTab) {
        switchTab(initialTab);
      }
    } catch(e) {}

    loadAll();
    initAlerts();

    document.getElementById("refresh-btn").addEventListener("click", loadAll);
    document.getElementById("f-search").addEventListener("input", renderApps);
    document.getElementById("f-status").addEventListener("change", renderApps);
    
    var fCountry = document.getElementById("f-country");
    if (fCountry) fCountry.addEventListener("change", renderApps);
    
    var fTrack = document.getElementById("f-track");
    if (fTrack) fTrack.addEventListener("change", renderApps);

    var selectAllApps = document.getElementById("chk-select-all-apps");
    if (selectAllApps) {
      selectAllApps.addEventListener("change", function () {
        var isChecked = this.checked;
        document.querySelectorAll(".chk-app-item").forEach(function (chk) {
          chk.checked = isChecked;
        });
        updateBulkBarState();
      });
    }

    var clearBulkBtn = document.getElementById("btn-clear-bulk-selection");
    if (clearBulkBtn) {
      clearBulkBtn.addEventListener("click", function () {
        if (selectAllApps) selectAllApps.checked = false;
        document.querySelectorAll(".chk-app-item").forEach(function (chk) {
          chk.checked = false;
        });
        updateBulkBarState();
      });
    }

    var applyBulkBtn = document.getElementById("btn-apply-bulk-action");
    if (applyBulkBtn) {
      applyBulkBtn.addEventListener("click", executeBulkAction);
    }

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

    var quickTaskForm = document.getElementById("m-quick-task-form");
    if (quickTaskForm) {
      quickTaskForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!currentApp) return;

        var title = document.getElementById("m-quick-task-title").value.trim();
        var dueDate = document.getElementById("m-quick-task-duedate").value;
        var priority = document.getElementById("m-quick-task-priority").value;
        var desc = document.getElementById("m-quick-task-desc").value.trim();
        var notify = document.getElementById("m-quick-task-notify").checked;
        var submitBtn = document.getElementById("btn-submit-quick-task");

        if (!title) {
          alert("Please enter a task title.");
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Assigning...";

        var targetId = currentApp.userId || currentApp.id;

        api("adminCreateTask", {
          assignedTo: targetId,
          assignedToName: currentApp.fullName || "Student",
          assignedToEmail: currentApp.email,
          title: title,
          description: desc,
          priority: priority,
          dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          stage: "admission",
          status: "todo",
          notifyEmail: notify
        }).then(function () {
          document.getElementById("m-quick-task-title").value = "";
          document.getElementById("m-quick-task-desc").value = "";
          if (typeof showToast === "function") {
            showToast("✅ Task assigned to " + currentApp.fullName + " successfully!");
          }
          loadAndRenderModalTasks(targetId, currentApp.id);
        }).catch(function (err) {
          alert("Error creating task: " + err.message);
        }).finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "🚀 Assign Task to Student";
        });
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
    if (!tabName) return;
    var rawName = String(tabName).toLowerCase().trim();
    if (rawName === "consultant" || rawName === "consultants" || rawName === "counselors") rawName = "counselor";
    if (rawName === "programs" || rawName === "program" || rawName === "universities") rawName = "unidb";
    if (rawName === "finance" || rawName === "financial" || rawName === "billing") rawName = "ops";

    activeTab = rawName;
    
    // Deactivate all tab headers
    var tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach(function (t) { t.classList.remove("active"); });

    // Activate selected tab header
    var activeBtn = document.querySelector('.admin-tab[data-tab="' + rawName + '"]');
    if (activeBtn) activeBtn.classList.add("active");

    // Hide all panel sections
    var panels = document.querySelectorAll(".admin-tab-panel");
    panels.forEach(function (p) { p.classList.add("hidden"); });

    // Show active panel
    var activePanel = document.getElementById("panel-" + rawName);
    if (activePanel) activePanel.classList.remove("hidden");

    // Context-specific loads
    if (rawName === "taskboard") {
      loadTasks();
    } else if (rawName === "users") {
      loadUsers();
    } else if (rawName === "ops") {
      loadOpsPanel();
    } else if (rawName === "journey") {
      initJourneyTab();
    } else if (rawName === "email") {
      initEmailTab();
    } else if (rawName === "extract") {
      initExtractTab();
    } else if (rawName === "counselor") {
      initCounselorTab();
    } else if (rawName === "packages") {
      initPackagesTab();
    } else if (rawName === "superdocs") {
      initSuperDocsTab();
    } else if (rawName === "unidb") {
      initUniDbTab();
    } else if (rawName === "testimonials") {
      initTestimonialsTab();
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

  function renderAdminTracingTrail(appObj, steps) {
    var box = document.getElementById("journey-tracing-box");
    var trailEl = document.getElementById("journey-tracing-trail");
    if (!box || !trailEl) return;

    box.style.display = "block";

    var trail = Array.isArray(appObj.stepCompletionTrail) ? appObj.stepCompletionTrail : [];
    if (!trail.length) {
      trailEl.innerHTML = '<span style="color:#94a3b8; font-size:0.82rem; font-style:italic;">No steps marked done yet for this student.</span>';
      return;
    }

    var html = "";
    trail.forEach(function (sNum, index) {
      var sObj = steps.filter(function (x) { return Number(x.step) === Number(sNum); })[0];
      var title = sObj ? sObj.title : ("Step " + sNum);
      
      html += '<div style="display:inline-flex; align-items:center; background:#0284c7; color:#ffffff; padding:0.25rem 0.6rem; border-radius:16px; font-size:0.78rem; font-weight:700;">' +
                '<span style="background:rgba(255,255,255,0.25); border-radius:50%; width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; font-size:0.68rem; margin-right:5px;">' + (index + 1) + '</span>' +
                'Step ' + sNum + ': ' + esc(title) +
              '</div>';

      if (index < trail.length - 1) {
        html += '<span style="color:#38bdf8; font-weight:800; font-size:1rem; margin:0 2px;">➔</span>';
      }
    });

    trailEl.innerHTML = html;
  }

  function renderJourneyStepsGrid(appObj) {
    var grid = document.getElementById("journey-steps-container");
    if (!grid) return;

    var steps = typeof getStudentTrackSteps === "function" ? getStudentTrackSteps(appObj) : (typeof ADMISSION_20_STEPS !== "undefined" ? ADMISSION_20_STEPS : []);
    var custom = appObj.stepCustomData || {};
    var totalSteps = steps.length;

    renderAdminTracingTrail(appObj, steps);

    grid.innerHTML = "";
    steps.forEach(function (s) {
      var sNum = Number(s.step);
      var sData = custom[sNum] || custom[String(sNum)] || {};
      var curStatus = sData.status || "Pending";
      var notesVal = sData.notes || "";

      var trail = Array.isArray(appObj.stepCompletionTrail) ? appObj.stepCompletionTrail : [];
      var trailIdx = trail.indexOf(sNum);
      var rankBadge = (curStatus === "Done" && trailIdx !== -1)
        ? '<span style="font-size:0.7rem; font-weight:800; background:#0284c7; color:#ffffff; padding:1px 6px; border-radius:10px; margin-left:4px;">Rank #' + (trailIdx + 1) + ' Done</span>'
        : '';

      var card = document.createElement("div");
      card.className = "panel";
      card.style.margin = "0";
      card.style.padding = "1rem";
      card.style.border = "1px solid var(--line)";
      card.style.borderRadius = "8px";

      card.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.2rem;">' +
          '<div>' +
            '<strong style="color:var(--blue-900); font-size:0.85rem; background:#f0f7ff; padding:2px 8px; border-radius:12px;">Step ' + s.step + '/' + totalSteps + '</strong>' +
            rankBadge +
          '</div>' +
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

    // Recalculate stepCompletionTrail
    var trail = Array.isArray(selectedJourneyApp.stepCompletionTrail) ? selectedJourneyApp.stepCompletionTrail.slice() : [];

    Object.keys(stepCustomData).forEach(function (k) {
      var sNum = Number(k);
      var st = stepCustomData[k].status;
      if (st === "Done") {
        if (trail.indexOf(sNum) === -1) {
          trail.push(sNum);
        }
      } else {
        var idx = trail.indexOf(sNum);
        if (idx !== -1) {
          trail.splice(idx, 1);
        }
      }
    });

    selectedJourneyApp.stepCompletionTrail = trail;

    api("adminUpdateJourneySteps", {
      appId: selectedJourneyApp.id || selectedJourneyApp.userId,
      stepCustomData: stepCustomData,
      stepCompletionTrail: trail
    }).catch(function (e) { console.warn("adminUpdateJourneySteps error:", e); });

    // Trigger email update notification to student
    fetch('/api/notify-admission-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentEmail: selectedJourneyApp.email,
        studentName: selectedJourneyApp.fullName || 'Student',
        stepTitle: 'Admission Journey Updated',
        newStatus: 'Milestones Updated',
        adminNotes: 'Your admission roadmap has been updated by your advisor.'
      })
    }).catch(function(e) { console.warn("Journey notify email error:", e); });

    setTimeout(function () {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save Step Updates & Notify Student";
      renderJourneyStepsGrid(selectedJourneyApp);
      alert("✅ Admission Journey updated successfully and notification email dispatched to " + selectedJourneyApp.email);
    }, 400);
  }

  /* ============================================================
     2. Private Email & SMTP Settings
     ============================================================ */
  function initEmailTab() {
    api("getEmailConfig")
      .then(function (data) {
        if (!data || !data.ok) return;
        var cfg = data.config || {};
        document.getElementById("smtp-host").value = cfg.host || "";
        document.getElementById("smtp-port").value = cfg.port || 587;
        document.getElementById("smtp-secure").checked = !!cfg.secure;
        document.getElementById("smtp-user").value = cfg.user || "";
        document.getElementById("smtp-pass").value = cfg.pass || "";
        document.getElementById("smtp-from-name").value = cfg.fromName || "StudyCzechBridge Admissions";
        document.getElementById("smtp-from-email").value = cfg.fromEmail || "info@studywithczechbridge.com";
        document.getElementById("smtp-admin-email").value = cfg.adminEmail || "info@studywithczechbridge.com";

        document.getElementById("notify-login").checked = cfg.notifyOnLogin !== false;
        document.getElementById("notify-admission").checked = cfg.notifyOnAdmissionUpdate !== false;
        document.getElementById("notify-doc").checked = cfg.notifyOnDocumentUpload !== false;

        renderEmailLogs(data.logs || []);
      })
      .catch(function (err) { console.warn("Load SMTP config error:", err); });

    // Load Email Templates & Populate Recipient Student Dropdown
    loadEmailTemplatesStudio();

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

        api("saveEmailConfig", body)
        .then(function (res) {
          saveBtn.disabled = false;
          saveBtn.textContent = "💾 Save Email Configuration";
          if (res && res.ok) alert("✅ Private SMTP settings saved successfully!");
          else alert("Error saving SMTP settings: " + (res ? res.message || "Unknown" : "Error"));
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
        var recipient = prompt("Enter email address to send test email to:", document.getElementById("smtp-admin-email").value || "info@studywithczechbridge.com");
        if (!recipient) return;

        testBtn.disabled = true;
        testBtn.textContent = "Sending Test...";

        api("testEmail", { recipient: recipient })
        .then(function (res) {
          testBtn.disabled = false;
          testBtn.textContent = "🧪 Send Test Email";
          if (res && res.ok) {
            alert("✅ Test email dispatched!\nStatus: " + (res.result ? res.result.statusMessage : 'Success'));
            initEmailTab(); // refresh logs
          } else {
            alert("Test email error: " + (res ? res.message : "Error"));
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

  /* Email Template Studio Handlers */
  var loadedTemplatesCache = [];

  function loadEmailTemplatesStudio() {
    // Populate Student Recipients Dropdown
    var studentSelect = document.getElementById("tpl-send-student");
    if (studentSelect) {
      studentSelect.innerHTML = '<option value="">-- Choose student / applicant --</option>';
      allUsers.forEach(function (u) {
        var opt = document.createElement("option");
        opt.value = u.email;
        opt.dataset.name = u.fullName || u.email;
        opt.dataset.country = u.targetCountry || u.country || u.nationality || "Czech Republic";
        opt.dataset.program = u.program || u.serviceTrack || "Study Program";
        opt.textContent = (u.fullName || u.email) + " (" + u.email + ")";
        studentSelect.appendChild(opt);
      });
    }

    // Fetch Saved Email Templates
    fetch("/api/email-templates")
      .then(function (r) { return r.json(); })
      .then(function (res) {
        loadedTemplatesCache = res.templates || [];
        renderSavedTemplatesList();
        populateTemplateDropdown();
      })
      .catch(function (err) {
        console.warn("Could not load email templates:", err);
      });

    setupTemplateStudioEvents();
  }

  function renderSavedTemplatesList() {
    var listEl = document.getElementById("saved-templates-list");
    if (!listEl) return;

    if (!loadedTemplatesCache.length) {
      listEl.innerHTML = '<div class="muted center py-3">No saved email templates yet. Click "+ Create New Email Template" above.</div>';
      return;
    }

    listEl.innerHTML = loadedTemplatesCache.map(function (tpl) {
      return (
        '<div style="background:white; border:1px solid var(--line); border-radius:8px; padding:0.85rem; box-shadow:var(--shadow-sm);">' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.35rem;">' +
            '<strong style="color:var(--blue-900); font-size:0.9rem;">' + esc(tpl.name) + '</strong>' +
            '<span class="badge" style="background:#edf2f7; color:#2d3748; font-size:0.7rem; font-weight:700;">' + esc(tpl.category || "General") + '</span>' +
          '</div>' +
          '<div style="font-size:0.8rem; font-weight:600; color:var(--blue-800); margin-bottom:0.35rem;">Subject: ' + esc(tpl.subject) + '</div>' +
          '<div class="muted" style="font-size:0.75rem; white-space:pre-wrap; max-height:60px; overflow:hidden; text-overflow:ellipsis; margin-bottom:0.5rem; background:#fafafa; padding:0.4rem; border-radius:4px; border:1px solid #eee;">' + esc(tpl.body) + '</div>' +
          '<div style="display:flex; gap:0.4rem; justify-content:flex-end;">' +
            '<button class="btn btn-outline btn-sm btn-use-tpl" data-id="' + tpl.id + '" style="font-size:0.75rem; padding:0.2rem 0.5rem; border-color:var(--teal-600); color:var(--teal-700);">⚡ Use Template</button>' +
            '<button class="btn btn-outline btn-sm btn-edit-tpl" data-id="' + tpl.id + '" style="font-size:0.75rem; padding:0.2rem 0.5rem;">✏️ Edit</button>' +
            '<button class="btn btn-outline btn-sm btn-del-tpl" data-id="' + tpl.id + '" style="font-size:0.75rem; padding:0.2rem 0.5rem; border-color:var(--red-500); color:var(--red-500);">🗑️</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    // Bind action buttons
    listEl.querySelectorAll(".btn-use-tpl").forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute("data-id");
        var sel = document.getElementById("tpl-select-template");
        if (sel) {
          sel.value = id;
          sel.dispatchEvent(new Event("change"));
        }
      };
    });

    listEl.querySelectorAll(".btn-edit-tpl").forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute("data-id");
        var tpl = loadedTemplatesCache.filter(function (x) { return x.id === id; })[0];
        if (!tpl) return;
        document.getElementById("tpl-modal-title").textContent = "Edit Email Template: " + tpl.name;
        document.getElementById("tpl-edit-id").value = tpl.id;
        document.getElementById("tpl-edit-title").value = tpl.name;
        document.getElementById("tpl-edit-category").value = tpl.category || "General";
        document.getElementById("tpl-edit-subject").value = tpl.subject;
        document.getElementById("tpl-edit-body").value = tpl.body;
        document.getElementById("template-editor-modal").style.display = "flex";
      };
    });

    listEl.querySelectorAll(".btn-del-tpl").forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute("data-id");
        if (!confirm("Are you sure you want to delete this email template?")) return;
        fetch("/api/email-templates/" + id, { method: "DELETE" })
          .then(function (r) { return r.json(); })
          .then(function () { loadEmailTemplatesStudio(); })
          .catch(function (err) { alert("Delete template error: " + err.message); });
      };
    });
  }

  function populateTemplateDropdown() {
    var sel = document.getElementById("tpl-select-template");
    if (!sel) return;

    sel.innerHTML = '<option value="">-- Choose a saved template --</option>';
    loadedTemplatesCache.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = "[" + (t.category || "General") + "] " + t.name;
      sel.appendChild(opt);
    });
  }

  var _tplEventsInitialized = false;
  function setupTemplateStudioEvents() {
    if (_tplEventsInitialized) return;
    _tplEventsInitialized = true;

    // Change template event
    var tplSelect = document.getElementById("tpl-select-template");
    if (tplSelect) {
      tplSelect.addEventListener("change", applyTemplatePreview);
    }

    var studentSelect = document.getElementById("tpl-send-student");
    if (studentSelect) {
      studentSelect.addEventListener("change", applyTemplatePreview);
    }

    var notesArea = document.getElementById("tpl-dispatch-notes");
    if (notesArea) {
      notesArea.addEventListener("input", applyTemplatePreview);
    }

    // Modal triggers
    var createBtn = document.getElementById("btn-create-template-modal");
    var modal = document.getElementById("template-editor-modal");
    var closeBtn = document.getElementById("tpl-modal-close");
    var cancelBtn = document.getElementById("tpl-modal-cancel");
    var saveBtn = document.getElementById("tpl-modal-save");

    if (createBtn) {
      createBtn.onclick = function () {
        document.getElementById("tpl-modal-title").textContent = "Create Email Template";
        document.getElementById("tpl-edit-id").value = "";
        document.getElementById("tpl-edit-title").value = "";
        document.getElementById("tpl-edit-category").value = "General";
        document.getElementById("tpl-edit-subject").value = "";
        document.getElementById("tpl-edit-body").value = "";
        modal.style.display = "flex";
      };
    }

    if (closeBtn) closeBtn.onclick = function () { modal.style.display = "none"; };
    if (cancelBtn) cancelBtn.onclick = function () { modal.style.display = "none"; };

    if (saveBtn) {
      saveBtn.onclick = function () {
        saveBtn.disabled = true;
        var payload = {
          id: document.getElementById("tpl-edit-id").value,
          name: document.getElementById("tpl-edit-title").value.trim(),
          category: document.getElementById("tpl-edit-category").value.trim(),
          subject: document.getElementById("tpl-edit-subject").value.trim(),
          body: document.getElementById("tpl-edit-body").value.trim()
        };

        if (!payload.name || !payload.subject || !payload.body) {
          alert("Template Name, Subject, and Body are required.");
          saveBtn.disabled = false;
          return;
        }

        fetch("/api/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            saveBtn.disabled = false;
            if (res.ok) {
              modal.style.display = "none";
              loadEmailTemplatesStudio();
            } else {
              alert("Save template failed: " + (res.error || "Unknown error"));
            }
          })
          .catch(function (err) {
            saveBtn.disabled = false;
            alert("Save template error: " + err.message);
          });
      };
    }

    // Direct Email Dispatch Trigger
    var sendBtn = document.getElementById("btn-dispatch-template-email");
    if (sendBtn) {
      sendBtn.onclick = function () {
        var recipientEmail = document.getElementById("tpl-send-student").value;
        var subject = document.getElementById("tpl-dispatch-subject").value.trim();
        var body = document.getElementById("tpl-dispatch-body").value.trim();
        var statusSpan = document.getElementById("tpl-send-status");

        if (!recipientEmail) {
          alert("Please select a target recipient student first.");
          return;
        }
        if (!subject || !body) {
          alert("Subject and Body cannot be empty.");
          return;
        }

        sendBtn.disabled = true;
        statusSpan.textContent = "⏳ Sending email...";

        fetch("/api/send-template-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: document.getElementById("tpl-select-template").value,
            recipientEmail: recipientEmail,
            customSubject: subject,
            customBody: body,
            variables: {
              student_name: getSelectedStudentData("name"),
              country: getSelectedStudentData("country"),
              program_or_job: getSelectedStudentData("program"),
              counselor_name: (sess && sess.user ? sess.user.fullName : "Czech Bridge Admissions Team"),
              notes: document.getElementById("tpl-dispatch-notes").value.trim()
            }
          })
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            sendBtn.disabled = false;
            if (res.ok) {
              statusSpan.textContent = "✅ Dispatched successfully!";
              statusSpan.style.color = "var(--green)";
              initEmailTab(); // Refresh email log
              setTimeout(function () { statusSpan.textContent = ""; }, 4000);
            } else {
              statusSpan.textContent = "❌ Failed to send";
              statusSpan.style.color = "var(--red-500)";
              alert("Error dispatching email: " + (res.error || "SMTP error"));
            }
          })
          .catch(function (err) {
            sendBtn.disabled = false;
            statusSpan.textContent = "❌ Network error";
            statusSpan.style.color = "var(--red-500)";
            alert("Error sending template email: " + err.message);
          });
      };
    }
  }

  function getSelectedStudentData(key) {
    var sel = document.getElementById("tpl-send-student");
    if (!sel || !sel.selectedIndex || sel.selectedIndex <= 0) return "";
    var opt = sel.options[sel.selectedIndex];
    if (key === "name") return opt.dataset.name || "";
    if (key === "country") return opt.dataset.country || "";
    if (key === "program") return opt.dataset.program || "";
    return "";
  }

  function applyTemplatePreview() {
    var tplId = document.getElementById("tpl-select-template") ? document.getElementById("tpl-select-template").value : "";
    var tpl = loadedTemplatesCache.filter(function (x) { return x.id === tplId; })[0];

    var studentName = getSelectedStudentData("name") || "[Student Name]";
    var country = getSelectedStudentData("country") || "[Target Country]";
    var program = getSelectedStudentData("program") || "[Program / Job]";
    var counselorName = (sess && sess.user ? sess.user.fullName : "Czech Bridge Admissions");
    var notes = document.getElementById("tpl-dispatch-notes") ? document.getElementById("tpl-dispatch-notes").value.trim() : "";

    var subj = tpl ? tpl.subject : (document.getElementById("tpl-dispatch-subject") ? document.getElementById("tpl-dispatch-subject").value : "");
    var body = tpl ? tpl.body : (document.getElementById("tpl-dispatch-body") ? document.getElementById("tpl-dispatch-body").value : "");

    // Perform live token replacements
    subj = subj.replace(/\{student_name\}/g, studentName)
               .replace(/\{country\}/g, country)
               .replace(/\{program_or_job\}/g, program)
               .replace(/\{counselor_name\}/g, counselorName)
               .replace(/\{notes\}/g, notes || "[Notes]");

    body = body.replace(/\{student_name\}/g, studentName)
               .replace(/\{country\}/g, country)
               .replace(/\{program_or_job\}/g, program)
               .replace(/\{counselor_name\}/g, counselorName)
               .replace(/\{notes\}/g, notes || "(No additional notes provided)");

    if (document.getElementById("tpl-dispatch-subject")) {
      document.getElementById("tpl-dispatch-subject").value = subj;
    }
    if (document.getElementById("tpl-dispatch-body")) {
      document.getElementById("tpl-dispatch-body").value = body;
    }
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
      var stats = res.stats || {};
      var normRole = normalizeRole(currentActiveRole);

      if (normRole === "counselor") {
        var myStudentCount = (allUsers || []).filter(function (u) {
          return u.assignedAgentId === (sess ? (sess.userId || sess.token) : "") || u.assignedAgentName === (sess ? sess.fullName : "");
        }).length;
        document.getElementById("s-users").textContent = myStudentCount || stats.users || 0;
        document.getElementById("s-apps").textContent = stats.applications || 0;
        document.getElementById("s-docs").textContent = stats.documents || 0;
        document.getElementById("s-msgs").textContent = stats.messages || 0;
      } else if (normRole === "admission_officer") {
        document.getElementById("s-users").textContent = stats.applications || 0;
        document.getElementById("s-apps").textContent = (stats.byStatus ? ((stats.byStatus["Pending Review"] || 0) + (stats.byStatus["Under Review"] || 0)) : 0);
        document.getElementById("s-docs").textContent = (stats.byStatus ? ((stats.byStatus["Legalization"] || 0) + (stats.byStatus["Super Legalization"] || 0) + (stats.byStatus["Nostrification"] || 0)) : 0);
        document.getElementById("s-msgs").textContent = (stats.byStatus ? ((stats.byStatus["Conditional Admission Letter Received"] || 0) + (stats.byStatus["Main Offer Letter Received"] || 0)) : 0);
      } else if (normRole === "finance_manager") {
        document.getElementById("s-users").textContent = "€" + (stats.revenueEur || 12500);
        document.getElementById("s-apps").textContent = "€" + (stats.tuitionDeposits || 3500);
        document.getElementById("s-docs").textContent = stats.activePackages || 4;
        document.getElementById("s-msgs").textContent = "€" + (stats.commissionsDue || 1200);
      } else {
        document.getElementById("s-users").textContent = stats.users || 0;
        document.getElementById("s-apps").textContent = stats.applications || 0;
        document.getElementById("s-docs").textContent = stats.documents || 0;
        document.getElementById("s-msgs").textContent = stats.messages || 0;
      }
    }).catch(function (err) {
      showNotice("admin-notice", "error", err.message);
    });
  }

  function loadApps() {
    api("adminListApplications").then(function (res) {
      allApps = res.applications || [];
      statuses = res.statuses || [];
      
      var sel = document.getElementById("f-status");
      if (sel) {
        sel.innerHTML = '<option value="">📌 All Statuses</option>' +
          statuses.map(function (s) { return "<option value='" + esc(s) + "'>" + esc(s) + "</option>"; }).join("");
      }

      var bulkStatusSel = document.getElementById("bulk-status-select");
      if (bulkStatusSel) {
        bulkStatusSel.innerHTML = '<option value="">-- Bulk Set Status --</option>' +
          statuses.map(function (s) { return "<option value='" + esc(s) + "'>" + esc(s) + "</option>"; }).join("");
      }

      populateBulkAgentDropdown();
      renderApps();
    }).catch(function (err) {
      var body = document.getElementById("apps-body");
      if (body) {
        body.innerHTML = '<tr><td colspan="8" class="muted">Error: ' + esc(err.message) + "</td></tr>";
      }
    });
  }

  function populateBulkAgentDropdown() {
    var bulkAgentSel = document.getElementById("bulk-agent-select");
    if (!bulkAgentSel) return;
    var agents = allUsers.filter(function (u) {
      return u.role === "agent" || u.role === "admin" || u.role === "super_admin";
    });
    bulkAgentSel.innerHTML = '<option value="">-- Bulk Assign Counselor --</option>' +
      agents.map(function (ag) {
        return '<option value="' + ag.id + '">' + esc(ag.fullName || ag.email) + '</option>';
      }).join("");
  }

  function renderApps() {
    var q = document.getElementById("f-search") ? document.getElementById("f-search").value.trim().toLowerCase() : "";
    var st = document.getElementById("f-status") ? document.getElementById("f-status").value : "";
    var countryFilter = document.getElementById("f-country") ? document.getElementById("f-country").value : "";
    var trackFilter = document.getElementById("f-track") ? document.getElementById("f-track").value : "";
    var body = document.getElementById("apps-body");

    if (!body) return;

    var rows = allApps.filter(function (a) {
      if (st && a.status !== st) return false;
      
      var targetC = a.targetCountry || a.country || "Czech Republic";
      if (countryFilter && targetC.toLowerCase() !== countryFilter.toLowerCase()) return false;

      var serviceTr = a.serviceTrack || a.level || "University Degree";
      if (trackFilter && serviceTr.toLowerCase().indexOf(trackFilter.toLowerCase()) === -1) return false;

      if (q) {
        var matchName = String(a.fullName || "").toLowerCase().indexOf(q) !== -1;
        var matchEmail = String(a.email || "").toLowerCase().indexOf(q) !== -1;
        var matchPhone = String(a.phone || "").toLowerCase().indexOf(q) !== -1;
        var matchProg = String(a.program || "").toLowerCase().indexOf(q) !== -1;
        if (!matchName && !matchEmail && !matchPhone && !matchProg) return false;
      }
      return true;
    });

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted center py-4">No matching candidate applications found.</td></tr>';
      updateBulkBarState();
      return;
    }

    body.innerHTML = "";
    rows.forEach(function (a) {
      var tr = document.createElement("tr");

      var phoneStr = a.phone || "";
      var waUrl = phoneStr ? ("https://wa.me/" + phoneStr.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Hello " + (a.fullName || "Candidate") + ", this is Czech Bridge Admissions regarding your " + (a.targetCountry || "Czechia") + " application.")) : null;

      var agentInfo = a.assignedAgentName 
        ? "<strong style='color:var(--blue-900); font-size:0.85rem;'>" + esc(a.assignedAgentName) + "</strong>" 
        : "<span class='muted' style='font-size:.8rem;'>Unassigned</span>";

      var flagMap = {
        "Czech Republic": "🇨🇿 Czechia",
        "United Kingdom": "🇬🇧 United Kingdom",
        "UK": "🇬🇧 United Kingdom",
        "Iceland": "🇮🇸 Iceland",
        "Malaysia": "🇲🇾 Malaysia",
        "Serbia": "🇷🇸 Serbia",
        "Poland": "🇵🇱 Poland",
        "Hungary": "🇭🇺 Hungary",
        "Slovakia": "🇸🇰 Slovakia"
      };
      var countryLabel = flagMap[a.targetCountry || a.country] || ("🌍 " + (a.targetCountry || a.country || "Czech Republic"));
      var trackLabel = a.serviceTrack || a.level || "Degree";

      tr.innerHTML =
        '<td style="text-align:center;"><input type="checkbox" class="chk-app-item" data-id="' + a.id + '" data-user-id="' + a.userId + '"></td>' +
        '<td>' +
          '<strong style="font-size:0.92rem; color:var(--blue-900);">' + esc(a.fullName) + '</strong>' +
          '<div style="font-size:0.78rem;" class="muted">' + esc(a.email) + '</div>' +
          (phoneStr ? '<div style="font-size:0.75rem; margin-top:2px;"><a href="' + waUrl + '" target="_blank" style="color:#128c7e; text-decoration:none; font-weight:700;">💬 WA: ' + esc(phoneStr) + '</a></div>' : '') +
        '</td>' +
        '<td><span class="badge" style="background:#eef2ff; color:#3730a3; font-weight:700;">' + countryLabel + '</span><br><span class="muted" style="font-size:0.75rem;">' + esc(trackLabel) + '</span></td>' +
        '<td><strong style="font-size:0.85rem;">' + esc(a.program) + '</strong><br><span class="muted" style="font-size:0.75rem;">' + esc(a.level) + '</span></td>' +
        '<td>' + esc(a.intake) + '</td>' +
        '<td><span class="badge ' + (BADGE_CLASS[a.status] || "st-pending") + '">' + esc(a.status) + '</span></td>' +
        '<td>' + agentInfo + '</td>' +
        '<td style="text-align:right; white-space:nowrap;">' +
          '<button class="btn btn-dark btn-sm btn-manage-app" data-id="' + a.id + '" style="font-size:0.75rem; padding:0.25rem 0.55rem; margin-right:0.3rem;">⚡ Manage</button>' +
          '<button class="btn btn-outline btn-sm btn-email-app" data-email="' + a.email + '" style="font-size:0.75rem; padding:0.25rem 0.4rem; border-color:var(--teal-600); color:var(--teal-700);">✉️ Email</button>' +
        '</td>';

      body.appendChild(tr);
    });

    body.querySelectorAll(".chk-app-item").forEach(function (chk) {
      chk.addEventListener("change", updateBulkBarState);
    });

    body.querySelectorAll(".btn-manage-app").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal(this.getAttribute("data-id"));
      });
    });

    body.querySelectorAll(".btn-email-app").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var email = this.getAttribute("data-email");
        switchTab("email");
        var studentSel = document.getElementById("tpl-send-student");
        if (studentSel) {
          studentSel.value = email;
          studentSel.dispatchEvent(new Event("change"));
        }
      });
    });

    updateBulkBarState();
  }

  function updateBulkBarState() {
    var checked = document.querySelectorAll(".chk-app-item:checked");
    var bar = document.getElementById("bulk-actions-bar");
    var countEl = document.getElementById("bulk-selected-count");
    if (!bar || !countEl) return;

    if (checked.length > 0) {
      bar.style.display = "flex";
      countEl.textContent = checked.length + " Selected";
    } else {
      bar.style.display = "none";
    }
  }

  function executeBulkAction() {
    var checked = document.querySelectorAll(".chk-app-item:checked");
    if (!checked.length) {
      alert("Please select at least one application.");
      return;
    }

    var newStatus = document.getElementById("bulk-status-select").value;
    var newAgentId = document.getElementById("bulk-agent-select").value;
    var bulkBtn = document.getElementById("btn-apply-bulk-action");

    if (!newStatus && !newAgentId) {
      alert("Please choose a Status or Counselor to apply bulk changes.");
      return;
    }

    var agentSel = document.getElementById("bulk-agent-select");
    var newAgentName = (agentSel && agentSel.selectedIndex >= 0 && newAgentId) ? agentSel.options[agentSel.selectedIndex].text : "";

    if (!confirm("Are you sure you want to update " + checked.length + " selected applications?")) return;

    bulkBtn.disabled = true;
    bulkBtn.textContent = "⏳ Processing...";

    var promises = [];
    checked.forEach(function (chk) {
      var appId = chk.getAttribute("data-id");
      var userId = chk.getAttribute("data-user-id");

      if (newAgentId) {
        promises.push(api("adminAssignAgent", { studentId: userId, agentId: newAgentId, agentName: newAgentName }));
      }
      if (newStatus) {
        promises.push(api("adminSetStatus", { appId: appId, status: newStatus, adminNotes: "Bulk status update applied by advisor." }));
      }
    });

    Promise.all(promises).then(function () {
      bulkBtn.disabled = false;
      bulkBtn.textContent = "Execute Bulk Action";
      alert("✅ Bulk update completed successfully for " + checked.length + " candidates!");
      loadApps();
    }).catch(function (err) {
      bulkBtn.disabled = false;
      bulkBtn.textContent = "Execute Bulk Action";
      alert("Bulk operation error: " + err.message);
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

      // Setup WhatsApp button in modal
      var waBtn = document.getElementById("m-wa-btn");
      if (waBtn) {
        var p = currentApp.phone || "";
        if (p) {
          waBtn.style.display = "inline-flex";
          waBtn.href = "https://wa.me/" + p.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Hello " + currentApp.fullName + ", this is " + (sess.fullName || "Czech Bridge Admissions") + " regarding your " + (currentApp.targetCountry || "Czechia") + " application.");
        } else {
          waBtn.style.display = "none";
        }
      }

      var emailBtn = document.getElementById("m-email-btn");
      if (emailBtn) {
        emailBtn.onclick = function () {
          closeModal();
          switchTab("email");
          var studentSel = document.getElementById("tpl-send-student");
          if (studentSel) {
            studentSel.value = currentApp.email;
            studentSel.dispatchEvent(new Event("change"));
          }
        };
      }

      var roadmapBtn = document.getElementById("m-roadmap-btn");
      if (roadmapBtn) {
        roadmapBtn.onclick = function () {
          closeModal();
          switchTab("journey");
          var jSel = document.getElementById("journey-student-select");
          if (jSel) {
            jSel.value = currentApp.id;
            jSel.dispatchEvent(new Event("change"));
          }
        };
      }

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

      renderModalFinancialSummary(currentApp);
      loadAndRenderModalTasks(currentApp.userId || currentApp.id, currentApp.id);
      renderModalDocs(res.documents || []);
    }).catch(function (err) {
      document.getElementById("m-title").textContent = "Error";
      document.getElementById("m-details").innerHTML = "<dd>" + esc(err.message) + "</dd>";
    });
  }

  function renderModalFinancialSummary(appObj) {
    if (!appObj) return;
    var reqDep = parseFloat(appObj.requiredDepositAmount || appObj.requiredDeposit || "500") || 500;
    var fee = parseFloat(appObj.serviceFee || "1200") || 1200;
    var deposits = Array.isArray(appObj.deposits) ? appObj.deposits : [];
    var expenses = Array.isArray(appObj.expenses) ? appObj.expenses : [];
    var totalPaidDep = deposits.reduce(function (s, d) { return s + (parseFloat(d.amount) || 0); }, 0);
    var totalExp = expenses.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
    
    var dueAmt = appObj.customDueAmount ? parseFloat(appObj.customDueAmount) : ((fee + totalExp) - totalPaidDep);
    if (isNaN(dueAmt) || dueAmt < 0) dueAmt = 0;

    var reqEl = document.getElementById("m-fin-req-deposit");
    var paidEl = document.getElementById("m-fin-paid-deposit");
    var dueEl = document.getElementById("m-fin-due-amount");
    var dateEl = document.getElementById("m-fin-due-date");

    if (reqEl) reqEl.textContent = "€" + reqDep.toFixed(2);
    if (paidEl) paidEl.textContent = "€" + totalPaidDep.toFixed(2);
    if (dueEl) dueEl.textContent = "€" + dueAmt.toFixed(2);
    if (dateEl) dateEl.textContent = appObj.paymentDueDate || appObj.dueDate || "Not set";

    var qBtn = document.getElementById("m-quick-fin-ledger-btn");
    if (qBtn) {
      qBtn.onclick = function () {
        openFinancialLedgerModal(appObj.id);
      };
    }
  }

  function loadAndRenderModalTasks(targetUserId, targetAppId) {
    var container = document.getElementById("m-assigned-tasks-list");
    if (!container) return;
    container.innerHTML = '<div class="muted center py-2"><span class="spinner dark"></span> Loading candidate tasks...</div>';

    api("adminListTasks").then(function (res) {
      var allT = res.tasks || [];
      var filtered = allT.filter(function (t) {
        return t.assignedTo === targetUserId || t.assignedTo === targetAppId;
      });

      if (!filtered.length) {
        container.innerHTML = '<div class="muted center py-2" style="font-size:0.82rem;">No custom tasks assigned yet. Use the form above to assign a required task to this student.</div>';
        return;
      }

      container.innerHTML = '<table class="data" style="width:100%; font-size:0.82rem;">' +
        '<thead><tr><th>Task Title</th><th>Due Date</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>' +
        '<tbody>' +
        filtered.map(function (t) {
          var pBadge = t.priority === "high" ? '<span class="badge" style="background:#fef2f2; color:#dc2626;">🚨 High</span>' :
                       (t.priority === "low" ? '<span class="badge" style="background:#f0fdf4; color:#166534;">🟢 Low</span>' :
                       '<span class="badge" style="background:#eff6ff; color:#1d4ed8;">🔵 Normal</span>');
          var stBadge = t.status === "done" ? '<span class="badge st-approved">Done ✓</span>' :
                        (t.status === "in_progress" ? '<span class="badge st-review">In Progress</span>' :
                        '<span class="badge st-pending">To Do</span>');

          return '<tr>' +
            '<td><strong>' + esc(t.title) + '</strong>' + (t.description ? '<br><span class="muted" style="font-size:0.75rem;">' + esc(t.description) + '</span>' : '') + '</td>' +
            '<td>' + esc(t.dueDate || "—") + '</td>' +
            '<td>' + pBadge + '</td>' +
            '<td>' + stBadge + '</td>' +
            '<td>' +
              '<button type="button" class="btn btn-outline btn-sm btn-m-toggle-task" data-id="' + t.id + '" data-st="' + t.status + '" style="padding:0.15rem 0.4rem; font-size:0.72rem;">' + (t.status === "done" ? "Undo" : "✓ Complete") + '</button> ' +
              '<button type="button" class="btn btn-danger btn-sm btn-m-del-task" data-id="' + t.id + '" style="padding:0.15rem 0.4rem; font-size:0.72rem;">✕</button>' +
            '</td>' +
          '</tr>';
        }).join("") +
        '</tbody></table>';

      // Attach handlers
      container.querySelectorAll(".btn-m-toggle-task").forEach(function (btn) {
        btn.onclick = function () {
          var taskId = this.getAttribute("data-id");
          var curSt = this.getAttribute("data-st");
          var newSt = curSt === "done" ? "todo" : "done";
          this.disabled = true;
          api("adminUpdateTask", { taskId: taskId, status: newSt }).then(function () {
            loadAndRenderModalTasks(targetUserId, targetAppId);
          }).catch(function (err) { alert(err.message); });
        };
      });

      container.querySelectorAll(".btn-m-del-task").forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm("Delete this assigned task?")) return;
          var taskId = this.getAttribute("data-id");
          this.disabled = true;
          api("adminDeleteTask", { taskId: taskId }).then(function () {
            loadAndRenderModalTasks(targetUserId, targetAppId);
          }).catch(function (err) { alert(err.message); });
        };
      });

    }).catch(function (err) {
      container.innerHTML = '<div class="notice error">Failed to load candidate tasks: ' + esc(err.message) + '</div>';
    });
  }
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

    // Gather counselors & agents for dropdown list
    var agents = allUsers.filter(function (u) {
      return u.role === "agent" || u.role === "counselor" || u.role === "councilor" || u.role === "admin" || u.role === "super_admin";
    });

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
      
      var roles = [
        { val: "student", label: "🎓 Student" },
        { val: "counselor", label: "🧭 Counselor" },
        { val: "admission_officer", label: "🎓 Admission Officer" },
        { val: "finance_manager", label: "💳 Finance Manager" },
        { val: "admin", label: "🛡️ Admin" },
        { val: "super_admin", label: "👑 Super Admin" }
      ];
      roles.forEach(function (rObj) {
        var opt = document.createElement("option");
        opt.value = rObj.val;
        opt.textContent = rObj.label;
        if (u.role === rObj.val || (rObj.val === "counselor" && (u.role === "agent" || u.role === "councilor"))) opt.selected = true;
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
        "<td><span class='badge-role " + (u.role || "student") + "'>" + esc(getRoleLabel(u.role)) + "</span></td>" +
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
    var totalDeposits = 0;
    var totalExpenses = 0;
    var totalComm = 0;

    opsStudentsList.forEach(function (app) {
      var fee = parseFloat(app.serviceFee || "1200");
      var comm = parseFloat(app.advisorCommission || "300");
      if (isNaN(fee)) fee = 1200;
      if (isNaN(comm)) comm = 300;

      totalGross += fee;
      totalComm += comm;

      if (Array.isArray(app.deposits)) {
        app.deposits.forEach(function (d) { totalDeposits += (parseFloat(d.amount) || 0); });
      }
      if (Array.isArray(app.expenses)) {
        app.expenses.forEach(function (e) { totalExpenses += (parseFloat(e.amount) || 0); });
      }
    });

    var netProfit = totalGross - (totalComm + totalExpenses);

    var grossEl = document.getElementById("ops-gross-fees");
    var depEl = document.getElementById("ops-deposits-collected");
    var expEl = document.getElementById("ops-total-expenses");
    var commEl = document.getElementById("ops-commissions");
    var profitEl = document.getElementById("ops-net-profit");

    if (grossEl) grossEl.textContent = "€" + totalGross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (depEl) depEl.textContent = "€" + totalDeposits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (expEl) expEl.textContent = "€" + totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (commEl) commEl.textContent = "€" + totalComm.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (profitEl) profitEl.textContent = "€" + netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    if (!tbody) return;

    if (!opsStudentsList.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="muted center py-3">No active students found in your client base.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    opsStudentsList.forEach(function (app) {
      var tr = document.createElement("tr");

      var serviceFee = parseFloat(app.serviceFee || "1200") || 1200;
      var advComm = parseFloat(app.advisorCommission || "300") || 300;
      var payoutStatus = app.payoutStatus || "Pending";

      var deposits = Array.isArray(app.deposits) ? app.deposits : [];
      var expenses = Array.isArray(app.expenses) ? app.expenses : [];

      var totalDep = deposits.reduce(function (s, d) { return s + (parseFloat(d.amount) || 0); }, 0);
      var totalExp = expenses.reduce(function (s, e) { return s + (parseFloat(e.amount) || 0); }, 0);
      var balDue = (serviceFee + totalExp) - totalDep;
      if (balDue < 0) balDue = 0;

      var isPaid = payoutStatus === "Paid";
      var statusSelectClass = isPaid ? "st-approved" : "st-pending";

      tr.innerHTML = 
        '<td><strong>' + esc(app.fullName) + '</strong><br><span class="muted" style="font-size:0.75rem;">' + esc(app.email) + '</span></td>' +
        '<td>' + esc(app.program) + '<br><span class="badge" style="background:rgba(29,78,137,0.1); color:var(--blue-700); font-size:0.75rem; font-weight:600;">🌍 ' + esc(app.targetCountry || app.nationality || "Czech Republic") + '</span></td>' +
        '<td style="text-align:right; font-weight:700;">€' + serviceFee.toFixed(2) + '</td>' +
        '<td style="text-align:right; font-weight:700; color:var(--green);">+€' + totalDep.toFixed(2) + '</td>' +
        '<td style="text-align:right; font-weight:700; color:#c2410c;">€' + totalExp.toFixed(2) + '</td>' +
        '<td style="text-align:right; font-weight:800; color:' + (balDue > 0 ? '#dc2626' : 'var(--green)') + ';">€' + balDue.toFixed(2) + '</td>' +
        '<td><input type="number" id="comm-input-' + app.id + '" value="' + advComm + '" style="width:75px; padding:0.2rem 0.4rem; border-radius:4px; border:1px solid var(--line); font-size:0.85rem; text-align:right;"></td>' +
        '<td>' +
          '<select id="payout-select-' + app.id + '" class="' + statusSelectClass + '" style="padding:0.2rem 0.4rem; border-radius:4px; border:none; font-size:0.8rem; font-weight:700; cursor:pointer;">' +
            '<option value="Pending"' + (payoutStatus === "Pending" ? " selected" : "") + '>Pending</option>' +
            '<option value="Paid"' + (payoutStatus === "Paid" ? " selected" : "") + '>Paid</option>' +
          '</select>' +
        '</td>' +
        '<td>' +
          '<button class="btn btn-outline btn-sm btn-open-ledger" data-id="' + app.id + '" style="padding:0.25rem 0.5rem; font-size:0.78rem; border-color:#16a34a; color:#15803d; font-weight:700; margin-bottom:0.2rem;">💳 Ledger</button> ' +
          '<button class="btn btn-primary btn-sm btn-save-budget" data-id="' + app.id + '" style="padding:0.25rem 0.5rem; font-size:0.78rem;">Save</button>' +
          '<span id="budget-saved-' + app.id + '" style="display:block; font-size:0.75rem; color:var(--green); font-weight:700; margin-top:0.1rem; text-align:center;"></span>' +
        '</td>';

      tbody.appendChild(tr);
    });

    // Bind open ledger buttons
    tbody.querySelectorAll(".btn-open-ledger").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var appId = this.getAttribute("data-id");
        openFinancialLedgerModal(appId);
      });
    });

    // Bind save budget events
    tbody.querySelectorAll(".btn-save-budget").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var appId = this.getAttribute("data-id");
        var commInput = document.getElementById("comm-input-" + appId);
        var payoutSelect = document.getElementById("payout-select-" + appId);
        var feedback = document.getElementById("budget-saved-" + appId);

        var targetApp = opsStudentsList.filter(function (a) { return a.id === appId; })[0];
        if (!targetApp) return;

        this.disabled = true;
        this.textContent = "Saving...";

        api("adminSaveFinancialLedger", {
          appId: appId,
          serviceFee: targetApp.serviceFee || "1200",
          advisorCommission: commInput.value.trim(),
          payoutStatus: payoutSelect.value,
          deposits: targetApp.deposits || [],
          expenses: targetApp.expenses || []
        }).then(function () {
          feedback.textContent = "Saved ✓";
          loadOpsPanel();
        }).catch(function (err) {
          alert("Error: " + err.message);
        }).finally(function () {
          btn.disabled = false;
          btn.textContent = "Save";
        });
      });
    });
  }

  /* ---------- Financial Ledger Modal Controllers ---------- */
  var activeFinApp = null;
  var activeFinDeposits = [];
  var activeFinExpenses = [];

  function openFinancialLedgerModal(appId) {
    activeFinApp = allApps.filter(function (a) { return a.id === appId; })[0];
    if (!activeFinApp) {
      alert("Application record not found.");
      return;
    }

    activeFinDeposits = Array.isArray(activeFinApp.deposits) ? JSON.parse(JSON.stringify(activeFinApp.deposits)) : [];
    activeFinExpenses = Array.isArray(activeFinApp.expenses) ? JSON.parse(JSON.stringify(activeFinApp.expenses)) : [];

    document.getElementById("fin-modal-student-name").textContent = "💳 " + (activeFinApp.fullName || "Candidate") + " — Financial Ledger";
    document.getElementById("fin-modal-student-info").textContent = (activeFinApp.email || "") + " | Target: " + (activeFinApp.targetCountry || "Czech Republic") + " (" + (activeFinApp.program || "Program") + ")";
    document.getElementById("fin-modal-app-id").textContent = activeFinApp.id;
    document.getElementById("fin-modal-target-appid").value = activeFinApp.id;

    document.getElementById("fin-input-service-fee").value = activeFinApp.serviceFee || "1200";
    var reqDepEl = document.getElementById("fin-input-required-deposit");
    if (reqDepEl) reqDepEl.value = activeFinApp.requiredDepositAmount || activeFinApp.requiredDeposit || "500";
    var dueAmtEl = document.getElementById("fin-input-due-amount");
    if (dueAmtEl) dueAmtEl.value = activeFinApp.customDueAmount || activeFinApp.dueAmount || "";
    var dueDateEl = document.getElementById("fin-input-due-date");
    if (dueDateEl) dueDateEl.value = activeFinApp.paymentDueDate || activeFinApp.dueDate || "";
    var depStatEl = document.getElementById("fin-input-deposit-status");
    if (depStatEl) depStatEl.value = activeFinApp.depositStatus || "Pending Deposit";
    
    document.getElementById("fin-input-commission").value = activeFinApp.advisorCommission || "300";
    document.getElementById("fin-input-payout-status").value = activeFinApp.payoutStatus || "Pending";

    // Reset inline forms
    document.getElementById("fin-add-deposit-box").style.display = "none";
    document.getElementById("fin-add-expense-box").style.display = "none";
    document.getElementById("fin-modal-save-status").textContent = "";

    renderFinModalTables();

    document.getElementById("financial-ledger-modal").style.display = "flex";
  }

  function renderFinModalTables() {
    var fee = parseFloat(document.getElementById("fin-input-service-fee").value) || 0;
    var totalDep = activeFinDeposits.reduce(function (sum, d) { return sum + (parseFloat(d.amount) || 0); }, 0);
    var totalExp = activeFinExpenses.reduce(function (sum, e) { return sum + (parseFloat(e.amount) || 0); }, 0);
    var balDue = (fee + totalExp) - totalDep;
    if (balDue < 0) balDue = 0;

    document.getElementById("fin-calc-deposits").textContent = "€" + totalDep.toFixed(2);
    document.getElementById("fin-calc-expenses").textContent = "€" + totalExp.toFixed(2);
    document.getElementById("fin-calc-balance").textContent = "€" + balDue.toFixed(2);

    // Deposits Table
    var depTbody = document.getElementById("fin-modal-deposits-tbody");
    if (!activeFinDeposits.length) {
      depTbody.innerHTML = '<tr><td colspan="6" class="muted center py-2">No deposits recorded yet. Click "+ Add Deposit Record" above.</td></tr>';
    } else {
      depTbody.innerHTML = activeFinDeposits.map(function (d, idx) {
        var statusClass = d.status === "Verified" ? "st-approved" : "st-pending";
        return '<tr>' +
          '<td><strong>' + esc(d.date || "—") + '</strong></td>' +
          '<td>' + esc(d.description || "Deposit") + '</td>' +
          '<td>' + esc(d.method || "Transfer") + (d.ref ? ' (' + esc(d.ref) + ')' : '') + '</td>' +
          '<td style="text-align:right; font-weight:700; color:var(--green);">+€' + (parseFloat(d.amount) || 0).toFixed(2) + '</td>' +
          '<td><span class="badge ' + statusClass + '" style="font-size:0.75rem;">' + esc(d.status || "Verified") + '</span></td>' +
          '<td><button type="button" class="btn btn-outline btn-sm btn-del-dep" data-idx="' + idx + '" style="color:var(--red-500); padding:0.15rem 0.4rem; font-size:0.75rem;">✕ Delete</button></td>' +
        '</tr>';
      }).join("");

      depTbody.querySelectorAll(".btn-del-dep").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var i = parseInt(this.getAttribute("data-idx"), 10);
          activeFinDeposits.splice(i, 1);
          renderFinModalTables();
        });
      });
    }

    // Expenses Table
    var expTbody = document.getElementById("fin-modal-expenses-tbody");
    if (!activeFinExpenses.length) {
      expTbody.innerHTML = '<tr><td colspan="6" class="muted center py-2">No managed expenses recorded yet. Click "+ Add Managed Expense" above.</td></tr>';
    } else {
      expTbody.innerHTML = activeFinExpenses.map(function (e, idx) {
        return '<tr>' +
          '<td><strong>' + esc(e.date || "—") + '</strong></td>' +
          '<td><strong>' + esc(e.category || "Expense") + '</strong></td>' +
          '<td><span class="muted" style="font-size:0.78rem;">' + esc(e.notes || "—") + '</span></td>' +
          '<td style="text-align:right; font-weight:700; color:#c2410c;">€' + (parseFloat(e.amount) || 0).toFixed(2) + '</td>' +
          '<td><span class="badge" style="font-size:0.75rem; background:var(--blue-50); color:var(--blue-800);">' + esc(e.paidBy || "Agency") + '</span></td>' +
          '<td><button type="button" class="btn btn-outline btn-sm btn-del-exp" data-idx="' + idx + '" style="color:var(--red-500); padding:0.15rem 0.4rem; font-size:0.75rem;">✕ Delete</button></td>' +
        '</tr>';
      }).join("");

      expTbody.querySelectorAll(".btn-del-exp").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var i = parseInt(this.getAttribute("data-idx"), 10);
          activeFinExpenses.splice(i, 1);
          renderFinModalTables();
        });
      });
    }
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

    setupFinancialModalListeners();
  }

  function setupFinancialModalListeners() {
    var modal = document.getElementById("financial-ledger-modal");
    var closeBtn = document.getElementById("fin-modal-close");
    var cancelBtn = document.getElementById("btn-close-fin-modal");

    function closeFinModal() {
      if (modal) modal.style.display = "none";
      activeFinApp = null;
    }

    if (closeBtn) closeBtn.onclick = closeFinModal;
    if (cancelBtn) cancelBtn.onclick = closeFinModal;
    if (modal) {
      modal.onclick = function (e) {
        if (e.target === modal) closeFinModal();
      };
    }

    // Modal open button inside Application Detail modal
    var mFinBtn = document.getElementById("m-fin-ledger-btn");
    if (mFinBtn) {
      mFinBtn.onclick = function () {
        if (currentApp) {
          openFinancialLedgerModal(currentApp.id);
        }
      };
    }

    // Toggle deposit form
    var addDepBtn = document.getElementById("btn-add-deposit-row");
    var addDepBox = document.getElementById("fin-add-deposit-box");
    if (addDepBtn && addDepBox) {
      addDepBtn.onclick = function () {
        var isVis = addDepBox.style.display === "block";
        addDepBox.style.display = isVis ? "none" : "block";
        if (!isVis) {
          document.getElementById("dep-add-date").value = new Date().toISOString().split("T")[0];
          document.getElementById("dep-add-desc").value = "";
          document.getElementById("dep-add-amount").value = "";
          document.getElementById("dep-add-method").value = "Bank Transfer";
          document.getElementById("dep-add-ref").value = "";
        }
      };
    }

    var cancelDepBtn = document.getElementById("btn-cancel-add-deposit");
    if (cancelDepBtn && addDepBox) {
      cancelDepBtn.onclick = function () { addDepBox.style.display = "none"; };
    }

    var saveDepBtn = document.getElementById("btn-save-add-deposit");
    if (saveDepBtn) {
      saveDepBtn.onclick = function () {
        var dt = document.getElementById("dep-add-date").value;
        var desc = document.getElementById("dep-add-desc").value.trim() || "Deposit Payment";
        var amt = parseFloat(document.getElementById("dep-add-amount").value);
        var method = document.getElementById("dep-add-method").value.trim() || "Transfer";
        var ref = document.getElementById("dep-add-ref").value.trim();
        var status = document.getElementById("dep-add-status").value;

        if (isNaN(amt) || amt <= 0) {
          alert("Please enter a valid deposit amount.");
          return;
        }

        activeFinDeposits.push({
          id: "dep_" + Date.now(),
          date: dt || new Date().toISOString().split("T")[0],
          description: desc,
          amount: amt,
          method: method,
          ref: ref,
          status: status
        });

        if (addDepBox) addDepBox.style.display = "none";
        renderFinModalTables();
      };
    }

    // Toggle expense form
    var addExpBtn = document.getElementById("btn-add-expense-row");
    var addExpBox = document.getElementById("fin-add-expense-box");
    if (addExpBtn && addExpBox) {
      addExpBtn.onclick = function () {
        var isVis = addExpBox.style.display === "block";
        addExpBox.style.display = isVis ? "none" : "block";
        if (!isVis) {
          document.getElementById("exp-add-date").value = new Date().toISOString().split("T")[0];
          document.getElementById("exp-add-amount").value = "";
          document.getElementById("exp-add-notes").value = "";
        }
      };
    }

    var cancelExpBtn = document.getElementById("btn-cancel-add-expense");
    if (cancelExpBtn && addExpBox) {
      cancelExpBtn.onclick = function () { addExpBox.style.display = "none"; };
    }

    var saveExpBtn = document.getElementById("btn-save-add-expense");
    if (saveExpBtn) {
      saveExpBtn.onclick = function () {
        var dt = document.getElementById("exp-add-date").value;
        var cat = document.getElementById("exp-add-category").value;
        var amt = parseFloat(document.getElementById("exp-add-amount").value);
        var paidBy = document.getElementById("exp-add-paidby").value;
        var notes = document.getElementById("exp-add-notes").value.trim();

        if (isNaN(amt) || amt <= 0) {
          alert("Please enter a valid expense amount.");
          return;
        }

        activeFinExpenses.push({
          id: "exp_" + Date.now(),
          date: dt || new Date().toISOString().split("T")[0],
          category: cat,
          amount: amt,
          paidBy: paidBy,
          notes: notes
        });

        if (addExpBox) addExpBox.style.display = "none";
        renderFinModalTables();
      };
    }

    // Save full financial ledger button
    var saveLedgerBtn = document.getElementById("btn-save-fin-ledger");
    if (saveLedgerBtn) {
      saveLedgerBtn.onclick = function () {
        var targetAppId = document.getElementById("fin-modal-target-appid").value;
        var feeVal = document.getElementById("fin-input-service-fee").value.trim();
        var reqDepVal = (document.getElementById("fin-input-required-deposit") ? document.getElementById("fin-input-required-deposit").value.trim() : "500");
        var dueAmtVal = (document.getElementById("fin-input-due-amount") ? document.getElementById("fin-input-due-amount").value.trim() : "");
        var dueDateVal = (document.getElementById("fin-input-due-date") ? document.getElementById("fin-input-due-date").value : "");
        var depStatusVal = (document.getElementById("fin-input-deposit-status") ? document.getElementById("fin-input-deposit-status").value : "Pending Deposit");
        var commVal = document.getElementById("fin-input-commission").value.trim();
        var payoutVal = document.getElementById("fin-input-payout-status").value;
        var statusEl = document.getElementById("fin-modal-save-status");

        if (!targetAppId) return;

        saveLedgerBtn.disabled = true;
        saveLedgerBtn.textContent = "Saving...";
        if (statusEl) statusEl.textContent = "Updating financial ledger...";

        api("adminSaveFinancialLedger", {
          appId: targetAppId,
          serviceFee: feeVal,
          requiredDepositAmount: reqDepVal,
          customDueAmount: dueAmtVal,
          paymentDueDate: dueDateVal,
          depositStatus: depStatusVal,
          advisorCommission: commVal,
          payoutStatus: payoutVal,
          deposits: activeFinDeposits,
          expenses: activeFinExpenses
        }).then(function () {
          if (statusEl) statusEl.textContent = "Saved ✓";
          closeFinModal();
          loadAll();
          loadOpsPanel();
          if (typeof showToast === "function") {
            showToast("Financial ledger & deposit amount updated successfully!");
          }
        }).catch(function (err) {
          alert("Error saving financial ledger: " + err.message);
          if (statusEl) statusEl.textContent = "❌ Error";
        }).finally(function () {
          saveLedgerBtn.disabled = false;
          saveLedgerBtn.textContent = "💾 Save Financial Ledger";
        });
      };
    }

    // Dispatch deposit alert email button
    var alertDepBtn = document.getElementById("btn-send-deposit-alert");
    if (alertDepBtn) {
      alertDepBtn.onclick = function () {
        if (!activeFinApp) return;
        var reqDepVal = (document.getElementById("fin-input-required-deposit") ? document.getElementById("fin-input-required-deposit").value.trim() : "500");
        var dueAmtVal = (document.getElementById("fin-input-due-amount") ? document.getElementById("fin-input-due-amount").value.trim() : "");
        var dueDateVal = (document.getElementById("fin-input-due-date") ? document.getElementById("fin-input-due-date").value : "");
        
        alertDepBtn.disabled = true;
        alertDepBtn.textContent = "Sending Alert...";

        var emailSubject = "Official Payment & Deposit Notice — StudyCzechBridge";
        var emailBody = "Dear " + (activeFinApp.fullName || "Candidate") + ",\n\n" +
          "This is an official payment notice regarding your " + (activeFinApp.targetCountry || "Czech Republic") + " university application (App ID: " + activeFinApp.id + ").\n\n" +
          "• Required Deposit Amount: €" + (reqDepVal || "500") + "\n" +
          (dueAmtVal ? "• Total Outstanding Due Amount: €" + dueAmtVal + "\n" : "") +
          (dueDateVal ? "• Payment Deadline: " + dueDateVal + "\n" : "") +
          "\nPlease log in to your StudyCzechBridge student portal to view wire transfer details or upload payment proof:\n" +
          "https://studywithczechbridge.com/dashboard.html\n\n" +
          "Best regards,\nAdmissions & Finance Desk\nStudyCzechBridge Brno HQ";

        fetch("/api/test-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmail: activeFinApp.email,
            subject: emailSubject,
            message: emailBody,
            type: "Deposit_Notice"
          })
        }).then(function (r) { return r.json(); }).then(function (res) {
          if (res.ok) {
            alert("✅ Deposit & Payment alert email dispatched successfully to " + activeFinApp.email);
          } else {
            alert("Email dispatch response: " + (res.message || "Alert dispatched"));
          }
        }).catch(function (err) {
          console.warn("Email alert error:", err);
          alert("Deposit notice recorded (email dispatch attempted).");
        }).finally(function () {
          alertDepBtn.disabled = false;
          alertDepBtn.textContent = "📧 Dispatch Deposit Alert Email";
        });
      };
    }
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
     Counselor Workspace & Advisor Command Center
     ============================================================ */
  function initCounselorTab() {
    var filterSel = document.getElementById("counselor-student-filter");
    if (filterSel) {
      filterSel.removeEventListener("change", renderCounselorWorkspace);
      filterSel.addEventListener("change", renderCounselorWorkspace);
    }
    var searchInput = document.getElementById("counselor-roster-search");
    if (searchInput) {
      searchInput.removeEventListener("input", renderCounselorRoster);
      searchInput.addEventListener("input", renderCounselorRoster);
    }
    var trackFilter = document.getElementById("counselor-track-filter");
    if (trackFilter) {
      trackFilter.removeEventListener("change", renderCounselorRoster);
      trackFilter.addEventListener("change", renderCounselorRoster);
    }

    // Modal Openers
    var btnAdd = document.getElementById("btn-open-add-counselor");
    if (btnAdd) btnAdd.onclick = function() { openCounselorProfileModal(); };

    var btnBcast = document.getElementById("btn-open-counselor-broadcast");
    if (btnBcast) btnBcast.onclick = function() { openCounselorBroadcastModal(); };

    // Modal Closers
    var closeProfile = document.getElementById("btn-close-counselor-modal");
    var cancelProfile = document.getElementById("btn-cancel-counselor-modal");
    if (closeProfile) closeProfile.onclick = closeCounselorProfileModal;
    if (cancelProfile) cancelProfile.onclick = closeCounselorProfileModal;

    var closeBcast = document.getElementById("btn-close-broadcast-modal");
    var cancelBcast = document.getElementById("btn-cancel-broadcast-modal");
    if (closeBcast) closeBcast.onclick = closeCounselorBroadcastModal;
    if (cancelBcast) cancelBcast.onclick = closeCounselorBroadcastModal;

    // Form Submissions
    var profileForm = document.getElementById("form-counselor-profile");
    if (profileForm) profileForm.onsubmit = handleSaveCounselorProfile;

    var broadcastForm = document.getElementById("form-counselor-broadcast");
    if (broadcastForm) broadcastForm.onsubmit = handleDispatchBroadcastEmail;

    renderCounselorRoster();
    renderCounselorWorkspace();
    renderCounselorPayouts();
    renderCounselorPackagesSummary();
  }

  function renderCounselorRoster() {
    var body = document.getElementById("counselor-roster-body");
    if (!body) return;

    var searchVal = document.getElementById("counselor-roster-search") ? document.getElementById("counselor-roster-search").value.toLowerCase().trim() : "";
    var trackVal = document.getElementById("counselor-track-filter") ? document.getElementById("counselor-track-filter").value : "all";

    var counselors = allUsers.filter(function(u) {
      return u.role === "agent" || u.role === "admin" || u.role === "super_admin";
    });

    if (searchVal) {
      counselors = counselors.filter(function(c) {
        return (c.fullName && c.fullName.toLowerCase().includes(searchVal)) ||
               (c.email && c.email.toLowerCase().includes(searchVal)) ||
               (c.specializationTrack && c.specializationTrack.toLowerCase().includes(searchVal));
      });
    }

    if (trackVal !== "all") {
      counselors = counselors.filter(function(c) {
        var spec = (c.specializationTrack || "").toLowerCase();
        if (trackVal === "czech") return spec.includes("czech");
        if (trackVal === "germany") return spec.includes("germany");
        if (trackVal === "austria") return spec.includes("austria");
        if (trackVal === "uk") return spec.includes("uk") || spec.includes("united kingdom");
        if (trackVal === "global") return spec.includes("global");
        return true;
      });
    }

    var countEl = document.getElementById("c-stat-counselors-count");
    if (countEl) countEl.textContent = counselors.length;

    if (!counselors.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted py-4 center">No counselors found matching filter. Click "➕ Add New Counselor" above to register staff counselors.</td></tr>';
      return;
    }

    body.innerHTML = "";
    counselors.forEach(function(c) {
      var tr = document.createElement("tr");

      var assignedApps = allApps.filter(function(a) {
        return a.assignedAgentId === c.id || a.assignedAgentName === c.fullName || (c.email && a.assignedAgentEmail === c.email);
      });

      var cap = c.capacity || 15;
      var loadPercent = Math.min(100, Math.round((assignedApps.length / cap) * 100));
      var trackName = c.specializationTrack || "🇨🇿 Czech Republic (20 Steps)";
      var statusText = c.status || "Active";
      var statusBadge = statusText === "Active" ? "<span class='badge st-approved'>🟢 Active</span>" : (statusText === "On Leave" ? "<span class='badge st-pending'>🟡 On Leave</span>" : "<span class='badge st-rejected'>🔴 Inactive</span>");

      tr.innerHTML =
        "<td><strong>" + esc(c.fullName || c.email) + "</strong><br><span class='muted' style='font-size:0.8rem;'>📧 " + esc(c.email) + (c.phone ? " · 📞 " + esc(c.phone) : "") + "</span></td>" +
        "<td><strong style='color:var(--blue-900); font-size:0.88rem;'>" + esc(trackName) + "</strong></td>" +
        "<td>" +
          "<div style='display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; margin-bottom:2px;'>" +
            "<span>" + assignedApps.length + " / " + cap + " Students</span>" +
            "<span>" + loadPercent + "%</span>" +
          "</div>" +
          "<div style='width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;'>" +
            "<div style='width:" + loadPercent + "%; height:100%; background:" + (loadPercent >= 90 ? "#ef4444" : "#0284c7") + ";'></div>" +
          "</div>" +
        "</td>" +
        "<td><strong>€" + (c.advisorCommission || 300) + "</strong> / placement</td>" +
        "<td>" + statusBadge + "</td>" +
        "<td></td>";

      var actionsTd = tr.lastElementChild;

      var btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-outline btn-sm mr-1";
      btnEdit.style.fontSize = "0.75rem";
      btnEdit.textContent = "✏️ Edit";
      btnEdit.onclick = function() { openCounselorProfileModal(c); };

      var btnTask = document.createElement("button");
      btnTask.className = "btn btn-dark btn-sm mr-1";
      btnTask.style.fontSize = "0.75rem";
      btnTask.textContent = "📩 Task";
      btnTask.onclick = function() {
        switchTab("taskboard");
        setTimeout(function() {
          var tTitle = document.getElementById("task-new-title");
          if (tTitle) {
            tTitle.value = "Assigned Task for " + (c.fullName || c.email);
            tTitle.focus();
          }
        }, 200);
      };

      actionsTd.appendChild(btnEdit);
      actionsTd.appendChild(btnTask);
      body.appendChild(tr);
    });
  }

  function renderCounselorWorkspace() {
    var body = document.getElementById("counselor-students-body");
    if (!body) return;

    var filterVal = document.getElementById("counselor-student-filter") ? document.getElementById("counselor-student-filter").value : "all";
    var currentUser = getCurrentUser();

    var filteredApps = allApps.filter(function (a) {
      if (filterVal === "all") return true;
      if (filterVal === "unassigned") return !a.assignedAgentId && !a.assignedAgentName;
      if (filterVal === "mine") {
        if (!a.assignedAgentId && !a.assignedAgentName) return false;
        if (currentUser && (a.assignedAgentId === currentUser.uid || a.assignedAgentId === currentUser.id || a.assignedAgentName === currentUser.fullName || currentUser.role === "admin" || currentUser.role === "super_admin")) {
          return true;
        }
        return false;
      }
      return true;
    });

    // Stats
    document.getElementById("c-stat-assigned").textContent = allApps.filter(function(a) { return a.assignedAgentId || a.assignedAgentName; }).length;
    var activeCount = allApps.filter(function (a) { return a.status !== "Completed" && a.status !== "Rejected"; }).length;
    document.getElementById("c-stat-active").textContent = activeCount;
    var totalComm = allApps.reduce(function (sum, a) { return sum + (Number(a.advisorCommission) || 0); }, 0);
    document.getElementById("c-stat-commission").textContent = "€" + totalComm;

    if (!filteredApps.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted py-4 center">No student records match the selected filter.</td></tr>';
      return;
    }

    var counselorsList = allUsers.filter(function (u) {
      return u.role === "agent" || u.role === "admin" || u.role === "super_admin";
    });

    body.innerHTML = "";
    filteredApps.forEach(function (a) {
      var tr = document.createElement("tr");
      var currentStepNum = a.stepProgress ? a.stepProgress : 1;
      var currentStepTitle = JOURNEY_20_STEPS[currentStepNum - 1] ? JOURNEY_20_STEPS[currentStepNum - 1].title : "Application Initiated";
      var targetCountry = a.targetCountry || "Czech Republic";

      tr.innerHTML =
        "<td><strong>" + esc(a.fullName) + "</strong><br><span class='muted' style='font-size:.8rem;'>" + esc(a.email) + "</span></td>" +
        "<td>" + esc(a.program) + "<br><span class='muted' style='font-size:.8rem;'>📍 " + esc(targetCountry) + " (" + esc(a.intake || "Sep 2026") + ")</span></td>" +
        "<td><span class='badge " + (BADGE_CLASS[a.status] || "st-pending") + "'>" + esc(a.status) + "</span></td>" +
        "<td><strong style='color:var(--blue-800);'>Step " + currentStepNum + "/20:</strong> " + esc(currentStepTitle) + "</td>" +
        "<td></td>" +
        "<td></td>";

      // Counselor Assignment Dropdown Cell
      var counselorTd = tr.children[4];
      var selAgent = document.createElement("select");
      selAgent.style.padding = "0.38rem 0.5rem";
      selAgent.style.fontSize = "0.82rem";
      selAgent.style.borderRadius = "6px";
      selAgent.style.border = "1px solid var(--line)";
      selAgent.style.fontWeight = "600";
      selAgent.innerHTML = '<option value="">⚠️ Unassigned</option>' +
        counselorsList.map(function (c) {
          var sel = (c.id === a.assignedAgentId || c.fullName === a.assignedAgentName) ? " selected" : "";
          return '<option value="' + c.id + '"' + sel + '>' + esc(c.fullName || c.email) + '</option>';
        }).join("");

      selAgent.addEventListener("change", function () {
        var chosenId = selAgent.value;
        var chosenObj = counselorsList.filter(function (c) { return c.id === chosenId; })[0];
        var chosenName = chosenObj ? chosenObj.fullName : "";

        selAgent.disabled = true;
        api("adminAssignAgent", {
          studentId: a.userId,
          agentId: chosenId,
          agentName: chosenName
        }).then(function () {
          showToast("✅ Counselor assigned & email sent from info@studywithczechbridge.com");
          loadApps();
          loadUsers();
        }).catch(function (err) {
          alert("Error assigning counselor: " + err.message);
        }).finally(function () {
          selAgent.disabled = false;
        });
      });

      counselorTd.appendChild(selAgent);

      var actionsTd = tr.lastElementChild;
      var btnJourney = document.createElement("button");
      btnJourney.className = "btn btn-outline btn-sm mr-1";
      btnJourney.style.fontSize = "0.75rem";
      btnJourney.style.borderColor = "var(--blue-700)";
      btnJourney.style.color = "var(--blue-700)";
      btnJourney.textContent = "🎓 20 Steps";
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
      btnManage.textContent = "Manage";
      btnManage.addEventListener("click", function () {
        openModal(a);
      });

      actionsTd.appendChild(btnJourney);
      actionsTd.appendChild(btnManage);
      body.appendChild(tr);
    });
  }

  function renderCounselorPayouts() {
    var body = document.getElementById("counselor-payouts-body");
    if (!body) return;

    var commApps = allApps.filter(function(a) {
      return Number(a.advisorCommission) > 0 || a.payoutStatus;
    });

    if (!commApps.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted py-4 center">No advisor commission payouts logged yet. Commissions are accrued automatically upon student enrolment.</td></tr>';
      return;
    }

    body.innerHTML = "";
    commApps.forEach(function(a) {
      var tr = document.createElement("tr");
      var commAmt = Number(a.advisorCommission) || 300;
      var status = a.payoutStatus || "Pending";
      var statusBadge = status === "Paid" ? "<span class='badge st-approved'>✅ Paid</span>" : "<span class='badge st-pending'>⌛ Pending Payout</span>";

      tr.innerHTML =
        "<td><strong>" + esc(a.fullName) + "</strong><br><span class='muted' style='font-size:0.8rem;'>" + esc(a.email) + "</span></td>" +
        "<td>" + (a.assignedAgentName ? "<strong>" + esc(a.assignedAgentName) + "</strong>" : "<span class='muted'>Unassigned</span>") + "</td>" +
        "<td>€" + (a.serviceFee || "1200") + "</td>" +
        "<td><strong style='color:#c05621; font-size:1rem;'>€" + commAmt + "</strong></td>" +
        "<td>" + statusBadge + "</td>" +
        "<td></td>";

      var actionTd = tr.lastElementChild;
      var btnPay = document.createElement("button");
      btnPay.className = "btn btn-outline btn-sm";
      btnPay.style.fontSize = "0.75rem";
      btnPay.textContent = status === "Paid" ? "Reopen Payout" : "💸 Mark Paid";
      btnPay.onclick = function() {
        var nextStatus = status === "Paid" ? "Pending" : "Paid";
        btnPay.disabled = true;
        a.payoutStatus = nextStatus;
        api("adminUpdateBudget", {
          appId: a.id,
          advisorCommission: commAmt,
          payoutStatus: nextStatus
        }).then(function() {
          showToast("✅ Payout status updated to " + nextStatus);
          renderCounselorPayouts();
        }).catch(function(err) {
          alert(err.message);
        }).finally(function() {
          btnPay.disabled = false;
        });
      };

      actionTd.appendChild(btnPay);
      body.appendChild(tr);
    });
  }

  function openCounselorProfileModal(counselor) {
    var m = document.getElementById("modal-counselor-profile");
    if (!m) return;
    document.getElementById("counselor-modal-msg").textContent = "";

    if (counselor) {
      document.getElementById("counselor-modal-title").textContent = "✏️ Edit Counselor Profile";
      document.getElementById("counselor-modal-id").value = counselor.id || "";
      document.getElementById("counselor-modal-name").value = counselor.fullName || "";
      document.getElementById("counselor-modal-email").value = counselor.email || "";
      document.getElementById("counselor-modal-phone").value = counselor.phone || "";
      document.getElementById("counselor-modal-track").value = counselor.specializationTrack || "🇨🇿 Czech Republic (Nostrification & Visa)";
      document.getElementById("counselor-modal-commission").value = counselor.advisorCommission || 300;
      document.getElementById("counselor-modal-capacity").value = counselor.capacity || 15;
      document.getElementById("counselor-modal-status").value = counselor.status || "Active";
      document.getElementById("counselor-modal-notes").value = counselor.notes || "";
    } else {
      document.getElementById("counselor-modal-title").textContent = "➕ Register New Counselor";
      document.getElementById("counselor-modal-id").value = "";
      document.getElementById("counselor-modal-name").value = "";
      document.getElementById("counselor-modal-email").value = "";
      document.getElementById("counselor-modal-phone").value = "";
      document.getElementById("counselor-modal-track").value = "🇨🇿 Czech Republic (Nostrification & Visa)";
      document.getElementById("counselor-modal-commission").value = 300;
      document.getElementById("counselor-modal-capacity").value = 15;
      document.getElementById("counselor-modal-status").value = "Active";
      document.getElementById("counselor-modal-notes").value = "";
    }

    m.classList.remove("hidden");
  }

  function closeCounselorProfileModal() {
    var m = document.getElementById("modal-counselor-profile");
    if (m) m.classList.add("hidden");
  }

  function handleSaveCounselorProfile(e) {
    e.preventDefault();
    var msg = document.getElementById("counselor-modal-msg");
    msg.textContent = "Saving counselor profile...";

    var body = {
      id: document.getElementById("counselor-modal-id").value,
      fullName: document.getElementById("counselor-modal-name").value.trim(),
      email: document.getElementById("counselor-modal-email").value.trim(),
      phone: document.getElementById("counselor-modal-phone").value.trim(),
      specializationTrack: document.getElementById("counselor-modal-track").value,
      advisorCommission: Number(document.getElementById("counselor-modal-commission").value) || 300,
      capacity: Number(document.getElementById("counselor-modal-capacity").value) || 15,
      status: document.getElementById("counselor-modal-status").value,
      notes: document.getElementById("counselor-modal-notes").value.trim()
    };

    api("adminSaveCounselorProfile", body).then(function() {
      msg.textContent = "✅ Saved successfully!";
      setTimeout(function() {
        closeCounselorProfileModal();
        loadUsers();
        renderCounselorRoster();
        renderCounselorWorkspace();
      }, 400);
    }).catch(function(err) {
      msg.textContent = "❌ " + err.message;
    });
  }

  function openCounselorBroadcastModal() {
    var m = document.getElementById("modal-counselor-broadcast");
    if (!m) return;
    document.getElementById("broadcast-msg").textContent = "";
    document.getElementById("broadcast-subject").value = "";
    document.getElementById("broadcast-body").value = "";
    m.classList.remove("hidden");
  }

  function closeCounselorBroadcastModal() {
    var m = document.getElementById("modal-counselor-broadcast");
    if (m) m.classList.add("hidden");
  }

  function handleDispatchBroadcastEmail(e) {
    e.preventDefault();
    var msg = document.getElementById("broadcast-msg");
    msg.textContent = "Dispatching broadcast from info@studywithczechbridge.com...";

    var target = document.getElementById("broadcast-target-select").value;
    var subject = document.getElementById("broadcast-subject").value.trim();

    var recipients = [];
    if (target === "all_counselors") {
      recipients = allUsers.filter(function(u) { return u.role === "agent" || u.role === "admin" || u.role === "super_admin"; }).map(function(u) { return u.email; });
    } else {
      recipients = allApps.map(function(a) { return a.email; });
    }

    if (!recipients.length) recipients = ["info@studywithczechbridge.com"];

    Promise.all(recipients.map(function(toEmail) {
      return fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: toEmail })
      }).catch(function(err) { console.warn("Broadcast error:", err); });
    })).then(function() {
      msg.textContent = "✅ Broadcast sent to " + recipients.length + " recipients!";
      setTimeout(function() {
        closeCounselorBroadcastModal();
        showToast("🚀 Broadcast email dispatched from info@studywithczechbridge.com");
      }, 800);
    }).catch(function(err) {
      msg.textContent = "❌ " + err.message;
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

  /* ============================================================
     11. Global University & Country Database Management
     ============================================================ */
  var allUniversitiesList = [];

  function initUniDbTab() {
    loadAdminUniversities();

    var searchInput = document.getElementById("admin-uni-search");
    var countrySelect = document.getElementById("admin-uni-country");
    var typeSelect = document.getElementById("admin-uni-type");
    var addBtn = document.getElementById("btn-add-university");

    if (searchInput) searchInput.oninput = debounceAdmin(renderAdminUniTable, 250);
    if (countrySelect) countrySelect.onchange = renderAdminUniTable;
    if (typeSelect) typeSelect.onchange = renderAdminUniTable;

    if (addBtn) {
      addBtn.onclick = function () {
        openUniEditorModal(null);
      };
    }

    var closeBtn = document.getElementById("btn-close-uni-modal");
    var cancelBtn = document.getElementById("btn-cancel-uni-modal");
    if (closeBtn) closeBtn.onclick = closeUniEditorModal;
    if (cancelBtn) cancelBtn.onclick = closeUniEditorModal;

    var form = document.getElementById("form-uni-editor");
    if (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        saveUniversityEntry();
      };
    }
  }

  function loadAdminUniversities() {
    api("getUniversities", {}).then(function (res) {
      if (!res || !res.universities) return;
      allUniversitiesList = res.universities;
      
      // Populate countries filter
      var countrySel = document.getElementById("admin-uni-country");
      if (countrySel && countrySel.options.length <= 1 && res.countries) {
        res.countries.forEach(function (c) {
          var opt = document.createElement("option");
          opt.value = c;
          opt.textContent = getCountryFlag(c) + " " + c;
          countrySel.appendChild(opt);
        });
      }

      renderAdminUniTable();
    }).catch(function (err) {
      console.error("Failed to load admin universities:", err);
    });
  }

  function renderAdminUniTable() {
    var searchEl = document.getElementById("admin-uni-search");
    var countryEl = document.getElementById("admin-uni-country");
    var typeEl = document.getElementById("admin-uni-type");

    var search = searchEl ? searchEl.value.toLowerCase().trim() : "";
    var country = countryEl ? countryEl.value.toLowerCase().trim() : "";
    var type = typeEl ? typeEl.value.toLowerCase().trim() : "";

    var filtered = allUniversitiesList.filter(function (u) {
      if (country && String(u.country || "").toLowerCase() !== country) return false;
      if (type && String(u.type || "").toLowerCase() !== type) return false;
      if (search) {
        var haystack = (u.name + " " + u.country + " " + u.website + " " + u.tuitionFees + " " + u.type).toLowerCase();
        if (haystack.indexOf(search) === -1) return false;
      }
      return true;
    });

    var badge = document.getElementById("admin-uni-badge");
    if (badge) badge.textContent = filtered.length + " / " + allUniversitiesList.length + " Records";

    var tbody = document.getElementById("admin-uni-tbody");
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2.5rem;" class="muted">No university records match search filters.</td></tr>';
      return;
    }

    var html = filtered.map(function (u) {
      var flag = getCountryFlag(u.country);
      var webBtn = u.website 
        ? '<a href="' + escAttr(u.website) + '" target="_blank" rel="noopener" style="font-weight:700; color:#2563eb; font-size:0.8rem; text-decoration:none;">🌐 Visit Website ↗</a>' 
        : '<span class="muted" style="font-size:0.75rem;">No website</span>';

      var typeTag = u.type === "Public" 
        ? '<span class="badge" style="background:#ecfdf5; color:#047857; font-weight:700;">Public</span>'
        : '<span class="badge" style="background:#fff7ed; color:#c2410c; font-weight:700;">Private</span>';

      return '<tr style="border-bottom: 1px solid #f1f5f9;">' +
        '<td style="padding:0.75rem 0.85rem; font-weight:700; color:#1e293b;">' + flag + ' ' + esc(u.country) + '</td>' +
        '<td style="padding:0.75rem 0.85rem;"><strong style="color:var(--blue-900); font-size:0.9rem;">' + esc(u.name) + '</strong><br>' + webBtn + '</td>' +
        '<td style="padding:0.75rem 0.85rem; text-align:center; font-weight:700; color:#475569;"><span class="badge" style="background:#f8fafc; border:1px solid #cbd5e1; color:#334155;">' + (u.countryTotalUniv || 1) + '</span></td>' +
        '<td style="padding:0.75rem 0.85rem; text-align:center;">' + typeTag + '</td>' +
        '<td style="padding:0.75rem 0.85rem; text-align:center; color:#2563eb; font-weight:700;">' + (u.scienceSubjects || 0) + '</td>' +
        '<td style="padding:0.75rem 0.85rem; text-align:center; color:#059669; font-weight:700;">' + (u.commerceSubjects || 0) + '</td>' +
        '<td style="padding:0.75rem 0.85rem; text-align:center; font-size:0.8rem;"><strong>Arts:</strong> ' + (u.artsSubjects || 0) + '<br><strong>Eng:</strong> ' + (u.engineeringSubjects || 0) + '</td>' +
        '<td style="padding:0.75rem 0.85rem; background:#faf5ff; font-weight:700; color:#6b21a8; font-size:0.82rem;">' + esc(u.tuitionFees || "Contact Faculty") + '</td>' +
        '<td style="padding:0.75rem 0.85rem; text-align:right;">' +
          '<div style="display:inline-flex; gap:0.3rem;">' +
            '<button class="btn btn-outline btn-xs btn-edit-uni" data-id="' + escAttr(u.id) + '" style="font-weight:700;">✏️ Edit</button>' +
            '<button class="btn btn-outline btn-xs btn-del-uni" data-id="' + escAttr(u.id) + '" style="color:#dc2626; border-color:#fca5a5; font-weight:700;">🗑️</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join("");

    tbody.innerHTML = html;

    // Attach button listeners
    tbody.querySelectorAll(".btn-edit-uni").forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute("data-id");
        var match = allUniversitiesList.filter(function (x) { return x.id === id; })[0];
        if (match) openUniEditorModal(match);
      };
    });

    tbody.querySelectorAll(".btn-del-uni").forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this university entry from the database?")) {
          api("adminDeleteUniversity", { id: id }).then(function (res) {
            if (res && res.ok) {
              if (typeof showToast === "function") showToast("University deleted successfully", "success");
              loadAdminUniversities();
            } else {
              alert("Failed to delete university entry.");
            }
          });
        }
      };
    });
  }

  function openUniEditorModal(u) {
    var modal = document.getElementById("modal-uni-editor");
    if (!modal) return;

    var titleEl = document.getElementById("modal-uni-title");
    var idEl = document.getElementById("uni-edit-id");
    var countryEl = document.getElementById("uni-edit-country");
    var totalEl = document.getElementById("uni-edit-countrytotal");
    var nameEl = document.getElementById("uni-edit-name");
    var webEl = document.getElementById("uni-edit-website");
    var typeEl = document.getElementById("uni-edit-type");
    var sciEl = document.getElementById("uni-edit-science");
    var commEl = document.getElementById("uni-edit-commerce");
    var artsEl = document.getElementById("uni-edit-arts");
    var engEl = document.getElementById("uni-edit-engineering");
    var tuiEl = document.getElementById("uni-edit-tuition");
    var msgEl = document.getElementById("uni-modal-msg");

    if (msgEl) msgEl.textContent = "";

    if (u) {
      titleEl.textContent = "✏️ Edit University Record";
      idEl.value = u.id || "";
      countryEl.value = u.country || "";
      totalEl.value = u.countryTotalUniv || u.countryTotal || 1;
      nameEl.value = u.name || "";
      webEl.value = u.website || "";
      typeEl.value = u.type || "Public";
      sciEl.value = u.scienceSubjects || 0;
      commEl.value = u.commerceSubjects || 0;
      artsEl.value = u.artsSubjects || 0;
      engEl.value = u.engineeringSubjects || 0;
      tuiEl.value = u.tuitionFees || "";
    } else {
      titleEl.textContent = "➕ Add New University Record";
      idEl.value = "";
      countryEl.value = "Czech Republic";
      totalEl.value = 26;
      nameEl.value = "";
      webEl.value = "";
      typeEl.value = "Public";
      sciEl.value = 30;
      commEl.value = 20;
      artsEl.value = 15;
      engEl.value = 25;
      tuiEl.value = "Free (Czech) / €2,500 – €11,500/yr (English)";
    }

    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }

  function closeUniEditorModal() {
    var modal = document.getElementById("modal-uni-editor");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  }

  function saveUniversityEntry() {
    var msgEl = document.getElementById("uni-modal-msg");
    if (msgEl) msgEl.textContent = "Saving...";

    var payload = {
      id: document.getElementById("uni-edit-id").value,
      country: document.getElementById("uni-edit-country").value,
      countryTotalUniv: Number(document.getElementById("uni-edit-countrytotal").value),
      name: document.getElementById("uni-edit-name").value,
      website: document.getElementById("uni-edit-website").value,
      type: document.getElementById("uni-edit-type").value,
      scienceSubjects: Number(document.getElementById("uni-edit-science").value),
      commerceSubjects: Number(document.getElementById("uni-edit-commerce").value),
      artsSubjects: Number(document.getElementById("uni-edit-arts").value),
      engineeringSubjects: Number(document.getElementById("uni-edit-engineering").value),
      tuitionFees: document.getElementById("uni-edit-tuition").value
    };

    api("adminSaveUniversity", payload).then(function (res) {
      if (res && res.ok) {
        if (msgEl) msgEl.textContent = "Saved!";
        if (typeof showToast === "function") showToast("University saved successfully!", "success");
        closeUniEditorModal();
        loadAdminUniversities();
      } else {
        if (msgEl) msgEl.textContent = "Error saving. Check required fields.";
      }
    }).catch(function (err) {
      if (msgEl) msgEl.textContent = "Server error saving university.";
    });
  }

  function getCountryFlag(countryName) {
    if (!countryName) return "🌍";
    var c = countryName.toLowerCase();
    if (c.indexOf("czech") !== -1) return "🇨🇿";
    if (c.indexOf("germany") !== -1) return "🇩🇪";
    if (c.indexOf("poland") !== -1) return "🇵🇱";
    if (c.indexOf("uk") !== -1 || c.indexOf("kingdom") !== -1) return "🇬🇧";
    if (c.indexOf("ireland") !== -1) return "🇮🇪";
    if (c.indexOf("hungary") !== -1) return "🇭🇺";
    if (c.indexOf("austria") !== -1) return "🇦🇹";
    if (c.indexOf("canada") !== -1) return "🇨🇦";
    if (c.indexOf("australia") !== -1) return "🇦🇺";
    if (c.indexOf("malaysia") !== -1) return "🇲🇾";
    if (c.indexOf("spain") !== -1) return "🇪🇸";
    if (c.indexOf("italy") !== -1) return "🇮🇹";
    if (c.indexOf("france") !== -1) return "🇫🇷";
    return "🌍";
  }

  function escAttr(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function debounceAdmin(fn, delay) {
    var timer = null;
    return function () {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(context, args); }, delay);
    };
  }

  /* ============================================================
     12. Video Testimonials Management
     ============================================================ */
  var allTestimonialsList = [];

  function initTestimonialsTab() {
    loadAdminTestimonials();

    var addBtn = document.getElementById("btn-add-testimonial");
    if (addBtn) {
      addBtn.onclick = function () {
        openTestimonialEditorModal(null);
      };
    }

    var closeBtn = document.getElementById("btn-close-vt-modal");
    var cancelBtn = document.getElementById("btn-cancel-vt-modal");
    if (closeBtn) closeBtn.onclick = closeTestimonialEditorModal;
    if (cancelBtn) cancelBtn.onclick = closeTestimonialEditorModal;

    var form = document.getElementById("form-vt-editor");
    if (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        saveTestimonialEntry();
      };
    }
  }

  function loadAdminTestimonials() {
    api("getTestimonials", {}).then(function (res) {
      if (!res || !res.testimonials) return;
      allTestimonialsList = res.testimonials;
      renderAdminTestimonials();
    }).catch(function (err) {
      console.error("Failed to load video testimonials:", err);
    });
  }

  function renderAdminTestimonials() {
    var container = document.getElementById("admin-testimonials-container");
    if (!container) return;

    if (allTestimonialsList.length === 0) {
      container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem;" class="muted">No video testimonials found. Click "Add Video Testimonial" to upload one!</div>';
      return;
    }

    var html = allTestimonialsList.map(function (t) {
      var stars = "⭐".repeat(t.rating || 5);
      var videoPreview = "";
      if (t.videoUrl && (t.videoUrl.indexOf("youtube.com") !== -1 || t.videoUrl.indexOf("youtu.be") !== -1)) {
        var ytId = "";
        if (t.videoUrl.indexOf("v=") !== -1) ytId = t.videoUrl.split("v=")[1].split("&")[0];
        else if (t.videoUrl.indexOf("youtu.be/") !== -1) ytId = t.videoUrl.split("youtu.be/")[1].split("?")[0];
        videoPreview = '<iframe src="https://www.youtube.com/embed/' + escAttr(ytId) + '" style="width:100%; height:200px; border-radius:8px; border:none;" allowfullscreen></iframe>';
      } else {
        videoPreview = '<video controls poster="' + escAttr(t.posterUrl || "") + '" src="' + escAttr(t.videoUrl) + '" style="width:100%; height:200px; object-fit:cover; border-radius:8px; background:#0f172a;"></video>';
      }

      return '<div class="card" style="border:1px solid var(--line); border-radius:10px; padding:1.25rem; background:#ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-content:space-between;">' +
        '<div>' +
          '<div style="margin-bottom:0.75rem;">' + videoPreview + '</div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">' +
            '<strong style="color:var(--blue-900); font-size:1rem;">' + esc(t.studentName) + '</strong>' +
            '<span style="font-size:0.8rem;">' + stars + '</span>' +
          '</div>' +
          '<div style="font-size:0.82rem; color:var(--muted); font-weight:600; margin-bottom:0.5rem;">' +
            '📍 ' + esc(t.location) + ' &bull; 🎓 ' + esc(t.university) + ' (' + esc(t.program) + ')' +
          '</div>' +
          '<blockquote style="font-size:0.88rem; color:#334155; font-style:italic; background:#f8fafc; padding:0.6rem 0.8rem; border-left:3px solid #be185d; border-radius:4px; margin:0 0 1rem 0;">"' + esc(t.quote) + '"</blockquote>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:0.75rem;">' +
          '<small class="muted" style="font-size:0.75rem;">ID: ' + esc(t.id) + '</small>' +
          '<div style="display:flex; gap:0.4rem;">' +
            '<button class="btn btn-outline btn-xs btn-edit-vt" data-id="' + escAttr(t.id) + '" style="font-weight:700;">✏️ Edit</button>' +
            '<button class="btn btn-outline btn-xs btn-del-vt" data-id="' + escAttr(t.id) + '" style="color:#dc2626; border-color:#fca5a5; font-weight:700;">🗑️ Delete</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("");

    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll(".btn-edit-vt").forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute("data-id");
        var match = allTestimonialsList.filter(function (x) { return x.id === id; })[0];
        if (match) openTestimonialEditorModal(match);
      };
    });

    container.querySelectorAll(".btn-del-vt").forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this video testimonial?")) {
          api("adminDeleteTestimonial", { id: id }).then(function (res) {
            if (res && res.ok) {
              if (typeof showToast === "function") showToast("Video testimonial deleted!", "success");
              loadAdminTestimonials();
            } else {
              alert("Failed to delete video testimonial.");
            }
          });
        }
      };
    });
  }

  function openTestimonialEditorModal(t) {
    var modal = document.getElementById("modal-testimonial-editor");
    if (!modal) return;

    var titleEl = document.getElementById("modal-vt-title");
    var idEl = document.getElementById("vt-edit-id");
    var nameEl = document.getElementById("vt-edit-name");
    var locEl = document.getElementById("vt-edit-location");
    var uniEl = document.getElementById("vt-edit-university");
    var progEl = document.getElementById("vt-edit-program");
    var vidEl = document.getElementById("vt-edit-videourl");
    var postEl = document.getElementById("vt-edit-posterurl");
    var rateEl = document.getElementById("vt-edit-rating");
    var quoteEl = document.getElementById("vt-edit-quote");
    var msgEl = document.getElementById("vt-modal-msg");

    if (msgEl) msgEl.textContent = "";

    if (t) {
      titleEl.textContent = "✏️ Edit Video Testimonial";
      idEl.value = t.id || "";
      nameEl.value = t.studentName || "";
      locEl.value = t.location || "";
      uniEl.value = t.university || "";
      progEl.value = t.program || "";
      vidEl.value = t.videoUrl || "";
      postEl.value = t.posterUrl || "";
      rateEl.value = String(t.rating || 5);
      quoteEl.value = t.quote || "";
    } else {
      titleEl.textContent = "🎥 Add New Video Testimonial";
      idEl.value = "";
      nameEl.value = "";
      locEl.value = "Dhaka, Bangladesh";
      uniEl.value = "Masaryk University 🇨🇿";
      progEl.value = "BSc Computer Science";
      vidEl.value = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      postEl.value = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80";
      rateEl.value = "5";
      quoteEl.value = "";
    }

    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }

  function closeTestimonialEditorModal() {
    var modal = document.getElementById("modal-testimonial-editor");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  }

  function saveTestimonialEntry() {
    var msgEl = document.getElementById("vt-modal-msg");
    if (msgEl) msgEl.textContent = "Saving...";

    var payload = {
      id: document.getElementById("vt-edit-id").value,
      studentName: document.getElementById("vt-edit-name").value,
      location: document.getElementById("vt-edit-location").value,
      university: document.getElementById("vt-edit-university").value,
      program: document.getElementById("vt-edit-program").value,
      videoUrl: document.getElementById("vt-edit-videourl").value,
      posterUrl: document.getElementById("vt-edit-posterurl").value,
      rating: Number(document.getElementById("vt-edit-rating").value),
      quote: document.getElementById("vt-edit-quote").value,
      videoType: "mp4"
    };

    api("adminSaveTestimonial", payload).then(function (res) {
      if (res && res.ok) {
        if (msgEl) msgEl.textContent = "Saved!";
        if (typeof showToast === "function") showToast("Video testimonial saved successfully!", "success");
        closeTestimonialEditorModal();
        loadAdminTestimonials();
      } else {
        if (msgEl) msgEl.textContent = "Error saving. Check required fields.";
      }
    }).catch(function (err) {
      if (msgEl) msgEl.textContent = "Server error saving video testimonial.";
    });
  }

})();

