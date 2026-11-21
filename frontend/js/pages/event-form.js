$(function () {
  if (!Layout.init({ guard: 'admin', active: 'events', sidebar: true })) return;   // ROLE GUARD: admins only
  const id = UI.qs('id'), editing = !!id;
  const $btn = $('#save-btn'), $err = $('#form-error');
  let file = null;
  if (editing && !UI.isUuid(id)) { UI.renderError($('#form-wrap'), { message: 'We could not find that event.' }); return; }
  $('#form-title').text(editing ? 'Edit event' : 'New event');

  function toLocalInput(iso) { const d = new Date(iso); if (isNaN(d)) return ''; d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

  if (editing) {
    Api.get('/events/' + id).done(function (res) {
      const e = res.data;
      $('#title').val(e.title); $('#description').val(e.description); $('#location').val(e.location);
      $('#starts_at').val(toLocalInput(e.starts_at)); $('#ends_at').val(toLocalInput(e.ends_at));
      if (e.metadata && e.metadata.image_url) $('#preview').attr('src', e.metadata.image_url).removeClass('hidden');
    }).fail(function (err) { UI.renderError($('#form-wrap'), err); });
  }

  $('#image').on('change', function () {
    file = this.files[0] || null;
    const msg = file ? UI.validateFile(file, 'image') : null;   // size/type checked BEFORE upload
    UI.fieldError($(this), msg);
    if (msg) { file = null; this.value = ''; return; }
    if (file) $('#preview').attr('src', URL.createObjectURL(file)).attr('alt', 'Preview of the selected image').removeClass('hidden');
  });

  $('#event-form').on('submit', function (e) {
    e.preventDefault(); $err.addClass('hidden');
    let ok = true;
    function need($f, msg) { UI.fieldError($f, msg); if (msg) ok = false; }
    const title = $.trim($('#title').val()), loc = $.trim($('#location').val()), s = $('#starts_at').val(), en = $('#ends_at').val();
    need($('#title'), title ? '' : 'Enter a title.'); need($('#location'), loc ? '' : 'Enter a location.');
    need($('#starts_at'), s ? '' : 'Choose a start date and time.'); need($('#ends_at'), en ? '' : 'Choose an end date and time.');
    if (s && en && new Date(en) <= new Date(s)) need($('#ends_at'), 'The end must be after the start.');
    if (!ok) { $('[aria-invalid="true"]').first().trigger('focus'); return; }

    const fd = new FormData();
    fd.append('title', title); fd.append('description', $.trim($('#description').val())); fd.append('location', loc);
    fd.append('starts_at', new Date(s).toISOString()); fd.append('ends_at', new Date(en).toISOString());   // ISO keeps the timezone
    if (file) fd.append('image', file);                    // field name required by uploadEventImage.single('image')
    UI.setLoading($btn, true, 'Saving…'); $('#progress').removeClass('hidden');
    Api.upload(editing ? 'PUT' : 'POST', editing ? '/events/' + id : '/events', fd, function (p) {
      $('#progress-bar').css('width', p + '%'); $('#progress-text').text(p + '%'); $('#progress').attr('aria-valuenow', p);
    }).done(function (res) {
      Auth.setFlash(editing ? 'Event updated.' : 'Event created. A notification was sent to all users.', 'success');
      location.href = 'event-detail.html?id=' + (res.data.id || id);
    }).fail(function (err) {
      UI.setLoading($btn, false); $('#progress').addClass('hidden');
      $err.text(UI.errorMessage(err)).removeClass('hidden');   // includes "File too large" style messages
    });
  });
});