$(function () {
  Auth.redirectIfLoggedIn();

  // Same rule the backend enforces (auth.controller.js).
  const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const RULES = [
    { label: 'At least 8 characters', test: function (p) { return p.length >= 8; } },
    { label: 'A lowercase letter', test: function (p) { return /[a-z]/.test(p); } },
    { label: 'An uppercase letter', test: function (p) { return /[A-Z]/.test(p); } },
    { label: 'A number', test: function (p) { return /\d/.test(p); } },
    { label: 'A special character, for example ! @ # $', test: function (p) { return /[\W_]/.test(p); } }
  ];
  const LABELS = ['', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const COLORS = ['bg-slate-300', 'bg-red-700', 'bg-orange-600', 'bg-amber-500', 'bg-lime-600', 'bg-green-700'];

  function renderMeter(p) {
    let score = 0, html = '';
    RULES.forEach(function (r) {
      const ok = r.test(p);
      if (ok) score++;
      html += '<li class="' + (ok ? 'text-green-800' : 'text-slate-700') + '">' +
        '<span aria-hidden="true">' + (ok ? '✓' : '○') + '</span> ' + r.label +
        '<span class="sr-only">' + (ok ? ' (met)' : ' (not met)') + '</span></li>';
    });
    $('#pw-rules').html(html);
    $('#strength-bar').attr('class', 'h-full rounded transition-all ' + COLORS[score]).css('width', (score * 20) + '%');
    $('#strength-label').text(p ? 'Password strength: ' + LABELS[score] : '');
  }
  renderMeter('');
  $('#password').on('input', function () { renderMeter($(this).val()); });

  $('#signup-form').on('submit', function (e) {
    e.preventDefault();
    $('#form-error').addClass('hidden').text('');
    const name = $.trim($('#full_name').val());
    const email = $.trim($('#email').val());
    const pw = $('#password').val();
    const pw2 = $('#confirm_password').val();

    let valid = true;
    function check($f, msg) { UI.fieldError($f, msg); if (msg) valid = false; }
    check($('#full_name'), name.length < 2 ? 'Enter your full name.' : '');
    check($('#email'), EMAIL_RULE.test(email) ? '' : 'Enter a valid email address.');
    check($('#password'), PASSWORD_RULE.test(pw) ? '' : 'Your password does not meet all the rules below.');
    check($('#confirm_password'), pw === pw2 ? '' : 'Passwords do not match.');
    if (!valid) { $('[aria-invalid="true"]').first().trigger('focus'); return; }

    const $btn = $('#signup-btn');
    UI.setLoading($btn, true, 'Creating account…');

    // SECURITY: the API accepts a "role" field, so the UI must NEVER send one.
    Api.post('/auth/signup', { full_name: name, email: email, password: pw }, false)
      .done(function () {
        Auth.setFlash('Account created. Please log in.', 'success');
        window.location.href = 'login.html';
      })
      .fail(function (err) {
        UI.setLoading($btn, false);
        if (err.status === 409) {
          UI.fieldError($('#email'), 'This email is already registered. Try logging in instead.');
          $('#email').trigger('focus');
        } else {
          $('#form-error').text(UI.errorMessage(err)).removeClass('hidden');
        }
        UI.toast(UI.errorMessage(err), 'error');
      });
  });
});