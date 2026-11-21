
window.Api = (function () {
  function normalizeError(xhr) {
    if (xhr.status === 0) {
      return { status: 0, network: true,
        message: 'Cannot reach the server. Check your connection and that the backend is running.' };
    }
    const body = xhr.responseJSON || {};
    let message = body.message;
    if (!message) {
      if (xhr.status === 403) message = 'You do not have permission to do that. Contact an administrator if you think this is a mistake.';
      else if (xhr.status === 404) message = 'We could not find what you asked for.';
      else if (xhr.status >= 500) message = 'Something went wrong on the server. Please try again.';
      else message = 'Request failed (' + xhr.status + ').';
    }
    return { status: xhr.status, message: message, network: false };
  }

  
  function request(opts) {
    const d = $.Deferred();
    const useAuth = opts.auth !== false;
    const ajax = {
      url: APP_CONFIG.API_URL + opts.path,
      method: opts.method || 'GET',
      dataType: 'json',
      headers: {}
    };
    if (useAuth && Auth.getToken()) ajax.headers['Authorization'] = 'Bearer ' + Auth.getToken();

    if (opts.formData) {
      ajax.data = opts.formData;
      ajax.processData = false;
      ajax.contentType = false;
      ajax.xhr = function () {
        const x = $.ajaxSettings.xhr();
        if (opts.onProgress && x.upload) {
          x.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) opts.onProgress(Math.round((e.loaded / e.total) * 100));
          });
        }
        return x;
      };
    } else if (opts.data !== undefined) {
      ajax.data = JSON.stringify(opts.data);
      ajax.contentType = 'application/json';
    }

    $.ajax(ajax)
      .done(function (res) { d.resolve(res); })
      .fail(function (xhr) {
        const err = normalizeError(xhr);
        // 401 on a protected call = missing/expired token 
        if (useAuth && xhr.status === 401) {
          Auth.logout('Your session expired. Please log in again.', 'warning');
        }
        d.reject(err);
      });
    return d.promise();
  }

  return {
    request: request,
    get: function (path) { return request({ path: path }); },
    post: function (path, data, auth) { return request({ method: 'POST', path: path, data: data, auth: auth }); },
    put: function (path, data) { return request({ method: 'PUT', path: path, data: data }); },
    patch: function (path, data) { return request({ method: 'PATCH', path: path, data: data }); },
    del: function (path) { return request({ method: 'DELETE', path: path }); },
    upload: function (method, path, formData, onProgress) {
      return request({ method: method, path: path, formData: formData, onProgress: onProgress });
    }
  };
})();