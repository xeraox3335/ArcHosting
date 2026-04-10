const CREATED_SERVERS_KEY = 'arc-created-servers';

const el = {
  serverName: document.getElementById('serverName'),
  visibility: document.getElementById('visibility'),
  repoSlugPreview: document.getElementById('repoSlugPreview'),
  starterPreset: document.getElementById('starterPreset'),
  applyPresetBtn: document.getElementById('applyPresetBtn'),
  currentFolder: document.getElementById('currentFolder'),
  newFolderBtn: document.getElementById('newFolderBtn'),
  newFileBtn: document.getElementById('newFileBtn'),
  uploadFiles: document.getElementById('uploadFiles'),
  fileManagerTree: document.getElementById('fileManagerTree'),
  collaboratorInput: document.getElementById('collaboratorInput'),
  addCollaboratorBtn: document.getElementById('addCollaboratorBtn'),
  collaboratorList: document.getElementById('collaboratorList'),
  resetFormBtn: document.getElementById('resetFormBtn'),
  createRepoBtn: document.getElementById('createRepoBtn'),
  createStatus: document.getElementById('createStatus'),
  createLog: document.getElementById('createLog'),
};

const state = {
  collaborators: [],
  selectedFolder: '/',
  fileEntries: [],
};

let createPending = false;

const presets = {
  'vanilla-basic': [
    { path: 'README.md', type: 'file', source: 'preset' },
    { path: 'server.jar', type: 'file', source: 'preset' },
    { path: 'server.properties', type: 'file', source: 'preset' },
    { path: 'eula.txt', type: 'file', source: 'preset' },
    { path: 'start.bat', type: 'file', source: 'preset' },
  ],
  'vanilla-performance': [
    { path: 'README.md', type: 'file', source: 'preset' },
    { path: 'server.jar', type: 'file', source: 'preset' },
    { path: 'server.properties', type: 'file', source: 'preset' },
    { path: 'config', type: 'folder', source: 'preset' },
    { path: 'config/performance.properties', type: 'file', source: 'preset' },
    { path: 'start.bat', type: 'file', source: 'preset' },
  ],
  empty: [],
};

const createHelpers = window.ArcCreateHelpers || {};

