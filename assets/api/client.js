(function bootstrapArcApi(global) {
  const CREATED_SERVERS_KEY = 'arc-created-servers';
  const DEFAULT_DELAY_MS = 180;

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

  function delay(ms = DEFAULT_DELAY_MS) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function loadCreatedServers() {
    try {
      const raw = localStorage.getItem(CREATED_SERVERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCreatedServers(servers) {
    localStorage.setItem(CREATED_SERVERS_KEY, JSON.stringify(servers));
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

  async function loginWithGithub() {
    await delay();
    return { user: { ...mockUser } };
  }

  async function listRepos() {
    await delay(120);
    return getAvailableRepos();
  }

  async function createRepository(payload) {
    await delay();

    const existing = loadCreatedServers();
    saveCreatedServers([...existing, payload]);

    return { ok: true, repo: payload };
  }

  global.ArcApi = {
    keys: {
      createdServers: CREATED_SERVERS_KEY,
    },
    mock: {
      user: { ...mockUser },
      repos: [...mockRepos],
    },
    loadCreatedServers,
    saveCreatedServers,
    getAvailableRepos,
    loginWithGithub,
    listRepos,
    createRepository,
  };
}(window));
