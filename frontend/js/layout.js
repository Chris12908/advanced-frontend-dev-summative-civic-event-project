
window.Layout = (function () {
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D6F5E3"/><stop offset="1" stop-color="#A9D4FF"/></linearGradient></defs>' +
    '<rect width="400" height="240" fill="url(#g)"/><text x="200" y="128" font-family="Georgia,serif" font-size="28" text-anchor="middle" fill="#115E59">CivicEvents+</text></svg>');

  const SEARCH_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
  const LOGO_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>';

  // ---------- session cache (e.g. promos); clear(prefix) invalidates ----------
  const Cache = {
    get: function (k) { try { const v = JSON.parse(sessionStorage.getItem('c_' + k)); return v && v.t > Date.now() ? v.d : null; } catch (e) { return null; } },
    set: function (k, d, ttl) { try { sessionStorage.setItem('c_' + k, JSON.stringify({ t: Date.now() + (ttl || 60000), d: d })); } catch (e) { } },
    clear: function (p) { Object.keys(sessionStorage).filter(function (k) { return k.indexOf('c_' + p) === 0; }).forEach(function (k) { sessionStorage.removeItem(k); }); }
  };

  // ---------- notification read-state (client side) ----------
  let notes = [];
  function readKey() { const u = Auth.getUser(); return 'civic_read_' + (u ? u.id : 'x'); }
  function getRead() { try { return JSON.parse(localStorage.getItem(readKey()) || '[]'); } catch (e) { return []; } }
  function saveRead(a) { try { localStorage.setItem(readKey(), JSON.stringify(a)); } catch (e) { } }
  function markRead(id) { const r = getRead(); if (r.indexOf(id) === -1) { r.push(id); saveRead(r); } updateBell(); }
  function markAllRead() { saveRead(notes.map(function (n) { return n.id; })); updateBell(); }
  function unreadCount() { const r = getRead(); return notes.filter(function (n) { return r.indexOf(n.id) === -1; }).length; }

  function fmtTime(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // Returns the 11-character YouTube id from watch / youtu.be / embed / shorts links, or null.
  function youtubeId(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function navLink(href, label, key, active, extra) {
    const on = key === active;
    return '<a href="' + href + '" class="nav-link ' + (extra || '') + '"' + (on ? ' aria-current="page"' : '') + '>' + label + '</a>';
  }

  function renderHeader(active) {
    const u = Auth.getUser() || {}, admin = Auth.isAdmin();
    const initial = UI.esc((u.full_name || '?').charAt(0).toUpperCase());
    function links(extra) {
      return navLink('events.html', 'Events', 'events', active, extra) + navLink('announcements.html', 'Announcements', 'announcements', active, extra) +
        navLink('promos.html', 'Promos', 'promos', active, extra) + navLink('dashboard.html', 'Dashboard', 'dashboard', active, extra) +
        (admin ? navLink('admin-users.html', 'Admin', 'admin', active, extra) : '');   // ROLE GUARD (UI): admin link
    }
    const searchField = function (id) {
      return '<label for="' + id + '" class="sr-only">Search events, announcements and promos</label>' +
        '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">' + SEARCH_ICON + '</span>' +
        '<input id="' + id + '" name="q" type="search" placeholder="Search everything" class="search-input w-full border border-slate-300 py-2 pl-9 pr-4 text-sm">';
    };
    $('#site-header').html(
      '<header class="site-header">' +
      '<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">' +
      '<a href="dashboard.html" class="flex items-center gap-2" aria-label="CivicEvents+ home"><span class="logo-mark">' + LOGO_SVG + '</span>' +
      '<span class="font-display text-xl font-bold text-brand-900">CivicEvents<span class="text-sun-600">+</span></span></a>' +
      '<nav aria-label="Main" class="ml-4 hidden items-center gap-1 md:flex">' + links('') + '</nav>' +
      '<div class="ml-auto flex items-center gap-2">' +
      '<form id="global-search" role="search" action="search.html" class="relative hidden w-56 md:block lg:w-72">' + searchField('q') + '</form>' +
      '<button id="bell-btn" type="button" class="relative rounded-full p-2 hover:bg-brand-50" aria-label="Notifications, 0 unread" aria-controls="notif-drawer" aria-expanded="false">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>' +
      '<span id="bell-count" class="absolute -right-0.5 -top-0.5 hidden min-w-[1.25rem] rounded-full bg-red-700 px-1 text-center text-xs font-bold leading-5 text-white" aria-hidden="true">0</span></button>' +
      '<div class="relative"><button id="profile-btn" type="button" aria-haspopup="true" aria-expanded="false" class="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-brand-50">' +
      '<span class="avatar flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white" aria-hidden="true">' + initial + '</span>' +
      '<span id="profile-name" class="hidden max-w-[8rem] truncate text-sm font-semibold sm:inline">' + UI.esc(u.full_name) + '</span>' +
      (admin ? '<span class="role-tag hidden sm:inline">Admin</span>' : '') + '</button>' +
      '<div id="profile-menu" class="absolute right-0 z-50 mt-2 hidden w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">' +
      '<div class="border-b border-slate-100 px-4 py-3"><p class="truncate text-sm font-semibold">' + UI.esc(u.full_name) + '</p><p class="truncate text-xs text-slate-600">' + UI.esc(u.email) + '</p></div>' +
      '<a class="block px-4 py-2 text-sm hover:bg-brand-50" href="profile.html">My profile</a>' +
      (admin ? '' : '<a class="block px-4 py-2 text-sm hover:bg-brand-50" href="my-registrations.html">My registrations</a>') +
      '<a class="block px-4 py-2 text-sm hover:bg-brand-50" href="notifications.html">All notifications</a>' +
      (admin ? '<a class="block px-4 py-2 text-sm hover:bg-brand-50" href="admin-users.html">Manage users</a>' : '') +
      '<button id="logout-btn" type="button" class="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm font-semibold text-red-800 hover:bg-red-50">Log out</button></div></div>' +
      '<button id="menu-btn" type="button" class="rounded-full p-2 hover:bg-brand-50 md:hidden" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-panel">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '</div></div>' +
      '<div id="mobile-panel" class="hidden border-t border-slate-200 bg-white px-4 py-3 md:hidden">' +
      '<form role="search" action="search.html" class="relative mb-3">' + searchField('q2') + '</form>' +
      '<nav aria-label="Main mobile" class="flex flex-col gap-1">' + links('block') + '</nav></div>' +
      '</header>' +
      '<div id="drawer-overlay" class="fixed inset-0 z-40 hidden bg-black/40"></div>' +
      '<aside id="notif-drawer" role="dialog" aria-modal="true" aria-label="Notifications" aria-hidden="true" class="invisible fixed inset-y-0 right-0 z-50 flex w-full max-w-sm translate-x-full flex-col bg-white shadow-2xl transition-transform">' +
      '<div class="drawer-head flex items-center justify-between p-4"><h2 class="font-display text-lg font-bold">Notifications</h2>' +
      '<button id="drawer-close" type="button" class="rounded-full px-2.5 py-1 text-xl hover:bg-white/50" aria-label="Close notifications">&times;</button></div>' +
      '<ul id="drawer-list" class="flex-1 divide-y divide-slate-100 overflow-y-auto"></ul>' +
      '<div class="flex justify-between border-t border-slate-200 p-3 text-sm"><button id="drawer-readall" type="button" class="font-semibold text-brand-700 underline">Mark all as read</button>' +
      '<a href="notifications.html" class="font-semibold text-brand-700 underline">Open inbox</a></div></aside>');

    if (/search\.html$/.test(location.pathname)) $('#q, #q2').val(UI.qs('q') || '');

    function closeMenu() { $('#profile-menu').addClass('hidden'); $('#profile-btn').attr('aria-expanded', 'false'); }
    $('#profile-btn').on('click', function (e) {
      e.stopPropagation();
      const open = $('#profile-menu').hasClass('hidden');
      $('#profile-menu').toggleClass('hidden', !open); $(this).attr('aria-expanded', String(open));
    });
    $('#profile-menu').on('click', function (e) { e.stopPropagation(); });
    $('#menu-btn').on('click', function () {
      const open = $('#mobile-panel').hasClass('hidden');
      $('#mobile-panel').toggleClass('hidden', !open); $(this).attr('aria-expanded', String(open));
    });
    $(document).on('click', closeMenu).on('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); closeDrawer(); } });
    $('#logout-btn').on('click', function () { Auth.logout('You have been logged out.', 'success'); });
    $('#bell-btn').on('click', openDrawer);
    $('#drawer-close, #drawer-overlay').on('click', closeDrawer);
    $('#drawer-readall').on('click', markAllRead);
    $('#drawer-list').on('click', 'a', function () { markRead($(this).data('id')); });
  }

  function openDrawer() {
    $('#notif-drawer').removeClass('invisible translate-x-full').attr('aria-hidden', 'false');
    $('#drawer-overlay').removeClass('hidden'); $('#bell-btn').attr('aria-expanded', 'true');
    $('#drawer-close').trigger('focus');
  }
  function closeDrawer() {
    if ($('#notif-drawer').hasClass('invisible')) return;
    $('#notif-drawer').addClass('invisible translate-x-full').attr('aria-hidden', 'true');
    $('#drawer-overlay').addClass('hidden'); $('#bell-btn').attr('aria-expanded', 'false').trigger('focus');
  }

  function updateBell() {
    const n = unreadCount(), r = getRead();
    $('#bell-count').text(n > 99 ? '99+' : n).toggleClass('hidden', n === 0);
    $('#bell-btn').attr('aria-label', 'Notifications, ' + n + ' unread');
    const html = notes.slice(0, 15).map(function (x) {
      const unread = r.indexOf(x.id) === -1;
      return '<li><a data-id="' + UI.esc(x.id) + '" href="notifications.html?id=' + encodeURIComponent(x.id) + '" class="block p-4 hover:bg-brand-50">' +
        '<p class="' + (unread ? 'font-bold' : 'text-slate-700') + '">' + (unread ? '<span class="mr-2 inline-block h-2 w-2 rounded-full bg-red-700" aria-hidden="true"></span><span class="sr-only">Unread: </span>' : '') + UI.esc(x.title) + '</p>' +
        '<p class="mt-0.5 line-clamp-2 text-sm text-slate-600">' + UI.esc(x.message) + '</p>' +
        '<p class="mt-1 text-xs text-slate-500">' + UI.formatDateTime(x.created_at) + '</p></a></li>';
    }).join('');
    $('#drawer-list').html(html || '<li class="p-6 text-center text-slate-600">You have no notifications yet.</li>');
    $(document).trigger('notes:updated');
  }

  function loadNotifications() {
    return Api.get('/notifications').done(function (res) { notes = res.data || []; updateBell(); });
  }

  // Admin sidebar. ROLE GUARD (UI): only rendered for admins (init checks Auth.isAdmin()).
  function renderSidebar(active) {
    const items = [['dashboard.html', 'Dashboard', 'dashboard'], ['admin-users.html', 'Users', 'admin'], ['events.html', 'Events', 'events'],
    ['event-form.html', 'New event', 'x1'], ['announcement-form.html', 'New announcement', 'x2'], ['promo-form.html', 'New promo', 'x3'], ['notifications.html', 'Notifications', 'notifications']];
    $('#sidebar').html('<aside class="hidden w-60 shrink-0 border-r border-slate-200 bg-white/80 p-4 md:block"><nav aria-label="Admin"><p class="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-slate-600">Admin tools</p><ul class="space-y-1">' +
      items.map(function (i) { return '<li><a href="' + i[0] + '" class="side-link"' + (i[2] === active ? ' aria-current="page"' : '') + '>' + i[1] + '</a></li>'; }).join('') + '</ul></nav></aside>');
  }

  // Page banner: built from the page's static <h1> (list pages). The h1 stays for screen readers.
  const BANNERS = {
    'announcements': ['Stay in the loop', 'Short audio updates from your community, whenever you need them.'],
    'promos': ['Community stories', 'Watch promo videos with captions and transcripts.'],
    'notifications': ['Your inbox', 'Everything new in your community, in one place.'],
    'my registrations': ['Your plans', 'Events you have registered for, or cancelled.'],
    'manage users': ['Administration', 'Search, review and enable or disable accounts.'],
    'my profile': ['Your account', 'Keep your name and email up to date.']
  };
  function renderBanner() {
    const $main = $('#main');
    if ($main.find('.hero-grad').length) return;
    const $h = $main.find('h1').first(), text = $.trim($h.text()), b = BANNERS[text.toLowerCase()];
    if (!text || !b) return;
    $h.addClass('sr-only');
    $main.prepend('<section class="hero-grad mb-6 rounded-2xl p-6 md:p-10"><nav aria-label="Breadcrumb" class="text-sm text-slate-700"><a class="underline" href="dashboard.html">Home</a> <span aria-hidden="true">/</span> <span aria-current="page">' + UI.esc(text) + '</span></nav>' +
      '<p class="eyebrow mt-3">' + b[0] + '</p><p class="mt-1 font-display text-4xl font-bold text-brand-900 md:text-5xl" aria-hidden="true">' + UI.esc(text) + '</p><p class="mt-2 max-w-xl text-slate-700">' + b[1] + '</p></section>');
  }

  function renderFooter() {
    const admin = Auth.isAdmin();
    const L = function (href, label) { return '<li><a class="text-white/90 underline-offset-4 hover:underline" href="' + href + '">' + label + '</a></li>'; };
    $('#site-footer').html('<footer class="mt-14 text-brand-100"><div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm sm:grid-cols-2 lg:grid-cols-4">' +
      '<div><div class="flex items-center gap-2"><span class="logo-mark">' + LOGO_SVG + '</span><span class="font-display text-xl font-bold text-white">CivicEvents<span class="text-sun-400">+</span></span></div>' +
      '<p class="mt-3 max-w-xs">Local events, announcements and promos that bring your community together.</p></div>' +
      '<div><p class="font-semibold text-white">Explore</p><ul class="mt-3 space-y-2">' + L('events.html', 'Events') + L('announcements.html', 'Announcements') + L('promos.html', 'Promos') + L('dashboard.html', 'Dashboard') + '</ul></div>' +
      '<div><p class="font-semibold text-white">Your account</p><ul class="mt-3 space-y-2">' + L('profile.html', 'My profile') + (admin ? L('admin-users.html', 'Manage users') : L('my-registrations.html', 'My registrations')) + L('notifications.html', 'Notifications') + '</ul></div>' +
      '<div><p class="font-semibold text-white">Contact and help</p><ul class="mt-3 space-y-2"><li>Kigali, Rwanda</li><li>Mon to Fri, 8:00 to 17:00</li><li><a class="text-white/90 underline-offset-4 hover:underline" href="mailto:support@civicevents.example">support@civicevents.example</a></li></ul></div></div>' +
      '<div class="border-t border-white/15"><div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs"><p>&copy; ' + new Date().getFullYear() + ' CivicEvents+. All rights reserved.</p><p>Built for communities, with accessibility in mind.</p></div></div></footer>');
  }

  function init(opts) {
    opts = opts || {};
    // ROLE GUARD: runs before anything is drawn.
    if (opts.guard === 'admin') { if (!Auth.requireAdmin()) return false; }
    else if (!Auth.requireAuth()) return false;
    UI.showFlash();
    renderHeader(opts.active); renderBanner(); renderFooter();
    if (opts.sidebar && Auth.isAdmin()) renderSidebar(opts.active);
    loadNotifications(); setInterval(loadNotifications, 60000);
    return true;
  }

  return { init: init, Cache: Cache, placeholder: PLACEHOLDER, markRead: markRead, markAllRead: markAllRead, getRead: getRead,
           unreadCount: unreadCount, reloadNotifications: loadNotifications, fmtTime: fmtTime, youtubeId: youtubeId };
})();