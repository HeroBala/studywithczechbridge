function runOnReady(fn) {
  if (document.readyState !== "loading") {
    setTimeout(fn, 0);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

runOnReady(function () {
  // Programs Database Controls
  var progSearchInput = document.getElementById("prog-search");
  var progCountrySelect = document.getElementById("prog-country-filter");
  var progLevelSelect = document.getElementById("prog-level-filter");
  var progFieldSelect = document.getElementById("prog-field-filter");
  var progResetBtn = document.getElementById("prog-reset-btn");

  if (progSearchInput) progSearchInput.addEventListener("input", debounce(loadPrograms, 300));
  if (progCountrySelect) progCountrySelect.addEventListener("change", loadPrograms);
  if (progLevelSelect) progLevelSelect.addEventListener("change", loadPrograms);
  if (progFieldSelect) progFieldSelect.addEventListener("change", loadPrograms);
  if (progResetBtn) {
    progResetBtn.addEventListener("click", function () {
      if (progSearchInput) progSearchInput.value = "";
      if (progCountrySelect) progCountrySelect.value = "";
      if (progLevelSelect) progLevelSelect.value = "";
      if (progFieldSelect) progFieldSelect.value = "";
      loadPrograms();
    });
  }

  // University Directory Controls
  var uniSearchInput = document.getElementById("uni-search");
  var uniCountrySelect = document.getElementById("uni-country-filter");
  var uniTypeSelect = document.getElementById("uni-type-filter");
  var uniResetBtn = document.getElementById("uni-reset-btn");

  if (uniSearchInput) uniSearchInput.addEventListener("input", debounce(loadUniversities, 300));
  if (uniCountrySelect) uniCountrySelect.addEventListener("change", loadUniversities);
  if (uniTypeSelect) uniTypeSelect.addEventListener("change", loadUniversities);
  if (uniResetBtn) {
    uniResetBtn.addEventListener("click", function () {
      if (uniSearchInput) uniSearchInput.value = "";
      if (uniCountrySelect) uniCountrySelect.value = "";
      if (uniTypeSelect) uniTypeSelect.value = "";
      loadUniversities();
    });
  }

  // Initial loads
  loadPrograms();
  loadUniversities();
});

function debounce(fn, delay) {
  var timer = null;
  return function () {
    var context = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(context, args); }, delay);
  };
}

function loadPrograms() {
  var searchEl = document.getElementById("prog-search");
  var countryEl = document.getElementById("prog-country-filter");
  var levelEl = document.getElementById("prog-level-filter");
  var fieldEl = document.getElementById("prog-field-filter");

  var search = searchEl ? searchEl.value : "";
  var country = countryEl ? countryEl.value : "";
  var level = levelEl ? levelEl.value : "";
  var field = fieldEl ? fieldEl.value : "";

  api("getPrograms", { search: search, country: country, level: level, field: field }).then(function (res) {
    if (!res || !res.programs) return;
    var list = res.programs;
    var tbody = document.getElementById("prog-table-body");
    var badge = document.getElementById("prog-count-badge");
    if (badge) badge.textContent = list.length + " Programs Found";

    // Populate country filter dropdown if not populated
    if (countryEl && countryEl.options.length <= 1 && res.countries) {
      res.countries.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c;
        opt.textContent = getCountryFlag(c) + " " + c;
        countryEl.appendChild(opt);
      });
    }

    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: #64748b; font-weight: 500;">No study programs match your filter criteria. Try clearing search terms or selecting another degree level/country.</td></tr>';
      return;
    }

    var html = list.map(function (p) {
      var flag = getCountryFlag(p.country);
      
      var regLink = p.portalApplyUrl || ('register.html?program=' + encodeURIComponent(p.university + ' - ' + p.title));
      
      var officialBtn = p.applyUrl 
        ? '<a href="' + escAttr(p.applyUrl) + '" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:0.25rem; background:#f1f5f9; color:#334155; padding:0.35rem 0.65rem; border-radius:6px; text-decoration:none; font-weight:700; font-size:0.75rem; border:1px solid #cbd5e1; white-space:nowrap;">🌐 Official Link ↗</a>'
        : '';

      var applyBtn = '<a href="' + escAttr(regLink) + '" style="display:inline-flex; align-items:center; gap:0.25rem; background:#16a34a; color:#ffffff; padding:0.35rem 0.75rem; border-radius:6px; text-decoration:none; font-weight:700; font-size:0.78rem; white-space:nowrap; border:1px solid #15803d; box-shadow:0 1px 3px rgba(0,0,0,0.1);">🚀 Apply Now</a>';

      var fieldBadge = '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-weight:700; font-size:0.72rem; padding:0.15rem 0.4rem; border-radius:4px;">' + esc(p.field || 'General') + '</span>';

      var levelBadge = '<span class="badge" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; font-weight:700; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:12px;">' + esc(p.level || "Bachelor's") + '</span>';

      return '<tr style="border-bottom: 1px solid #f1f5f9;">' +
        '<td style="padding:0.9rem 1rem; font-weight:700; color:#1e293b;"><span style="font-size:1.1rem; margin-right:0.3rem;">' + flag + '</span> ' + esc(p.country) + '</td>' +
        '<td style="padding:0.9rem 1rem;"><strong style="color:var(--blue-900); font-size:0.95rem; display:block; margin-bottom:0.2rem;">' + esc(p.title) + '</strong>' + fieldBadge + '</td>' +
        '<td style="padding:0.9rem 1rem;"><strong style="color:#334155; font-size:0.88rem;">' + esc(p.university) + '</strong><br><span style="font-size:0.75rem; color:#64748b;">🗣️ ' + esc(p.language || 'English') + '</span></td>' +
        '<td style="padding:0.9rem 1rem; text-align:center;">' + levelBadge + '<br><span style="font-size:0.75rem; color:#475569; display:inline-block; margin-top:0.2rem;">⏱️ ' + esc(p.duration || '3 Years') + '</span></td>' +
        '<td style="padding:0.9rem 1rem; background:#fdf4ff; border-left:1px solid #fae8ff;"><strong style="color:#7e22ce; font-size:0.9rem; display:block;">' + esc(p.tuitionFees || "Contact Faculty") + '</strong><span style="font-size:0.72rem; color:#9333ea;">🗓️ Intake: ' + esc(p.intake || 'Sep') + '</span></td>' +
        '<td style="padding:0.9rem 1rem; text-align:center;"><div style="display:flex; flex-direction:column; gap:0.4rem; align-items:center; justify-content:center;">' + applyBtn + officialBtn + '</div></td>' +
      '</tr>';
    }).join("");

    tbody.innerHTML = html;
  }).catch(function (err) {
    console.error("Failed to load programs:", err);
  });
}

