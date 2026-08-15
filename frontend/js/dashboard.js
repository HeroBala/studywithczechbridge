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

  function runOnReady(fn) {
    if (document.readyState !== "loading") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  runOnReady(function () {
    var helloEl = document.getElementById("hello");
    if (helloEl) {
      helloEl.textContent = "Welcome, " + (sess.fullName || "Student") + " 👋";
    }

    var jumpUploadBtn = document.getElementById("btn-jump-upload-deposit");
    if (jumpUploadBtn) {
      jumpUploadBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var docTypeSel = document.getElementById("doc-type");
        if (docTypeSel) {
          docTypeSel.value = "Deposit Payment Receipt";
        }
        var target = document.getElementById("vault-upload-anchor");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

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

  function setupCountrySelector(a) {
    var sel = document.getElementById("dash-country-select");
    var label = document.getElementById("dash-active-country-label");
    if (!sel) return;

    var curCountry = a ? (a.targetCountry || a.country || "Czech Republic") : "Czech Republic";
    sel.value = curCountry;
    if (label) label.textContent = curCountry;

    sel.onchange = function () {
      var newCountry = sel.value;
      if (label) label.textContent = newCountry;
      if (a) {
        a.targetCountry = newCountry;
      } else {
        a = { targetCountry: newCountry, status: "Pending Review" };
      }
      render20StepsGrid(a.status || "Pending Review", a);
      renderStudentFinancialLedger(a);

      api("updateMyApplication", { targetCountry: newCountry }).catch(function (err) {
        console.warn("Update country error:", err);
      });
    };
  }

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

      setupCountrySelector(a);
      renderTracker(a.status);
      var isUnlocked = renderDepositLockGate(a);
      render20StepsGrid(a.status, a, isUnlocked);
      renderCounselorCard(a);
      renderStudentFinancialLedger(a);

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

  function isDepositUnlocked(appObj) {
    if (!appObj) return false;
    if (appObj.isProcessUnlocked === true) return true;
    var stat = (appObj.depositStatus || "").toLowerCase();
    if (stat === "deposit paid" || stat === "fully settled" || stat === "verified") return true;

    var deposits = Array.isArray(appObj.deposits) ? appObj.deposits : [];
    var totalVerified = deposits.reduce(function (sum, d) {
      var isV = !d.status || d.status === "Verified";
      return isV ? sum + (parseFloat(d.amount) || 0) : sum;
    }, 0);

    // Minimum 50k deposit requirement (or custom required deposit if specified)
    var reqAmt = 50000;
    if (appObj.requiredDepositAmount && parseFloat(appObj.requiredDepositAmount) > 0) {
      reqAmt = parseFloat(appObj.requiredDepositAmount);
    }

    if (totalVerified >= reqAmt || totalVerified >= 50000) return true;
    return false;
  }

  function renderDepositLockGate(appObj) {
    var lockBanner = document.getElementById("deposit-lock-banner");
    var unlockBanner = document.getElementById("deposit-unlocked-banner");
    var isUnlocked = isDepositUnlocked(appObj);

    var deposits = (appObj && Array.isArray(appObj.deposits)) ? appObj.deposits : [];
    var totalVerified = deposits.reduce(function (sum, d) {
      var isV = !d.status || d.status === "Verified";
      return isV ? sum + (parseFloat(d.amount) || 0) : sum;
    }, 0);

    var reqAmt = 50000;
    if (appObj && appObj.requiredDepositAmount && parseFloat(appObj.requiredDepositAmount) > 0) {
      reqAmt = parseFloat(appObj.requiredDepositAmount);
    }

    if (isUnlocked) {
      if (lockBanner) lockBanner.style.display = "none";
      if (unlockBanner) unlockBanner.style.display = "block";
    } else {
      if (lockBanner) lockBanner.style.display = "block";
      if (unlockBanner) unlockBanner.style.display = "none";
      
      var progText = document.getElementById("deposit-lock-progress-text");
      var progBar = document.getElementById("deposit-lock-progress-bar");
      if (progText) {
        progText.textContent = totalVerified.toLocaleString() + " / " + reqAmt.toLocaleString() + " Paid (Pending Verification)";
      }
      if (progBar) {
        var pct = Math.min(100, Math.round((totalVerified / reqAmt) * 100));
        progBar.style.width = pct + "%";
      }
    }

    return isUnlocked;
  }

  function renderPersonalizedProcessTracker(appObj, steps, isUnlocked) {
    var totalSteps = steps.length;
    var customStepData = appObj && appObj.stepCustomData ? appObj.stepCustomData : {};
    var completionTrail = appObj && Array.isArray(appObj.stepCompletionTrail) ? appObj.stepCompletionTrail : [];

    var completedSteps = [];
    var pendingOrActiveSteps = [];

    steps.forEach(function (sObj) {
      var sNum = Number(sObj.step);
      var custom = customStepData[sNum] || customStepData[String(sNum)] || {};
      var status = custom.status || "Pending";
      if (status === "Done") {
        completedSteps.push({ stepObj: sObj, stepNum: sNum, custom: custom });
      } else {
        pendingOrActiveSteps.push({ stepObj: sObj, stepNum: sNum, custom: custom, status: status });
      }
    });

    var completedCount = completedSteps.length;
    var percentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

    var statsBadge = document.getElementById("process-stats-badge");
    var pctLabel = document.getElementById("process-percentage-label");
    var progressBar = document.getElementById("process-progress-bar-fill");

    if (statsBadge) statsBadge.textContent = completedCount + " / " + totalSteps + " Milestones Completed";
    if (pctLabel) pctLabel.textContent = percentage + "% Completed";
    if (progressBar) progressBar.style.width = percentage + "%";

    // 1. Render Steps Done List
    var doneListEl = document.getElementById("steps-done-list");
    var doneCountBadge = document.getElementById("steps-done-count-badge");
    if (doneCountBadge) doneCountBadge.textContent = completedCount + " Done";

    if (doneListEl) {
      if (!completedSteps.length) {
        doneListEl.innerHTML = '<div class="muted" style="font-size:0.85rem; padding:0.75rem; text-align:center; background:#ffffff; border-radius:6px; border:1px dashed #bbf7d0;">' +
          'No milestones marked as done yet. Once your 50k deposit is verified, your counselor will begin executing your university submission steps!' +
        '</div>';
      } else {
        doneListEl.innerHTML = completedSteps.map(function (item) {
          var trailIdx = completionTrail.indexOf(item.stepNum);
          var rankText = trailIdx !== -1 ? 'Rank #' + (trailIdx + 1) : 'Done';
          return '<div style="background:#ffffff; border:1px solid #86efac; border-radius:6px; padding:0.55rem 0.75rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">' +
            '<div>' +
              '<div style="font-weight:700; font-size:0.85rem; color:#166534;">' +
                '✓ Step ' + item.stepNum + ': ' + escapeHtml(item.stepObj.title) +
              '</div>' +
              (item.custom.notes ? '<div style="font-size:0.75rem; color:#65a30d; margin-top:2px;">' + escapeHtml(item.custom.notes) + '</div>' : '') +
            '</div>' +
            '<span class="badge st-approved" style="font-size:0.7rem; font-weight:800; white-space:nowrap;">' + rankText + '</span>' +
          '</div>';
        }).join("");
      }
    }

    // 2. Render Active / Next Step Card
    var activeCardEl = document.getElementById("current-active-step-card");
    if (activeCardEl) {
      if (!isUnlocked) {
        activeCardEl.innerHTML =
          '<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:0.85rem; margin-bottom:0.5rem;">' +
            '<div style="font-weight:800; color:#92400e; font-size:0.92rem; margin-bottom:0.3rem;">🔒 Step Tracking Locked</div>' +
            '<div style="font-size:0.82rem; color:#78350f; line-height:1.4;">' +
              'Your official admission progression is awaiting verification of your <strong>minimum 50,000 initial deposit</strong>.' +
            '</div>' +
          '</div>' +
          '<a href="#vault-upload-anchor" class="btn btn-primary btn-sm" style="background:#d97706; border-color:#d97706; text-align:center; font-weight:700; padding:0.45rem;">' +
            '📤 Upload Deposit Slip to Unlock' +
          '</a>';
      } else if (!pendingOrActiveSteps.length) {
        activeCardEl.innerHTML =
          '<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:1rem; text-align:center;">' +
            '<div style="font-size:1.5rem; margin-bottom:0.3rem;">🎉</div>' +
            '<div style="font-weight:800; color:#166534; font-size:0.95rem;">All Milestones Completed!</div>' +
            '<div style="font-size:0.82rem; color:#15803d; margin-top:0.25rem;">Congratulations! You have successfully completed all admission and visa steps.</div>' +
          '</div>';
      } else {
        var nextItem = pendingOrActiveSteps[0];
        activeCardEl.innerHTML =
          '<div>' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">' +
              '<span style="font-weight:800; font-size:0.82rem; color:#1d4ed8; background:#dbeafe; padding:2px 8px; border-radius:12px;">' +
                'Step ' + nextItem.stepNum + ' of ' + totalSteps +
              '</span>' +
              '<span class="badge" style="background:#2563eb; color:#ffffff; font-size:0.72rem; font-weight:700;">' +
                (nextItem.status === "In Progress" ? "In Progress" : "Next In Line") +
              '</span>' +
            '</div>' +
            '<div style="font-weight:800; font-size:0.98rem; color:#1e3a8a; margin-bottom:0.3rem;">' +
              escapeHtml(nextItem.stepObj.title) +
            '</div>' +
            '<div style="font-size:0.82rem; color:#3b82f6; line-height:1.4; margin-bottom:0.6rem;">' +
              escapeHtml(nextItem.stepObj.desc) +
            '</div>' +
            (nextItem.custom.notes ? '<div style="background:#fffbeb; border-left:3px solid #f59e0b; padding:0.4rem; border-radius:4px; font-size:0.78rem; color:#92400e; margin-bottom:0.6rem;"><strong>Brno Advisor Note:</strong> ' + escapeHtml(nextItem.custom.notes) + '</div>' : '') +
          '</div>' +
          '<div style="display:flex; gap:0.5rem; justify-content:space-between; align-items:center; padding-top:0.5rem; border-top:1px solid #bfdbfe;">' +
            '<button type="button" class="btn btn-primary btn-sm btn-quick-complete-step" data-step="' + nextItem.stepNum + '" style="flex:1; background:#16a34a; border-color:#16a34a; font-weight:700; font-size:0.8rem; padding:0.45rem;">' +
              '✅ Mark Step ' + nextItem.stepNum + ' Completed' +
            '</button>' +
          '</div>';

        var quickBtn = activeCardEl.querySelector(".btn-quick-complete-step");
        if (quickBtn) {
          quickBtn.onclick = function () {
            var stepNum = Number(this.getAttribute("data-step"));
            updateStudentStepStatus(appObj, steps, stepNum, "Done");
          };
        }
      }
    }

    // 3. Render Upcoming Steps List
    var upcomingListEl = document.getElementById("steps-upcoming-list");
    var upcomingCountBadge = document.getElementById("steps-upcoming-count-badge");
    var remainingCount = pendingOrActiveSteps.length;
    if (upcomingCountBadge) upcomingCountBadge.textContent = remainingCount + " Remaining";

    if (upcomingListEl) {
      if (!pendingOrActiveSteps.length) {
        upcomingListEl.innerHTML = '<div class="muted" style="font-size:0.85rem; padding:0.5rem; text-align:center;">No upcoming steps — complete!</div>';
      } else {
        upcomingListEl.innerHTML = pendingOrActiveSteps.map(function (item, idx) {
          var isNext = idx === 0;
          return '<div style="background:' + (isNext ? '#ffffff' : 'rgba(255,255,255,0.7)') + '; border:1px solid ' + (isNext ? '#93c5fd' : '#e2e8f0') + '; border-radius:6px; padding:0.45rem 0.65rem; display:flex; justify-content:space-between; align-items:center;">' +
            '<div style="font-size:0.82rem; font-weight:' + (isNext ? '700' : '600') + '; color:' + (isNext ? '#1e40af' : '#475569') + ';">' +
              'Step ' + item.stepNum + ': ' + escapeHtml(item.stepObj.title) +
            '</div>' +
            '<span style="font-size:0.72rem; color:' + (isNext ? '#2563eb' : '#94a3b8') + '; font-weight:700;">' + (isNext ? 'Next ➔' : 'Pending') + '</span>' +
          '</div>';
        }).join("");
      }
    }
  }

  function render20StepsGrid(currentStatus, appObj, isUnlockedParam) {
    var grid = document.getElementById("student-20-steps-grid");
    if (!grid) return;

    var steps = typeof getStudentTrackSteps === "function" ? getStudentTrackSteps(appObj) : (typeof ADMISSION_20_STEPS !== "undefined" ? ADMISSION_20_STEPS : []);
    if (!steps.length) return;

    var isUnlocked = typeof isUnlockedParam === "boolean" ? isUnlockedParam : isDepositUnlocked(appObj);
    var totalSteps = steps.length;
    var customStepData = appObj && appObj.stepCustomData ? appObj.stepCustomData : {};
    var completionTrail = appObj && Array.isArray(appObj.stepCompletionTrail) ? appObj.stepCompletionTrail : [];

    // Render the Personalized Process Tracker (Done vs Next vs Upcoming)
    renderPersonalizedProcessTracker(appObj, steps, isUnlocked);

    // Render the Sequential Tracing Trail Box
    renderStepTracingTrail(steps, completionTrail, customStepData);

    grid.innerHTML = "";
    steps.forEach(function (sObj) {
      var sNum = Number(sObj.step);
      var custom = customStepData[sNum] || customStepData[String(sNum)] || {};
      
      var curStatus = custom.status || "Pending";
      var isCompleted = curStatus === "Done";
      var isCurrent = curStatus === "In Progress";
      var isActionReq = curStatus === "Action Required";

      var trailIndex = completionTrail.indexOf(sNum);
      var orderBadgeHtml = (isCompleted && trailIndex !== -1)
        ? '<span style="font-size:0.72rem; font-weight:800; background:#0284c7; color:#ffffff; padding:2px 8px; border-radius:12px; margin-left:4px;">Rank #' + (trailIndex + 1) + ' Completed</span>'
        : '';

      var badgeBg = isCompleted ? "#1e8e5a" : (isActionReq ? "#dc2626" : (isCurrent ? "#14315e" : "#e2e8f0"));
      var badgeColor = isCompleted || isCurrent || isActionReq ? "#ffffff" : "#475569";

      var card = document.createElement("div");
      card.style.cssText = "background:#ffffff; border:1px solid " + (isCompleted ? "#22c55e" : (isCurrent ? "var(--blue-700)" : "var(--line)")) +
        "; border-radius:8px; padding:0.85rem; display:flex; flex-direction:column; justify-content:space-between;" +
        (isCurrent ? "box-shadow: 0 4px 12px rgba(20,49,94,0.12);" : "");

      var selectDisabledAttr = !isUnlocked ? 'disabled title="Complete minimum 50,000 deposit to unlock status editing"' : '';

      card.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem; flex-wrap:wrap; gap:0.2rem;">' +
          '<div>' +
            '<span style="font-size:0.75rem; font-weight:800; color:var(--blue-800); background:#f0f7ff; padding:2px 8px; border-radius:12px;">Step ' + sNum + '/' + totalSteps + '</span>' +
            orderBadgeHtml +
          '</div>' +
          '<span style="font-size:0.75rem; font-weight:700; background:' + badgeBg + '; color:' + badgeColor + '; padding:2px 8px; border-radius:12px;">' + escapeHtml(curStatus) + '</span>' +
        '</div>' +
        '<div style="font-weight:700; font-size:0.92rem; color:var(--blue-900); margin-bottom:0.25rem;">' + escapeHtml(sObj.title) + '</div>' +
        '<div style="font-size:0.8rem; color:var(--muted); line-height:1.35; margin-bottom:0.5rem;">' + escapeHtml(sObj.desc) + '</div>' +
        (custom.notes ? '<div style="margin-top:auto; margin-bottom:0.5rem; background:#fffbeb; border-left:3px solid #f59e0b; padding:0.4rem; border-radius:4px; font-size:0.78rem; color:#92400e;"><strong>Brno Advisor Note:</strong> ' + escapeHtml(custom.notes) + '</div>' : '') +
        '<div style="margin-top:auto; padding-top:0.4rem; border-top:1px dashed #e2e8f0; display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">' +
          '<span style="font-size:0.72rem; font-weight:700; color:var(--muted);">' + (isUnlocked ? 'Update Status:' : '🔒 Locked (Deposit Req):') + '</span>' +
          '<select class="student-step-status-select" data-step="' + sNum + '" ' + selectDisabledAttr + ' style="font-size:0.78rem; padding:0.2rem 0.4rem; border-radius:4px; border:1px solid #cbd5e1; background:' + (isUnlocked ? '#f8fafc' : '#f1f5f9') + '; cursor:' + (isUnlocked ? 'pointer' : 'not-allowed') + ';">' +
            '<option value="Pending" ' + (curStatus === "Pending" ? "selected" : "") + '>⏳ Pending</option>' +
            '<option value="In Progress" ' + (curStatus === "In Progress" ? "selected" : "") + '>🔄 In Progress</option>' +
            '<option value="Done" ' + (curStatus === "Done" ? "selected" : "") + '>✅ Mark Done</option>' +
          '</select>' +
        '</div>';

      grid.appendChild(card);
    });

    if (isUnlocked) {
      grid.querySelectorAll(".student-step-status-select").forEach(function (select) {
        select.addEventListener("change", function () {
          var stepNum = Number(this.getAttribute("data-step"));
          var newStatus = this.value;
          updateStudentStepStatus(appObj, steps, stepNum, newStatus);
        });
      });
    }
  }

  function renderStepTracingTrail(steps, completionTrail, customStepData) {
    var trailEl = document.getElementById("student-step-tracing-trail");
    if (!trailEl) return;

    if (!completionTrail || !completionTrail.length) {
      trailEl.innerHTML = '<span style="color:#94a3b8; font-size:0.85rem; font-style:italic;">No milestones completed yet. Change any step status to "Mark Done" below to generate your real-time execution trace!</span>';
      return;
    }

    var html = "";
    completionTrail.forEach(function (sNum, index) {
      var sObj = steps.filter(function (x) { return Number(x.step) === Number(sNum); })[0];
      var title = sObj ? sObj.title : ("Step " + sNum);
      
      html += '<div style="display:inline-flex; align-items:center; background:#0284c7; color:#ffffff; padding:0.35rem 0.75rem; border-radius:20px; font-size:0.8rem; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,0.2); margin:2px;">' +
                '<span style="background:rgba(255,255,255,0.25); border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; font-size:0.7rem; margin-right:6px;">' + (index + 1) + '</span>' +
                'Step ' + sNum + ': ' + escapeHtml(title) +
              '</div>';

      if (index < completionTrail.length - 1) {
        html += '<span style="color:#38bdf8; font-weight:800; font-size:1.1rem; margin:0 2px;">➔</span>';
      }
    });

    trailEl.innerHTML = html;
  }

  function updateStudentStepStatus(appObj, steps, stepNum, newStatus) {
    if (!appObj) return;
    appObj.stepCustomData = appObj.stepCustomData || {};
    appObj.stepCustomData[stepNum] = appObj.stepCustomData[stepNum] || {};
    appObj.stepCustomData[stepNum].status = newStatus;

    var trail = Array.isArray(appObj.stepCompletionTrail) ? appObj.stepCompletionTrail.slice() : [];

    if (newStatus === "Done") {
      if (trail.indexOf(stepNum) === -1) {
        trail.push(stepNum);
      }
    } else {
      var idx = trail.indexOf(stepNum);
      if (idx !== -1) {
        trail.splice(idx, 1);
      }
    }

    appObj.stepCompletionTrail = trail;

    api("updateMyApplication", {
      stepCustomData: appObj.stepCustomData,
      stepCompletionTrail: appObj.stepCompletionTrail
    }).then(function () {
      render20StepsGrid(appObj.status, appObj);
    }).catch(function (err) {
      alert("Status update error: " + err.message);
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

  function renderStudentFinancialLedger(appObj) {
    if (!appObj) return;

    var fee = parseFloat(appObj.serviceFee || "1200");
    if (isNaN(fee)) fee = 1200;

    var reqDep = parseFloat(appObj.requiredDepositAmount || appObj.requiredDeposit || "500");
    if (isNaN(reqDep)) reqDep = 500;

    var deposits = Array.isArray(appObj.deposits) ? appObj.deposits : [];
    var expenses = Array.isArray(appObj.expenses) ? appObj.expenses : [];

    var totalDeposits = deposits.reduce(function (sum, d) { return sum + (parseFloat(d.amount) || 0); }, 0);
    var totalExpenses = expenses.reduce(function (sum, e) { return sum + (parseFloat(e.amount) || 0); }, 0);
    
    var balanceDue = appObj.customDueAmount ? parseFloat(appObj.customDueAmount) : ((fee + totalExpenses) - totalDeposits);
    if (isNaN(balanceDue) || balanceDue < 0) balanceDue = 0;

    var feeEl = document.getElementById("st-fin-service-fee");
    var reqDepEl = document.getElementById("st-fin-req-deposit");
    var depEl = document.getElementById("st-fin-deposits-paid");
    var expEl = document.getElementById("st-fin-total-expenses");
    var balEl = document.getElementById("st-fin-balance-due");
    var dueDateEl = document.getElementById("st-fin-due-date");

    if (feeEl) feeEl.textContent = "€" + fee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (reqDepEl) reqDepEl.textContent = "€" + reqDep.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (depEl) depEl.textContent = "€" + totalDeposits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (expEl) expEl.textContent = "€" + totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (balEl) balEl.textContent = "€" + balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (dueDateEl) dueDateEl.textContent = appObj.paymentDueDate || appObj.dueDate || "As per schedule";

    // Dynamic Payment Notice Banner
    var bannerTxt = document.getElementById("st-payment-banner-text");
    if (bannerTxt) {
      if (totalDeposits >= reqDep && balanceDue === 0) {
        bannerTxt.innerHTML = "🟢 <strong>Payment Complete</strong>: Your required deposit of <strong>€" + reqDep.toFixed(2) + "</strong> and contract fee have been fully received and verified. Thank you!";
      } else if (totalDeposits >= reqDep) {
        bannerTxt.innerHTML = "✅ <strong>Deposit Received</strong>: Your required deposit of <strong>€" + reqDep.toFixed(2) + "</strong> has been verified. Remaining balance due: <strong>€" + balanceDue.toFixed(2) + "</strong>" + (appObj.paymentDueDate ? " (Due by: " + appObj.paymentDueDate + ")" : "") + ".";
      } else {
        var remDep = reqDep - totalDeposits;
        bannerTxt.innerHTML = "⚠️ <strong>Required Deposit Due</strong>: Please transfer the initial deposit of <strong>€" + remDep.toFixed(2) + "</strong>" + (appObj.paymentDueDate ? " before <strong>" + appObj.paymentDueDate + "</strong>" : "") + " to initiate university application filing and document legalization.";
      }
    }

    // Render Deposits Table
    var depTbody = document.getElementById("st-deposits-tbody");
    if (depTbody) {
      if (!deposits.length) {
        depTbody.innerHTML = '<tr><td colspan="5" class="muted center py-2">No deposit payment records found.</td></tr>';
      } else {
        depTbody.innerHTML = deposits.map(function (d) {
          var amt = parseFloat(d.amount) || 0;
          var statusBadge = d.status === "Verified" 
            ? '<span class="badge st-approved" style="font-size:0.75rem;">Verified</span>'
            : '<span class="badge st-pending" style="font-size:0.75rem;">Pending</span>';

          return '<tr>' +
            '<td><strong>' + escapeHtml(d.date || "—") + '</strong></td>' +
            '<td>' + escapeHtml(d.description || "Deposit Payment") + '</td>' +
            '<td><span class="muted" style="font-size:0.8rem;">' + escapeHtml(d.method || "Transfer") + (d.ref ? ' (' + escapeHtml(d.ref) + ')' : '') + '</span></td>' +
            '<td style="text-align:right; font-weight:700; color:var(--green);">+€' + amt.toFixed(2) + '</td>' +
            '<td>' + statusBadge + '</td>' +
          '</tr>';
        }).join("");
      }
    }

    // Render Expenses Table
    var expTbody = document.getElementById("st-expenses-tbody");
    if (expTbody) {
      if (!expenses.length) {
        expTbody.innerHTML = '<tr><td colspan="4" class="muted center py-2">No managed expense records found.</td></tr>';
      } else {
        expTbody.innerHTML = expenses.map(function (e) {
          var amt = parseFloat(e.amount) || 0;
          return '<tr>' +
            '<td><strong>' + escapeHtml(e.date || "—") + '</strong></td>' +
            '<td><strong>' + escapeHtml(e.category || "Expense") + '</strong>' + (e.notes ? '<br><span class="muted" style="font-size:0.75rem;">' + escapeHtml(e.notes) + '</span>' : '') + '</td>' +
            '<td><span class="badge" style="font-size:0.75rem; background:var(--blue-50); color:var(--blue-800);">' + escapeHtml(e.paidBy || "Agency") + '</span></td>' +
            '<td style="text-align:right; font-weight:700; color:#c2410c;">€' + amt.toFixed(2) + '</td>' +
          '</tr>';
        }).join("");
      }
    }

    // Download Financial Statement Handler
    var dlBtn = document.getElementById("download-student-statement-btn");
    if (dlBtn) {
      dlBtn.onclick = function () {
        var txt = "CZECHBRIDGE OFFICIAL FINANCIAL STATEMENT & LEDGER\n";
        txt += "====================================================\n";
        txt += "Candidate Name: " + (appObj.fullName || sess.fullName) + "\n";
        txt += "Candidate Email: " + (appObj.email || sess.email) + "\n";
        txt += "Target Country: " + (appObj.targetCountry || "Czech Republic") + "\n";
        txt += "Program / Track: " + (appObj.program || "Higher Education Degree") + "\n";
        txt += "Statement Date: " + new Date().toLocaleDateString("en-GB") + "\n";
        txt += "----------------------------------------------------\n\n";

        txt += "FINANCIAL SUMMARY:\n";
        txt += "Contracted Service Fee: €" + fee.toFixed(2) + "\n";
        txt += "Total Deposits Received: €" + totalDeposits.toFixed(2) + "\n";
        txt += "Total Managed Expenses: €" + totalExpenses.toFixed(2) + "\n";
        txt += "Remaining Balance Due:  €" + balanceDue.toFixed(2) + "\n\n";

        txt += "DEPOSIT PAYMENTS RECEIVED:\n";
        if (!deposits.length) {
          txt += "  (No deposit payments recorded)\n";
        } else {
          deposits.forEach(function (d, i) {
            txt += "  " + (i + 1) + ". " + (d.date || "N/A") + " | " + (d.description || "Deposit") + " | €" + (parseFloat(d.amount) || 0).toFixed(2) + " (" + (d.method || "N/A") + " - " + (d.status || "Verified") + ")\n";
          });
        }
        txt += "\n";

        txt += "MANAGED OFFICIAL EXPENSES:\n";
        if (!expenses.length) {
          txt += "  (No managed expenses recorded)\n";
        } else {
          expenses.forEach(function (e, i) {
            txt += "  " + (i + 1) + ". " + (e.date || "N/A") + " | " + (e.category || "Expense") + " | €" + (parseFloat(e.amount) || 0).toFixed(2) + " [Paid By: " + (e.paidBy || "Agency") + "]\n";
            if (e.notes) txt += "     Note: " + e.notes + "\n";
          });
        }
        txt += "\n----------------------------------------------------\n";
        txt += "Issued by CzechBridge Admissions & Financial Operations desk, Brno, Czech Republic.\n";

        var blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "CzechBridge_Financial_Statement_" + (appObj.fullName || "Candidate").replace(/\s+/g, "_") + ".txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  window.cbEscapeHtml = escapeHtml;
})();
