// app.js
import { register, login, getProfile, updateUser, listUsers } from './api.js';
import { saveSession, isAuthenticated, getUsername, clearSession, loadSession } from './storage.js';

const $ = (sel) => document.querySelector(sel);
const STORAGE_KEY = 'sid_auth';

const authScreen = $('#auth-screen');
const appScreen  = $('#app-screen');
const authMsg    = $('#auth-msg');
const appMsg     = $('#app-msg');
const whoami     = $('#whoami');

const tabLogin    = $('#tab-login');
const tabRegister = $('#tab-register');
const formLogin   = $('#form-login');
const formRegister= $('#form-register');
const btnLogout   = $('#btn-logout');

const btnLoadProfile = $('#btn-load-profile');
const profileCard    = $('#profile-card');
const profileMsg     = $('#profile-msg');

const formUpdate = $('#form-update');
const updateMsg  = $('#update-msg');

const btnLoadRanking = $('#btn-load-ranking');
const limitInput     = $('#limit');
const tableRanking   = $('#table-ranking tbody');
const rankingMsg     = $('#ranking-msg');


function showAuth(msg) {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  if (msg) { authMsg.textContent = msg; authMsg.className = 'msg error'; }
  else     { authMsg.textContent = '';   authMsg.className = 'msg'; }
  appMsg.textContent = '';
}
function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  const u = getUsername() || '—';
  whoami.textContent = `Usuario: ${u}`;
}
function handle401(err) {
  if (err && err.status === 401) {
    clearSession();
    showAuth('Tu sesión expiró o el token es inválido. Inicia sesión nuevamente.');
    return true;
  }
  return false;
}

// ---- vigilancia de cambios en token ----
let sessionSnapshot = safeParse(localStorage.getItem(STORAGE_KEY));
function safeParse(s){ try{return JSON.parse(s)}catch{ return null } }
function sameToken(a,b){ return (a?.token||null) === (b?.token||null); }
function startTokenWatch(){
  setInterval(() => {
    const now = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!sameToken(now, sessionSnapshot)) {
      sessionSnapshot = now;
      clearSession();
      showAuth('La sesión se cerró porque el token cambió en el almacenamiento local.');
    }
  }, 800);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      const now = safeParse(e.newValue);
      if (!sameToken(now, sessionSnapshot)) {
        sessionSnapshot = now;
        clearSession();
        showAuth('La sesión se cerró porque el token cambió en otra pestaña.');
      }
    }
  });
  window.addEventListener('focus', () => {
    const now = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!sameToken(now, sessionSnapshot)) {
      sessionSnapshot = now;
      clearSession();
      showAuth('La sesión se cerró porque el token cambió.');
    }
  });
}

// ---- Tabs ----
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active'); tabRegister.classList.remove('active');
  formLogin.classList.add('visible'); formRegister.classList.remove('visible');
  authMsg.textContent = ''; authMsg.className = 'msg';
});
tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active'); tabLogin.classList.remove('active');
  formRegister.classList.add('visible'); formLogin.classList.remove('visible');
  authMsg.textContent = ''; authMsg.className = 'msg';
});

// ---- Registro ----
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(formRegister);
  const username = f.get('username').trim();
  const password = f.get('password');
  authMsg.className = 'msg';
  try {
    await register(username, password);
    authMsg.textContent = 'Usuario registrado. Ahora inicia sesión.';
    authMsg.classList.add('ok');
    tabLogin.click();
    formLogin.username.value = username;
    formLogin.password.value = password;
  } catch (err) {
    authMsg.textContent = err.message || 'Error en registro';
    authMsg.classList.add('error');
  }
});

// ---- Login ----
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(formLogin);
  const username = f.get('username').trim();
  const password = f.get('password');
  authMsg.className = 'msg';
  try {
    const { token } = await login(username, password);
    saveSession({ username, token });
    sessionSnapshot = safeParse(localStorage.getItem(STORAGE_KEY));
    showApp();
    appMsg.textContent = 'Sesión iniciada.'; appMsg.className = 'msg ok';
    await loadProfile();
  } catch (err) {
    authMsg.textContent = err.message || 'Error en login';
    authMsg.classList.add('error');
  }
});


btnLogout.addEventListener('click', () => {
  clearSession();
  sessionSnapshot = safeParse(localStorage.getItem(STORAGE_KEY));
  showAuth();
});


function renderProfile(u){
  const username = (u?.username ?? getUsername() ?? '—').trim() || '—';
  const scoreVal = Number(u?.data?.score ?? 0);
  const score = Number.isFinite(scoreVal) ? scoreVal : 0;

  profileCard.className = 'profile-card';
  profileCard.innerHTML = `
    <div class="profile-name">@${username}</div>
    <div class="profile-score">Score: <b>${score}</b></div>
  `;
  whoami.textContent = `Usuario: ${username}`;
}

async function loadProfile() {
  profileMsg.className = 'msg'; profileMsg.textContent = '';
  profileCard.innerHTML = '';
  try {
    const { token, username } = loadSession() || {};
    const res = await getProfile({ username, token });
    const usuario = res?.usuario ?? res?.user ?? res;
    renderProfile(usuario);
    profileMsg.textContent = 'Perfil cargado.'; profileMsg.classList.add('ok');
    return usuario;
  } catch (err) {
    if (handle401(err)) return;
    profileMsg.textContent = err.message || 'Error al cargar perfil';
    profileMsg.classList.add('error');
  }
}


formUpdate.addEventListener('submit', async (e) => {
  e.preventDefault();
  updateMsg.className = 'msg'; updateMsg.textContent = '';
  try {
    const { token, username } = loadSession() || {};
    const f = new FormData(formUpdate);
    const score = Number(f.get('score'));
    await updateUser({ username, token, data: { score } });
    updateMsg.textContent = 'Score actualizado.'; updateMsg.classList.add('ok');
    await loadProfile();
  } catch (err) {
    if (handle401(err)) return;
    updateMsg.textContent = err.message || 'Error al actualizar';
    updateMsg.classList.add('error');
  }
});


async function loadRanking() {
  rankingMsg.className = 'msg'; rankingMsg.textContent = '';
  tableRanking.innerHTML = '';
  try {
    const sess = loadSession();
    const token = sess?.token;
    if (!token) {
      rankingMsg.textContent = 'No hay token: inicia sesión de nuevo.';
      rankingMsg.classList.add('error');
      return;
    }

    
    const res = await listUsers({ token });

    
    const rawList = Array.isArray(res) ? res :
      (res?.usuarios ?? res?.users ?? res?.data ?? res?.results ?? []);

    const users = rawList.map(u => ({
      username: u?.username ?? u?.user ?? '—',
      score: Number(u?.data?.score ?? u?.score ?? 0)
    })).sort((a,b) => b.score - a.score);

    users.forEach((u, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${u.username}</td><td>${u.score}</td>`;
      tableRanking.appendChild(tr);
    });
    rankingMsg.textContent = `Total mostrados: ${users.length}`;
    rankingMsg.classList.add('ok');
  } catch (err) {
    if (handle401(err)) return;
    rankingMsg.textContent = err.message || 'Error al cargar ranking';
    rankingMsg.classList.add('error');
  }
}

btnLoadRanking.addEventListener('click', loadRanking);

(function start() {
  startTokenWatch();
  if (isAuthenticated()) { showApp(); loadProfile(); }
  else { showAuth(); }
})();
