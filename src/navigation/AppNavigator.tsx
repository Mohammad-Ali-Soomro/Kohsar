import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { useSpotsStore } from '../stores/spotsStore';
import { useUIStore } from '../stores/uiStore';
import { Colors } from '../constants/theme';
import { KLoadingSpinner } from '../components/ui/KLoadingSpinner';

// Screens
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { SpotDetailsScreen } from '../screens/SpotDetailsScreen';

// Navigators
import { MainTabs } from './MainTabs';
import { RootStackParamList, AuthStackParamList, AppStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Auth" component={AuthScreen} />
    </AuthStack.Navigator>
  );
};

const AppStackNavigator = () => {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabs} />
      <AppStack.Screen name="SpotDetails" component={SpotDetailsScreen} />
    </AppStack.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, isLoading, initialize, isAuthenticated } = useAuthStore();
  const { loadUserSavesAndVisits, clearUserSavesAndVisits } = useSpotsStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load user bookmarks and visits once logged in
  useEffect(() => {
    if (user?.id) {
      loadUserSavesAndVisits(user.id);
    } else {
      clearUserSavesAndVisits();
    }
  }, [user?.id, loadUserSavesAndVisits, clearUserSavesAndVisits]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <KLoadingSpinner size={50} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStackNavigator /> : <AuthNavigator />}
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
