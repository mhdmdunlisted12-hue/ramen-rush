# Ramen Rush

Tarayıcıda çalışan, anime/Japon temalı ritim arcade oyunu. Gökten düşen ramenleri
kaseyle yakalıyorsun — ama ramenler rastgele düşmüyor, **müziğin vuruşuna göre** iniyor.

Tek HTML dosyası. Bağımlılık yok, build adımı yok, sunucu yok. `index.html`'i aç ve oyna.

**Oyna:** https://mhdmdunlisted12-hue.github.io/ramenrush/

---

## Nasıl oynanır

Kaseyi mouse (veya dokunmatik) ile kaydır. 90 saniyede en yüksek skoru yap, ya da
sınırsız modda canların bitene kadar dayan.

| Ramen | Etki |
|---|---|
| Normal | `10 × level` puan |
| Spicy | iki katı puan |
| Rainbow | 10 saniyelik Rainbow Mode — hız ve puan çarpanı artar |
| Golden | büyük bonus (`500 + level × 50`) |
| Mega | her 5 levelde bir, `+1000` |
| Rotten | **kaçın** — maç skorun sıfırlanır, bir can gider |

Rotten sadece *mevcut maçın* skorunu siler. Rekor, coin, açtığın skinler ve
seviye geçmişi durur.

Combo 5'te ×1.2, 10'da ×1.5, 20'de ×2, 30'da ×3 çarpan verir. Toplam çarpan tavanı ×6.

**Kontroller:** `ESC` duraklat · `F3` debug paneli (açıkken `1-6` ramen spawn, `0` +2000 puan)

---

## Modlar

**90 saniye** — 10 parça, her biri farklı BPM ve zorlukta. Müzik kodun içinde
üretiliyor (Web Audio), harici dosya yok: city pop, kawaii future bass, shuffle,
disco, rock, hardcore, lofi, taiko, funk, drum & bass.

**∞ Sınırsız** — süre yok, canların bitene kadar. Şarkı döngüye girer, zorluk
150 saniyede tavana çıkıp orada sabitlenir (sonsuza kadar hızlanmaz).

**Hız çubuğu** (0.6× – 2.0×) — düşüş *süresini* kısaltır, hedef vuruş zamanını
değil. Yani tepki süren 2.5 saniyeden 0.45 saniyeye iner ama ramenler yine tam
vuruşta kaseye gelir; ritim bozulmaz.

---

## Senkron nasıl çalışıyor

Ritim oyunlarında asıl zorluk, görselin müzikle aynı anda gelmesi. Burada:

- **Zaman kaynağı müziğin kendisi.** `AudioContext.currentTime` okunuyor,
  `requestAnimationFrame` sayacı değil — kare atlasa da senkron kaymaz.
- **Ramen geriye doğru konumlanıyor.** Hedef vuruş zamanı belli; ramen o vuruştan
  *düşüş süresi kadar önce* doğuyor ve hızı `mesafe / kalan süre` ile veriliyor.
  Böylece hedefe tam vuruşta varıyor.
- **Adalet kilidi:** ardışık iki ramenin yatay mesafesi, kasenin o süre içinde
  gerçekten kat edebileceği mesafeyle sınırlı. İmkânsız kombinasyon üretilmiyor.

Ölçüm: 6 farklı hız ayarında ve 5 farklı BPM'de vuruş sapması 0.00 ms, gereken
kase hızı 890 px/sn (limit 1050).

Sınırsız modda şarkı `AudioBufferSourceNode` ile `loopStart`/`loopEnd` kullanılarak
örnek hassasiyetinde döndürülüyor. Düz `<audio loop>` kullanılmıyor çünkü MP3
encoder padding'i her turda ~50 ms boşluk bırakır ve ritim oyununda bu ölümcül.

---

## Kendi şarkını gömmek

