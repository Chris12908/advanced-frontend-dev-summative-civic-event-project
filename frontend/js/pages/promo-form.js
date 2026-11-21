$(function () {
  if (!Layout.init({ guard: 'admin', active: 'promos', sidebar: true })) return;   // ROLE GUARD: admins only
  const id = UI.qs('id'), editing = !!id, $btn = $('#save-btn'), $err = $('#form-error');
  let file = null;
  if (editing && !UI.isUuid(id)) { UI.renderError($('#form-wrap'), { message: 'We could not find that promo.' }); return; }
  $('#form-title').text(editing ? 'Edit promo' : 'New promo');
  if (editing) {
    $('#video-hint').text('Optional. Leave empty to keep the current video.');
    Api.get('/promos/' + id).done(function (res) {
      $('#title').val(res.data.title); $('#description').val(res.data.description); $('#caption_text').val(res.data.caption_text);
      if (Layout.youtubeId(res.data.video_url)) $('#video_url').val(res.data.video_url);
    }).fail(function (err) { UI.renderError($('#form-wrap'), err); });
  }
  $('#video').on('change', function () {
    file = this.files[0] || null;
    const msg = file ? UI.validateFile(file, 'video') : null;
    UI.fieldError($(this), msg); if (msg) { file = null; this.value = ''; }
  });
  $('#promo-form').on('submit', function (e) {
    e.preventDefault(); $err.addClass('hidden');
    let ok = true;
    function need($f, msg) { UI.fieldError($f, msg); if (msg) ok = false; }
    const title = $.trim($('#title').val()), desc = $.trim($('#description').val()), cap = $.trim($('#caption_text').val()), link = $.trim($('#video_url').val());
    need($('#title'), title ? '' : 'Enter a title.'); need($('#description'), desc ? '' : 'Enter a description.'); need($('#caption_text'), cap ? '' : 'Enter the caption text.');
    need($('#video_url'), link && !Layout.youtubeId(link) ? 'Enter a valid YouTube link.' : '');
    if (!editing) need($('#video'), file || link ? '' : 'Choose a video file or paste a YouTube link.');
    if (!ok) { $('[aria-invalid="true"]').first().trigger('focus'); return; }
    const fd = new FormData();
    fd.append('title', title); fd.append('description', desc); fd.append('caption_text', cap);
    if (file) fd.append('video', file);                      // field "video"
    else if (link) fd.append('video_url', link);             // YouTube link saved as the promo's video_url
    UI.setLoading($btn, true, 'Saving…'); $('#progress').toggleClass('hidden', !file);
    Api.upload(editing ? 'PUT' : 'POST', editing ? '/promos/' + id : '/promos', fd, function (p) {
      $('#progress-bar').css('width', p + '%'); $('#progress-text').text(p + '%'); $('#progress').attr('aria-valuenow', p);
    }).done(function () {
      Layout.Cache.clear('promos');                          // cache invalidation after create/update
      Auth.setFlash(editing ? 'Promo updated.' : 'Promo created. A notification was sent to all users.', 'success');
      location.href = 'promos.html';
    }).fail(function (err) { UI.setLoading($btn, false); $('#progress').addClass('hidden'); $err.text(UI.errorMessage(err)).removeClass('hidden'); });
  });
});