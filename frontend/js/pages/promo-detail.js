$(function () {
  if (!Layout.init({ guard: 'auth', active: 'promos' })) return;
  const id = UI.qs('id'), admin = Auth.isAdmin(), $d = $('#detail');
  if (!UI.isUuid(id)) { UI.renderError($d, { message: 'We could not find that promo.' }); return; }

  // Uploaded videos: the API stores caption_text only, so we build a WebVTT track in the browser.
  function buildVtt(text, dur) {
    let lines = String(text || '').split(/\r?\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (lines.length < 2) lines = String(text || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) return null;
    const step = (isFinite(dur) && dur > 0 ? dur : 60) / lines.length;
    const ts = function (s) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + (s % 60).toFixed(3).padStart(6, '0'); };
    return 'WEBVTT\n\n' + lines.map(function (l, i) { return ts(i * step) + ' --> ' + ts((i + 1) * step) + '\n' + l; }).join('\n\n');
  }

  function load() {
    $d.html(UI.skeletonRows(3));
    Api.get('/promos/' + id).done(function (res) {
      const p = res.data, yt = Layout.youtubeId(p.video_url);
      if (p.published === false && !admin) { UI.renderError($d, { message: 'This promo is not available.' }); return; }
      document.title = p.title + ' · CivicEvents+';
      const player = yt
        // YouTube embed: cc_load_policy=1 turns captions on by default when the video has them.
        ? '<div class="aspect-video w-full overflow-hidden rounded-lg bg-black"><iframe class="h-full w-full" src="https://www.youtube-nocookie.com/embed/' + yt + '?cc_load_policy=1&rel=0" title="Promo video: ' + UI.esc(p.title) + '" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' +
          '<p class="mt-2 text-sm text-slate-700">Use the CC button in the player to turn captions on or off. The transcript is below.</p>'
        : '<video id="player" controls preload="metadata" class="w-full rounded-lg bg-black" aria-label="Promo video: ' + UI.esc(p.title) + '" src="' + UI.esc(p.video_url) + '">' +
          'Your browser cannot play this video. <a class="underline" href="' + UI.esc(p.video_url) + '">Download the video</a>.</video>' +
          '<button id="cc" type="button" aria-pressed="true" class="mt-2 rounded border border-slate-400 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-100">Captions: on</button>';
      $d.html('<a href="promos.html" class="text-sm font-semibold text-brand-700 underline">Back to promos</a><h1 class="mt-3 font-display text-3xl font-bold">' + UI.esc(p.title) + '</h1>' +
        '<div class="mt-4 max-w-3xl">' + player + '</div>' +
        '<p class="mt-5 max-w-2xl whitespace-pre-line">' + UI.esc(p.description) + '</p>' +
        '<details class="mt-4 max-w-2xl rounded border border-slate-200 bg-white p-4" open><summary class="cursor-pointer font-semibold">Transcript</summary><p class="mt-2 whitespace-pre-line text-sm">' + UI.esc(p.caption_text || 'No transcript provided.') + '</p></details>' +
        // ROLE GUARD (UI): admin-only controls
        (admin ? '<div class="mt-5 flex gap-2"><a class="rounded border border-slate-400 px-3 py-2 text-sm font-semibold hover:bg-slate-100" href="promo-form.html?id=' + id + '">Edit</a>' +
          '<button id="del" type="button" class="rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800">Delete</button></div>' : ''));

      const v = document.getElementById('player');
      if (v) {                                               // uploaded video: attach the generated caption track
        let added = false;
        const addTrack = function () {
          if (added) return; added = true;
          const tr = document.createElement('track');
          tr.kind = 'captions'; tr.srclang = 'en'; tr.label = 'English'; tr.default = true;
          if (p.caption_url) tr.src = p.caption_url;
          else { const vtt = buildVtt(p.caption_text, v.duration); if (!vtt) { $('#cc').addClass('hidden'); return; } tr.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })); }
          v.appendChild(tr);
          if (v.textTracks[0]) v.textTracks[0].mode = 'showing';   // captions on by default
        };
        v.addEventListener('loadedmetadata', addTrack);
        v.addEventListener('error', function () { UI.toast('The video could not be played. Browsers play .mp4 (H.264) most reliably.', 'error'); });
        $('#cc').on('click', function () {
          const t = v.textTracks[0]; if (!t) return;
          const on = t.mode !== 'showing'; t.mode = on ? 'showing' : 'hidden';
          $(this).text('Captions: ' + (on ? 'on' : 'off')).attr('aria-pressed', String(on));
        });
      }
      $('#del').on('click', function () {
        UI.confirmDialog({ title: 'Delete promo?', message: 'This cannot be undone.', confirmText: 'Delete' }).then(function (ok) {
          if (ok) Api.del('/promos/' + id).done(function () { Layout.Cache.clear('promos'); Auth.setFlash('Promo deleted.', 'success'); location.href = 'promos.html'; }).fail(function (err) { UI.toast(UI.errorMessage(err), 'error'); });
        });
      });
    }).fail(function (err) { UI.renderError($d, err, load); });
  }
  load();
});