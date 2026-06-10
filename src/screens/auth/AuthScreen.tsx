import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KHeader } from '../../components/ui/KHeader';
import { KInput } from '../../components/ui/KInput';
import { KButton } from '../../components/ui/KButton';
import { KCard } from '../../components/ui/KCard';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../navigation/types';

type AuthScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'Auth'>;

export const AuthScreen = () => {
  const navigation = useNavigation<AuthScreenNavProp>();
  const { signInWithOtp } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);

  const validateEmail = (emailStr: string) => {
    if (!emailStr) {
      return 'Email address is required';
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(emailStr)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleSendCode = async () => {
    Keyboard.dismiss();
    setEmailError(null);

    // Validate email client-side
    const err = validateEmail(email.trim());
    if (err) {
      setEmailError(err);
      return;
    }

    setSendingCode(true);

    // Edge case: Network offline check
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setEmailError('No connection. Check your internet and try again.');
      setSendingCode(false);
      return;
    }

    try {
      const { error } = await signInWithOtp(email.trim().toLowerCase());
      
      if (error) {
        setEmailError(error.message || 'Failed to send verification code.');
      } else {
        // Navigate on success
        navigation.navigate('OTPVerify', { email: email.trim().toLowerCase() });
      }
    } catch (err: any) {
      console.error(err);
      setEmailError('An unexpected error occurred. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <KHeader title="Sign In" onBackPress={() => navigation.goBack()} />

        <View style={styles.content}>
          <KCard backgroundColor={Colors.white} style={styles.card}>
            <Text style={[Typography.heading2, styles.cardTitle]}>
              Enter Your Email
            </Text>
            <Text style={[Typography.body, styles.cardSubtitle]}>
              We will send you a 6-digit verification code to log in or register.
            </Text>

            <KInput
              label="Email Address"
              placeholder="e.g. yourname@mail.com"
              value={email}
              onChangeText={(txt) => {
                setEmail(txt);
                if (emailError) setEmailError(null);
              }}
              error={emailError || undefined}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Ionicons name="at-outline" size={20} color={Colors.jetBlack} />}
            />

            <KButton
              label="Send Code"
              variant="primary"
              size="lg"
              onPress={handleSendCode}
              loading={sendingCode}
              style={styles.submitBtn}
            />
          </KCard>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    padding: 24,
  },
  cardTitle: {
    color: Colors.jetBlack,
    marginBottom: 8,
  },
  cardSubtitle: {
    color: Colors.deepClay,
    lineHeight: 20,
    marginBottom: 24,
  },
  submitBtn: {
    marginTop: 8,
  },
});
