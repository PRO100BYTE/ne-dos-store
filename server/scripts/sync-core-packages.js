const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const branch = process.env.NE_DOS_BRANCH || 'big-reload-1.3.0';
const repo = process.env.NE_DOS_REPO || path.resolve(__dirname, '..', '..', '..', 'ne-dos');
const outDir = path.resolve(__dirname, '..', 'packages', 'core');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const fileList = execSync(`git -C "${repo}" ls-tree -r --name-only ${branch} src/commands`, { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((item) => item.endsWith('.js'))
  .filter((item) => !item.endsWith('StorageManager.js'));

for (const filePath of fileList) {
  const content = execSync(`git -C "${repo}" show ${branch}:${filePath}`, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 4 });
  const target = path.join(outDir, filePath);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, content);
}

console.log(`Synced ${fileList.length} core command files to ${outDir}`);
