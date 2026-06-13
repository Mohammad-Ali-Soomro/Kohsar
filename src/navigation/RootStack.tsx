import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';

// Screens
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { AuthLandingScreen } from '../screens/auth/AuthLandingScreen';
import { AuthScreen } from '../screens/auth/AuthScreen';
import { OTPVerifyScreen } from '../screens/auth/OTPVerifyScreen';
import { UsernameSetupScreen } from '../screens/auth/UsernameSetupScreen';
import { SpotDetailScreen } from '../screens/main/SpotDetailScreen';
import { SubmitSpotScreen } from '../screens/main/SubmitSpotScreen';
import { ProfileScreen as UserProfileScreen } from '../screens/main/ProfileScreen';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootStack = () => {
  const { isAuthenticated, isGuest, isOnboarded, profile } = useAuthStore();
  const isProfileComplete = !!(profile?.username);

  // Screen transition settings: standard iOS slide-from-right / Android fade-through
  // Modal (SpotDetail): slide from bottom

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isOnboarded === false ? (
        // 1. Onboarding flow
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            animation: 'fade',
          }}
        />
      ) : !isAuthenticated && !isGuest ? (
        // 2. Auth flow
        <>
          <Stack.Screen
            name="AuthLanding"
            component={AuthLandingScreen}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="OTPVerify"
            component={OTPVerifyScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      ) : isAuthenticated && !isProfileComplete ? (
        // 3. Username Setup flow
        <Stack.Screen
          name="UsernameSetup"
          component={UsernameSetupScreen}
          options={{
            animation: 'fade',
          }}
        />
      ) : (
        // 4. Main App flow
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="SpotDetails"
            component={SpotDetailScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="SubmitSpot"
            component={SubmitSpotScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
