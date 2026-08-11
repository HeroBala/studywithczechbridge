document.addEventListener("DOMContentLoaded", function () {
  var searchInput = document.getElementById("uni-search");
  var countrySelect = document.getElementById("uni-country-filter");
  var typeSelect = document.getElementById("uni-type-filter");

  if (searchInput) searchInput.addEventListener("input", debounce(loadUniversities, 300));
  if (countrySelect) countrySelect.addEventListener("change", loadUniversities);
  if (typeSelect) typeSelect.addEventListener("change", loadUniversities);

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
