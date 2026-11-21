
window.UI = (function () {

  
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  
  const TOAST_STYLES = {
    success: 'bg-green-50 text-green-900 border-green-700',
    error: 'bg-red-50 text-red-900 border-red-700',
    warning: 'bg-amber-50 text-amber-900 border-amber-700',
    info: 'bg-sky-50 text-sky-900 border-sky-700'
  };
  function toastRoot() {
    let r = document.getElementById('toast-root');
    if (!r) {
      r = document.createElement('div');
      r.id = 'toast-root';
      r.className = 'fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2';
      r.setAttribute('aria-live', 'polite');
      document.body.appendChild(r);
    }
    return r;
  }
  function toast(message, type, ms) {
    type = TOAST_STYLES[type] ? type : 'info';
    const $t = $(
      '<div class="flex items-start gap-3 rounded-md border-l-4 p-3 shadow-lg ' + TOAST_STYLES[type] + '">' +
      '<p class="flex-1 text-sm"></p>' +
      '<button type="button" class="text-lg leading-none" aria-label="Dismiss message">&times;</button></div>');
    $t.find('p').text(message);                       // .text() = safe
    $t.find('button').on('click', function () { $t.remove(); });
    $(toastRoot()).append($t);
    setTimeout(function () { $t.fadeOut(200, function () { $t.remove(); }); },
      ms || (type === 'error' ? 7000 : 4500));
  }
  // Show the one-time message left by Auth.setFlash() before a redirect.
  function showFlash() {
    const f = Auth.takeFlash();
    if (f) toast(f.message, f.type);
  }

  
  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const dlg = document.createElement('dialog');
      dlg.className = 'w-[calc(100%-2rem)] max-w-md rounded-lg p-0 shadow-xl backdrop:bg-black/50';
      dlg.setAttribute('aria-labelledby', 'confirm-title');
      dlg.setAttribute('aria-describedby', 'confirm-text');
      dlg.innerHTML =
        '<form method="dialog" class="p-6">' +
        '<h2 id="confirm-title" class="font-display text-xl font-bold">' + esc(opts.title || 'Are you sure?') + '</h2>' +
        '<p id="confirm-text" class="mt-2 text-slate-700">' + esc(opts.message || '') + '</p>' +
        '<div class="mt-6 flex justify-end gap-3">' +
        '<button value="cancel" autofocus class="rounded border border-slate-400 bg-white px-4 py-2 hover:bg-slate-100">Cancel</button>' +
        '<button value="confirm" class="rounded px-4 py-2 font-semibold text-white ' +
        (opts.danger === false ? 'bg-brand-700 hover:bg-brand-800' : 'bg-red-700 hover:bg-red-800') + '">' +
        esc(opts.confirmText || 'Confirm') + '</button></div></form>';
      dlg.addEventListener('close', function () {
        const ok = dlg.returnValue === 'confirm';
        dlg.remove();
        resolve(ok);
      });
      document.body.appendChild(dlg);
      dlg.showModal();
    });
  }

  // ---------- Buttons ----------
  function setLoading($btn, loading, text) {
    if (loading) {
      if ($btn.data('label') === undefined) $btn.data('label', $btn.html());
      $btn.prop('disabled', true).attr('aria-busy', 'true').html(
        '<span class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]" aria-hidden="true"></span>' +
        esc(text || 'Please wait…'));
    } else {
      $btn.prop('disabled', false).removeAttr('aria-busy').html($btn.data('label'));
      $btn.removeData('label');
    }
  }

  
  function skeletonCards(n) {
    let h = '';
    for (let i = 0; i < (n || 6); i++) {
      h += '<div class="animate-pulse rounded-lg border border-slate-200 bg-white p-4" aria-hidden="true">' +
        '<div class="h-40 rounded bg-slate-200"></div><div class="mt-4 h-4 w-3/4 rounded bg-slate-200"></div>' +
        '<div class="mt-2 h-3 w-1/2 rounded bg-slate-200"></div></div>';
    }
    return h + '<span class="sr-only" role="status">Loading…</span>';
  }
  function skeletonRows(n) {
    let h = '';
    for (let i = 0; i < (n || 5); i++) h += '<div class="h-12 animate-pulse rounded bg-slate-200" aria-hidden="true"></div>';
    return h + '<span class="sr-only" role="status">Loading…</span>';
  }
  function emptyState(title, text) {
    return '<div class="col-span-full rounded-lg border border-dashed border-slate-400 bg-white p-10 text-center">' +
      '<p class="font-display text-lg font-semibold">' + esc(title) + '</p>' +
      (text ? '<p class="mt-1 text-slate-700">' + esc(text) + '</p>' : '') + '</div>';
  }
  // Turn raw backend messages into friendly ones.
  function errorMessage(err) {
    const m = (err && err.message) || 'Something went wrong. Please try again.';
    if (/foreign key/i.test(m)) return 'This item is linked to other records (for example registrations), so it cannot be deleted.';
    if (/invalid input syntax for type uuid/i.test(m)) return 'We could not find what you asked for.';
    return m;
  }
  
  function renderError($el, err, retryFn) {
    $el.html('<div role="alert" class="col-span-full rounded-lg border border-red-300 bg-red-50 p-6 text-red-900">' +
      '<p class="font-semibold"></p>' +
      (retryFn ? '<button type="button" class="retry mt-3 rounded bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800">Try again</button>' : '') +
      '</div>');
    $el.find('p').text(errorMessage(err));
    if (retryFn) $el.find('.retry').on('click', retryFn);
  }

  
  function fieldError($input, message) {
    const $msg = $('#' + $input.attr('id') + '-error');
    if (message) {
      $input.attr('aria-invalid', 'true').addClass('border-red-700');
      $msg.text(message).removeClass('hidden');
    } else {
      $input.removeAttr('aria-invalid').removeClass('border-red-700');
      $msg.text('').addClass('hidden');
    }
  }
  // These limits mirror upload.middleware.js on the backend.
  const FILE_RULES = {
    image: { exts: ['.jpg', '.jpeg', '.png', '.gif'], maxMB: 2 },
    audio: { exts: ['.mp3', '.wav', '.m4a', '.ogg'], maxMB: 5 },
    video: { exts: ['.mp4', '.mov', '.avi', '.mkv'], maxMB: 8 }
  };
  function validateFile(file, kind) {
    const rule = FILE_RULES[kind];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (rule.exts.indexOf(ext) === -1) return 'Only ' + rule.exts.join(', ') + ' files are allowed.';
    if (file.size > rule.maxMB * 1048576) {
      return 'That file is ' + (file.size / 1048576).toFixed(1) + ' MB. The limit is ' + rule.maxMB + ' MB.';
    }
    return null;
  }

  // ---------- Misc ----------
  function formatDateTime(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v || ''); }
  function qs(name) { return new URLSearchParams(window.location.search).get(name); }
  function num(v) { return Number(v) || 0; }   // dashboard counts arrive as strings

  return { esc, toast, showFlash, confirmDialog, setLoading, skeletonCards, skeletonRows,
           emptyState, errorMessage, renderError, fieldError, FILE_RULES, validateFile,
           formatDateTime, isUuid, qs, num };
})();