$(function () {
  if (!Layout.init({ guard: 'admin', active: 'announcements', sidebar: true })) return;   // ROLE GUARD: admins only
  const id = UI.qs('id'), editing = !!id, $btn = $('#save-btn'), $err = $('#form-error');
  let file = null;
  if (editing && !UI.isUuid(id)) { UI.renderError($('#form-wrap'), { message: 'We could not find that announcement.' }); return; }
  $('#form-title').text(editing ? 'Edit announcement' : 'New announcement');
  if (editing) {
    // The API cannot replace audio on edit, so only the title is editable.
    $('#audio-wrap, #published-wrap').addClass('hidden'); $('#edit-note').removeClass('hidden');
    Api.get('/announcements/' + id).done(function (res) { $('#title').val(res.data.title); }).fail(function (err) { UI.renderError($('#form-wrap'), err); });
  }
  $('#audio').on('change', function () {
    file = this.files[0] || null;
    const msg = file ? UI.validateFile(file, 'audio') : null;
    UI.fieldError($(this), msg); if (msg) { file = null; this.value = ''; }
  });
  $('#announcement-form').on('submit', function (e) {
    e.preventDefault(); $err.addClass('hidden');
    const title = $.trim($('#title').val());
    UI.fieldError($('#title'), title ? '' : 'Enter a title.');
    if (!title) return;                                    // audio is optional
    UI.setLoading($btn, true, 'Saving…');
    let req;
    if (editing) req = Api.put('/announcements/' + id, { title: title });
    else {
      const fd = new FormData();
      fd.append('title', title); fd.append('published', $('#published').is(':checked') ? 'true' : 'false');
      if (file) fd.append('audio', file);                  // field "audio", only when a file was chosen
      $('#progress').toggleClass('hidden', !file);
      req = Api.upload('POST', '/announcements', fd, function (p) { $('#progress-bar').css('width', p + '%'); $('#progress-text').text(p + '%'); $('#progress').attr('aria-valuenow', p); });
    }
    req.done(function () {
      Auth.setFlash(editing ? 'Announcement updated.' : 'Announcement created. A notification was sent to all users.', 'success');
      location.href = 'announcements.html';
    }).fail(function (err) { UI.setLoading($btn, false); $('#progress').addClass('hidden'); $err.text(UI.errorMessage(err)).removeClass('hidden'); });
  });
});