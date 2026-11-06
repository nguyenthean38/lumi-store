// Runs the API (port 4000) and the Vite dev server (port 5173) together.
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs = [
  ['API', ['run', 'dev', '--prefix', 'server'], '\x1b[36m'],
  ['WEB', ['run', 'dev', '--prefix', 'client'], '\x1b[35m'],
].map(([name, args, color]) => {
  const p = spawn(npm, args, { cwd: root, shell: process.platform === 'win32' });
  const tag = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) => stream.on('data', (d) => d.toString().split(/\r?\n/).filter(Boolean).forEach((l) => out.write(tag + l + '\n')));
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    console.log(`${tag}đã dừng (mã ${code})`);
    procs.forEach((x) => x !== p && x.kill());
    process.exit(code ?? 0);
  });
  return p;
});

console.log('\nCửa hàng:   http://localhost:5173\nQuản trị:   http://localhost:5173/admin  (admin@lumi.vn / admin123)\n');
process.on('SIGINT', () => procs.forEach((p) => p.kill()));
