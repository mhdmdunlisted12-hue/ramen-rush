#!/usr/bin/env node
/* Sınırsız moda kendi şarkını gömer.
 *
 *   node tools/embed-audio.js sarkim.mp3 --bpm 102 --bars 16
 *
 * Şarkı base64 olarak index.html'in içine yazılır; harici dosya gerekmez.
 * --bpm verilmezse mevcut değer korunur.
 *
 * ÖNEMLİ — loop'un ritme oturması için şarkı tam bar sayısına kesilmiş olmalı.
 * Kesilmemişse her turda ritim kayar. ffmpeg ile kesmek (README'de detay):
 *
 *   bar  = 240 / BPM saniye            (4/4 ölçüde)
 *   süre = bar * bar_sayısı
 *   ffmpeg -ss <ilk_vuruş> -t <süre> -i kaynak.mp3 -vn -c:a libmp3lame -b:a 128k loop.mp3
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const audioPath = args.find(a => !a.startsWith('--'));
const flag = n => {
  const i = args.indexOf('--' + n);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

if (!audioPath) {
  console.error('Kullanım: node tools/embed-audio.js <ses-dosyası> [--bpm 102] [--bars 16] [--html index.html]');
  process.exit(1);
}

const htmlPath = path.resolve(flag('html') || path.join(__dirname, '..', 'index.html'));
const audio = path.resolve(audioPath);

for (const f of [htmlPath, audio]) {
  if (!fs.existsSync(f)) { console.error('Bulunamadı: ' + f); process.exit(1); }
}

const ext = path.extname(audio).toLowerCase();
const mime = { '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.aac':'audio/aac',
               '.ogg':'audio/ogg', '.opus':'audio/ogg', '.wav':'audio/wav' }[ext];
if (!mime) { console.error('Desteklenmeyen format: ' + ext); process.exit(1); }

const bytes = fs.readFileSync(audio);
const b64 = bytes.toString('base64');
let html = fs.readFileSync(htmlPath, 'utf8');

// --- sesi göm ---
const slot = /const EMBEDDED_TRACK_B64 = "([A-Za-z0-9+/=]*)";/;
if (!slot.test(html)) { console.error('index.html içinde EMBEDDED_TRACK_B64 alanı yok.'); process.exit(1); }
html = html.replace(slot, 'const EMBEDDED_TRACK_B64 = "' + b64 + '";');

// --- BPM / bar ---
const bpm = flag('bpm'), bars = flag('bars');
if (bpm)  html = html.replace(/(ENDLESS:\s*\{[\s\S]*?bpm:)\s*[\d.]+/,  '$1' + parseFloat(bpm));
if (bars) html = html.replace(/(ENDLESS:\s*\{[\s\S]*?bars:)\s*\d+/,    '$1' + parseInt(bars, 10));

// --- parça adı (dosya adından) ---
const nice = path.basename(audio, ext).replace(/[_-]+/g, ' ').trim();
if (nice) html = html.replace(/(ENDLESS:\s*\{[\s\S]*?trackName:')[^']*/, '$1' + nice.replace(/'/g, ''));

fs.writeFileSync(htmlPath, html, 'utf8');

const cur = v => { const m = html.match(new RegExp('ENDLESS:\\s*\\{[\\s\\S]*?' + v + ':\\s*([\\d.]+)')); return m ? m[1] : '?'; };
const B = parseFloat(cur('bpm')), N = parseInt(cur('bars'), 10);
const bar = 240 / B, loop = bar * N;

console.log('✓ Gömüldü: ' + path.basename(audio) + '  (' + (bytes.length/1024/1024).toFixed(2) + ' MB ses)');
console.log('  BPM ' + B + ' · ' + N + ' bar · loop ' + loop.toFixed(3) + ' sn (' + (N*4) + ' vuruş)');
console.log('  index.html: ' + (fs.statSync(htmlPath).size/1024/1024).toFixed(2) + ' MB');
if (Math.abs(bytes.length) > 8 * 1024 * 1024)
  console.log('  ! Dosya büyük — tarayıcıda açılış yavaşlar, 128 kbps yeniden kodlamayı düşün.');
console.log('  Şarkı tam ' + N + ' bar değilse loop ritimden kayar (README: "Kendi şarkını gömmek").');
