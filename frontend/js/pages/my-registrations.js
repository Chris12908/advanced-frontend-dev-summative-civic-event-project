$(function () {
  if (!Layout.init({ guard: 'auth', active: 'events' })) return;
  const $l = $('#list');
  function load() {
    $l.html(UI.skeletonRows(4));
    Api.get('/event-registrations/my-registrations').done(function (res) {
      const rows = res.data || [];
      $l.html(rows.length ? rows.map(function (r) {
        const on = r.status === 'registered';
        return '<article class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"><div>' +
          '<h2 class="font-display text-lg font-bold"><a class="hover:underline" href="event-detail.html?id=' + r.event_id + '">' + UI.esc(r.title) + '</a></h2>' +
          '<p class="text-sm text-slate-700">' + UI.formatDateTime(r.starts_at) + ' · ' + UI.esc(r.location) + '</p></div><div class="flex items-center gap-3">' +
          '<span class="rounded px-2 py-1 text-sm font-semibold ' + (on ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-700') + '">' + (on ? 'Registered' : 'Cancelled') + '</span>' +
          (on ? '<button type="button" class="cancel rounded border border-red-700 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50" data-id="' + r.event_id + '">Cancel registration</button>' : '') + '</div></article>';
      }).join('') : UI.emptyState('No registrations yet', 'Find an event and register to see it here.'));
    }).fail(function (err) { UI.renderError($l, err, load); });
  }
  $l.on('click', '.cancel', function () {
    const $b = $(this), id = $b.data('id');
    UI.confirmDialog({ title: 'Cancel registration?', message: 'You will not be able to register for this event again.', confirmText: 'Cancel registration' }).then(function (ok) {
      if (!ok) return;
      UI.setLoading($b, true, 'Cancelling…');
      Api.post('/event-registrations/cancel', { event_id: id }).done(function () { UI.toast('Registration cancelled.', 'success'); load(); })
        .fail(function (err) { UI.setLoading($b, false); UI.toast(UI.errorMessage(err), 'error'); });
    });
  });
  load();
});