function loadCreatedServers() {
  if (typeof window.ArcApi?.loadCreatedServers === 'function') {
    return window.ArcApi.loadCreatedServers();
  }

  try {
    const raw = localStorage.getItem(CREATED_SERVERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCreatedServers(servers) {
  if (typeof window.ArcApi?.saveCreatedServers === 'function') {
    window.ArcApi.saveCreatedServers(servers);
    return;
  }

  localStorage.setItem(CREATED_SERVERS_KEY, JSON.stringify(servers));
}

const slugify = createHelpers.slugify || ((value) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 63));

const isValidGitHubUsername = createHelpers.isValidGitHubUsername || ((value) => /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value));

const INVALID_PATH_CHAR_PATTERN = /[<>:"|?*\u0000-\u001F]/;

function validateServerName(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter a server name.';
  if (trimmed.length > 80) return 'Server name must be 80 characters or fewer.';
  if (!slugify(trimmed)) return 'Server name must include letters or numbers.';
  return '';
}

function validateManualEntryName(value, label) {
  const trimmed = value.trim();
  if (!trimmed) return `${label} cannot be empty.`;

  const segments = normalizePath(trimmed).split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return `${label} cannot contain "." or ".." path segments.`;
  }

  if (segments.some((segment) => INVALID_PATH_CHAR_PATTERN.test(segment))) {
    return `${label} contains invalid characters.`;
  }

  return '';
}

const getRepoName = createHelpers.getRepoName || ((baseName, existing) => {
  const existingSet = new Set(existing);
  if (!existingSet.has(baseName)) return baseName;

  let idx = 2;
  let next = `${baseName}-${idx}`;
  while (existingSet.has(next)) {
    idx += 1;
    next = `${baseName}-${idx}`;
  }
  return next;
});

function addLog(message) {
  const li = document.createElement('li');

  const step = document.createElement('span');
  step.className = 'log-time';
  step.textContent = 'Step';

  const text = document.createElement('span');
  text.textContent = message;

  li.appendChild(step);
  li.appendChild(text);
  el.createLog.appendChild(li);
}

function clearLog() {
  el.createLog.innerHTML = '';
}

const normalizePath = createHelpers.normalizePath || ((path) => path
  .replace(/\\/g, '/')
  .replace(/^\/+|\/+$/g, '')
  .replace(/\/+/g, '/'));

const joinPath = createHelpers.joinPath || ((folder, name) => {
  const cleanName = normalizePath(name);
  if (!cleanName) return '';
  if (!folder || folder === '/') return cleanName;
  return `${normalizePath(folder)}/${cleanName}`;
});

function parentPath(path) {
  const normalized = normalizePath(path);
  if (!normalized.includes('/')) return '/';
  return normalized.slice(0, normalized.lastIndexOf('/'));
}

function ensureParentFolders(path, source = 'manual') {
  const normalized = normalizePath(path);
  const parts = normalized.split('/').slice(0, -1);
  let cursor = '';

  parts.forEach((part) => {
    cursor = cursor ? `${cursor}/${part}` : part;
    addEntry(cursor, 'folder', source, false);
  });
}

function addEntry(path, type, source = 'manual', render = true) {
  const normalized = normalizePath(path);
  if (!normalized) return false;

  if (type === 'file') {
    ensureParentFolders(normalized, source);
  }

  const existingIndex = state.fileEntries.findIndex((entry) => entry.path === normalized);
  if (existingIndex >= 0) {
    if (state.fileEntries[existingIndex].type !== type) return false;
    return false;
  }

  state.fileEntries.push({ path: normalized, type, source });
  if (render) {
    renderFileTree();
  }
  return true;
}

function removeEntry(path) {
  const normalized = normalizePath(path);
  const isFolder = state.fileEntries.some((entry) => entry.path === normalized && entry.type === 'folder');

  state.fileEntries = state.fileEntries.filter((entry) => {
    if (entry.path === normalized) return false;
    if (isFolder && entry.path.startsWith(`${normalized}/`)) return false;
    return true;
  });

  if (state.selectedFolder === `/${normalized}` || state.selectedFolder === normalized) {
    state.selectedFolder = '/';
  }

  renderFileTree();
}

function renderCollaborators() {
  el.collaboratorList.replaceChildren();

  const fragment = document.createDocumentFragment();
  state.collaborators.forEach((username, index) => {
    const li = document.createElement('li');

    const name = document.createElement('span');
    name.textContent = `@${username}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', `Remove ${username}`);
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      state.collaborators.splice(index, 1);
      renderCollaborators();
    });

    li.appendChild(name);
    li.appendChild(removeBtn);
    fragment.appendChild(li);
  });

  el.collaboratorList.replaceChildren(fragment);
}

function buildTreeModel() {
  const root = { folders: new Map(), files: [] };

  const sorted = [...state.fileEntries].sort((a, b) => a.path.localeCompare(b.path));
  sorted.forEach((entry) => {
    const parts = entry.path.split('/');
    let node = root;

    if (entry.type === 'folder') {
      parts.forEach((part) => {
        if (!node.folders.has(part)) {
          node.folders.set(part, { folders: new Map(), files: [] });
        }
        node = node.folders.get(part);
      });
      return;
    }

    parts.slice(0, -1).forEach((part) => {
      if (!node.folders.has(part)) {
        node.folders.set(part, { folders: new Map(), files: [] });
      }
      node = node.folders.get(part);
    });

    node.files.push(parts[parts.length - 1]);
  });

  return root;
}

function createFolderNode(name, fullPath, nodeModel) {
  const li = document.createElement('li');
  const row = document.createElement('div');
  row.className = 'node-row';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `node-select ${normalizePath(state.selectedFolder) === normalizePath(fullPath) ? 'active' : ''}`;
  button.textContent = `📁 ${name}`;
  button.addEventListener('click', () => {
    state.selectedFolder = `/${normalizePath(fullPath)}`;
    renderFileTree();
  });

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'node-delete';
  del.textContent = '✕';
  del.title = `Delete ${name}`;
  del.addEventListener('click', () => removeEntry(fullPath));

  row.appendChild(button);
  row.appendChild(del);
  li.appendChild(row);

  const childUl = document.createElement('ul');
  [...nodeModel.folders.keys()].sort().forEach((childName) => {
    const childPath = `${fullPath}/${childName}`;
    childUl.appendChild(createFolderNode(childName, childPath, nodeModel.folders.get(childName)));
  });
  nodeModel.files.sort().forEach((fileName) => {
    const filePath = `${fullPath}/${fileName}`;
    childUl.appendChild(createFileNode(fileName, filePath));
  });

  if (childUl.childElementCount > 0) {
    li.appendChild(childUl);
  }

  return li;
}

function createFileNode(name, fullPath) {
  const li = document.createElement('li');
  const row = document.createElement('div');
  row.className = 'node-row';

  const title = document.createElement('span');
  title.textContent = `📄 ${name}`;

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'node-delete';
  del.textContent = '✕';
  del.title = `Delete ${name}`;
  del.addEventListener('click', () => removeEntry(fullPath));

  row.appendChild(title);
  row.appendChild(del);
  li.appendChild(row);
  return li;
}

function renderFileTree() {
  el.fileManagerTree.replaceChildren();
  el.currentFolder.textContent = state.selectedFolder || '/';

  if (!state.fileEntries.length) {
    const empty = document.createElement('p');
    empty.className = 'node-empty';
    empty.textContent = 'No files yet. Apply a preset, add files/folders, or upload files.';
    el.fileManagerTree.replaceChildren(empty);
    return;
  }

  const model = buildTreeModel();
  const rootUl = document.createElement('ul');

  [...model.folders.keys()].sort().forEach((folder) => {
    rootUl.appendChild(createFolderNode(folder, folder, model.folders.get(folder)));
  });
  model.files.sort().forEach((file) => {
    rootUl.appendChild(createFileNode(file, file));
  });

  el.fileManagerTree.replaceChildren(rootUl);
}

function refreshSlugPreview() {
  const slug = slugify(el.serverName.value || 'new-server');
  el.repoSlugPreview.textContent = slug || 'new-server';
}

function applyPreset() {
  const selected = presets[el.starterPreset.value] || [];
  state.fileEntries = [];
  state.selectedFolder = '/';

  selected.forEach((entry) => {
    addEntry(entry.path, entry.type, entry.source, false);
  });

  renderFileTree();
  el.createStatus.textContent = `Preset applied: ${el.starterPreset.options[el.starterPreset.selectedIndex].text}.`;
}

function addCollaborator() {
  const value = el.collaboratorInput.value.trim().replace(/^@/, '');
  if (!value) return;

  const normalized = value.toLowerCase();

  if (!isValidGitHubUsername(normalized)) {
    el.createStatus.textContent = 'Invalid GitHub username format.';
    return;
  }

  if (state.collaborators.includes(normalized)) {
    el.createStatus.textContent = 'That collaborator is already added.';
    return;
  }

  state.collaborators.push(normalized);
  el.collaboratorInput.value = '';
  el.createStatus.textContent = '';
  renderCollaborators();
}

function setCreatePending(next) {
  createPending = next;
  el.createRepoBtn.disabled = next;
  el.resetFormBtn.disabled = next;
  el.createRepoBtn.textContent = next
    ? 'Creating repository...'
    : 'Create repository + auto setup';
}

function handleFileUpload(event) {
  const selectedFolder = state.selectedFolder || '/';
  [...event.target.files].forEach((file) => {
    const path = joinPath(selectedFolder, file.name);
    addEntry(path, 'file', 'upload', false);
  });

  event.target.value = '';
  renderFileTree();
}

function createFolder() {
  const name = window.prompt('Folder name');
  if (!name) return;

  const validationError = validateManualEntryName(name, 'Folder name');
  if (validationError) {
    el.createStatus.textContent = validationError;
    return;
  }

  const path = joinPath(state.selectedFolder, name);
  if (!path) return;

  const ok = addEntry(path, 'folder', 'manual');
  if (!ok) {
    el.createStatus.textContent = 'Folder already exists or path is invalid.';
    return;
  }

  state.selectedFolder = `/${normalizePath(path)}`;
  el.createStatus.textContent = '';
  renderFileTree();
}

function createFile() {
  const name = window.prompt('File name (example: notes.txt)');
  if (!name) return;

  const validationError = validateManualEntryName(name, 'File name');
  if (validationError) {
    el.createStatus.textContent = validationError;
    return;
  }

  const path = joinPath(state.selectedFolder, name);
  if (!path) return;

  const ok = addEntry(path, 'file', 'manual');
  if (!ok) {
    el.createStatus.textContent = 'File already exists or path is invalid.';
    return;
  }

  el.createStatus.textContent = '';
}

async function createRepository() {
  if (createPending) return;

  const serverName = el.serverName.value.trim();

  const serverNameError = validateServerName(serverName);
  if (serverNameError) {
    el.createStatus.textContent = serverNameError;
    return;
  }

  if (!state.fileEntries.length) {
    el.createStatus.textContent = 'Add at least one file or folder in the file manager.';
    return;
  }

  const existing = loadCreatedServers();
  const existingNames = existing.map((item) => item.name);
  const base = slugify(serverName) || 'new-server';
  const repoName = getRepoName(base, existingNames);

  const payload = {
    name: repoName,
    displayName: serverName,
    role: 'Owner',
    visibility: el.visibility.value,
    templateFiles: [],
    uploadedFiles: [],
    files: [],
    fileTree: [...state.fileEntries],
    collaborators: [...state.collaborators],
    autoSetup: true,
    createdAt: new Date().toISOString(),
  };

  state.fileEntries.forEach((entry) => {
    if (entry.type !== 'file') return;

    payload.files.push(entry.path);
    if (entry.source === 'preset') payload.templateFiles.push(entry.path);
    if (entry.source === 'upload') payload.uploadedFiles.push(entry.path);
  });

  setCreatePending(true);
  el.createStatus.textContent = 'Creating repository and applying setup...';

  try {
    if (typeof window.ArcApi?.createRepository === 'function') {
      await window.ArcApi.createRepository(payload);
    } else {
      saveCreatedServers([...existing, payload]);
    }

    clearLog();
    addLog(`Created GitHub repository ${repoName} (${payload.visibility}).`);
    addLog(`Initialized repository and committed ${payload.files.length} file(s).`);

    if (payload.uploadedFiles.length) {
      addLog(`Uploaded ${payload.uploadedFiles.length} file(s) from your device.`);
    } else {
      addLog('No local uploads selected.');
    }

    if (payload.collaborators.length) {
      addLog(`Invited collaborators: ${payload.collaborators.map((name) => `@${name}`).join(', ')}.`);
    } else {
      addLog('No collaborators added at creation time.');
    }

    addLog('Auto setup complete. Repository is ready to host.');
    el.createStatus.textContent = `Done: ${repoName} has been created and configured.`;
  } catch {
    addLog('Repository creation failed. Please retry.');
    el.createStatus.textContent = 'Repository creation failed. Please try again.';
  } finally {
    setCreatePending(false);
  }
}

function resetCreateForm() {
  if (createPending) return;

  state.collaborators = [];
  state.selectedFolder = '/';

  el.serverName.value = '';
  el.visibility.value = 'private';
  el.starterPreset.value = 'vanilla-basic';
  el.collaboratorInput.value = '';
  el.uploadFiles.value = '';

  clearLog();
  renderCollaborators();
  refreshSlugPreview();
  applyPreset();
  el.createStatus.textContent = 'Form reset. Default preset applied.';
}

function wireEvents() {
  el.serverName.addEventListener('input', refreshSlugPreview);
  el.applyPresetBtn.addEventListener('click', applyPreset);
  el.newFolderBtn.addEventListener('click', createFolder);
  el.newFileBtn.addEventListener('click', createFile);
  el.addCollaboratorBtn.addEventListener('click', addCollaborator);
  el.resetFormBtn.addEventListener('click', resetCreateForm);
  el.collaboratorInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCollaborator();
    }
  });
  el.uploadFiles.addEventListener('change', handleFileUpload);
  el.createRepoBtn.addEventListener('click', () => {
    void createRepository();
  });
}

wireEvents();
refreshSlugPreview();
renderCollaborators();
applyPreset();
