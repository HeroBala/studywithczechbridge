/* ============================================================
   StudyCzechBridge — Dynamic Role-Based Task Board Component
   ============================================================
   Supports 4 distinct roles:
   1. Student:
      - Interactive personal checklist with big checkboxes.
      - Progress bar with % completion and interactive feedback.
      - Fast Stage Filter Tabs (All, Admission, Visa).
   2. Brno Agent (Advisor):
      - Filters by "My Assigned Students" (on by default) and "All".
      - Student-specific filters and search bar.
      - Inline status selector, task edit & delete.
   3. Admin / Super Admin:
      - Enterprise-level view of all active student tracks.
      - Agent assignment filters, student filters, search.
      - Modal-based task creation, modifications, and deletion.
   ============================================================ */

var TaskBoardComponent = (function () {
  var _container = null;
  var _session = null;
  var _tasks = [];
  var _users = [];
  var _agents = [];
  var _students = [];
  
  // Filters
  var _searchQuery = "";
  var _selectedStudentId = "";
  var _selectedAgentId = "";
  var _agentMyStudentsOnly = true;
  var _studentStageFilter = "all"; // "all" | "admission" | "visa"

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getBadgeClass(status) {
    var BADGES = {
      "todo": "task-badge todo",
      "in_progress": "task-badge in_progress",
      "done": "task-badge done"
    };
    return BADGES[status] || "task-badge todo";
  }

  function getStatusLabel(status) {
    if (status === "done") return "Completed";
    if (status === "in_progress") return "In Progress";
    return "To Do";
  }

  /* ---------- Modal Controller ---------- */
  var _modalEl = null;
  var _editingTask = null;

  function renderModal() {
    if (_modalEl) {
      document.body.removeChild(_modalEl);
      _modalEl = null;
    }

    _modalEl = document.createElement("div");
    _modalEl.className = "modal-back show";
    _modalEl.style.zIndex = "2000";

    var isEdit = !!_editingTask;
    var title = isEdit ? "✏️ Edit Task" : "📝 Assign New Task";

    var modalHtml = 
      '<div class="modal" style="max-width: 500px; padding: 2rem; position: relative;">' +
        '<button class="modal-close" id="tb-modal-close" style="position: absolute; top: 1rem; right: 1.2rem; background: none; border: none; font-size: 1.2rem; cursor: pointer;">✕</button>' +
        '<h2 style="margin-bottom: 1.2rem; color: var(--blue-900); font-weight: 800; border-bottom: 2px solid var(--line); padding-bottom: 0.5rem;">' + title + '</h2>' +
        '<form id="tb-task-form">' +
          '<div class="field" style="margin-bottom: 1rem;">' +
            '<label style="font-weight:700; display:block; margin-bottom:0.3rem;">Target Student</label>' +
            '<select id="tb-task-student" required style="width:100%; border:1px solid var(--line); border-radius:6px; padding:0.5rem; background: var(--white);"' + (isEdit ? " disabled" : "") + '>';

    if (!isEdit) {
      modalHtml += '<option value="">-- Select a Student --</option>';
      _students.forEach(function (s) {
        modalHtml += '<option value="' + s.id + '">' + esc(s.fullName) + ' (' + esc(s.email) + ')</option>';
      });
    } else {
      modalHtml += '<option value="' + _editingTask.assignedTo + '" selected>' + esc(_editingTask.assignedToName) + '</option>';
    }

    modalHtml += 
            '</select>' +
          '</div>' +

          '<div class="field" style="margin-bottom: 1rem;">' +
            '<label style="font-weight:700; display:block; margin-bottom:0.3rem;">Task Title</label>' +
            '<input type="text" id="tb-task-title" required placeholder="e.g. Upload high school certificate" value="' + (isEdit ? esc(_editingTask.title) : "") + '" style="width:100%; border:1px solid var(--line); border-radius:6px; padding:0.5rem;">' +
          '</div>' +

          '<div class="field" style="margin-bottom: 1rem;">' +
            '<label style="font-weight:700; display:block; margin-bottom:0.3rem;">Task Description</label>' +
            '<textarea id="tb-task-desc" rows="3" placeholder="Provide instructions for the student..." style="width:100%; border:1px solid var(--line); border-radius:6px; padding:0.5rem; font-family:inherit;">' + (isEdit ? esc(_editingTask.description || "") : "") + '</textarea>' +
          '</div>' +

          '<div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">' +
            '<div class="field">' +
              '<label style="font-weight:700; display:block; margin-bottom:0.3rem;">Workflow Phase</label>' +
              '<select id="tb-task-stage" required style="width:100%; border:1px solid var(--line); border-radius:6px; padding:0.5rem; background: var(--white);">' +
                '<option value="admission"' + (isEdit && _editingTask.stage === "admission" ? " selected" : "") + '>Phase 1: Admission</option>' +
                '<option value="visa"' + (isEdit && _editingTask.stage === "visa" ? " selected" : "") + '>Phase 2: Visa</option>' +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label style="font-weight:700; display:block; margin-bottom:0.3rem;">Current Status</label>' +
              '<select id="tb-task-status" required style="width:100%; border:1px solid var(--line); border-radius:6px; padding:0.5rem; background: var(--white);">' +
                '<option value="todo"' + (isEdit && _editingTask.status === "todo" ? " selected" : "") + '>To Do</option>' +
                '<option value="in_progress"' + (isEdit && _editingTask.status === "in_progress" ? " selected" : "") + '>In Progress</option>' +
                '<option value="done"' + (isEdit && _editingTask.status === "done" ? " selected" : "") + '>Completed</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          '<div style="text-align:right; border-top:1px solid var(--line); padding-top:1rem; display:flex; justify-content:flex-end; gap:0.5rem;">' +
            '<button type="button" class="btn btn-outline btn-sm" id="tb-modal-cancel">Cancel</button>' +
            '<button type="submit" class="btn btn-primary btn-sm" id="tb-modal-submit">' + (isEdit ? "Save Changes" : "Assign Task") + '</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    _modalEl.innerHTML = modalHtml;
    document.body.appendChild(_modalEl);

    // Event binding
    _modalEl.querySelector("#tb-modal-close").addEventListener("click", closeModal);
    _modalEl.querySelector("#tb-modal-cancel").addEventListener("click", closeModal);
    _modalEl.querySelector("#tb-task-form").addEventListener("submit", submitModalForm);
    _modalEl.addEventListener("click", function (e) {
      if (e.target === _modalEl) closeModal();
    });
  }

  function closeModal() {
    if (_modalEl) {
      document.body.removeChild(_modalEl);
      _modalEl = null;
    }
    _editingTask = null;
  }

  function submitModalForm(e) {
    e.preventDefault();

    var studSelect = document.getElementById("tb-task-student");
    var titleInput = document.getElementById("tb-task-title");
    var descInput = document.getElementById("tb-task-desc");
    var stageSelect = document.getElementById("tb-task-stage");
    var statusSelect = document.getElementById("tb-task-status");
    var submitBtn = document.getElementById("tb-modal-submit");

    var studentId = studSelect.value;
    var studentName = studSelect.options[studSelect.selectedIndex].text.split(" (")[0];

    if (!studentId || !titleInput.value.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    if (_editingTask) {
      // Edit mode
      api("adminUpdateTask", {
        taskId: _editingTask.id,
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        stage: stageSelect.value,
        status: statusSelect.value
      }).then(function () {
        closeModal();
        reloadTasks();
      }).catch(function (err) {
        alert("Failed to update task: " + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Changes";
      });
    } else {
      // Create mode
      api("adminCreateTask", {
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        assignedTo: studentId,
        assignedToName: studentName,
        stage: stageSelect.value,
        status: statusSelect.value
      }).then(function () {
        closeModal();
        reloadTasks();
      }).catch(function (err) {
        alert("Failed to assign task: " + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Assign Task";
      });
    }
  }


  /* ---------- Data Loaders ---------- */

  function reloadTasks() {
    api("adminListTasks").then(function (res) {
      _tasks = res.tasks || [];
      render();
    }).catch(function (err) {
      console.error("TaskBoardComponent failed to load tasks:", err);
    });
  }

  function loadUsers() {
    // Only staff can list users
    var isStaff = _session.role === "admin" || _session.role === "super_admin" || _session.role === "agent";
    if (!isStaff) return Promise.resolve();

    return api("adminListUsers").then(function (res) {
      _users = res.users || [];
      _students = _users.filter(function (u) { return u.role === "student"; });
      _agents = _users.filter(function (u) { return u.role === "agent"; });
    }).catch(function (err) {
      console.warn("Could not fetch user listings for dropdown filters:", err);
    });
  }


  /* ---------- Main Render Entrypoint ---------- */

  function render() {
    if (!_container) return;
    
    var role = _session.role;
    var html = "";

    if (role === "student") {
      html = renderStudentBoard();
    } else if (role === "agent") {
      html = renderAgentBoard();
    } else if (role === "admin" || role === "super_admin") {
      html = renderAdminBoard();
    } else {
      html = '<div class="muted center py-4">Unauthorized session context. Please log in again.</div>';
    }

    _container.innerHTML = html;
    bindEvents();
  }


  /* ============================================================
     STUDENT VIEW — Interactive Personalized Checklist
     ============================================================ */

  function renderStudentBoard() {
    var studentTasks = _tasks; // Already pre-filtered by Firebase for current user

    // Stage filters
    if (_studentStageFilter === "admission") {
      studentTasks = studentTasks.filter(function (t) { return t.stage === "admission"; });
    } else if (_studentStageFilter === "visa") {
      studentTasks = studentTasks.filter(function (t) { return t.stage === "visa"; });
    }

    // Keyword Search
    if (_searchQuery) {
      var q = _searchQuery.toLowerCase();
      studentTasks = studentTasks.filter(function (t) {
        return t.title.toLowerCase().indexOf(q) !== -1 || (t.description && t.description.toLowerCase().indexOf(q) !== -1);
      });
    }

    // Progress Calculation
    var totalCount = _tasks.length;
    var doneCount = _tasks.filter(function (t) { return t.status === "done"; }).length;
    var pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    // Split for visual stages if stage filter is 'all'
    var admTasks = studentTasks.filter(function (t) { return t.stage === "admission"; });
    var visaTasks = studentTasks.filter(function (t) { return t.stage === "visa"; });

    var motivatorMsg = "Keep up the great work! Complete your assigned steps to clear your path to Europe. 🇨🇿";
    if (pct === 100 && totalCount > 0) motivatorMsg = "Awesome job! You have completed all checklist steps. Your advisor will update you on the next milestone.";
    else if (pct >= 70) motivatorMsg = "Almost there! Just a couple of steps left to unlock your study offer and visa.";
    else if (pct === 0 && totalCount > 0) motivatorMsg = "Welcome! Let's get started on your admission documents today.";

    var boardHtml = 
      '<div style="margin-bottom: 1.5rem;">' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">' +
          '<div>' +
            '<h2 style="font-size:1.4rem; color:var(--blue-900); font-weight:800; display:flex; align-items:center; gap:0.5rem;">' +
              '📋 My Road to Czechia Checklist' +
              '<span class="badge-role student" style="font-size:0.7rem; vertical-align:middle;">Personalized Track</span>' +
            '</h2>' +
            '<p class="muted" style="font-size:0.88rem; margin-top:0.25rem;">Follow these tailored steps designed by your dedicated Brno Advisor.</p>' +
          '</div>' +
          // Interactive progress ring / meter
          '<div style="text-align:right; min-width:200px;">' +
            '<div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.3rem;">' +
              '<span>Progress Tracker</span>' +
              '<span style="color:var(--blue-800);">' + doneCount + ' of ' + totalCount + ' completed (' + pct + '%)</span>' +
            '</div>' +
            '<div style="width:100%; height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; border:1px solid rgba(0,0,0,0.05);">' +
              '<div style="width:' + pct + '%; height:100%; background:linear-gradient(90deg, var(--blue-700), var(--green)); border-radius:999px; transition: width 0.6s cubic-bezier(0.1, 0.8, 0.3, 1);"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="notice info" style="margin-bottom:1.5rem; font-size:0.85rem; padding:0.8rem 1rem; border-radius:8px; display:flex; align-items:center; gap:0.5rem;">' +
          '💡 <span>' + motivatorMsg + '</span>' +
        '</div>' +

        // Fast Filters & Search Row
        '<div style="display:flex; gap:1rem; margin-bottom:1.5rem; justify-content:space-between; align-items:center; flex-wrap:wrap;">' +
          '<div style="display:flex; gap:0.4rem; background:#f1f5f9; padding:0.25rem; border-radius:999px;">' +
            '<button class="tb-tab ' + (_studentStageFilter === "all" ? "active" : "") + '" data-filter="all" style="border:none; background:none; padding:0.4rem 1rem; border-radius:999px; font-size:0.8rem; font-weight:700; cursor:pointer;">All Steps</button>' +
            '<button class="tb-tab ' + (_studentStageFilter === "admission" ? "active" : "") + '" data-filter="admission" style="border:none; background:none; padding:0.4rem 1rem; border-radius:999px; font-size:0.8rem; font-weight:700; cursor:pointer;">🎓 Admission Phase</button>' +
            '<button class="tb-tab ' + (_studentStageFilter === "visa" ? "active" : "") + '" data-filter="visa" style="border:none; background:none; padding:0.4rem 1rem; border-radius:999px; font-size:0.8rem; font-weight:700; cursor:pointer;">🛂 Visa Phase</button>' +
          '</div>' +
          '<div>' +
            '<input type="text" id="tb-search" placeholder="🔍 Search tasks..." value="' + esc(_searchQuery) + '" style="padding:0.4rem 1rem; border-radius:999px; border:1px solid var(--line); font-size:0.85rem; width:220px; background:var(--white);">' +
          '</div>' +
        '</div>';

    // RENDER CHECKLIST CHUNKS
    boardHtml += '<div class="task-stages">';

    // Column 1: University Admission
    if (_studentStageFilter === "all" || _studentStageFilter === "admission") {
      boardHtml += 
        '<div class="stage-col" style="background:#fcfdfe;">' +
          '<h3 style="font-size:1.05rem; font-weight:800; border-bottom:2px solid #e2e8f0; padding-bottom:0.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">' +
            '<span>🎓 Phase 1: University Admission</span>' +
            '<span style="background:var(--blue-50); color:var(--blue-800); font-size:0.75rem; padding:0.15rem 0.5rem; border-radius:999px;">' + admTasks.length + ' tasks</span>' +
          '</h3>' +
          '<div class="task-card-list">';

      if (!admTasks.length) {
        boardHtml += '<div class="muted center py-3" style="font-size:0.85rem;">No admission tasks assigned at this moment.</div>';
      } else {
        admTasks.forEach(function (t) {
          boardHtml += renderStudentTaskCard(t);
        });
      }

      boardHtml += '</div></div>';
    }

    // Column 2: Visa Approval
    if (_studentStageFilter === "all" || _studentStageFilter === "visa") {
      boardHtml += 
        '<div class="stage-col" style="background:#fcfdfe;">' +
          '<h3 style="font-size:1.05rem; font-weight:800; border-bottom:2px solid #e2e8f0; padding-bottom:0.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">' +
            '<span>🛂 Phase 2: Visa Approval Process</span>' +
            '<span style="background:var(--blue-50); color:var(--blue-800); font-size:0.75rem; padding:0.15rem 0.5rem; border-radius:999px;">' + visaTasks.length + ' tasks</span>' +
          '</h3>' +
          '<div class="task-card-list">';

      if (!visaTasks.length) {
        boardHtml += '<div class="muted center py-3" style="font-size:0.85rem;">No visa stages assigned yet. (Starts after Admission Offer)</div>';
      } else {
        visaTasks.forEach(function (t) {
          boardHtml += renderStudentTaskCard(t);
        });
      }

      boardHtml += '</div></div>';
    }

    boardHtml += '</div>'; // End stages
    return boardHtml;
  }

  function renderStudentTaskCard(t) {
    var isDone = t.status === "done";
    var containerClass = "task-card " + t.status;
    var statusLabel = getStatusLabel(t.status);

    var cardHtml = 
      '<div class="' + containerClass + '" style="border-radius:10px; border-left-width:5px; box-shadow:var(--shadow-sm); padding:1rem; transition:all 0.2s; cursor:pointer;">' +
        '<div style="display:flex; gap:0.9rem; align-items:flex-start; width:100%;">' +
          '<div style="margin-top:0.2rem;">' +
            '<input type="checkbox" class="tb-student-checkbox" data-id="' + t.id + '"' + (isDone ? " checked" : "") + ' style="width:1.25rem; height:1.25rem; cursor:pointer; accent-color:var(--green);">' +
          '</div>' +
          '<div style="flex-grow:1;">' +
            '<h4 style="font-size:0.95rem; font-weight:700; margin-bottom:0.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap; gap:0.5rem;">' +
              '<span style="' + (isDone ? "text-decoration:line-through; color:var(--ink-soft);" : "color:var(--blue-900);") + '">' + esc(t.title) + '</span>' +
              '<span class="' + getBadgeClass(t.status) + '" style="font-size:0.65rem; padding:0.1rem 0.5rem;">' + statusLabel + '</span>' +
            '</h4>' +
            '<p class="task-desc" style="font-size:0.85rem; margin-bottom:0.4rem; color:var(--ink-soft); line-height:1.45;">' + esc(t.description || "No details provided.") + '</p>' +
            '<div class="task-meta" style="font-size:0.75rem; color:var(--ink-soft); border-top:1px dashed var(--line); padding-top:0.35rem; margin-top:0.35rem; display:flex; justify-content:space-between; align-items:center;">' +
              '<span>Advisor: <strong>' + esc(t.assignedByName || "Brno Advisor") + '</strong></span>' +
              (t.completedAt ? '<span>Done: ' + new Date(t.completedAt).toLocaleDateString("en-GB", {day:"numeric", month:"short"}) + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    return cardHtml;
  }


  /* ============================================================
     AGENT VIEW — Brno Advisor Dedicated Task Board
     ============================================================ */

  function renderAgentBoard() {
    var agentTasks = _tasks;

    // Filter tasks by "My Students Only"
    if (_agentMyStudentsOnly) {
      agentTasks = agentTasks.filter(function (t) {
        // Find if student is assigned to current agent
        var stu = _students.find(function (s) { return s.id === t.assignedTo; });
        var isMyStu = stu && stu.assignedAgentId === _session.uid;
        var assignedByMe = t.assignedBy === _session.uid;
        return isMyStu || assignedByMe;
      });
    }

    // Filter by specific Student dropdown selector
    if (_selectedStudentId) {
      agentTasks = agentTasks.filter(function (t) { return t.assignedTo === _selectedStudentId; });
    }

    // Search bar filter
    if (_searchQuery) {
      var q = _searchQuery.toLowerCase();
      agentTasks = agentTasks.filter(function (t) {
        return t.title.toLowerCase().indexOf(q) !== -1 || 
               (t.description && t.description.toLowerCase().indexOf(q) !== -1) ||
               t.assignedToName.toLowerCase().indexOf(q) !== -1;
      });
    }

    var admTasks = agentTasks.filter(function (t) { return t.stage === "admission"; });
    var visaTasks = agentTasks.filter(function (t) { return t.stage === "visa"; });

    var boardHtml = 
      '<div style="margin-bottom: 1rem;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.2rem;">' +
          '<div>' +
            '<h2 style="font-size:1.35rem; color:var(--blue-900); font-weight:800; display:flex; align-items:center; gap:0.5rem;">' +
              '📋 Brno Agent Workboard' +
              '<span class="badge-role agent" style="font-size:0.7rem;">Active Advisor</span>' +
            '</h2>' +
            '<p class="muted" style="font-size:0.88rem; margin-top:0.2rem;">Manage admissions, legalizations, and visa checklist steps for your students.</p>' +
          '</div>' +
          '<div>' +
            '<button class="btn btn-primary btn-sm" id="tb-create-btn">+ Assign Task</button>' +
          '</div>' +
        '</div>' +

        // Controls bar
        '<div class="filter-bar" style="display:flex; gap:1rem; align-items:center; justify-content:space-between; flex-wrap:wrap; background:#f8fafc; padding:0.8rem 1rem; border-radius:8px; border:1px solid var(--line); margin-bottom:1.5rem;">' +
          '<div style="display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">' +
            // My Students Toggle
            '<label style="display:flex; align-items:center; gap:0.4rem; font-weight:700; font-size:0.85rem; cursor:pointer;">' +
              '<input type="checkbox" id="tb-my-students-toggle" ' + (_agentMyStudentsOnly ? "checked" : "") + ' style="width:1.1rem; height:1.1rem;">' +
              '⭐ My Students Only' +
            '</label>' +

            // Student Dropdown Filter
            '<select id="tb-filter-student" style="padding:0.4rem; border-radius:6px; border:1px solid var(--line); font-size:0.85rem; background:var(--white); min-width:180px;">' +
              '<option value="">-- All Students --</option>';

    var relevantStudents = _agentMyStudentsOnly 
      ? _students.filter(function(s) { return s.assignedAgentId === _session.uid; })
      : _students;

    relevantStudents.forEach(function (s) {
      var sel = s.id === _selectedStudentId ? " selected" : "";
      boardHtml += '<option value="' + s.id + '"' + sel + '>' + esc(s.fullName) + '</option>';
    });

    boardHtml += 
            '</select>' +
          '</div>' +

          '<div>' +
            '<input type="text" id="tb-search" placeholder="🔍 Search student or task..." value="' + esc(_searchQuery) + '" style="padding:0.4rem 1rem; border-radius:999px; border:1px solid var(--line); font-size:0.85rem; width:220px; background:var(--white);">' +
          '</div>' +
        '</div>';

    // Kanban Columns
    boardHtml += 
      '<div class="task-stages">' +
        // Phase 1 Admission
        '<div class="stage-col">' +
          '<h3 style="font-size:1.1rem; font-weight:800; border-bottom:2px solid rgba(20,49,94,0.1); padding-bottom:0.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">' +
            '<span>🎓 Phase 1: University Admission</span>' +
            '<span style="background:rgba(20,49,94,0.06); color:var(--blue-800); font-size:0.75rem; padding:0.15rem 0.5rem; border-radius:999px;">' + admTasks.length + '</span>' +
          '</h3>' +
          '<div class="task-card-list" id="tb-list-admission">';

    if (!admTasks.length) {
      boardHtml += '<div class="muted center py-3">No tasks found.</div>';
    } else {
      admTasks.forEach(function (t) {
        boardHtml += renderStaffTaskCard(t);
      });
    }

    boardHtml += 
          '</div>' +
        '</div>' +

        // Phase 2 Visa
        '<div class="stage-col">' +
          '<h3 style="font-size:1.1rem; font-weight:800; border-bottom:2px solid rgba(20,49,94,0.1); padding-bottom:0.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">' +
            '<span>🛂 Phase 2: Visa Approval</span>' +
            '<span style="background:rgba(20,49,94,0.06); color:var(--blue-800); font-size:0.75rem; padding:0.15rem 0.5rem; border-radius:999px;">' + visaTasks.length + '</span>' +
          '</h3>' +
          '<div class="task-card-list" id="tb-list-visa">';

    if (!visaTasks.length) {
      boardHtml += '<div class="muted center py-3">No tasks found.</div>';
    } else {
      visaTasks.forEach(function (t) {
        boardHtml += renderStaffTaskCard(t);
      });
    }

    boardHtml += 
          '</div>' +
        '</div>' +
      '</div>';

    return boardHtml;
  }


  /* ============================================================
     ADMIN & SUPER ADMIN VIEW — Full Pipeline Command Center
     ============================================================ */

  function renderAdminBoard() {
    var adminTasks = _tasks;

    // Filter by Student
    if (_selectedStudentId) {
      adminTasks = adminTasks.filter(function (t) { return t.assignedTo === _selectedStudentId; });
    }

    // Filter by Agent (Who is supporting the student)
    if (_selectedAgentId) {
      adminTasks = adminTasks.filter(function (t) {
        var stu = _students.find(function (s) { return s.id === t.assignedTo; });
        return stu && stu.assignedAgentId === _selectedAgentId;
      });
    }

    // Search query
    if (_searchQuery) {
      var q = _searchQuery.toLowerCase();
      adminTasks = adminTasks.filter(function (t) {
        return t.title.toLowerCase().indexOf(q) !== -1 || 
               (t.description && t.description.toLowerCase().indexOf(q) !== -1) ||
               t.assignedToName.toLowerCase().indexOf(q) !== -1 ||
               (t.assignedByName && t.assignedByName.toLowerCase().indexOf(q) !== -1);
      });
    }

    var admTasks = adminTasks.filter(function (t) { return t.stage === "admission"; });
    var visaTasks = adminTasks.filter(function (t) { return t.stage === "visa"; });

    var roleBadge = _session.role === "super_admin" ? "Super Admin" : "Admin";
    var badgeClass = _session.role === "super_admin" ? "super_admin" : "admin";

    var boardHtml = 
      '<div style="margin-bottom: 1rem;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.2rem;">' +
          '<div>' +
            '<h2 style="font-size:1.35rem; color:var(--blue-900); font-weight:800; display:flex; align-items:center; gap:0.5rem;">' +
              '📋 Student Track Control Board' +
              '<span class="badge-role ' + badgeClass + '" style="font-size:0.7rem;">' + roleBadge + '</span>' +
            '</h2>' +
            '<p class="muted" style="font-size:0.88rem; margin-top:0.2rem;">Monitor and manage custom checklist roadmap milestones for all active applicants.</p>' +
          '</div>' +
          '<div>' +
            '<button class="btn btn-primary btn-sm" id="tb-create-btn">+ Assign New Task</button>' +
          '</div>' +
        '</div>' +

        // Filters Bar
        '<div class="filter-bar" style="display:flex; gap:1rem; align-items:center; justify-content:space-between; flex-wrap:wrap; background:#f8fafc; padding:0.8rem 1rem; border-radius:8px; border:1px solid var(--line); margin-bottom:1.5rem;">' +
          '<div style="display:flex; gap:0.8rem; align-items:center; flex-wrap:wrap;">' +
            // Student Dropdown Filter
            '<select id="tb-filter-student" style="padding:0.4rem; border-radius:6px; border:1px solid var(--line); font-size:0.85rem; background:var(--white); min-width:180px;">' +
              '<option value="">-- All Students --</option>';

    _students.forEach(function (s) {
      var sel = s.id === _selectedStudentId ? " selected" : "";
      boardHtml += '<option value="' + s.id + '"' + sel + '>' + esc(s.fullName) + '</option>';
    });

    boardHtml += 
            '</select>' +

            // Agent Dropdown Filter
            '<select id="tb-filter-agent" style="padding:0.4rem; border-radius:6px; border:1px solid var(--line); font-size:0.85rem; background:var(--white); min-width:180px;">' +
              '<option value="">-- All Brno Agents --</option>';

    _agents.forEach(function (a) {
      var sel = a.id === _selectedAgentId ? " selected" : "";
      boardHtml += '<option value="' + a.id + '"' + sel + '>' + esc(a.fullName) + '</option>';
    });

    boardHtml += 
            '</select>' +
          '</div>' +

          '<div>' +
            '<input type="text" id="tb-search" placeholder="🔍 Search student, advisor, or task..." value="' + esc(_searchQuery) + '" style="padding:0.4rem 1rem; border-radius:999px; border:1px solid var(--line); font-size:0.85rem; width:220px; background:var(--white);">' +
          '</div>' +
        '</div>';

    // Columns
    boardHtml += 
      '<div class="task-stages">' +
        // Phase 1 Admission
        '<div class="stage-col">' +
          '<h3 style="font-size:1.1rem; font-weight:800; border-bottom:2px solid rgba(20,49,94,0.1); padding-bottom:0.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">' +
            '<span>🎓 Phase 1: University Admission</span>' +
            '<span style="background:rgba(20,49,94,0.06); color:var(--blue-800); font-size:0.75rem; padding:0.15rem 0.5rem; border-radius:999px;">' + admTasks.length + '</span>' +
          '</h3>' +
          '<div class="task-card-list" id="tb-list-admission">';

    if (!admTasks.length) {
      boardHtml += '<div class="muted center py-3">No tasks found.</div>';
    } else {
      admTasks.forEach(function (t) {
        boardHtml += renderStaffTaskCard(t);
      });
    }

    boardHtml += 
          '</div>' +
        '</div>' +

        // Phase 2 Visa
        '<div class="stage-col">' +
          '<h3 style="font-size:1.1rem; font-weight:800; border-bottom:2px solid rgba(20,49,94,0.1); padding-bottom:0.5rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">' +
            '<span>🛂 Phase 2: Visa Approval</span>' +
            '<span style="background:rgba(20,49,94,0.06); color:var(--blue-800); font-size:0.75rem; padding:0.15rem 0.5rem; border-radius:999px;">' + visaTasks.length + '</span>' +
          '</h3>' +
          '<div class="task-card-list" id="tb-list-visa">';

    if (!visaTasks.length) {
      boardHtml += '<div class="muted center py-3">No tasks found.</div>';
    } else {
      visaTasks.forEach(function (t) {
        boardHtml += renderStaffTaskCard(t);
      });
    }

    boardHtml += 
          '</div>' +
        '</div>' +
      '</div>';

    return boardHtml;
  }

  function renderStaffTaskCard(t) {
    var statusLabel = getStatusLabel(t.status);
    
    // Find if the student is assigned to current agent
    var sUser = _students.find(function (s) { return s.id === t.assignedTo; });
    var isMyStudent = sUser && sUser.assignedAgentId === _session.uid;

    var starBadge = isMyStudent 
      ? '<span style="background:#e0f2fe; color:#0369a1; font-size:0.65rem; padding:0.1rem 0.4rem; border-radius:999px; font-weight:700; margin-left:0.5rem;">⭐ My Student</span>'
      : '';

    var cardHtml = 
      '<div class="task-card ' + t.status + '" style="padding: 1rem; border-radius: 8px; border-left-width: 5px; box-shadow: var(--shadow-sm); position: relative;">' +
        '<div>' +
          '<h4 style="font-size:0.95rem; font-weight:700; color:var(--blue-900); display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.3rem;">' +
            '<span>' + esc(t.title) + starBadge + '</span>' +
            '<span class="' + getBadgeClass(t.status) + '" style="font-size:0.65rem;">' + statusLabel + '</span>' +
          '</h4>' +
          '<p class="task-desc" style="font-size:0.85rem; color:var(--ink-soft); margin-bottom:0.5rem; line-height:1.4;">' + esc(t.description || "No details provided.") + '</p>' +
          
          '<div style="font-size:0.8rem; margin-bottom:0.4rem; color:var(--blue-800); background: #f1f5f9; padding:0.25rem 0.5rem; border-radius:4px; display:inline-block;">' +
            '👤 Applicant: <strong>' + esc(t.assignedToName) + '</strong>' +
          '</div>' +

          '<div class="task-meta" style="font-size:0.75rem; color:var(--ink-soft); border-top:1px dashed var(--line); padding-top:0.4rem; margin-top:0.4rem; display:flex; justify-content:space-between; align-items:center;">' +
            '<span>By: ' + esc(t.assignedByName) + '</span>' +
            '<div style="display:flex; gap:0.4rem; align-items:center;">' +
              '<select class="tb-status-select" data-id="' + t.id + '" style="padding:0.2rem; font-size:0.75rem; border-radius:4px; border:1px solid var(--line); background:var(--white);">' +
                '<option value="todo"' + (t.status === "todo" ? " selected" : "") + '>To Do</option>' +
                '<option value="in_progress"' + (t.status === "in_progress" ? " selected" : "") + '>In Progress</option>' +
                '<option value="done"' + (t.status === "done" ? " selected" : "") + '>Completed</option>' +
              '</select>' +
              '<button class="btn btn-outline btn-sm tb-edit-btn" data-id="' + t.id + '" style="padding:0.15rem 0.4rem; font-size:0.7rem;">✏️</button>' +
              '<button class="btn btn-danger btn-sm tb-delete-btn" data-id="' + t.id + '" style="padding:0.15rem 0.4rem; font-size:0.7rem; color:var(--white);">✕</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return cardHtml;
  }


  /* ============================================================
     EVENT BINDINGS & INTERACTIONS
     ============================================================ */

  function bindEvents() {
    var role = _session.role;

    // Search bar
    var searchEl = document.getElementById("tb-search");
    if (searchEl) {
      searchEl.addEventListener("input", function () {
        _searchQuery = this.value;
        render();
        // Refocus to allow smooth continuous typing
        var freshSearchEl = document.getElementById("tb-search");
        if (freshSearchEl) {
          freshSearchEl.focus();
          // Move cursor to end
          var val = freshSearchEl.value;
          freshSearchEl.value = "";
          freshSearchEl.value = val;
        }
      });
    }

    // Role Specific events
    if (role === "student") {
      // Toggle checklists
      var checkboxes = _container.querySelectorAll(".tb-student-checkbox");
      checkboxes.forEach(function (box) {
        box.addEventListener("change", function () {
          var taskId = this.getAttribute("data-id");
          var newStatus = this.checked ? "done" : "in_progress";
          
          this.disabled = true; // prevent double taps
          api("adminUpdateTask", { taskId: taskId, status: newStatus }).then(function () {
            reloadTasks();
          }).catch(function (err) {
            alert("Could not update: " + err.message);
            reloadTasks();
          });
        });
      });

      // Tab clicks
      var tabs = _container.querySelectorAll(".tb-tab");
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          _studentStageFilter = this.getAttribute("data-filter");
          render();
        });
      });

    } else {
      // Create button
      var createBtn = document.getElementById("tb-create-btn");
      if (createBtn) {
        createBtn.addEventListener("click", function () {
          _editingTask = null;
          renderModal();
        });
      }

      // Inline Status select
      var selects = _container.querySelectorAll(".tb-status-select");
      selects.forEach(function (sel) {
        sel.addEventListener("change", function () {
          var taskId = this.getAttribute("data-id");
          var val = this.value;
          this.disabled = true;
          api("adminUpdateTask", { taskId: taskId, status: val }).then(function () {
            reloadTasks();
          }).catch(function (err) {
            alert("Could not update task status: " + err.message);
            reloadTasks();
          });
        });
      });

      // Edit Button
      var editBtns = _container.querySelectorAll(".tb-edit-btn");
      editBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var taskId = this.getAttribute("data-id");
          _editingTask = _tasks.find(function (t) { return t.id === taskId; });
          if (_editingTask) {
            renderModal();
          }
        });
      });

      // Delete Button
      var deleteBtns = _container.querySelectorAll(".tb-delete-btn");
      deleteBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var taskId = this.getAttribute("data-id");
          if (confirm("Are you sure you want to delete this task milestone? This is permanent.")) {
            this.disabled = true;
            api("adminDeleteTask", { taskId: taskId }).then(function () {
              reloadTasks();
            }).catch(function (err) {
              alert("Could not delete task: " + err.message);
              reloadTasks();
            });
          }
        });
      });

      // Student Dropdown Filter
      var filterStudent = document.getElementById("tb-filter-student");
      if (filterStudent) {
        filterStudent.addEventListener("change", function () {
          _selectedStudentId = this.value;
          render();
        });
      }

      if (role === "agent") {
        // My Students Toggle
        var toggle = document.getElementById("tb-my-students-toggle");
        if (toggle) {
          toggle.addEventListener("change", function () {
            _agentMyStudentsOnly = this.checked;
            _selectedStudentId = ""; // clear student filter since list changes
            render();
          });
        }
      } else if (role === "admin" || role === "super_admin") {
        // Agent Dropdown Filter
        var filterAgent = document.getElementById("tb-filter-agent");
        if (filterAgent) {
          filterAgent.addEventListener("change", function () {
            _selectedAgentId = this.value;
            render();
          });
        }
      }
    }
  }


  /* ---------- Public API ---------- */

  return {
    init: function (containerId, session) {
      _container = document.getElementById(containerId);
      _session = session;
      
      if (!_container) return;
      _container.innerHTML = '<div class="muted center py-4"><span class="spinner dark"></span> Initializing adaptive task track...</div>';

      // Load tasks + listings then render
      loadUsers().then(function () {
        api("adminListTasks").then(function (res) {
          _tasks = res.tasks || [];
          render();
        }).catch(function (err) {
          _container.innerHTML = '<div class="notice error">Failed to load milestones: ' + esc(err.message) + '</div>';
        });
      });
    }
  };
})();
