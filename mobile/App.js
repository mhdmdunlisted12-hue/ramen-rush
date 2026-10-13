import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, BackHandler, AppState, Platform, StatusBar as RNStatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import * as NavigationBar from 'expo-navigation-bar';
import GAME_HTML from './assets/gameHtml';

// baseUrl şart: WebView'a origin verir, oyunun localStorage'ı (skor, coin, skin, ayarlar) böylece kalıcı olur
const BASE_URL = 'https://ramenrush.local/';

export default function App() {
  const webRef = useRef(null);
  useKeepAwake();                                  // 90 sn boyunca ekran kapanmasın

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    }
  }, []);

  // Uygulama arka plana alınınca oyunu duraklat
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active' && webRef.current) {
        webRef.current.injectJavaScript('window.RamenRush && window.RamenRush.pause(); true;');
      }
    });
    return () => sub.remove();
  }, []);

  // Donanım geri tuşu -> oyunun kendi geri mantığı
  useEffect(() => {
    const onBack = () => {
      if (webRef.current) {
        webRef.current.injectJavaScript('window.RamenRush && window.RamenRush.back(); true;');
      }
      return true;                                  // çıkışı oyun karar verir (postMessage: 'exit')
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  const onMessage = useCallback(e => {
    if (e.nativeEvent.data === 'exit') BackHandler.exitApp();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <WebView
        ref={webRef}
        source={{ html: GAME_HTML, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        style={styles.web}
        containerStyle={styles.web}
        // --- oyun için kritik ayarlar ---
        javaScriptEnabled
        domStorageEnabled                            // localStorage
        mediaPlaybackRequiresUserAction={false}      // Web Audio / müzik
        allowsInlineMediaPlayback
        allowFileAccess
        cacheEnabled
        // --- kaydırma/zoom davranışını kapat ---
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        textZoom={100}
        androidLayerType="hardware"
        onMessage={onMessage}
        onShouldStartLoadWithRequest={() => true}
        renderLoading={() => <View style={styles.root} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05030c', paddingTop: Platform.OS === 'android' ? 0 : 0 },
  web: { flex: 1, backgroundColor: '#05030c' }
});
