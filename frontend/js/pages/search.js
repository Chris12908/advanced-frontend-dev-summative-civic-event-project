$(function () {
  if (!Layout.init({ guard: 'auth' })) return;
  const admin = Auth.isAdmin(), q = (UI.qs('q') || '').trim().toLowerCase(), $r = $('#results');
  $('#heading').text(q ? 'Results for "' + (UI.qs('q') || '').trim() + '"' : 'Search');
  if (!q) { $r.html(UI.emptyState('Type something in the search box', 'Search covers events, announcements and promos.')); return; }
  $r.html(UI.skeletonRows(4));
  const hit = function (o, keys) { return keys.map(function (k) { return o[k] || ''; }).join(' ').toLowerCase().indexOf(q) > -1; };
  const vis = function (x) { return admin || x.published !== false; };
  $.when(Api.get('/events'), Api.get('/announcements?limit=100'), Api.get('/promos?page=1&limit=100')).done(function (ev, an, pr) {
    function section(title, items, href, sub) {
      return '<section class="mt-6"><h2 class="font-display text-xl font-bold">' + title + ' (' + items.length + ')</h2>' + (items.length ? '<ul class="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">' +
        items.map(function (i) { return '<li><a class="block p-4 hover:bg-slate-50" href="' + href + i.id + '"><p class="font-semibold">' + UI.esc(i.title) + '</p><p class="text-sm text-slate-600">' + UI.esc(sub(i)) + '</p></a></li>'; }).join('') + '</ul>' : '<p class="mt-2 text-slate-700">No matches.</p>') + '</section>';
    }
    const e = (ev.data || []).filter(vis).filter(function (x) { return hit(x, ['title', 'description', 'location']); });
    const a = (an.data || []).filter(vis).filter(function (x) { return hit(x, ['title']); });
    const p = (pr.data || []).filter(vis).filter(function (x) { return hit(x, ['title', 'description', 'caption_text']); });
    $r.html(section('Events', e, 'event-detail.html?id=', function (i) { return UI.formatDateTime(i.starts_at) + ', ' + (i.location || ''); }) +
      section('Announcements', a, 'announcement-detail.html?id=', function (i) { return UI.formatDateTime(i.created_at); }) +
      section('Promos', p, 'promo-detail.html?id=', function (i) { return i.description || ''; }));
  }).fail(function (err) { UI.renderError($r, err, function () { location.reload(); }); });
});