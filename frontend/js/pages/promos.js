$(function () {
  if (!Layout.init({ guard: 'auth', active: 'promos' })) return;
  const admin = Auth.isAdmin(), $grid = $('#grid');
  let items = [];
  if (admin) $('#admin-actions').html('<a href="promo-form.html" class="rounded bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">New promo</a>');

  // Lazy-load video thumbnails: the file is only requested when the card scrolls into view.
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { const v = en.target; v.src = v.getAttribute('data-src') + '#t=0.5'; v.preload = 'metadata'; io.unobserve(v); }
    });
  }, { rootMargin: '200px' }) : null;

  function thumb(p) {
    const yt = Layout.youtubeId(p.video_url);
    return yt
      ? '<img src="https://img.youtube.com/vi/' + yt + '/hqdefault.jpg" alt="" loading="lazy" class="h-full w-full object-cover">'
      : '<video class="thumb h-full w-full object-cover" muted playsinline preload="none" data-src="' + UI.esc(p.video_url) + '" aria-hidden="true" tabindex="-1"></video>';
  }

  function card(p) {
    const t = UI.esc(p.title);
    return '<article class="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div class="aspect-video bg-slate-900">' + thumb(p) + '</div>' +
      '<div class="flex flex-1 flex-col p-4"><div class="flex items-start justify-between gap-2"><h2 class="font-display text-lg font-bold">' + t + '</h2>' +
      (p.published === false ? '<span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Unpublished</span>' : '') + '</div>' +
      '<p class="mt-1 line-clamp-3 flex-1 text-sm">' + UI.esc(p.description) + '</p><div class="mt-4 flex flex-wrap gap-2">' +
      '<a class="rounded bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800" href="promo-detail.html?id=' + p.id + '" aria-label="Play ' + t + '">Play</a>' +
      // ROLE GUARD (UI): admin-only controls
      (admin ? '<button type="button" class="pub rounded border border-slate-400 px-3 py-2 text-sm font-semibold hover:bg-slate-100" data-id="' + p.id + '" data-pub="' + (p.published !== false) + '">' + (p.published === false ? 'Publish' : 'Unpublish') + '</button>' +
        '<a class="rounded border border-slate-400 px-3 py-2 text-sm font-semibold hover:bg-slate-100" href="promo-form.html?id=' + p.id + '">Edit</a>' +
        '<button type="button" class="del rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800" data-id="' + p.id + '" data-title="' + t + '">Delete</button>' : '') + '</div></div></article>';
  }
  function render() {
    const list = items.filter(function (p) { return admin || p.published !== false; });
    $grid.html(list.length ? list.map(card).join('') : UI.emptyState('No promos yet', admin ? 'Add the first promo.' : 'Check back soon.'));
    $grid.find('video.thumb').each(function () { if (io) io.observe(this); });
  }
  function load(force) {
    const cached = !force && Layout.Cache.get('promos');
    if (cached) { items = cached; render(); return; }
    $grid.html(UI.skeletonCards(3));
    Api.get('/promos?page=1&limit=100').done(function (res) { items = res.data || []; Layout.Cache.set('promos', items, 60000); render(); })
      .fail(function (err) { UI.renderError($grid, err, function () { load(true); }); });
  }
  $grid.on('click', '.pub', function () {
    const $b = $(this), id = $b.data('id'), pub = String($b.data('pub')) === 'true';
    UI.setLoading($b, true, 'Saving…');
    Api.patch('/promos/' + id + (pub ? '/unpublish' : '/publish')).done(function () { Layout.Cache.clear('promos'); UI.toast(pub ? 'Unpublished.' : 'Published.', 'success'); load(true); })
      .fail(function (err) { UI.setLoading($b, false); UI.toast(UI.errorMessage(err), 'error'); });
  }).on('click', '.del', function () {
    const id = $(this).data('id');
    UI.confirmDialog({ title: 'Delete promo?', message: '"' + $(this).data('title') + '" will be permanently deleted.', confirmText: 'Delete' }).then(function (ok) {
      if (ok) Api.del('/promos/' + id).done(function () { Layout.Cache.clear('promos'); UI.toast('Promo deleted.', 'success'); load(true); }).fail(function (err) { UI.toast(UI.errorMessage(err), 'error'); });
    });
  });
  load();
});