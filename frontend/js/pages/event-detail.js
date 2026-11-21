$(function () {
  if (!Layout.init({ guard: 'auth', active: 'events', sidebar: true })) return;
  const id = UI.qs('id'), admin = Auth.isAdmin();
  const $main = $('#event-main');
  let ev = null, mine = null;
  if (!UI.isUuid(id)) { UI.renderError($main, { message: 'We could not find that event.' }); return; }

  const stars = function (n) { n = Math.round(n); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };

  function loadEvent() {
    $main.html(UI.skeletonRows(4));
    Api.get('/events/' + id).done(function (res) {
      ev = res.data; renderMain();
      if (admin) { loadAttendees(); } else { loadReg(); }
      loadFeedback();
    }).fail(function (err) { UI.renderError($main, err, loadEvent); });
  }

  function renderMain() {
    const img = ev.metadata && ev.metadata.image_url;
    document.title = ev.title + ' · CivicEvents+';
    $main.html('<a href="events.html" class="text-sm font-semibold text-brand-700 underline">Back to events</a>' +
      '<div class="mt-3 grid gap-6 md:grid-cols-2"><img id="ev-img" src="' + UI.esc(img || Layout.placeholder) + '" alt="' + (img ? 'Photo for ' + UI.esc(ev.title) : '') + '" class="h-72 w-full rounded-lg object-cover">' +
      '<div><h1 class="font-display text-3xl font-bold">' + UI.esc(ev.title) + '</h1>' +
      '<dl class="mt-3 space-y-1 text-slate-800"><div><dt class="inline font-semibold">Starts: </dt><dd class="inline">' + UI.formatDateTime(ev.starts_at) + '</dd></div>' +
      '<div><dt class="inline font-semibold">Ends: </dt><dd class="inline">' + UI.formatDateTime(ev.ends_at) + '</dd></div>' +
      '<div><dt class="inline font-semibold">Where: </dt><dd class="inline">' + UI.esc(ev.location) + ' <a class="font-semibold text-brand-700 underline" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ev.location || '') + '">Open map</a></dd></div></dl>' +
      // ROLE GUARD (UI): edit/delete only rendered for admins.
      (admin ? '<div class="mt-4 flex gap-2"><a class="rounded border border-slate-400 px-3 py-1.5 text-sm font-semibold hover:bg-slate-100" href="event-form.html?id=' + id + '">Edit</a>' +
        '<button id="del" type="button" class="rounded bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800">Delete</button></div>' : '') +
      '</div></div><div class="mt-6 max-w-prose whitespace-pre-line leading-relaxed">' + UI.esc(ev.description) + '</div>');
    $('#ev-img').on('error', function () { this.src = Layout.placeholder; });
    $('#del').on('click', function () {
      UI.confirmDialog({ title: 'Delete event?', message: 'This cannot be undone.', confirmText: 'Delete' }).then(function (ok) {
        if (!ok) return;
        Api.del('/events/' + id).done(function () { Auth.setFlash('Event deleted.', 'success'); location.href = 'events.html'; })
          .fail(function (err) { UI.toast(UI.errorMessage(err), 'error'); });
      });
    });
  }

  // ----- registration (normal users only) -----
  let regStatus = null;
  function loadReg() {
    Api.get('/event-registrations/my-registrations').done(function (res) {
      const r = (res.data || []).filter(function (x) { return x.event_id === id; })[0];
      regStatus = r ? r.status : null; renderReg();
    }).fail(function (err) { UI.renderError($('#reg-box'), err, loadReg); });
  }
  function renderReg() {
    const ended = new Date(ev.ends_at) < new Date();
    let h = '<h2 class="font-display text-xl font-bold">Your registration</h2>';
    if (regStatus === 'registered') h += '<p class="mt-2">You are registered for this event.</p><button id="cancel" type="button" class="mt-3 rounded border border-red-700 px-4 py-2 font-semibold text-red-800 hover:bg-red-50">Cancel registration</button>';
    else if (regStatus === 'cancelled') h += '<p class="mt-2 text-slate-700">You cancelled your registration. The service does not allow registering again for the same event.</p>';
    else if (ended) h += '<p class="mt-2 text-slate-700">This event has ended.</p>';
    else h += '<button id="register" type="button" class="mt-3 rounded bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">Register for this event</button>';
    $('#reg-box').removeClass('hidden').html(h);
  }
  $('#reg-box').on('click', '#register', function () {
    const $b = $(this); UI.setLoading($b, true, 'Registering…');
    Api.post('/event-registrations/register', { event_id: id }).done(function () { UI.toast('You are registered.', 'success'); loadReg(); })
      .fail(function (err) { UI.setLoading($b, false); UI.toast(UI.errorMessage(err), 'error'); });
  }).on('click', '#cancel', function () {
    const $b = $(this);
    UI.confirmDialog({ title: 'Cancel registration?', message: 'You will not be able to register for this event again.', confirmText: 'Cancel registration' }).then(function (ok) {
      if (!ok) return;
      UI.setLoading($b, true, 'Cancelling…');
      Api.post('/event-registrations/cancel', { event_id: id }).done(function () { UI.toast('Registration cancelled.', 'success'); loadReg(); })
        .fail(function (err) { UI.setLoading($b, false); UI.toast(UI.errorMessage(err), 'error'); });
    });
  });

  // ----- attendees (ADMIN ONLY: backend route is authorize(['admin'])) -----
  function loadAttendees() {
    const $a = $('#attendees').removeClass('hidden').html(UI.skeletonRows(3));
    Api.get('/event-registrations/event/' + id + '/attendees').done(function (res) {
      const rows = res.data || [];
      $a.html('<h2 class="font-display text-xl font-bold">Registrants (' + rows.length + ')</h2>' + (rows.length ?
        '<div class="mt-3 overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-2 pr-4">Name</th><th class="py-2 pr-4">Email</th><th class="py-2">Registered</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr class="border-b border-slate-100"><td class="py-2 pr-4">' + UI.esc(r.full_name) + '</td><td class="py-2 pr-4">' + UI.esc(r.email) + '</td><td class="py-2">' + UI.formatDateTime(r.created_at) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="mt-2 text-slate-700">Nobody has registered yet.</p>'));
    }).fail(function (err) { UI.renderError($a, err, loadAttendees); });
  }

  // ----- feedback -----
  function loadFeedback() {
    const $f = $('#feedback').removeClass('hidden');
    if (admin) {   // ROLE GUARD: only admins can read all feedback (backend rule)
      Api.get('/event-feedback/event/' + id).done(function (res) {
        const list = res.data || [], avg = list.length ? list.reduce(function (s, f) { return s + f.rating; }, 0) / list.length : 0;
        $f.html('<h2 class="font-display text-xl font-bold">Feedback</h2>' + (list.length ?
          '<p class="mt-2" aria-label="Average rating ' + avg.toFixed(1) + ' out of 5"><span class="text-2xl text-sun-600" aria-hidden="true">' + stars(avg) + '</span> <strong>' + avg.toFixed(1) + '</strong> from ' + list.length + ' review' + (list.length > 1 ? 's' : '') + '</p><ul class="mt-3 space-y-3">' +
          list.map(function (f) { return '<li class="rounded border border-slate-200 p-3"><p class="text-sun-600" aria-label="' + f.rating + ' out of 5">' + stars(f.rating) + '</p><p>' + UI.esc(f.comment) + '</p><p class="mt-1 text-xs text-slate-600">' + UI.esc(f.full_name) + ', ' + UI.formatDateTime(f.created_at) + '</p></li>'; }).join('') + '</ul>'
          : '<p class="mt-2 text-slate-700">No feedback yet.</p>'));
      }).fail(function (err) { UI.renderError($f, err, loadFeedback); });
    } else {
      Api.get('/event-feedback/my-feedback').done(function (res) {
        mine = (res.data || []).filter(function (f) { return f.event_id === id; })[0] || null; renderUserFeedback();
      }).fail(function (err) { UI.renderError($f, err, loadFeedback); });
    }
  }
  function renderUserFeedback() {
    let radios = '';
    for (let i = 1; i <= 5; i++) radios += '<label class="mr-4 inline-flex items-center gap-1"><input type="radio" name="rating" value="' + i + '"' + (mine && mine.rating === i ? ' checked' : '') + '> ' + i + '</label>';
    $('#feedback').html('<h2 class="font-display text-xl font-bold">' + (mine ? 'Your feedback' : 'Leave feedback') + '</h2>' +
      '<p class="mt-1 text-sm text-slate-600">Average ratings and other reviews are visible to administrators only.</p>' +
      '<form id="fb-form" class="mt-3 max-w-lg space-y-4" novalidate><fieldset><legend class="text-sm font-semibold">Rating (1 to 5)</legend><div class="mt-1">' + radios + '</div>' +
      '<p id="rating-error" class="mt-1 hidden text-sm text-red-800"></p></fieldset>' +
      '<div><label for="comment" class="block text-sm font-semibold">Comment</label><textarea id="comment" rows="3" class="mt-1 block w-full rounded border border-slate-400 bg-white px-3 py-2">' + UI.esc(mine ? mine.comment : '') + '</textarea></div>' +
      '<button id="fb-btn" type="submit" class="rounded bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">' + (mine ? 'Update feedback' : 'Submit feedback') + '</button></form>');
  }
  $('#feedback').on('submit', '#fb-form', function (e) {
    e.preventDefault();
    const rating = Number($('input[name=rating]:checked').val()), comment = $.trim($('#comment').val());
    if (!(rating >= 1 && rating <= 5)) { $('#rating-error').text('Choose a rating from 1 to 5.').removeClass('hidden'); return; }
    $('#rating-error').addClass('hidden');
    const $b = $('#fb-btn'); UI.setLoading($b, true, 'Saving…');
    const req = mine ? Api.put('/event-feedback/' + mine.id, { rating: rating, comment: comment }) : Api.post('/event-feedback', { event_id: id, rating: rating, comment: comment });
    req.done(function () { UI.toast(mine ? 'Feedback updated.' : 'Thanks for your feedback.', 'success'); loadFeedback(); })
      .fail(function (err) {
        UI.setLoading($b, false);
        UI.toast(err.status === 409 ? 'You already reviewed this event.' : UI.errorMessage(err), 'error');
        if (err.status === 409) loadFeedback();
      });
  });
  loadEvent();
});