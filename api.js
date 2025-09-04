

// api.js
const BASE = 'https://sid-restapi.onrender.com';

async function http(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) {
    headers['x-token'] = token;                    
    headers['Authorization'] = `Bearer ${token}`;   
  }



  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    mode: 'cors',
    cache: 'no-store',
  });

  const txt = await res.text();
  let data; try { data = txt ? JSON.parse(txt) : {}; } catch { data = { raw: txt }; }

  if (!res.ok) {
    const err = new Error(data?.msg || `HTTP ${res.status}`);
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}
export { http }; 


export function register(username, password) {
  return http('/api/usuarios', { method: 'POST', body: { username, password } });
}
export function login(username, password) {
  return http('/api/auth/login', { method: 'POST', body: { username, password } });
}

export function getProfile({ username, token }) {
  return http('/api/usuarios/' + encodeURIComponent(username), { token });
}

export function updateUser({ username, data, token }) {
  return http('/api/usuarios', { method: 'PATCH', token, body: { username, data } });
}

export function listUsers({ token }) {
  return http('/api/usuarios', { token });
}


