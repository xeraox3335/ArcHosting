(function bootstrapCreateHelpers(globalScope) {
  const helperApi = {
    slugify(value) {
      return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 63);
    },

    isValidGitHubUsername(value) {
      return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value);
    },

    getRepoName(baseName, existing) {
      const existingSet = new Set(existing);
      if (!existingSet.has(baseName)) return baseName;

      let idx = 2;
      let next = `${baseName}-${idx}`;
      while (existingSet.has(next)) {
        idx += 1;
        next = `${baseName}-${idx}`;
      }
      return next;
    },

    normalizePath(path) {
      return path
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '')
        .split('/')
        .filter(Boolean)
        .join('/');
    },

    joinPath(folder, name) {
      const cleanName = helperApi.normalizePath(name);
      if (!cleanName) return '';
      if (!folder || folder === '/') return cleanName;
      return `${helperApi.normalizePath(folder)}/${cleanName}`;
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = helperApi;
  }

  globalScope.ArcCreateHelpers = helperApi;
}(typeof globalThis !== 'undefined' ? globalThis : window));
