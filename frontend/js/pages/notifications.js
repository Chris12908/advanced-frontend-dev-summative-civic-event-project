$(function () {
  if (!Layout.init({ guard: 'auth', active: 'notifications', sidebar: true })) return;
  const admin = Auth.isAdmin(), $list = $('#list'), $det = $('#notif-detail');
  let notes = [], sel = UI.qs('id');

  function linkFor(n) {
    const m = n.metadata || {};
    if (m.event_id) return ['event-detail.html?id=' + m.event_id, 'View event'];
    if (m.announcement_id) return ['announcement-detail.html?id=' + m.announcement_id, 'Open announcement'];
    if (m.promo_id) return ['promo-detail.html?id=' + m.promo_id, 'Watch promo'];
    return null;
  }
  function renderList() {
    const read = Layout.getRead();
    $list.html(notes.length ? notes.map(function (n) {
      const unread = read.indexOf(n.id) === -1;
      return '<li class="flex items-stretch border-b border-slate-100"><button type="button" class="open flex-1 p-4 text-left hover:bg-slate-50" data-id="' + n.id + '"' + (n.id === sel ? ' aria-current="true"' : '') + '>' +
        '<p class="' + (unread ? 'font-bold' : '') + '">' + (unread ? '<span class="mr-2 inline-block h-2 w-2 rounded-full bg-red-700" aria-hidden="true"></span><span class="sr-only">Unread: </span>' : '') + UI.esc(n.title) + '</p>' +
        '<p class="text-xs text-slate-600">' + UI.esc(n.type) + ' · ' + UI.formatDateTime(n.created_at) + '</p></button>' +
        // ROLE GUARD (UI): only admins see the delete button (backend: authorize(['admin']))
        (admin ? '<button type="button" class="del px-3 text-sm font-semibold text-red-800 hover:bg-red-50" data-id="' + n.id + '" aria-label="Delete notification ' + UI.esc(n.title) + '">Delete</button>' : '') + '</li>';
    }).join('') : '<li>' + UI.emptyState('You have no notifications yet') + '</li>');
  }
  function show(id) {
    sel = id;
    let n = notes.filter(function (x) { return x.id === id; })[0];
    function paint(n) {
      if (!n) { $det.html('<p class="text-slate-700">That notification no longer exists.</p>'); return; }
      Layout.markRead(n.id); renderList();                    // optimistic: marked read immediately
      const l = linkFor(n);
      $det.html('<h2 class="font-display text-2xl font-bold">' + UI.esc(n.title) + '</h2><p class="mt-1 text-sm text-slate-600">' + UI.esc(n.type) + ' · ' + UI.formatDateTime(n.created_at) + '</p>' +
        '<p class="mt-4 whitespace-pre-line">' + UI.esc(n.message) + '</p>' + (l ? '<p class="mt-5"><a class="rounded bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800" href="' + l[0] + '">' + l[1] + '</a></p>' : ''));
    }
    if (n) paint(n);
    else if (UI.isUuid(id)) Api.get('/notifications/' + id).done(function (r) { paint(r.data); }).fail(function () { paint(null); });
    else paint(null);
  }
  function load() {
    $list.html(UI.skeletonRows(5));
    Api.get('/notifications').done(function (res) { notes = res.data || []; renderList(); if (sel) show(sel); Layout.reloadNotifications(); })
      .fail(function (err) { UI.renderError($list, err, load); });
  }
  $list.on('click', '.open', function () { show($(this).data('id')); })
    .on('click', '.del', function () {
      const id = $(this).data('id');
      UI.confirmDialog({ title: 'Delete notification?', message: 'It will be removed for every user who can see it.', confirmText: 'Delete' }).then(function (ok) {
        if (!ok) return;
        Api.del('/notifications/' + id).done(function () { UI.toast('Notification deleted.', 'success'); if (sel === id) { sel = null; $det.html('<p class="text-slate-700">Select a notification to read it.</p>'); } load(); })
          .fail(function (err) { UI.toast(UI.errorMessage(err), 'error'); });
      });
    });
  $('#mark-all').on('click', function () { Layout.markAllRead(); renderList(); UI.toast('All notifications marked as read.', 'success'); });
  load();
});