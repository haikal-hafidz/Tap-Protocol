// TAP Protocol - local helper: puts your Supabase PUBLISHABLE key into js/config.js. No network, no npm install needed.
//
//   node tools/set-key.mjs                  asks you to paste the key (nothing is shown while you type or paste)
//   node tools/set-key.mjs "C:\path\key.txt"  reads the key out of a text file you already have (the file is not changed)
//   node tools/set-key.mjs --clear          puts the key line back to empty
//
// Safety: only a Publishable key (sb_publishable_...) or a legacy "anon" key is accepted. A Secret key or a service_role
// key is never written: it is ignored if it is in your text file, and refused if you paste it. The key is never printed,
// never logged and never sent anywhere. The only files touched are js/config.js and the cache stamp in sw.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeVersion } from './stamp-version.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = path.join(ROOT, 'js/config.js');
const SW = path.join(ROOT, 'sw.js');
const LINE = /^export const SUPABASE_KEY = '[^'\n]*';.*$/m;

const say = (m) => console.log(m);
function fail(m) { console.error('\nGAGAL: ' + m + '\nTidak ada file yang diubah.'); process.exit(1); }

function jwtRole(k) {
  const p = k.split('.');
  if (p.length !== 3) return '';
  try { return String(JSON.parse(Buffer.from(p[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).role || ''); } catch { return ''; }
}
// Returns { key, ignoredSecret } from arbitrary text. Never returns a secret key.
export function pickKey(text) {
  const t = String(text || '');
  const ignoredSecret = /sb_secret_[A-Za-z0-9_-]+/.test(t) || /service_role/i.test(t);
  const pub = t.match(/sb_publishable_[A-Za-z0-9_-]{16,}/);
  if (pub) return { key: pub[0], ignoredSecret };
  for (const m of t.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    if (jwtRole(m[0]) === 'anon') return { key: m[0], ignoredSecret };
  }
  return { key: '', ignoredSecret };
}

function readHidden(prompt) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) { let d = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', (c) => { d += c; }); process.stdin.on('end', () => resolve(d)); return; }
    process.stdout.write(prompt);
    let buf = '';
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', onData); process.stdout.write('\n'); resolve(buf); return; }
        if (ch === '\u0003') { process.stdin.setRawMode(false); process.stdout.write('\nDibatalkan.\n'); process.exit(1); }
        if (ch === '\u007f' || ch === '\b') buf = buf.slice(0, -1); else if (ch >= ' ') buf += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

function writeKey(key) {
  const cur = fs.readFileSync(CONFIG, 'utf8');
  if (!LINE.test(cur)) fail('js/config.js tidak punya baris SUPABASE_KEY dengan format yang dikenal. Jangan diubah manual dulu; kabari Claude.');
  const next = cur.replace(LINE, () => `export const SUPABASE_KEY = '${key}';` + (key ? '' : '   // example: sb_publishable_...'));
  fs.writeFileSync(CONFIG, next);
  // Keep the cache stamp honest (README: "run npm run stamp after changing a precached file").
  const sw = fs.readFileSync(SW, 'utf8');
  fs.writeFileSync(SW, sw.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${computeVersion(ROOT)}';`));
}

const arg = process.argv[2];
if (arg === '--clear') { writeKey(''); say('Key dikosongkan. Cloud Sync mati di salinan ini.'); process.exit(0); }
if (arg === '--help' || arg === '-h') { say(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 8).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }

let source = '';
if (arg) {
  const f = path.resolve(arg.replace(/^"|"$/g, ''));
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) fail('File tidak ditemukan: ' + f);
  if (fs.statSync(f).size > 200000) fail('File terlalu besar untuk file key.');
  source = fs.readFileSync(f, 'utf8');
} else {
  say('Tempel Publishable key Anda (diawali sb_publishable_), lalu tekan Enter.');
  say('Layar tidak menampilkan apa pun saat Anda menempel; itu normal.');
  source = await readHidden('Key: ');
}
const { key, ignoredSecret } = pickKey(source);
if (!key) {
  if (/sb_secret_|service_role/i.test(source)) fail('Yang Anda berikan adalah Secret key atau service_role key. Itu TIDAK BOLEH dipakai di game. Ambil yang berlabel "Publishable key".');
  fail('Tidak menemukan Publishable key (sb_publishable_...) di masukan Anda.');
}
writeKey(key);
say(`\nSelesai. Publishable key (${key.length} karakter, awalan ${key.slice(0, 15)}...) sudah dipasang di js/config.js.`);
say('Key lengkap tidak ditampilkan dan tidak disimpan di tempat lain.');
if (ignoredSecret) say('\nPERINGATAN: file Anda juga berisi Secret/service_role key. Itu diabaikan dan tidak dipakai. Sebaiknya jangan simpan Secret key di file teks biasa.');
say('\nLangkah berikutnya: unggah js/config.js dan sw.js ke GitHub (lihat docs/PANDUAN_INDONESIA.md).');
