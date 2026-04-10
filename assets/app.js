const mockUser = {
  id: 'user-you',
  name: 'You',
  handle: '@you',
};

const mockRepos = [
  { name: 'mc-vanilla-main', role: 'Contributor' },
  { name: 'mc-vanilla-events', role: 'Contributor' },
  { name: 'mc-vanilla-backups', role: 'Contributor' },
];

const createdServersKey = 'arc-created-servers';
const MAX_ACTIVITY_LOG_ENTRIES = 12;

const initialState = {
  loggedIn: false,
  user: null,
  repos: [],
  selectedRepo: null,
  server: {
    hostId: null,
    hostName: null,
    running: false,
    buildId: '-',
    lastSync: null,
    lastUpload: null,
    startedAt: null,
  },
  logs: [
    { time: '09:00', text: 'Dashboard ready. Login with GitHub to begin.' },
  ],
};

const storageKey = 'arc-control-simple-v2';
let state = loadState();
let uptimeTickerId = null;

const $ = (id) => document.getElementById(id);

const el = {
  githubUser: $('githubUser'),
  authActionBtn: $('authActionBtn'),
  popupLoginBtn: $('popupLoginBtn'),
  loginModal: $('loginModal'),
  repoHint: $('repoHint'),
  repoList: $('repoList'),
  hostName: $('hostName'),
  serverStatus: $('serverStatus'),
  selectedRepo: $('selectedRepo'),
  startServerBtn: $('startServerBtn'),
  stopServerBtn: $('stopServerBtn'),
  serverNote: $('serverNote'),
  hostPanel: $('hostPanel'),
  buildId: $('buildId'),
  lastPull: $('lastPull'),
  lastUpload: $('lastUpload'),
  uptime: $('uptime'),
  activityLog: $('activityLog'),
};

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return structuredClone(initialState);

    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(initialState),
      ...parsed,
      server: {
        ...structuredClone(initialState.server),
        ...parsed.server,
      },
      repos: Array.isArray(parsed.repos) ? parsed.repos : [],
      logs: Array.isArray(parsed.logs) && parsed.logs.length ? parsed.logs : structuredClone(initialState.logs),
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadCreatedServers() {
  try {
    const raw = localStorage.getItem(createdServersKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAvailableRepos() {
  const createdRepos = loadCreatedServers().map((server) => ({
    name: server.name,
    role: server.role || 'Owner',
  }));

  const byName = new Map();
  [...mockRepos, ...createdRepos].forEach((repo) => {
    byName.set(repo.name, repo);
  });
  return [...byName.values()];
}

function refreshRepoPool() {
  if (!state.loggedIn) return;

  state.repos = getAvailableRepos();
  if (!state.selectedRepo || !state.repos.some((repo) => repo.name === state.selectedRepo)) {
    state.selectedRepo = state.repos[0]?.name ?? null;
  }
}

function nowLabel(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addLog(text) {
  state.logs.unshift({ time: nowLabel(), text });
  state.logs = state.logs.slice(0, MAX_ACTIVITY_LOG_ENTRIES);
}

function isCurrentUserHost() {
  return Boolean(state.loggedIn && state.user && state.server.hostId === state.user.id);
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

function formatDuration(startedAt) {
  if (!startedAt) return '0m 00s';
  const ms = Math.max(0, Date.now() - startedAt);
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${String(sec).padStart(2, '0')}s`;
}

function performPull(reason = 'Pull') {
  if (!state.selectedRepo) return;

  const stamp = new Date();
  const suffix = `${stamp.getHours()}${String(stamp.getMinutes()).padStart(2, '0')}`;
  state.server.lastSync = stamp.toISOString();
  state.server.buildId = `${state.selectedRepo}-${suffix}`;
  addLog(`${reason}: pulled latest ${state.selectedRepo} from GitHub.`);
}

function renderAuth() {
  el.githubUser.textContent = state.loggedIn && state.user ? `${state.user.name} (${state.user.handle})` : 'Not logged in';
  el.authActionBtn.textContent = state.loggedIn ? 'Logout' : 'Login';
}

function renderLoginModal() {
  el.loginModal.classList.toggle('hidden', state.loggedIn);
}

function renderRepos() {
  el.repoList.innerHTML = '';

  if (!state.loggedIn) {
    el.repoHint.textContent = 'Log in to load repositories.';
    return;
  }

  if (!state.repos.length) {
    el.repoHint.textContent = 'No servers yet. Use Create Server to create your first instance.';
    return;
  }

  el.repoHint.textContent = 'Click a repository to target this server instance.';

  const fragment = document.createDocumentFragment();

  state.repos.forEach((repo) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `repo-item ${state.selectedRepo === repo.name ? 'active' : ''}`;
    const title = document.createElement('strong');
    title.textContent = repo.name;

    const meta = document.createElement('div');
    meta.className = 'repo-meta';
    meta.textContent = repo.role;

    button.appendChild(title);
    button.appendChild(meta);
    button.addEventListener('click', () => {
      state.selectedRepo = repo.name;
      addLog(`Selected repo: ${repo.name}.`);
      syncAll();
    });
    item.appendChild(button);
    fragment.appendChild(item);
  });

  el.repoList.appendChild(fragment);
}

function renderServer() {
  const currentHost = state.server.hostName ?? 'No host';
  const running = state.server.running;
  const youAreHost = isCurrentUserHost();

  el.hostName.textContent = currentHost;
  el.serverStatus.textContent = running ? 'Running' : 'Stopped';
  el.selectedRepo.textContent = state.selectedRepo ?? 'None';

  if (!state.loggedIn) {
    el.startServerBtn.textContent = 'Login first';
    el.startServerBtn.disabled = true;
  } else if (!state.selectedRepo) {
    el.startServerBtn.textContent = 'Select a repo first';
    el.startServerBtn.disabled = true;
  } else if (running && !youAreHost && state.server.hostName) {
    el.startServerBtn.textContent = 'Take over + Start Server (auto-pull)';
    el.startServerBtn.disabled = false;
  } else if (youAreHost && running) {
    el.startServerBtn.textContent = 'You are hosting';
    el.startServerBtn.disabled = true;
  } else {
    el.startServerBtn.textContent = 'Start Server (auto-pull)';
    el.startServerBtn.disabled = false;
  }

  el.stopServerBtn.disabled = !(youAreHost && running);

  if (!state.loggedIn) {
    el.serverNote.textContent = 'Login with GitHub to view repos and control hosting.';
  } else if (running && youAreHost) {
    el.serverNote.textContent = 'You are the host. Full interface is unlocked below.';
  } else if (running && !youAreHost) {
    el.serverNote.textContent = `${state.server.hostName} is currently host. You can take over by starting the server.`;
  } else {
    el.serverNote.textContent = 'No active host. Start server to auto-pull and become host.';
  }
}

function renderHostPanel() {
  const visible = isCurrentUserHost() && state.server.running;
  el.hostPanel.classList.toggle('hidden', !visible);

  el.buildId.textContent = state.server.buildId || '-';
  el.lastPull.textContent = formatDate(state.server.lastSync);
  el.lastUpload.textContent = formatDate(state.server.lastUpload);
  el.uptime.textContent = formatDuration(state.server.startedAt);
}

function renderLogs() {
  el.activityLog.innerHTML = '';

  const fragment = document.createDocumentFragment();
  state.logs.forEach((entry) => {
    const li = document.createElement('li');

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = entry.time;

    const message = document.createElement('span');
    message.textContent = entry.text;

    li.appendChild(time);
    li.appendChild(message);
    fragment.appendChild(li);
  });

  el.activityLog.appendChild(fragment);
}

function startUptimeTicker() {
  if (uptimeTickerId !== null) return;

  uptimeTickerId = setInterval(() => {
    if (!state.server.running) {
      stopUptimeTicker();
      return;
    }

    renderServer();
    renderHostPanel();
  }, 1000);
}

function stopUptimeTicker() {
  if (uptimeTickerId === null) return;

  clearInterval(uptimeTickerId);
  uptimeTickerId = null;
}

function syncAll() {
  refreshRepoPool();
  renderAuth();
  renderLoginModal();
  renderRepos();
  renderServer();
  renderHostPanel();
  renderLogs();

  if (state.server.running) {
    startUptimeTicker();
  } else {
    stopUptimeTicker();
  }

  saveState();
}

function loginWithGithub() {
  if (state.loggedIn) {
    syncAll();
    return;
  }

  state.loggedIn = true;
  state.user = mockUser;
  state.repos = getAvailableRepos();
  state.selectedRepo = state.selectedRepo ?? state.repos[0]?.name ?? null;
  addLog('GitHub login successful. Contributor repositories loaded.');
  syncAll();
}

function logoutFromGithub() {
  if (!state.loggedIn) {
    syncAll();
    return;
  }

  if (isCurrentUserHost() && state.server.running) {
    stopServer({ reason: 'Logged out while hosting' });
  }

  state.loggedIn = false;
  state.user = null;
  state.repos = [];
  state.selectedRepo = null;
  addLog('Logged out from GitHub.');
  syncAll();
}

function handleAuthAction() {
  if (state.loggedIn) {
    logoutFromGithub();
    return;
  }

  el.loginModal.classList.remove('hidden');
}

function startServer() {
  if (!state.loggedIn || !state.user) {
    addLog('Start blocked: login required.');
    syncAll();
    return;
  }

  if (!state.selectedRepo) {
    addLog('Start blocked: select a repository first.');
    syncAll();
    return;
  }

  if (state.server.running && !isCurrentUserHost() && state.server.hostName) {
    addLog(`Takeover requested from ${state.server.hostName}.`);
  }

  performPull('Start server');
  state.server.running = true;
  state.server.hostId = state.user.id;
  state.server.hostName = state.user.name;
  state.server.startedAt = Date.now();
  addLog(`Server started after auto-pull. ${state.user.name} is now host.`);
  syncAll();
}

function stopServer(options = {}) {
  const reason = options.reason || 'Stop server';

  if (!(isCurrentUserHost() && state.server.running)) {
    addLog('Stop blocked: only the current host can stop the server.');
    syncAll();
    return;
  }

  const stopTime = new Date();
  state.server.lastUpload = stopTime.toISOString();
  addLog(`${reason}: uploaded server state and auto-pushed to GitHub.`);

  state.server.running = false;
  state.server.hostId = null;
  state.server.hostName = null;
  state.server.startedAt = null;

  addLog('Server stopped. Host released.');
  syncAll();
}

function wireEvents() {
  el.authActionBtn.addEventListener('click', handleAuthAction);
  el.popupLoginBtn.addEventListener('click', loginWithGithub);
  el.startServerBtn.addEventListener('click', startServer);
  el.stopServerBtn.addEventListener('click', () => stopServer({ reason: 'Stop server' }));
}

wireEvents();
syncAll();
