/** Rebuild the NAS fork's traceability records from Git and the staged tree; no network or runtime data is read. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trimEnd();
const [base, pinnedSha] = readFileSync(path.join(root, 'docs/nas/upstream-base.txt'), 'utf8').trim().split('\n');
// A fresh clone of the personal fork may not carry upstream's tag names.
// Pin the baseline object as well; it is already an ancestor of the nas branch.
const baseSha = git('rev-parse', '--verify', `${pinnedSha || base}^{commit}`);
const head = git('rev-parse', 'HEAD');
git('merge-base', '--is-ancestor', baseSha, head);
const primary = new Set(git('rev-list', '--first-parent', `${baseSha}..HEAD`).split('\n'));
const records = git('log', '--reverse', '--format=%H%x1f%ad%x1f%s%x1f%P', '--date=short', `${baseSha}..HEAD`)
  .split('\n').filter(Boolean).map((line) => {
    const [sha, date, subject, parentText] = line.split('\x1f');
    return { sha, date, subject, merge: parentText.split(' ').length > 1 };
  });
const code = (value) => `\`${value.replaceAll('`', '\\`').replaceAll('|', '\\|')}\``;
const text = (value) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
const fileLink = (name) => `[${text(name).replace(/[\[\]\\]/g, '\\$&')}](../../${name.split('/').map(encodeURIComponent).join('/')})`;

function paths(...args) {
  const values = git('diff', ...args, '--name-status', '-z').split('\0');
  const rows = [];
  for (let index = 0; index < values.length && values[index];) {
    const status = values[index++];
    const before = values[index++];
    const renamed = /^[RC]/.test(status);
    rows.push({ status, before: renamed ? before : null, name: renamed ? values[index++] : before });
  }
  return rows;
}
const pathTable = (rows) => [
  '| 状态 | 文件 | 原路径 |', '| --- | --- | --- |',
  ...rows.map((row) => `| ${row.status} | ${fileLink(row.name)} | ${row.before ? code(row.before) : '—'} |`),
].join('\n');
const outputNames = new Set(['docs/nas/commit-log.md', 'docs/nas/file-index.md']);
const staged = paths('--cached').filter((row) => !outputNames.has(row.name));
const changed = paths('--cached', baseSha);
for (const name of outputNames) {
  if (!changed.some((row) => row.name === name)) changed.push({ status: 'A', before: null, name });
}
changed.sort((a, b) => a.name.localeCompare(b.name));
const header = `官方基线：${code(base)} (${code(baseSha)})。历史覆盖至生成时的 HEAD：${code(head)}。\n\n`;
const renderRecord = (record) => {
  const changedPaths = git('diff-tree', '--no-commit-id', '--name-only', '-r', ...(record.merge ? ['-m', '--first-parent'] : []), record.sha)
    .split('\n').filter(Boolean);
  return `### ${record.sha.slice(0, 8)} · ${record.date} · ${text(record.subject)}\n\n`
    + `- 完整提交：${code(record.sha)}${record.merge ? '（合并提交，整体回退应使用 `git revert -m 1`）' : ''}\n`
    + `- 相对第一父提交涉及文件：\n\n${[...new Set(changedPaths)].map((name) => `  - ${code(name)}`).join('\n')}\n`;
};
const log = `# NAS 分支完整提交记录（自动生成）\n\n${header}`
  + '功能说明和回退依赖见 [维护指南](README.md)，完整净差异见 [文件索引](file-index.md)。不要手动编辑本文件。\n\n'
  + '## 随本次提交入库的变更\n\n下表来自暂存区，不包含这两个自动生成文件。该提交的 SHA 在提交完成后才产生；下一次生成时会进入下方历史。\n\n'
  + (staged.length ? pathTable(staged) : '无其他暂存变更。') + '\n\n'
  + '## NAS 主线提交\n\n' + records.filter((record) => primary.has(record.sha)).map(renderRecord).join('\n')
  + '\n## 从 PR / 其他分支合入的提交\n\n' + records.filter((record) => !primary.has(record.sha)).map(renderRecord).join('\n');
const index = `# NAS 相对官方版本的完整文件索引（自动生成）\n\n${header}`
  + `记录基线与当前暂存树之间的全部净差异，共 ${changed.length} 个文件；已提交后又完整回退的文件可在 [提交记录](commit-log.md) 查到。\n\n`
  + '状态：A 新增、M 修改、D 删除、R 重命名、C 复制。源码之外的 NAS 本机数据库、CLI 配置和凭据由各机器自行维护，参见 [部署说明](../../deploy/README.md)。\n\n'
  + pathTable(changed) + '\n';
mkdirSync(path.join(root, 'docs/nas'), { recursive: true });
writeFileSync(path.join(root, 'docs/nas/commit-log.md'), log);
writeFileSync(path.join(root, 'docs/nas/file-index.md'), index);
console.log(`NAS records: ${records.length} existing commits, ${staged.length} staged changes, ${changed.length} changed files versus ${base}.`);
