import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { useSpotsStore } from '../stores/spotsStore';
import { Colors } from '../constants/theme';
import { KLoadingSpinner } from '../components/ui/KLoadingSpinner';

// Screens
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { AuthLandingScreen } from '../screens/auth/AuthLandingScreen';
import { AuthScreen } from '../screens/auth/AuthScreen';
import { OTPVerifyScreen } from '../screens/auth/OTPVerifyScreen';
import { UsernameSetupScreen } from '../screens/auth/UsernameSetupScreen';
import { SpotDetailsScreen } from '../screens/SpotDetailsScreen';
import { SubmitSpotScreen } from '../screens/main/SubmitSpotScreen';

// Navigators
import { MainTabs } from './MainTabs';
import { AppStackParamList, AuthStackParamList } from './types';

const OnboardingStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const SetupStack = createNativeStackNavigator();

const OnboardingNavigator = () => {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Onboarding" component={OnboardingScreen} />
    </OnboardingStack.Navigator>
  );
};

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={AuthLandingScreen} />
      <AuthStack.Screen name="Auth" component={AuthScreen} />
      <AuthStack.Screen name="OTPVerify" component={OTPVerifyScreen} />
    </AuthStack.Navigator>
  );
};

const AppStackNavigator = () => {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabs} />
      <AppStack.Screen name="SpotDetails" component={SpotDetailsScreen} />
      <AppStack.Screen name="SubmitSpot" component={SubmitSpotScreen} />
    </AppStack.Navigator>
  );
};

const SetupNavigator = () => {
  return (
    <SetupStack.Navigator screenOptions={{ headerShown: false }}>
      <SetupStack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
    </SetupStack.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, profile, isLoading, initialize, isAuthenticated, isGuest, isOnboarded } = useAuthStore();
  const { loadUserSavesAndVisits, clearUserSavesAndVisits } = useSpotsStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync user saves and visits
  useEffect(() => {
    if (user?.id) {
      loadUserSavesAndVisits(user.id);
    } else {
      clearUserSavesAndVisits();
    }
  }, [user?.id, loadUserSavesAndVisits, clearUserSavesAndVisits]);

  if (isLoading || isOnboarded === null) {
    return (
      <View style={styles.loadingContainer}>
        <KLoadingSpinner size={50} />
      </View>
    );
  }

  // Auth Routing Decisions:
  // 1. If user is NOT onboarded, route to Onboarding Stack
  // 2. If user is logged in, check if profile is complete (username is set)
  //    - If complete: Route to Main App Stack
  //    - If incomplete: Route to Username Setup Stack
  // 3. If guest mode is enabled, route to Main App Stack
  // 4. Otherwise: Route to Auth onboarding Stack

  const isProfileComplete = !!(profile?.username);

  return (
    <NavigationContainer>
      {isOnboarded === false ? (
        <OnboardingNavigator />
      ) : isAuthenticated ? (
        isProfileComplete ? (
          <AppStackNavigator />
        ) : (
          <SetupNavigator />
        )
      ) : isGuest ? (
        <AppStackNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
