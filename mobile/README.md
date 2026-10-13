# Ramen Rush — Mobil (Expo + WebView)

Oyunun tamamı `index.html` içinde. Bu proje onu WebView'a sarıp APK üretir.
**Tek kaynak kuralı:** oyunu her zaman HTML'de düzenle, sonra `npm run build:html` çalıştır.

## Klasör yerleşimi

```
ramenrush/
├─ index.html              <- oyun (tek kaynak)
├─ supabase-setup.sql      <- veritabanı kurulumu
└─ mobile/                 <- bu proje
   ├─ App.js
   ├─ assets/gameHtml.js   <- otomatik üretilir, depoya girmez
   └─ tools/build-html.js
```

Oyun başka yerdeyse: `node tools/build-html.js /yol/index.html`

## Kurulum

```bash
cd mobile
npm install
npm run build:html          # HTML -> assets/gameHtml.js
```

## Telefonda test (development build)

Expo Go **kullanma** — Expo Go bu projeyi çalıştıramaz:
`react-native-webview` native bir modül, Expo Go içinde yok.

```bash
npx eas login
npx eas build:configure          # app.json'daki extra.eas.projectId'yi doldurur
npx eas build -p android --profile development
# APK'yı telefona kur, sonra:
npm start
```

Kablo ile bilgisayardan direkt derlemek istersen (Android Studio + JDK 17 gerekir):

```bash
npx expo run:android
```

## APK üretimi (dağıtılabilir)

```bash
npm run apk        # = eas build -p android --profile preview
```

Çıkan `.apk` linkini indir, telefona kur. Play Store için `production` profili
`.aab` üretir (`eas build -p android --profile production`).

## Hesap + sıralama

1. `supabase-setup.sql` dosyasını Supabase SQL Editor'de çalıştır.
2. Authentication > Providers > Email > **Confirm email: OFF**.
3. Depo kökündeki `index.html` içinde `CONFIG.SUPABASE` alanını doldur:

```js
SUPABASE: {
  url: 'https://xxxx.supabase.co',
  anonKey: 'eyJ...',
  emailDomain: 'ramenrush.app'
}
```

4. `npm run build:html` (APK'nın yeni ayarı alması için şart).

`SUPABASE.url` boş bırakılırsa oyun tamamen offline çalışır; skorlar sadece
cihazda tutulur, hesap ekranı "sunucu ayarlanmamış" der.

## Mobilde neler değişiyor

- **Yön:** app.json `orientation: "default"` — hem yatay hem dikey. Oyun `resize`
  olayında düzeni ve ölçeği yeniden hesaplıyor, ritim senkronu bozulmuyor
  (düşüş hızı ekran yüksekliğinden bağımsız olarak vuruşa göre hesaplanıyor).
- **Kase konumu:** dokunmatik cihazda kase parmağın ~86px üstünde duruyor,
  parmak kaseyi kapatmıyor. Ekranın herhangi bir yerinden sürükleyebilirsin.
- **Performans:** `Perf` modülü dokunmatik cihazda otomatik düşük FX moduna
  geçiyor (gölge/blur kapalı, DPR 1.25, particle 110, yağmur 55). FPS 45'in
  altında 3 saniye kalırsa masaüstünde de devreye girer.
  Settings > Performance mode ile AUTO / LOW FX / FULL FX arasında geçiş var.
- **Geri tuşu:** açık ekranı kapatır → oyundaysa duraklatır → menüdeyken çıkar.
- **Titreşim:** çürük noodle 90ms, rainbow 35ms, level up 25ms.
  Settings > Vibration ile kapatılır.
- **Ekran kapanması:** `expo-keep-awake` ile maç boyunca engelleniyor.

## Bilinen sınır

WebView'da ses çıkışı 100-200 ms gecikebilir. Bu ritim senkronunu **bozmaz**
(noodle konumları müzik saatinden türetiliyor, ikisi birlikte kayar), sadece
dokunma → efekt sesi tepkisi hafif geç gelir. Rahatsız ederse şarkı seçme
ekranındaki SYNC kaydırıcısı ile telafi edilebilir.
