/* Page guards + auth form handlers.
   Include on pages that need login state. */

function requireLogin() {
  var s = getSession();
  if (!s || !s.token) {
    location.href = "login.html";
    return null;
  }
  return s;
}

function requireAdmin() {
  var s = requireLogin();
  if (s) {
    var isStaff = s.role === "admin" || s.role === "super_admin" || s.role === "agent" || (typeof isKnownAdminEmail === "function" && isKnownAdminEmail(s.email));
    if (!isStaff) {
      location.href = "dashboard.html";
      return null;
    }
  }
  return s;
}

function showNotice(id, type, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.className = "notice " + type + " show";
  el.textContent = msg;
}

function afterAuth(res) {
  setSession({ token: res.token, role: res.role, fullName: res.fullName, email: res.email });
  var isStaff = res.role === "admin" || res.role === "super_admin" || res.role === "agent";
  location.href = isStaff ? "admin.html" : "dashboard.html";
}

/* Fetches a stored document (base64) and opens it in a new tab. */
function cbOpenDocument(docId) {
  return api("downloadDocument", { docId: docId }).then(function (res) {
    if (!res.base64) throw new Error("This file has no stored content (mock upload).");
    var bin = atob(res.base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var blob = new Blob([bytes], { type: res.mimeType || "application/octet-stream" });
    var url = URL.createObjectURL(blob);
    var win = window.open(url, "_blank");
    if (!win) { // popup blocked → force a download instead
      var a = document.createElement("a");
      a.href = url;
      a.download = res.fileName || "document";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  });
}
