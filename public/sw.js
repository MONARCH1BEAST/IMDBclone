self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

var syncQueue = [];

function broadcastSynced(movieId, action) {
  try {
    var channel = new BroadcastChannel('watchlist');
    channel.postMessage({ type: 'SYNCED', movieId: movieId, action: action });
    channel.close();
  } catch (error) {
    // BroadcastChannel may not be supported in all environments.
  }
}

function queueRequest(request) {
  return request.clone().text().then(function (body) {
    syncQueue.push({
      url: request.url,
      method: request.method,
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });
  });
}

function shouldIntercept(url, method) {
  return (
    (url.pathname === '/api/watchlist' && method === 'POST') ||
    (url.pathname.indexOf('/api/watchlist/') === 0 && method === 'DELETE')
  );
}

function movieIdFromRequest(url, body) {
  var pathMatch = url.pathname.match(/\/api\/watchlist\/([^/]+)/);
  if (pathMatch && pathMatch[1]) {
    return Number(pathMatch[1]) || null;
  }

  try {
    var payload = JSON.parse(body || '{}');
    return payload.movieId || null;
  } catch (e) {
    return Number(url.searchParams.get('movieId')) || null;
  }
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  if (!shouldIntercept(url, request.method)) {
    return;
  }

  if (!self.navigator || !self.navigator.onLine) {
    event.respondWith(
      queueRequest(request).then(function () {
        return new Response(JSON.stringify({ queued: true }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request.clone())
      .then(function (response) {
        if (response.ok) {
          var action = request.method === 'POST' ? 'add' : 'remove';
          return request
            .clone()
            .text()
            .then(function (body) {
              broadcastSynced(movieIdFromRequest(new URL(request.url), body), action);
              return response;
            });
        }
        return queueRequest(request).then(function () {
          return new Response(JSON.stringify({ queued: true }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
      .catch(function () {
        return queueRequest(request).then(function () {
          return new Response(JSON.stringify({ queued: true }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
  );
});

function flushQueue() {
  var queue = syncQueue.slice();
  var results = queue.map(function (item) {
    return fetch(item.url, {
      method: item.method,
      headers: item.headers,
      body: item.body,
    })
      .then(function (response) {
        if (!response.ok) {
          return false;
        }

        var action = item.method === 'POST' ? 'add' : 'remove';
        var movieId = null;
        try {
          movieId = movieIdFromRequest(new URL(item.url), item.body);
        } catch (e) {
          movieId = null;
        }
        broadcastSynced(movieId, action);
        return true;
      })
      .catch(function () {
        return false;
      });
  });

  return Promise.all(results).then(function (successArray) {
    syncQueue = syncQueue.filter(function (_, index) {
      return !successArray[index];
    });
  });
}

self.addEventListener('sync', function (event) {
  if (event.tag === 'watchlist-sync') {
    event.waitUntil(flushQueue());
  }
});
