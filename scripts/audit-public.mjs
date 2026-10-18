import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';

// Fail closed on unknown files. Review this allowlist when adding public content.
const roots = new Set(['src', 'docs', 'public', 'scripts', 'tests', '.github']);
const rootFiles = new Set(['README.md', 'package.json', 'package-lock.json', '.gitignore', '.env.production', '.env.example', 'index.html', 'tsconfig.json', 'vite.config.ts', 'vercel.json']);
const ignored = new Set(['node_modules', '.git', '.vercel', 'test-results', 'playwright-report']);
const textTypes = new Set(['.ts', '.tsx', '.js', '.css', '.html', '.md', '.svg', '.json', '.mjs', '.yml', '.yaml', '.example', '.production', '']);
const rules = [
  ['private endpoint', /(?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)|\.ts\.net\b|tailscale|:876[56]\b/i],
  ['local path', /[A-Z]:[\\/](?:Users|work|home)[\\/]|\/home\/[\w.-]+\//i],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['known credential', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9_-]{24,})/],
  ['assigned credential', /(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["'][^"'\s]{8,}["']/i],
];
const failures = [];
let count = 0;
async function walk(directory, built = false) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name), name = relative(process.cwd(), path).replaceAll('\\', '/');
    if (entry.isSymbolicLink()) { failures.push(`${name}: symlinks are not permitted`); continue; }
    if (entry.isDirectory()) {
      if (ignored.has(entry.name)) continue;
      if (directory === process.cwd() && entry.name !== 'dist' && !roots.has(entry.name)) { failures.push(`${name}: unexpected directory`); continue; }
      await walk(path, built || entry.name === 'dist'); continue;
    }
    if (directory === process.cwd() && !rootFiles.has(entry.name)) failures.push(`${name}: unexpected root file`);
    if (entry.name.endsWith('.map')) failures.push(`${name}: source maps are not permitted`);
    if (!textTypes.has(extname(entry.name))) { failures.push(`${name}: binary or unknown file requires explicit review`); continue; }
    // Scanner rules intentionally contain the patterns they reject.
    if (name === 'scripts/audit-public.mjs') continue;
    const content = await readFile(path, 'utf8'); count++;
    for (const [label, rule] of rules) if (rule.test(content)) failures.push(`${name}: ${label}`);
    // Three.js ships dormant file/image loaders. Network API checks apply to authored source;
    // built output still gets endpoint/credential checks. CSP and browser QA enforce runtime isolation.
    if (name.startsWith('src/') && /\b(?:fetch\s*\(|new\s+WebSocket\s*\(|XMLHttpRequest\s*\(|sendBeacon\s*\()/.test(content)) failures.push(`${name}: network API needs review`);
    if ((built || name.startsWith('src/')) && /@import\s+url|(?:src|href)=["']https?:|url\(["']?https?:/i.test(content)) failures.push(`${name}: remote resource needs review`);
  }
}
await walk(process.cwd());
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Public audit passed: ${count} text files inspected. No flagged patterns. This is a bounded check, not a guarantee of secrecy.`);
