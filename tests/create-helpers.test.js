const test = require('node:test');
const assert = require('node:assert/strict');
const {
  slugify,
  isValidGitHubUsername,
  getRepoName,
  normalizePath,
  joinPath,
} = require('../assets/create/create-helpers.js');

test('slugify creates kebab-case repo-safe values', () => {
  assert.equal(slugify('MC Vanilla Season 2'), 'mc-vanilla-season-2');
  assert.equal(slugify('  ###  '), '');
});

test('GitHub username validation accepts and rejects expected formats', () => {
  assert.equal(isValidGitHubUsername('octocat'), true);
  assert.equal(isValidGitHubUsername('bad--name'), false);
  assert.equal(isValidGitHubUsername('-starts-with-dash'), false);
});

test('getRepoName deduplicates by appending incrementing suffix', () => {
  assert.equal(getRepoName('server', ['abc', 'xyz']), 'server');
  assert.equal(getRepoName('server', ['server', 'server-2']), 'server-3');
});

test('normalizePath converts slashes and trims edges', () => {
  assert.equal(normalizePath('\\config\\nested\\file.txt'), 'config/nested/file.txt');
  assert.equal(normalizePath('/config///nested/'), 'config/nested');
});

test('joinPath combines folder and name safely', () => {
  assert.equal(joinPath('/', 'server.properties'), 'server.properties');
  assert.equal(joinPath('/config', 'performance.properties'), 'config/performance.properties');
});
