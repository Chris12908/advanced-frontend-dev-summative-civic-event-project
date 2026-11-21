$(function () {
  if (!Layout.init({ guard: 'auth', active: 'announcements' })) return;
  const admin = Auth.isAdmin(), $grid = $('#grid');
  let items = [];
  if (admin) $('#admin-actions').html('<a href="announcement-form.html" class="rounded bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">New announcement</a>');

  function card(a) {
    const t = UI.esc(a.title), hasAudio = !!a.audio_url;
    return '<article class="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div class="flex items-start justify-between gap-2"><h2 class="font-display text-lg font-bold">' + t + '</h2>' +
      (a.published === false ? '<span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Unpublished</span>' : '') + '</div>' +
      '<p class="mt-1 text-sm text-slate-700">' + UI.formatDateTime(a.created_at) +
      (hasAudio ? '. Length: <span class="dur" data-url="' + UI.esc(a.audio_url) + '">loading…</span>' : '. Text announcement (no audio)') + '</p>' +
      '<div class="mt-4 flex flex-wrap gap-2"><a class="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800" href="announcement-detail.html?id=' + a.id + '" aria-label="' + (hasAudio ? 'Play ' : 'Open ') + t + '">' + (hasAudio ? 'Play' : 'Read') + '</a>' +
      // ROLE GUARD (UI): admin-only controls
      (admin ? '<button type="button" class="pub rounded border border-slate-400 px-3 py-2 text-sm font-semibold hover:bg-slate-100" data-id="' + a.id + '" data-pub="' + (a.published !== false) + '">' + (a.published === false ? 'Publish' : 'Unpublish') + '</button>' +
        '<a class="rounded border border-slate-400 px-3 py-2 text-sm font-semibold hover:bg-slate-100" href="announcement-form.html?id=' + a.id + '">Edit</a>' +
        '<button type="button" class="del rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800" data-id="' + a.id + '" data-title="' + t + '">Delete</button>' : '') + '</div></article>';
  }
  function render() {
    const list = items.filter(function (a) { return admin || a.published !== false; });
    $grid.html(list.length ? list.map(card).join('') : UI.emptyState('No announcements yet', admin ? 'Create the first one.' : 'Check back soon.'));
    $grid.find('.dur').each(function () {   // duration is not stored by the API, so read it from the audio file
      const el = this, au = new Audio(); au.preload = 'metadata';
      au.onloadedmetadata = function () { el.textContent = Layout.fmtTime(au.duration); };
      au.onerror = function () { el.textContent = 'unknown'; };
      au.src = el.getAttribute('data-url');
    });
  }
  function load() {
    $grid.html(UI.skeletonCards(4));
    Api.get('/announcements?limit=100').done(function (res) { items = res.data || []; render(); }).fail(function (err) { UI.renderError($grid, err, load); });
  }
  $grid.on('click', '.pub', function () {
    const $b = $(this), id = $b.data('id'), pub = String($b.data('pub')) === 'true';
    UI.setLoading($b, true, 'Saving…');
    Api.patch('/announcements/' + id + (pub ? '/unpublish' : '/publish')).done(function () { UI.toast(pub ? 'Unpublished.' : 'Published.', 'success'); load(); })
      .fail(function (err) { UI.setLoading($b, false); UI.toast(UI.errorMessage(err), 'error'); });
  }).on('click', '.del', function () {
    const id = $(this).data('id');
    UI.confirmDialog({ title: 'Delete announcement?', message: '"' + $(this).data('title') + '" will be permanently deleted.', confirmText: 'Delete' }).then(function (ok) {
      if (ok) Api.del('/announcements/' + id).done(function () { UI.toast('Announcement deleted.', 'success'); load(); }).fail(function (err) { UI.toast(UI.errorMessage(err), 'error'); });
    });
  });
  load();
});