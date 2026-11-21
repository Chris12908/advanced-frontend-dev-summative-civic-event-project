$(function () {
  if (!Layout.init({ guard: 'auth', active: 'dashboard', sidebar: true })) return;
  const admin = Auth.isAdmin(), me = Auth.getUser() || {};

  // Small line icons (24x24 stroke paths).
  const ICONS = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    speaker: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>',
    video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M22 8l-5 4 5 4V8z"/>',
    users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
    bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    list: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>'
  };
  const icon = function (n) { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>'; };
  const pulse = function (n) { let h = ''; for (let i = 0; i < n; i++) h += '<div class="h-24 animate-pulse rounded-lg bg-slate-200" aria-hidden="true"></div>'; return h + '<span class="sr-only" role="status">Loading…</span>'; };

  $('#page-title').text('Hello, ' + String(me.full_name || '').split(' ')[0] + '!');
  $('#hero-sub').text(admin ? 'Here is how your community platform is doing today.' : 'Here is what is happening in your community.');

  function stat(label, value, href, ic) {
    const inner = '<span class="icon-chip">' + icon(ic) + '</span><div><p class="text-3xl font-bold leading-none text-brand-900">' + UI.esc(value) + '</p><p class="mt-1 text-sm text-slate-700">' + UI.esc(label) + '</p></div>';
    return href ? '<a href="' + href + '" class="tile flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5">' + inner + '</a>'
      : '<div class="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5">' + inner + '</div>';
  }

  // Accessible bar chart: visual bars + a hidden data table for screen readers.
  function bars(title, items) {
    const max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return '<section class="rounded-lg border border-slate-200 bg-white p-5"><h3 class="font-display text-lg font-bold">' + UI.esc(title) + '</h3>' +
      '<div class="mt-4 flex items-end gap-3" style="height:170px" aria-hidden="true">' + items.map(function (i) {
        return '<div class="flex h-full flex-1 flex-col items-center justify-end"><span class="text-xs font-semibold">' + i.value + '</span>' +
          '<div class="w-full rounded-t bg-brand-600" style="height:' + Math.round(i.value / max * 120) + 'px;min-height:2px"></div>' +
          '<span class="mt-1 text-center text-xs text-slate-700">' + UI.esc(i.label) + '</span></div>';
      }).join('') + '</div><table class="sr-only"><caption>' + UI.esc(title) + '</caption><tbody>' +
      items.map(function (i) { return '<tr><th scope="row">' + UI.esc(i.label) + '</th><td>' + i.value + '</td></tr>'; }).join('') + '</tbody></table></section>';
  }

  // ----- stats (and charts for admins) -----
  let statsLoaded = false;
  function loadStats() {
    if (!statsLoaded) $('#stats').html('<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">' + pulse(admin ? 10 : 5) + '</div>');
    if (admin) {
      Api.get('/dashboard/admin').done(function (res) {
        statsLoaded = true;
        const d = res.data, n = UI.num;
        const upcoming = n(d.events.upcoming_events), past = n(d.events.past_events), total = n(d.events.total_events);
        $('#stats').html('<div class="mb-3 flex items-center justify-between"><p class="text-sm text-slate-600">Updated ' + new Date().toLocaleTimeString() + '</p>' +
          '<button id="refresh" type="button" class="rounded border border-slate-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-100">Refresh</button></div>' +
          '<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">' +
          stat('Users', n(d.users.total_users), 'admin-users.html', 'users') + stat('Active users', n(d.users.active_users), null, 'check') +
          stat('Events', total, 'events.html', 'calendar') + stat('Upcoming events', upcoming, null, 'calendar') +
          stat('Registrations', n(d.registrations.total_registrations), null, 'list') + stat('Feedback entries', n(d.feedbacks.total_feedback), null, 'star') +
          stat('Promos', n(d.promos.total_promos), 'promos.html', 'video') + stat('Announcements', n(d.announcements.total_announcements), 'announcements.html', 'speaker') +
          stat('Notifications', n(d.notifications.total_notifications), 'notifications.html', 'bell') + stat('Unread for you', Layout.unreadCount(), 'notifications.html', 'bell') + '</div>');
        $('#charts-wrap').removeClass('hidden');
        $('#charts').html(
          bars('New users per month', (d.user_growth || []).map(function (g) { return { label: g.month, value: n(g.new_users) }; })) +
          bars('Events by timing', [{ label: 'Upcoming', value: upcoming }, { label: 'Past', value: past }, { label: 'Happening now', value: Math.max(0, total - upcoming - past) }]) +
          bars('Users by status', [{ label: 'Active', value: n(d.users.active_users) }, { label: 'Disabled', value: n(d.users.inactive_users) }]));
        $('#refresh').on('click', function () { loadStats(); loadUpcoming(); Layout.reloadNotifications(); });
      }).fail(function (err) { UI.renderError($('#stats'), err, loadStats); });
    } else {
      Api.get('/dashboard/me').done(function (res) {
        statsLoaded = true;
        const d = res.data, n = UI.num;
        $('#stats').html('<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">' +
          stat('Events you registered for', n(d.registrations.total_registered_events), 'my-registrations.html', 'list') + stat('Feedback you left', n(d.feedbacks.total_feedbacks), null, 'star') +
          stat('Unread notifications', Layout.unreadCount(), 'notifications.html', 'bell') + stat('Announcements', n(d.announcements.total_announcements), 'announcements.html', 'speaker') +
          stat('Promos', n(d.promos.total_promos), 'promos.html', 'video') + '</div>');
      }).fail(function (err) { UI.renderError($('#stats'), err, loadStats); });
    }
  }

  // ----- quick actions (ROLE GUARD (UI): different tiles for admins and users) -----
  function quick() {
    const items = admin
      ? [['event-form.html', 'New event', 'Publish a new community event', 'plus'], ['announcement-form.html', 'New announcement', 'Share an update, with optional audio', 'speaker'],
         ['promo-form.html', 'New promo', 'Upload a video or paste a YouTube link', 'video'], ['admin-users.html', 'Manage users', 'Enable or disable accounts', 'users']]
      : [['events.html', 'Browse events', 'Find something happening nearby', 'calendar'], ['my-registrations.html', 'My registrations', 'See and manage your plans', 'list'],
         ['announcements.html', 'Announcements', 'Listen to the latest updates', 'speaker'], ['promos.html', 'Promos', 'Watch videos with captions', 'video']];
    $('#quick').html(items.map(function (i) {
      return '<a href="' + i[0] + '" class="tile flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5"><span class="icon-chip">' + icon(i[3]) + '</span>' +
        '<span><span class="block font-display text-lg font-bold">' + i[1] + '</span><span class="mt-0.5 block text-sm text-slate-700">' + i[2] + '</span></span></a>';
    }).join(''));
  }

  // ----- upcoming events -----
  function loadUpcoming() {
    $('#upcoming').html(pulse(3));
    Api.get('/events').done(function (res) {
      const now = new Date();
      const list = (res.data || []).filter(function (e) { return (admin || e.published !== false) && new Date(e.ends_at || e.starts_at) >= now; })
        .sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); }).slice(0, 3);
      $('#upcoming').html(list.length ? list.map(function (e) {
        const d = new Date(e.starts_at);
        return '<a href="event-detail.html?id=' + e.id + '" class="tile flex gap-4 rounded-lg border border-slate-200 bg-white p-4">' +
          '<div class="flex h-16 w-16 flex-none flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800" aria-hidden="true"><span class="text-2xl font-bold leading-none">' + d.getDate() + '</span><span class="mt-1 text-[11px] font-bold tracking-wider">' + d.toLocaleString(undefined, { month: 'short' }).toUpperCase() + '</span></div>' +
          '<div class="min-w-0"><p class="truncate font-display text-lg font-bold">' + UI.esc(e.title) + '</p><p class="text-sm text-slate-700">' + UI.formatDateTime(e.starts_at) + '</p><p class="truncate text-sm text-slate-700">' + UI.esc(e.location) + '</p></div></a>';
      }).join('') : UI.emptyState('No upcoming events', admin ? 'Create one to get started.' : 'Check back soon.'));
    }).fail(function (err) { UI.renderError($('#upcoming'), err, loadUpcoming); });
  }

  quick(); loadStats(); loadUpcoming();
  if (admin) setInterval(loadStats, 60000);
  $(document).on('notes:updated', function () { if (statsLoaded) loadStats(); });
});