function loadUniversities() {
  var searchEl = document.getElementById("uni-search");
  var countryEl = document.getElementById("uni-country-filter");
  var typeEl = document.getElementById("uni-type-filter");

  var search = searchEl ? searchEl.value : "";
  var country = countryEl ? countryEl.value : "";
  var type = typeEl ? typeEl.value : "";

  api("getUniversities", { search: search, country: country, type: type }).then(function (res) {
    if (!res || !res.universities) return;
    var list = res.universities;
    var tbody = document.getElementById("uni-table-body");
    var badge = document.getElementById("uni-count-badge");
    if (badge) badge.textContent = list.length + " Universities Found";

    // Populate country filter dropdown if not populated
    if (countryEl && countryEl.options.length <= 1 && res.countries) {
      res.countries.forEach(function (c) {
        var opt = document.createElement("option");
        opt.value = c;
        opt.textContent = getCountryFlag(c) + " " + c;
        countryEl.appendChild(opt);
      });
    }

    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #64748b; font-weight: 500;">No universities match your filter criteria. Try clearing search terms or selecting another country.</td></tr>';
      return;
    }

    var html = list.map(function (u) {
      var flag = getCountryFlag(u.country);
      var webBtn = u.website 
        ? '<a href="' + escAttr(u.website) + '" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:0.25rem; background:#eff6ff; color:#1d4ed8; padding:0.25rem 0.55rem; border-radius:6px; text-decoration:none; font-weight:700; font-size:0.78rem; border:1px solid #bfdbfe; margin-top:0.25rem;">🌐 Visit Website ↗</a>' 
        : '<span class="muted" style="font-size:0.75rem;">No Website</span>';
      
      var typeBadge = u.type === "Public" 
        ? '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-weight:700; padding:0.25rem 0.5rem;">🏛️ Public</span>'
        : '<span class="badge" style="background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; font-weight:700; padding:0.25rem 0.5rem;">🏢 Private</span>';

      return '<tr style="border-bottom: 1px solid #f1f5f9;">' +
        '<td style="padding:0.85rem 1rem; font-weight:700; color:#1e293b;">' + flag + ' ' + esc(u.country) + '</td>' +
        '<td style="padding:0.85rem 1rem;"><strong style="color:var(--blue-900); font-size:0.92rem;">' + esc(u.name) + '</strong><br>' + webBtn + '</td>' +
        '<td style="padding:0.85rem 1rem; text-align:center; font-weight:700; color:#475569;"><span class="badge" style="background:#f8fafc; border:1px solid #cbd5e1; color:#334155;">' + (u.countryTotalUniv || 'N/A') + ' Total</span></td>' +
        '<td style="padding:0.85rem 1rem; text-align:center;">' + typeBadge + '</td>' +
        '<td style="padding:0.85rem 1rem; text-align:center;"><strong style="color:#2563eb; font-size:0.95rem;">' + (u.scienceSubjects || 0) + '</strong> <br><span style="font-size:0.72rem; color:#64748b;">Subjects</span></td>' +
        '<td style="padding:0.85rem 1rem; text-align:center;"><strong style="color:#059669; font-size:0.95rem;">' + (u.commerceSubjects || 0) + '</strong> <br><span style="font-size:0.72rem; color:#64748b;">Subjects</span></td>' +
        '<td style="padding:0.85rem 1rem; text-align:center;"><span style="font-size:0.8rem; font-weight:700; color:#7c3aed;">Arts: ' + (u.artsSubjects || 0) + '</span><br><span style="font-size:0.8rem; font-weight:700; color:#d97706;">Eng: ' + (u.engineeringSubjects || 0) + '</span></td>' +
        '<td style="padding:0.85rem 1rem; background:#faf5ff; border-left:1px solid #f3e8ff;"><strong style="color:#6b21a8; font-size:0.88rem; display:block;">' + esc(u.tuitionFees || "Contact Faculty") + '</strong></td>' +
      '</tr>';
    }).join("");

    tbody.innerHTML = html;
  }).catch(function (err) {
    console.error("Failed to load universities:", err);
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
  if (c.indexOf("estonia") !== -1) return "🇪🇪";
  if (c.indexOf("serbia") !== -1) return "🇷🇸";
  if (c.indexOf("iceland") !== -1) return "🇮🇸";
  if (c.indexOf("moldova") !== -1) return "🇲🇩";
  if (c.indexOf("sweden") !== -1) return "🇸🇪";
  if (c.indexOf("netherland") !== -1) return "🇳🇱";
  return "🌍";
}

function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escAttr(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
