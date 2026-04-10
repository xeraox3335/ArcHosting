const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [
  ['assets/index.html', 'href="create/create.html"'],
  ['assets/index.html', 'src="api/client.js"'],
  ['assets/create/create.html', 'href="../index.html"'],
  ['assets/create/create.html', 'src="../api/client.js"'],
  ['assets/create/create.html', 'src="create-helpers.js"'],
  ['assets/app.js', 'function handleRepoItemKeydown'],
  ['assets/app.js', 'function shouldRunUptimeTicker'],
  ['assets/create/create.js', 'function resetCreateForm'],
  ['assets/create/create.js', 'function setCreatePending'],
];

const missing = [];
for (const [relativeFile, needle] of checks) {
  const fullPath = path.join(root, relativeFile);
  const text = fs.readFileSync(fullPath, 'utf8');
  if (!text.includes(needle)) {
    missing.push(`${relativeFile} -> ${needle}`);
  }
}

if (missing.length > 0) {
  console.error('Static smoke check failed:\n' + missing.join('\n'));
  process.exit(1);
}

console.log(`Static smoke checks passed: ${checks.length}`);
