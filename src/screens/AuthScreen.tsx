import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Brutalism } from '../constants/theme';
import { KHeader } from '../components/ui/KHeader';
import { KInput } from '../components/ui/KInput';
import { KButton } from '../components/ui/KButton';
import { KCard } from '../components/ui/KCard';
import { useAuthStore } from '../stores/authStore';
import { AuthStackParamList } from '../navigation/types';

type AuthScreenRouteProp = RouteProp<AuthStackParamList, 'Auth'>;
type AuthScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Auth'>;

export const AuthScreen = () => {
  const route = useRoute<AuthScreenRouteProp>();
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const isSignUpInitial = route.params?.isSignUpInitial ?? false;

  const { signIn, signUp, isLoading } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(isSignUpInitial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = () => {
    const errors: Record<string, string> = {};
    
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp) {
      if (!username) {
        errors.username = 'Username is required';
      } else if (username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.username = 'Username can only contain letters, numbers and underscores';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setApiError(null);
    if (!validate()) return;

    if (isSignUp) {
      const { error } = await signUp(email, password, username, fullName, city);
      if (error) {
        setApiError(error.message || 'Failed to sign up');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setApiError(error.message || 'Invalid email or password');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <KHeader
        title={isSignUp ? 'Join Kohsar' : 'Sign In'}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <KCard backgroundColor={Colors.white} style={styles.card}>
          <View style={styles.form}>
            {apiError && (
              <View style={[styles.errorBox, Brutalism.borderLight]}>
                <Ionicons name="alert-circle" size={20} color={Colors.error} style={styles.errorIcon} />
                <Text style={[Typography.captionBold, { color: Colors.error, flex: 1 }]}>
                  {apiError}
                </Text>
              </View>
            )}

            <KInput
              label="Email Address"
              placeholder="e.g. explorer@kohsar.pk"
              value={email}
              onChangeText={setEmail}
              error={validationErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Ionicons name="mail-outline" size={20} color={Colors.jetBlack} />}
            />

            <KInput
              label="Password"
              placeholder="Min 6 characters"
              value={password}
              onChangeText={setPassword}
              error={validationErrors.password}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Ionicons name="lock-closed-outline" size={20} color={Colors.jetBlack} />}
            />

            {isSignUp && (
              <>
                <KInput
                  label="Username"
                  placeholder="e.g. baloch_explorer"
                  value={username}
                  onChangeText={setUsername}
                  error={validationErrors.username}
                  autoCapitalize="none"
                  autoCorrect={false}
                  icon={<Ionicons name="at-outline" size={20} color={Colors.jetBlack} />}
                />

                <KInput
                  label="Full Name"
                  placeholder="e.g. Zarrar Baloch"
                  value={fullName}
                  onChangeText={setFullName}
                  icon={<Ionicons name="person-outline" size={20} color={Colors.jetBlack} />}
                />

                <KInput
                  label="Your City in Balochistan"
                  placeholder="e.g. Quetta, Gwadar, Khuzdar"
                  value={city}
                  onChangeText={setCity}
                  icon={<Ionicons name="business-outline" size={20} color={Colors.jetBlack} />}
                />
              </>
            )}

            <KButton
              label={isSignUp ? 'Create Account' : 'Sign In'}
              onPress={handleSubmit}
              loading={isLoading}
              style={styles.submitBtn}
            />

            <View style={styles.switchContainer}>
              <Text style={[Typography.body, { color: Colors.deepClay }]}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <Pressable onPress={() => {
                setIsSignUp(!isSignUp);
                setValidationErrors({});
                setApiError(null);
              }}>
                <Text style={[Typography.bodyMedium, styles.switchText]}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
  },
  form: {
    width: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sand,
    borderColor: Colors.error,
    padding: 12,
    borderRadius: Brutalism.borderRadius,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  submitBtn: {
    marginTop: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: Colors.terracotta,
    textDecorationLine: 'underline',
  },
});