Depodaki sürüm **müziksiz** gelir (bkz. [Müzik](#müzik)). Sınırsız moda kendi
parçanı koymak için:

```bash
node tools/embed-audio.js sarkim.mp3 --bpm 102 --bars 16
```

Şarkı base64 olarak `index.html`'in içine yazılır; harici dosya gerekmez.

**Önce şarkıyı tam bar sayısına kesmelisin**, yoksa loop her turda ritimden kayar:

```bash
# 4/4 ölçüde:  bar = 240 / BPM saniye
# 102 BPM -> bar 2.3529 sn -> 16 bar = 37.647 sn
ffmpeg -ss 0.09 -t 37.647 -i kaynak.mp3 -vn -c:a libmp3lame -b:a 128k loop.mp3
```

`-ss` değeri şarkının **ilk vuruşu** (baştaki sessizlik/anakruz). BPM'i bilmiyorsan
bir tempo analiz aracıyla ölç — 1-2 BPM hata 40 saniyede duyulur hale gelir.

Şarkı gömülü değilse sınırsız mod kodun ürettiği müzikle çalışır, oyun bozulmaz.

---

## Mobil (Android APK)

`mobile/` klasöründe Expo + WebView sarmalayıcı var. Oyunun tamamı `index.html`'de
kalır; `build:html` onu React Native'in okuyabileceği bir modüle gömer.

```bash
cd mobile
npm install
npm run build:html      # ../index.html -> assets/gameHtml.js
npm run apk             # eas build -p android --profile preview
```

Detaylar: [mobile/README.md](mobile/README.md)

Mobilde kase parmağın 86 px üstünde durur (parmak oyunu kapatmasın), dokunmatik
cihazda düşük efekt modu otomatik açılır, geri tuşu ve titreşim bağlıdır.
Hem dikey hem yatay çalışır.

---

## Sıralama tablosu (opsiyonel)

Hesap ve leaderboard için Supabase kullanılıyor — SDK yok, sadece `fetch`.

1. `supabase-setup.sql`'i Supabase SQL Editor'de çalıştır
2. Authentication → Providers → Email → **Confirm email: OFF**
3. `index.html` içinde `CONFIG.SUPABASE` alanını doldur

```js
SUPABASE: { url:'https://xxxx.supabase.co', anonKey:'eyJ...', emailDomain:'ramenrush.app' }
```

Giriş kullanıcı adı + şifre ile; e-posta arka planda `kullanici@ramenrush.app`
şeklinde üretilir, kullanıcı görmez. **Bedeli:** şifresini unutanı kurtaramazsın,
sıfırlama linki gidecek gerçek adres yok.

SQL tarafında makul-skor kısıtları, 25 saniyelik rate limit ve "sadece kendi
skorunu ekle" politikası var; update/delete politikası yok. Skor yine de
tarayıcıdan geliyor — kararlı bir hileciyi durdurmaz, kaba hileyi eler.

Boş bırakılırsa oyun tamamen offline çalışır, skorlar `localStorage`'da durur.

---

## Müzik

Depoda ses dosyası **yok**. 90 saniyelik modların müziği zaten kodun içinde
üretiliyor (telifsiz, benim). Sınırsız mod için geliştirirken kullandığım parça
üçüncü taraf bir ticari parçaydı; onu buraya koymak telifli müziği dağıtmak olurdu,
o yüzden dışarıda bırakıldı. Kendi parçanı yukarıdaki araçla gömebilirsin.

Gömülü ses olmadan sınırsız mod prosedürel müzikle sorunsuz çalışır.

---

## Teknik

Tek dosya, framework yok: HTML5 Canvas + Web Audio API + `localStorage`.

Parçacıklar ve ramenler havuzlanıyor (object pooling), arka planın statik katmanı
(dükkân, shoji pencereler, şehir silüeti) resize'da bir kez offscreen canvas'a
çiziliyor — her karede yeniden çizilmiyor. `Perf` modülü FPS 45'in altında üç
saniye kalırsa düşük efekt moduna geçer.

Dengeyle ilgili her sayı `CONFIG` içinde tek yerde: süre, canlar, puan formülü,
spawn ağırlıkları, cooldown'lar, combo kademeleri, ritim pattern'leri.

---

## Lisans

Kod MIT ([LICENSE](LICENSE)). Oyuna sonradan gömeceğin ses dosyaları bu lisansın
kapsamında değildir.
