import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, LogBox } from 'react-native';

// Suppress transient promise rejections (e.g. cancelled/aborted fetches) from displaying as redboxes
LogBox.ignoreLogs([
  'Unhandled Promise Rejection',
  'DOMException',
  'Aborted',
  'Search query failed',
]);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

import { useAuthStore } from './src/stores/authStore';
import { useSpotsStore } from './src/stores/spotsStore';
import { RootStack } from './src/navigation/RootStack';
import { KToast } from './src/components/ui/KToast';
import { OfflineBanner } from './src/components/ui/OfflineBanner';
import { BalochPattern } from './src/components/ui/BalochPattern';
import { Colors } from './src/constants/theme';

// Keep the native splash screen visible while we resolve initial assets and auth
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading app in dev mode might cause this to throw, ignore */
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  const { user, isLoading: authLoading, initialize, isOnboarded } = useAuthStore();
  const { loadUserSavesAndVisits, clearUserSavesAndVisits } = useSpotsStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync user saves and visits from AsyncStorage
  useEffect(() => {
    if (user?.id) {
      loadUserSavesAndVisits(user.id);
    } else {
      clearUserSavesAndVisits();
    }
  }, [user?.id, loadUserSavesAndVisits, clearUserSavesAndVisits]);

  const isReady = (fontsLoaded || fontError) && !authLoading && isOnboarded !== null;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  if (!isReady) {
    // Mimic the Splash Screen design as a React Native fallback component
    const hasSpaceGrotesk = fontsLoaded || fontError;
    return (
      <View style={styles.splashContainer}>
        <Text
          style={[
            styles.splashText,
            hasSpaceGrotesk ? { fontFamily: 'SpaceGrotesk-Bold' } : { fontWeight: 'bold' },
          ]}
        >
          KOHSAR
        </Text>
        <BalochPattern
          height={15}
          width={120}
          patternColor={Colors.terracotta}
          backgroundColor={Colors.sand}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
        <KToast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  splashText: {
    fontSize: 42,
    color: Colors.jetBlack,
    letterSpacing: 2,
  },
});
