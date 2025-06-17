// Service worker is currently not used for uploads.
// Use this file for offline/caching features if needed in the future.

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'UPLOAD_IMAGE') {
    uploadImage(event.data.file, event.data.uploadUrl, event.data.id);
  }
});

async function uploadImage(file, uploadUrl, id) {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();
  xhr.open('POST', uploadUrl, true);

  xhr.upload.onprogress = function (e) {
    if (e.lengthComputable) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'UPLOAD_PROGRESS',
            id,
            loaded: e.loaded,
            total: e.total
          });
        });
      });
    }
  };

  xhr.onload = function () {
    let response = {};
    try { response = JSON.parse(xhr.responseText); } catch {}
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPLOAD_DONE',
          id,
          response,
          status: xhr.status
        });
      });
    });
  };

  xhr.onerror = function () {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'UPLOAD_ERROR',
          id,
          status: xhr.status
        });
      });
    });
  };

  xhr.send(formData);
} 