const BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function getCurrentState() {
  const res = await fetch(`${BASE}/current-state`);
  if (!res.ok) throw new Error(`Failed to get state: ${res.status}`);
  return res.json();
}

export async function getSource() {
  const res = await fetch(`${BASE}/source`);
  if (!res.ok) throw new Error(`Failed to get source: ${res.status}`);
  return res.text();
}

export async function pushCode(source, username) {
  const res = await fetch(`${BASE}/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'X-Modified-By': username,
    },
    body: source,
  });
  if (!res.ok) throw new Error(`Failed to push: ${res.status}`);
  return res.json();
}

export async function resetToStable() {
  const res = await fetch(`${BASE}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to reset: ${res.status}`);
  return res.json();
}
