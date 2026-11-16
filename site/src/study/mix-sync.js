// Reads and writes the shared copy of the mix state at api/progress. Every
// call fails soft and returns null: on a host without the endpoint, or with no
// network, the device carries on with its own copy.

const ENDPOINT = 'api/progress';

async function request(options) {
  try {
    const response = await fetch(ENDPOINT, { cache: 'no-store', ...options });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** The shared state, or null when it cannot be reached. */
export function fetchShared() {
  return request({});
}

/**
 * Sends `state` to be merged into the shared copy. Returns the merged state,
 * or null when it could not be sent. `keepalive` lets the request outlive the page.
 */
export function sendShared(state, { keepalive = false } = {}) {
  return request({
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(state),
    keepalive,
  });
}
