/* Oyunun tek dosyalık HTML'ini React Native'in okuyabileceği JS modülüne çevirir.
   Tek kaynak korunur: ramen-rush.html'i güncelle, bu scripti çalıştır, APK yeni sürümü alır.
   Kullanım:  node tools/build-html.js  [kaynak-html-yolu] */
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || path.resolve(__dirname, '..', '..', 'index.html');
const out = path.resolve(__dirname, '..', 'assets', 'gameHtml.js');

if (!fs.existsSync(src)) {
  console.error('HTML bulunamadı: ' + src);
  console.error('Kullanım: node tools/build-html.js ../ramen-rush.html');
  process.exit(1);
}

let html = fs.readFileSync(src, 'utf8');

// Template literal içine gömüleceği için kaçırılması gereken karakterler
const escaped = html
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const banner = '// OTOMATİK ÜRETİLDİ — elle düzenleme. Kaynak: ' + path.basename(src) + '\n' +
               '// Yeniden üretmek için: npm run build:html\n';

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, banner + 'export default `' + escaped + '`;\n', 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log('✓ assets/gameHtml.js yazıldı (' + kb + ' KB kaynak)');
