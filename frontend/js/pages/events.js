$(function () {
  if (!Layout.init({ guard: 'auth', active: 'events', sidebar: true })) return;
  const admin = Auth.isAdmin(), PER = 9;
  let events = [], regs = {}, page = 1;
  const $grid = $('#grid');

  // ROLE GUARD (UI): only admins get the create button and Edit/Delete controls.
  if (admin) $('#admin-actions').html('<a href="event-form.html" class="rounded bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">New event</a>');

  function load() {
    $grid.html(UI.skeletonCards(6)); $('#pager').empty();
    const calls = [Api.get('/events')];
    if (!admin) calls.push(Api.get('/event-registrations/my-registrations'));
    $.when.apply($, calls).done(function (ev, rg) {
      events = ev.data || []; regs = {};
      ((rg && rg.data) || []).forEach(function (r) { regs[r.event_id] = r.status; });
      const locs = events.map(function (e) { return e.location; }).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
      $('#f-loc').html('<option value="">All locations</option>' + locs.map(function (l) { return '<option>' + UI.esc(l) + '</option>'; }).join(''));
      render();
    }).fail(function (err) { UI.renderError($grid, err, load); });
  }

  function visible() {
    const q = $('#f-q').val().toLowerCase().trim(), loc = $('#f-loc').val(), from = $('#f-date').val();
    return events.filter(function (e) {
      return (admin || e.published !== false) &&   // non-admins never see unpublished items
        (!q || (e.title + ' ' + (e.description || '') + ' ' + (e.location || '')).toLowerCase().indexOf(q) > -1) &&
        (!loc || e.location === loc) && (!from || new Date(e.starts_at) >= new Date(from + 'T00:00'));
    });
  }

  // Small calendar chip (day + month) shown over the event image.
  function dateChip(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return '<div class="absolute left-3 top-3 flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-white text-brand-800 shadow" aria-hidden="true">' +
      '<span class="text-xl font-bold leading-none">' + d.getDate() + '</span>' +
      '<span class="mt-0.5 text-[10px] font-bold tracking-wider">' + d.toLocaleString(undefined, { month: 'short' }).toUpperCase() + '</span></div>';
  }

  function card(e) {
    const img = e.metadata && e.metadata.image_url, st = regs[e.id];
    let actions = '<a class="rounded border border-brand-700 px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50" href="event-detail.html?id=' + e.id + '">View</a>';
    if (admin) actions += '<a class="rounded border border-slate-400 px-3 py-1.5 text-sm font-semibold hover:bg-slate-100" href="event-form.html?id=' + e.id + '">Edit</a>' +
      '<button type="button" class="del rounded bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800" data-id="' + e.id + '" data-title="' + UI.esc(e.title) + '">Delete</button>';
    else if (st === 'registered') actions += '<span class="rounded bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-900">Registered</span>';
    else if (st === 'cancelled') actions += '<span class="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700">Cancelled</span>';
    else actions += '<button type="button" class="reg rounded bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800" data-id="' + e.id + '">Register</button>';
    return '<article class="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md">' +
      '<div class="relative"><img src="' + UI.esc(img || Layout.placeholder) + '" alt="' + (img ? 'Photo for ' + UI.esc(e.title) : '') + '" loading="lazy" class="h-44 w-full object-cover">' + dateChip(e.starts_at) + '</div>' +
      '<div class="flex flex-1 flex-col p-4"><h2 class="font-display text-lg font-bold">' + UI.esc(e.title) + '</h2>' +
      '<p class="mt-1 text-sm text-slate-700">' + UI.formatDateTime(e.starts_at) + '</p><p class="text-sm text-slate-700">' + UI.esc(e.location) + '</p>' +
      '<p class="mt-2 line-clamp-3 flex-1 text-sm">' + UI.esc(e.description) + '</p><div class="mt-4 flex flex-wrap gap-2">' + actions + '</div></div></article>';
  }

  function render() {
    const list = visible(), pages = Math.max(1, Math.ceil(list.length / PER));
    page = Math.min(page, pages);
    $grid.html(list.length ? list.slice((page - 1) * PER, page * PER).map(card).join('') : UI.emptyState('No events found', 'Try clearing the filters.'));
    $grid.find('img').on('error', function () { this.src = Layout.placeholder; });
    $('#count').text(list.length + (list.length === 1 ? ' event' : ' events') + ' in your community');
    $('#pager').html(pages > 1 ? '<button type="button" id="prev" class="rounded border border-slate-400 bg-white px-3 py-1.5 disabled:opacity-50" ' + (page === 1 ? 'disabled' : '') + '>Previous</button>' +
      '<span class="px-3" aria-live="polite">Page ' + page + ' of ' + pages + '</span><button type="button" id="next" class="rounded border border-slate-400 bg-white px-3 py-1.5 disabled:opacity-50" ' + (page === pages ? 'disabled' : '') + '>Next</button>' : '');
  }

  $('#filters').on('input change', function () { page = 1; render(); }).on('submit', function (e) { e.preventDefault(); });
  $('#reset').on('click', function () { $('#filters')[0].reset(); page = 1; render(); });
  $('#pager').on('click', '#prev', function () { page--; render(); $('#main')[0].scrollIntoView(); })
    .on('click', '#next', function () { page++; render(); $('#main')[0].scrollIntoView(); });

  $grid.on('click', '.reg', function () {
    const $b = $(this), id = $b.data('id');
    UI.setLoading($b, true, 'Registering…');
    Api.post('/event-registrations/register', { event_id: id }).done(function () {
      regs[id] = 'registered'; UI.toast('You are registered.', 'success'); render();
    }).fail(function (err) { UI.setLoading($b, false); UI.toast(UI.errorMessage(err), 'error'); });
  });
  $grid.on('click', '.del', function () {
    const id = $(this).data('id'), title = $(this).data('title');
    UI.confirmDialog({ title: 'Delete event?', message: '"' + title + '" will be permanently deleted.', confirmText: 'Delete' }).then(function (ok) {
      if (!ok) return;
      Api.del('/events/' + id).done(function () { UI.toast('Event deleted.', 'success'); load(); })
        .fail(function (err) { UI.toast(UI.errorMessage(err), 'error'); });
    });
  });
  load();
});