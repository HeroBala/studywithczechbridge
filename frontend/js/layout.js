/* Injects the shared header and footer on every page.
   Session-aware: shows Login/Apply for guests, Dashboard/Logout for
   logged-in users, and an Admin link for admins. */

(function () {
  var PAGES = [
    { href: "index.html",    label: "Home" },
    { href: "about.html",    label: "About" },
    { href: "services.html", label: "Services" },
    { href: "programs.html", label: "Programs" },
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

    var ctaHtml;
    var mobileCtaHtml;
    if (s && s.token) {
      var isStaff = s.role === "admin" || s.role === "super_admin" || s.role === "staff" || s.role === "agent";
      ctaHtml =
        (isStaff
          ? '<a class="btn btn-dark btn-sm nav-btn-desktop" href="admin.html">Admin Panel</a>'
          : '<a class="btn btn-dark btn-sm nav-btn-desktop" href="dashboard.html">My Dashboard</a>') +
        '<a class="btn btn-outline btn-sm nav-btn-desktop nav-logout-btn" href="#">Logout</a>';

      mobileCtaHtml =
        '<div class="mobile-cta-box">' +
          (isStaff
            ? '<a class="btn btn-dark btn-sm btn-block" href="admin.html">Admin Panel</a>'
            : '<a class="btn btn-dark btn-sm btn-block" href="dashboard.html">My Dashboard</a>') +
          '<a class="btn btn-outline btn-sm btn-block nav-logout-btn" href="#">Logout</a>' +
        '</div>';
    } else {
      ctaHtml =
        '<a class="btn btn-outline btn-sm nav-btn-desktop" href="login.html">Login</a>' +
        '<a class="btn btn-primary btn-sm" href="register.html">Apply Now</a>';

      mobileCtaHtml =
        '<div class="mobile-cta-box">' +
          '<a class="btn btn-outline btn-sm btn-block" href="login.html">Login</a>' +
          '<a class="btn btn-primary btn-sm btn-block" href="register.html">Apply Now</a>' +
        '</div>';
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
        '<div class="nav-links-wrapper" id="nav-links-wrapper">' +
          '<ul class="nav-links" id="nav-links">' + links + "</ul>" +
          mobileCtaHtml +
        "</div>" +
        '<div class="nav-cta">' + ctaHtml +
          '<button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>' +
        "</div>" +
      "</div>"
    );
  }

  function buildFooter() {
    var year = new Date().getFullYear();
    var mapUrl = "https://maps.app.goo.gl/wvngYMsLtrz4feYH8";
    var embedMapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d167058.0772718104!2d16.51659914757304!3d49.19506013661148!2m3!1f0!0!f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x471294397f358361%3A0xa70d11790776f29e!2sBrno%2C%20Czechia!5e0!3m2!1sen!2sbd!4v1710000000000!5m2!1sen!2sbd";

    return (
      '<div class="footer-map-container">' +
        '<iframe class="footer-map-iframe" src="' + embedMapUrl + '" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Study with Czech Bridge Location Map"></iframe>' +
        '<div class="footer-map-overlay"></div>' +
      '</div>' +

      '<div class="container footer-glass-card">' +
        '<div class="footer-top-bar">' +
          '<div class="footer-location-badge">' +
            '<span class="pulse-dot"></span> 📍 <strong>Study with Czech Bridge</strong> · Brno, Czech Republic' +
          '</div>' +
          '<a class="btn-map-direct" href="' + mapUrl + '" target="_blank" rel="noopener">' +
            '🗺️ Open Location in Google Maps ↗' +
          '</a>' +
        '</div>' +

        '<div class="footer-grid">' +
          '<div>' +
            '<img src="assets/logo-mark.svg" alt="CzechBridge logo" class="footer-logo">' +
            '<h4>StudyCzechBridge</h4>' +
            '<p>Free consultation, university admission support, visa guidance, and student relocation assistance — guided remotely by our team in Brno, Czech Republic for international students worldwide from diverse backgrounds and expertise.</p>' +
          '</div>' +
          '<div>' +
            '<h4>Quick Links</h4>' +
            '<ul>' +
              '<li><a href="about.html">About Us</a></li>' +
              '<li><a href="services.html">Services</a></li>' +
              '<li><a href="programs.html">Programs</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h4>Students</h4>' +
            '<ul>' +
              '<li><a href="register.html">Create Account</a></li>' +
              '<li><a href="login.html">Login</a></li>' +
              '<li><a href="dashboard.html">My Dashboard</a></li>' +
              '<li><a href="contact.html">Free Consultation</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h4>Contact &amp; Location</h4>' +
            '<ul>' +
              '<li>📍 Brno, Czech Republic</li>' +
              '<li>🗺️ <a href="' + mapUrl + '" target="_blank" rel="noopener" style="text-decoration:underline; font-weight:600;">Google Maps Location</a></li>' +
              '<li>✉️ <a href="mailto:info@studywithczechbridge.com">info@studywithczechbridge.com</a></li>' +
              '<li>✉️ <a href="mailto:admission@studywithczechbridge.com">admission@studywithczechbridge.com</a></li>' +
              '<li>✉️ <a href="mailto:support@studywithczechbridge.com">support@studywithczechbridge.com</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +

        '<div class="footer-bottom">© ' + year + ' StudyCzechBridge. All rights reserved.</div>' +
      '</div>'
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    var header = document.querySelector(".site-header");
    var footer = document.querySelector(".site-footer");
    if (header) header.innerHTML = buildHeader();
    if (footer) {
      footer.classList.add("site-footer-map");
      footer.innerHTML = buildFooter();
    }

    var toggle = document.getElementById("nav-toggle");
    var navWrapper = document.getElementById("nav-links-wrapper");

    if (toggle && navWrapper) {
      toggle.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = navWrapper.classList.toggle("open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        toggle.innerHTML = isOpen ? "✕" : "☰";
      });

      document.addEventListener("click", function (e) {
        if (!navWrapper.contains(e.target) && !toggle.contains(e.target)) {
          if (navWrapper.classList.contains("open")) {
            navWrapper.classList.remove("open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.innerHTML = "☰";
          }
        }
      });

      navWrapper.addEventListener("click", function (e) {
        if (e.target.tagName === "A" && !e.target.classList.contains("nav-logout-btn")) {
          navWrapper.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.innerHTML = "☰";
        }
      });
    }

    var logoutBtns = document.querySelectorAll(".nav-logout-btn");
    logoutBtns.forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        var s = session();
        localStorage.removeItem("cb_session");
        if (window.api && s && s.token) { api("logout", {}).catch(function () {}); }
        location.href = "index.html";
      });
    });
  });
})();
