/* Injects the shared header and footer on every page.
   Session-aware: shows Login/Apply for guests, Dashboard/Logout for
   logged-in users, and an Admin link for admins. */

(function () {
  var PAGES = [
    { href: "index.html",    label: "Home" },
    { href: "about.html",    label: "About" },
    { href: "services.html", label: "Services" },
    { href: "programs.html", label: "Programs" },
    { href: "process.html",  label: "Process" },
    { href: "contact.html",  label: "Contact" }
  ];

  function session() {
    try { return JSON.parse(localStorage.getItem("cb_session") || "null"); }
    catch (e) { return null; }
  }

  function currentPage() {
    var p = location.pathname.split("/").pop();
    return p === "" ? "index.html" : p;
  }

  function buildHeader() {
    var s = session();
    var cur = currentPage();

    var links = PAGES.map(function (p) {
      var cls = p.href === cur ? ' class="active"' : "";
      return '<li><a href="' + p.href + '"' + cls + ">" + p.label + "</a></li>";
    }).join("");

    var cta;
    if (s && s.token) {
      var isStaff = s.role === "admin" || s.role === "super_admin" || s.role === "agent";
      cta =
        (isStaff
          ? '<a class="btn btn-dark btn-sm" href="admin.html">Admin Panel</a>'
          : '<a class="btn btn-dark btn-sm" href="dashboard.html">My Dashboard</a>') +
        '<a class="btn btn-outline btn-sm" href="#" id="nav-logout">Logout</a>';
    } else {
      cta =
        '<a class="btn btn-outline btn-sm" href="login.html">Login</a>' +
        '<a class="btn btn-primary btn-sm" href="register.html">Apply Now</a>';
    }

    return (
      '<div class="container nav-bar">' +
        '<a class="brand" href="index.html">' +
          '<span class="brand-mark"><img src="assets/logo-mark.svg" alt="CzechBridge logo"></span>' +
          '<span class="brand-text">' +
            "<small>STUDY WITH</small>" +
            '<span class="brand-name">Czech<em>Bridge</em></span>' +
          "</span>" +
        "</a>" +
        '<ul class="nav-links" id="nav-links">' + links + "</ul>" +
        '<div class="nav-cta">' + cta +
          '<button class="nav-toggle" id="nav-toggle" aria-label="Menu">☰</button>' +
        "</div>" +
      "</div>"
    );
  }

  function buildFooter() {
    var year = new Date().getFullYear();
    return (
      '<div class="container">' +
        '<div class="footer-grid">' +
          "<div>" +
            '<img src="assets/logo-mark.svg" alt="CzechBridge logo" class="footer-logo">' +
            "<h4>StudyCzechBridge</h4>" +
            "<p>Based in Brno, Czech Republic — providing remote guidance and support to students in Bangladesh planning to study in Europe.</p>" +
          "</div>" +
          "<div>" +
            "<h4>Quick Links</h4>" +
            "<ul>" +
              '<li><a href="about.html">About Us</a></li>' +
              '<li><a href="services.html">Services</a></li>' +
              '<li><a href="programs.html">Programs</a></li>' +
              '<li><a href="process.html">Application Process</a></li>' +
            "</ul>" +
          "</div>" +
          "<div>" +
            "<h4>Students</h4>" +
            "<ul>" +
              '<li><a href="register.html">Create Account</a></li>' +
              '<li><a href="login.html">Login</a></li>' +
              '<li><a href="dashboard.html">My Dashboard</a></li>' +
              '<li><a href="contact.html">Free Consultation</a></li>' +
            "</ul>" +
          "</div>" +
          "<div>" +
            "<h4>Contact</h4>" +
            "<ul>" +
              '<li>📍 Brno, Czech Republic</li>' +
              '<li>✉️ <a href="mailto:info@studywithczechbridge.com">info@studywithczechbridge.com</a></li>' +
              '<li>✉️ <a href="mailto:admission@studywithczechbridge.com">admission@studywithczechbridge.com</a></li>' +
              '<li>✉️ <a href="mailto:support@studywithczechbridge.com">support@studywithczechbridge.com</a></li>' +
            "</ul>" +
          "</div>" +
        "</div>" +
        '<div class="footer-bottom">© ' + year + " StudyCzechBridge. All rights reserved.</div>" +
      "</div>"
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    var header = document.querySelector(".site-header");
    var footer = document.querySelector(".site-footer");
    if (header) header.innerHTML = buildHeader();
    if (footer) footer.innerHTML = buildFooter();

    var toggle = document.getElementById("nav-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        document.getElementById("nav-links").classList.toggle("open");
      });
    }

    var logout = document.getElementById("nav-logout");
    if (logout) {
      logout.addEventListener("click", function (ev) {
        ev.preventDefault();
        var s = session();
        localStorage.removeItem("cb_session");
        // Best-effort server-side logout; ignore result.
        if (window.api && s && s.token) { api("logout", {}).catch(function () {}); }
        location.href = "index.html";
      });
    }
  });
})();
