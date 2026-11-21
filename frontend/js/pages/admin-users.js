$(function () {
  if (!Layout.init({ guard: 'admin', active: 'admin', sidebar: true })) return;   // ROLE GUARD: admins only
  const me = Auth.getUser(), $b = $('#rows');
  let users = [];
  // NOTE: there is intentionally no control to change a user's role (assignment rule).
  function render() {
    const q = $('#f-q').val().toLowerCase().trim();
    const list = users.filter(function (u) { return !q || (u.full_name + ' ' + u.email).toLowerCase().indexOf(q) > -1; });
    $b.html(list.length ? list.map(function (u) {
      const self = u.id === me.id;
      return '<tr class="border-b border-slate-100"><td class="py-3 pr-4">' + UI.esc(u.full_name) + '</td><td class="py-3 pr-4">' + UI.esc(u.email) + '</td><td class="py-3 pr-4">' + UI.esc(u.role) + '</td>' +
        '<td class="py-3 pr-4"><span class="rounded px-2 py-0.5 text-xs font-semibold ' + (u.is_active ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900') + '">' + (u.is_active ? 'Active' : 'Disabled') + '</span></td>' +
        '<td class="py-3"><div class="flex gap-2"><button type="button" class="view rounded border border-slate-400 px-3 py-1 text-sm font-semibold hover:bg-slate-100" data-id="' + u.id + '">View</button>' +
        (self ? '<span class="px-2 text-sm text-slate-600">You</span>' : '<button type="button" class="toggle rounded px-3 py-1 text-sm font-semibold text-white ' + (u.is_active ? 'bg-red-700 hover:bg-red-800' : 'bg-brand-700 hover:bg-brand-800') + '" data-id="' + u.id + '" data-active="' + u.is_active + '">' + (u.is_active ? 'Disable' : 'Enable') + '</button>') +
        '</div></td></tr>';
    }).join('') : '<tr><td colspan="5" class="py-8 text-center text-slate-700">No users match your search.</td></tr>');
  }
  function load() {
    $b.html('<tr><td colspan="5">' + UI.skeletonRows(4) + '</td></tr>');
    Api.get('/users?limit=100').done(function (res) { users = res.data || []; render(); })
      .fail(function (err) { $b.html('<tr><td colspan="5"></td></tr>'); UI.renderError($b.find('td'), err, load); });
  }
  $('#f-q').on('input', render);
  $b.on('click', '.toggle', function () {
    const $t = $(this), id = $t.data('id'), active = String($t.data('active')) === 'true';
    UI.confirmDialog({ title: (active ? 'Disable' : 'Enable') + ' this user?', message: active ? 'They will be marked as disabled.' : 'They will be marked as active.', confirmText: active ? 'Disable' : 'Enable', danger: active }).then(function (ok) {
      if (!ok) return;
      UI.setLoading($t, true, 'Saving…');
      Api.patch('/users/' + id + (active ? '/disable' : '/enable')).done(function (res) {
        users = users.map(function (u) { return u.id === id ? $.extend(u, { is_active: res.data.is_active }) : u; });
        UI.toast('User ' + (active ? 'disabled' : 'enabled') + '.', 'success'); render();
      }).fail(function (err) { UI.setLoading($t, false); UI.toast(UI.errorMessage(err), 'error'); });
    });
  }).on('click', '.view', function () {
    const id = $(this).data('id'), dlg = document.getElementById('user-dialog');
    $('#user-body').html(UI.skeletonRows(3)); dlg.showModal();
    Api.get('/users/' + id).done(function (res) {
      const u = res.data;
      $('#user-body').html('<dl class="space-y-2"><div><dt class="text-sm font-semibold">Name</dt><dd>' + UI.esc(u.full_name) + '</dd></div><div><dt class="text-sm font-semibold">Email</dt><dd>' + UI.esc(u.email) + '</dd></div>' +
        '<div><dt class="text-sm font-semibold">Role</dt><dd>' + UI.esc(u.role) + '</dd></div><div><dt class="text-sm font-semibold">Status</dt><dd>' + (u.is_active ? 'Active' : 'Disabled') + '</dd></div>' +
        '<div><dt class="text-sm font-semibold">Joined</dt><dd>' + UI.formatDateTime(u.created_at) + '</dd></div></dl>');
    }).fail(function (err) { $('#user-body').text(UI.errorMessage(err)); });
  });
  load();
});