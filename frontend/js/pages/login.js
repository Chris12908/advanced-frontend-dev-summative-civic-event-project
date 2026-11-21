$(function () {
  Auth.redirectIfLoggedIn();   // already signed in -> straight to dashboard
  UI.showFlash();              // e.g. "Account created" or "Session expired"

  const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const $btn = $('#login-btn'), $err = $('#form-error');

  $('#toggle-password').on('click', function () {
    const $p = $('#password');
    const show = $p.attr('type') === 'password';
    $p.attr('type', show ? 'text' : 'password');
    $(this).text(show ? 'Hide' : 'Show').attr('aria-pressed', String(show));
  });

  $('#login-form').on('submit', function (e) {
    e.preventDefault();
    $err.addClass('hidden').text('');
    const email = $.trim($('#email').val());
    const password = $('#password').val();

    UI.fieldError($('#email'), EMAIL_RULE.test(email) ? '' : 'Enter a valid email address.');
    UI.fieldError($('#password'), password ? '' : 'Enter your password.');
    if (!EMAIL_RULE.test(email) || !password) return;

    UI.setLoading($btn, true, 'Signing in…');

    Api.post('/auth/login', { email: email, password: password }, false)
      .then(function (res) {
        // Save first so the next request carries the token.
        Auth.save(res.data.token, res.data.user, $('#remember').is(':checked'));
        // The backend does not check is_active at login, so we do it here.
        return Api.get('/users/profile/me').then(function (me) {
          if (me.data && me.data.is_active === false) {
            Auth.logout('Your account has been disabled. Please contact an administrator.', 'error');
            return $.Deferred().reject({ handled: true }).promise();
          }
          Auth.setFlash('Welcome back, ' + res.data.user.full_name + '!', 'success');
          window.location.href = 'dashboard.html';
        });
      })
      .fail(function (err) {
        if (err && err.handled) return;
        UI.setLoading($btn, false);
        $err.text(UI.errorMessage(err)).removeClass('hidden');
        $('#email').trigger('focus');
      });
  });
});