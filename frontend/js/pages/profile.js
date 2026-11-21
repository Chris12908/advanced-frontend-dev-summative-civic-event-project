$(function () {
  if (!Layout.init({ guard: 'auth' })) return;
  const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, $btn = $('#save-btn'), $err = $('#form-error');
  function load() {
    Api.get('/users/profile/me').done(function (res) {
      const u = res.data;
      $('#full_name').val(u.full_name); $('#email').val(u.email);
      $('#role').text(u.role); $('#status').text(u.is_active ? 'Active' : 'Disabled'); $('#joined').text(UI.formatDateTime(u.created_at));
    }).fail(function (err) { UI.renderError($('#form-wrap'), err, load); });
  }
  $('#profile-form').on('submit', function (e) {
    e.preventDefault(); $err.addClass('hidden');
    const name = $.trim($('#full_name').val()), email = $.trim($('#email').val());
    UI.fieldError($('#full_name'), name ? '' : 'Enter your full name.');
    UI.fieldError($('#email'), EMAIL_RULE.test(email) ? '' : 'Enter a valid email address.');
    if (!name || !EMAIL_RULE.test(email)) return;
    UI.setLoading($btn, true, 'Saving…');
    // Only full_name and email are sent. The API rejects role / is_active.
    Api.patch('/users/profile/me', { full_name: name, email: email }).done(function (res) {
      UI.setLoading($btn, false); Auth.updateUser({ full_name: res.data.full_name, email: res.data.email });
      $('#profile-name').text(res.data.full_name); UI.toast('Profile updated.', 'success');
    }).fail(function (err) {
      UI.setLoading($btn, false);
      if (err.status === 409) { UI.fieldError($('#email'), 'That email belongs to another account. Use a different one.'); $('#email').trigger('focus'); }
      else $err.text(UI.errorMessage(err)).removeClass('hidden');
      UI.toast(UI.errorMessage(err), 'error');
    });
  });
  load();
});