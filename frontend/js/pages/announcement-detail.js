$(function () {
  if (!Layout.init({ guard: 'auth', active: 'announcements' })) return;
  const id = UI.qs('id'), admin = Auth.isAdmin(), $d = $('#detail');
  if (!UI.isUuid(id)) { UI.renderError($d, { message: 'We could not find that announcement.' }); return; }

  function load() {
    $d.html(UI.skeletonRows(3));
    Api.get('/announcements/' + id).done(function (res) {
      const a = res.data;
      if (a.published === false && !admin) { UI.renderError($d, { message: 'This announcement is not available.' }); return; }
      document.title = a.title + ' · CivicEvents+';
      const audio = a.audio_url ?
        '<div class="mt-5 max-w-2xl rounded-lg border border-slate-200 bg-white p-5"><audio id="player" controls preload="metadata" class="w-full" aria-label="Audio for ' + UI.esc(a.title) + '" src="' + UI.esc(a.audio_url) + '">' +
        'Your browser cannot play this audio. <a class="underline" href="' + UI.esc(a.audio_url) + '">Download the audio file</a>.</audio>' +
        '<p class="mt-3 text-sm" aria-hidden="true"><span id="cur">0:00</span> / <span id="tot">0:00</span></p></div>' +
        '<p class="mt-3 max-w-2xl text-sm text-slate-700">No transcript was provided for this announcement.</p>'
        : '<p class="mt-5 max-w-2xl rounded border border-slate-200 bg-white p-5 text-slate-700">This announcement has no audio.</p>';
      $d.html('<a href="announcements.html" class="text-sm font-semibold text-brand-700 underline">Back to announcements</a>' +
        '<h1 class="mt-3 font-display text-3xl font-bold">' + UI.esc(a.title) + '</h1><p class="mt-1 text-sm text-slate-700">' + UI.formatDateTime(a.created_at) + '</p>' + audio +
        // ROLE GUARD (UI): admin-only controls
        (admin ? '<div class="mt-5 flex gap-2"><a class="rounded border border-slate-400 px-3 py-2 text-sm font-semibold hover:bg-slate-100" href="announcement-form.html?id=' + id + '">Edit title</a>' +
          '<button id="del" type="button" class="rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800">Delete</button></div>' : ''));
      const p = document.getElementById('player');
      if (p) {
        p.addEventListener('loadedmetadata', function () { $('#tot').text(Layout.fmtTime(p.duration)); });
        p.addEventListener('timeupdate', function () { $('#cur').text(Layout.fmtTime(p.currentTime)); });
        p.addEventListener('error', function () { UI.toast('The audio could not be loaded.', 'error'); });
      }
      $('#del').on('click', function () {
        UI.confirmDialog({ title: 'Delete announcement?', message: 'This cannot be undone.', confirmText: 'Delete' }).then(function (ok) {
          if (ok) Api.del('/announcements/' + id).done(function () { Auth.setFlash('Announcement deleted.', 'success'); location.href = 'announcements.html'; }).fail(function (err) { UI.toast(UI.errorMessage(err), 'error'); });
        });
      });
    }).fail(function (err) { UI.renderError($d, err, load); });
  }
  load();
});