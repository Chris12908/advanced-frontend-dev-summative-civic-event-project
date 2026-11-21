
window.Auth = (function () {
  const TOKEN_KEY = 'civic_token';
  const USER_KEY = 'civic_user';
  const FLASH_KEY = 'civic_flash';

  function store() {
    return localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  }
  function save(token, user, remember) {
    clearStorage();
    const s = remember ? localStorage : sessionStorage;
    s.setItem(TOKEN_KEY, token);
    s.setItem(USER_KEY, JSON.stringify({ id: user.id, full_name: user.full_name, email: user.email, role: user.role }));
  }
  function clearStorage() {
    [localStorage, sessionStorage].forEach(s => { s.removeItem(TOKEN_KEY); s.removeItem(USER_KEY); });
  }
  function getToken() { return store().getItem(TOKEN_KEY); }
  function getUser() {
    try { return JSON.parse(store().getItem(USER_KEY)); } catch (e) { return null; }
  }
  function updateUser(patch) {
    const u = Object.assign(getUser() || {}, patch);
    store().setItem(USER_KEY, JSON.stringify(u));
  }
  // JWT payload is the middle part; read exp (seconds) to detect expiry without a request.
  function isExpired() {
    const t = getToken();
    if (!t) return true;
    try {
      const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return !payload.exp || payload.exp * 1000 <= Date.now();
    } catch (e) { return true; }
  }
  function isLoggedIn() { return !!getToken() && !isExpired(); }
  function isAdmin() { const u = getUser(); return isLoggedIn() && u && u.role === 'admin'; }

  // One-time message shown on the next page 
  function setFlash(message, type) {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type: type || 'info' }));
  }
  function takeFlash() {
    const raw = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function logout(message, type) {
    clearStorage();
    if (message) setFlash(message, type || 'info');
    window.location.href = 'login.html';
  }

  

  
  function requireAuth() {
    if (!isLoggedIn()) {
      logout(getToken() ? 'Your session expired. Please log in again.' : 'Please log in to continue.', 'warning');
      return false;
    }
    return true;
  }

  
  function requireAdmin() {
    if (!requireAuth()) return false;
    if (!isAdmin()) {
      setFlash('You do not have permission to view that page.', 'error');
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  
  function redirectIfLoggedIn() {
    if (isLoggedIn()) window.location.href = 'dashboard.html';
  }

  return { save, getToken, getUser, updateUser, isExpired, isLoggedIn, isAdmin,
           setFlash, takeFlash, logout, requireAuth, requireAdmin, redirectIfLoggedIn };
})();