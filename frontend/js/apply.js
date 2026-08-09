/* Application form: pre-fills an existing application (editable only
   while status is "Pending Review") and submits create/update. */

(function () {
  var sess = requireLogin();
  if (!sess) return;

  var FIELDS = ["fullName", "dob", "gender", "nationality", "passportNo", "address", "city", "phone",
    "guardianName", "guardianPhone", "sscResult", "sscYear", "hscResult", "hscYear",
    "bachelor", "bachelorCgpa", "englishTest", "englishScore",
    "targetCountry", "serviceTrack", "program", "level", "intake", "notes"];

  function el(f) { return document.getElementById("a-" + f); }

  function runOnReady(fn) {
    if (document.readyState !== "loading") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  runOnReady(function () {
    // Pre-fill name from session
    if (sess.fullName) el("fullName").value = sess.fullName;

    api("getMyApplication").then(function (res) {
      var a = res.application;
      if (!a) return;
      FIELDS.forEach(function (f) {
        if (a[f] != null && a[f] !== "") el(f).value = a[f];
      });
      if (a.status !== "Pending Review") {
        showNotice("apply-notice", "info",
          "Your application status is \"" + a.status + "\" and can no longer be edited. " +
          "Contact us if something needs to change.");
        Array.prototype.forEach.call(
          document.querySelectorAll("#apply-form input, #apply-form select, #apply-form textarea, #a-submit"),
          function (x) { x.disabled = true; }
        );
      } else {
        showNotice("apply-notice", "info",
          "You already submitted an application — you can update it below while it is pending review.");
        document.getElementById("a-submit").textContent = "Update Application";
      }
    }).catch(function (err) {
      showNotice("apply-notice", "error", err.message);
    });

    document.getElementById("apply-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var btn = document.getElementById("a-submit");
      btn.disabled = true;
      var oldLabel = btn.textContent;
      btn.textContent = "Submitting...";

      var data = {};
      FIELDS.forEach(function (f) { data[f] = el(f).value.trim(); });

      api("submitApplication", data).then(function (res) {
        showNotice("apply-notice", "success",
          res.created
            ? "🎉 Application submitted! Our team will review it and update your status within 1–3 days."
            : "✅ Application updated successfully.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        btn.textContent = "Update Application";
        btn.disabled = false;
        setTimeout(function () { location.href = "dashboard.html"; }, 2500);
      }).catch(function (err) {
        showNotice("apply-notice", "error", err.message);
        window.scrollTo({ top: 0, behavior: "smooth" });
        btn.textContent = oldLabel;
        btn.disabled = false;
      });
    });
  });
})();
