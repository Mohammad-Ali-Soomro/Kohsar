import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { ErrorBoundary } from '../components/ErrorBoundary';

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

// Higher-order component to wrap screens in ErrorBoundary defensively
const withErrorBoundary = (Component: React.ComponentType<any>) => {
  return (props: any) => (
    <ErrorBoundary>
      <Component {...props} />
    </ErrorBoundary>
  );
};

const OnboardingWithBoundary = withErrorBoundary(OnboardingScreen);
const AuthLandingWithBoundary = withErrorBoundary(AuthLandingScreen);
const AuthWithBoundary = withErrorBoundary(AuthScreen);
const OTPVerifyWithBoundary = withErrorBoundary(OTPVerifyScreen);
const UsernameSetupWithBoundary = withErrorBoundary(UsernameSetupScreen);
const MainTabsWithBoundary = withErrorBoundary(MainTabs);
const SpotDetailsWithBoundary = withErrorBoundary(SpotDetailScreen);
const SubmitSpotWithBoundary = withErrorBoundary(SubmitSpotScreen);
const UserProfileWithBoundary = withErrorBoundary(UserProfileScreen);

export const RootStack = () => {
  const { isAuthenticated, isGuest, isOnboarded, profile } = useAuthStore();
  const isProfileComplete = !!(profile?.username);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isOnboarded === false ? (
        // 1. Onboarding flow
        <Stack.Screen
          name="Onboarding"
          component={OnboardingWithBoundary}
          options={{
            animation: 'fade',
          }}
        />
      ) : !isAuthenticated && !isGuest ? (
        // 2. Auth flow
        <>
          <Stack.Screen
            name="AuthLanding"
            component={AuthLandingWithBoundary}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="Auth"
            component={AuthWithBoundary}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="OTPVerify"
            component={OTPVerifyWithBoundary}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      ) : isAuthenticated && !isProfileComplete ? (
        // 3. Username Setup flow
        <Stack.Screen
          name="UsernameSetup"
          component={UsernameSetupWithBoundary}
          options={{
            animation: 'fade',
          }}
        />
      ) : (
        // 4. Main App flow
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabsWithBoundary}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="SpotDetails"
            component={SpotDetailsWithBoundary}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="SubmitSpot"
            component={SubmitSpotWithBoundary}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileWithBoundary}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
