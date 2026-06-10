import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Pressable,
  Alert,
  BackHandler,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KHeader } from '../../components/ui/KHeader';
import { KButton } from '../../components/ui/KButton';
import { KCard } from '../../components/ui/KCard';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { AuthStackParamList } from '../../navigation/types';

type OTPVerifyRouteProp = RouteProp<AuthStackParamList, 'OTPVerify'>;
type OTPVerifyNavProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerify'>;

export const OTPVerifyScreen = () => {
  const route = useRoute<OTPVerifyRouteProp>();
  const navigation = useNavigation<OTPVerifyNavProp>();
  const { email } = route.params;

  const { verifyOtp, signInWithOtp, isLoading } = useAuthStore();
  const { showToast } = useUIStore();

  // Code state
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Resend code states
  const [cooldown, setCooldown] = useState(60);
  
  // Lockout states
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Shake animation shared value
  const shakeTranslateX = useSharedValue(0);

  // Back handler logic
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true; // Stop default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  // Cooldown timer
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Lockout timer
  useEffect(() => {
    let timer: any;
    if (lockoutTime > 0) {
      timer = setTimeout(() => setLockoutTime(lockoutTime - 1), 1000);
    } else if (lockoutTime === 0 && failedAttempts >= 3) {
      // Unlock after timer ends
      setFailedAttempts(0);
    }
    return () => clearTimeout(timer);
  }, [lockoutTime, failedAttempts]);

  const handleBackPress = () => {
    Alert.alert(
      'Go Back?',
      "You will need to request a new verification code if you leave.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const triggerShake = () => {
    shakeTranslateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const animatedShakeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeTranslateX.value }],
    };
  });

  const handleCodeChange = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const newCode = [...code];

    if (cleanText.length > 0) {
      // Take the last entered character if length > 1
      const digit = cleanText.substring(cleanText.length - 1);
      newCode[index] = digit;
      setCode(newCode);

      // Auto-advance focus
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Auto-submit on 6th digit if everything is filled
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        Keyboard.dismiss();
        handleSubmit(fullCode);
      }
    } else {
      // Empty input
      newCode[index] = '';
      setCode(newCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (code[index] === '' && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || lockoutTime > 0) return;
    
    setCode(['', '', '', '', '', '']);
    setCooldown(60);

    try {
      const { error } = await signInWithOtp(email);
      if (error) {
        showToast(error.message || 'Failed to resend code.', 'error');
      } else {
        showToast('A new 6-digit code has been sent to your email.', 'success');
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error(err);
      showToast('Error sending new code.', 'error');
    }
  };

  const handleSubmit = async (overrideCode?: string) => {
    const finalCode = overrideCode || code.join('');
    
    if (finalCode.length < 6) {
      showToast('Please enter all 6 digits.', 'warning');
      triggerShake();
      return;
    }

    if (lockoutTime > 0) {
      showToast(`Locked out. Try again in ${lockoutTime} seconds.`, 'error');
      return;
    }

    try {
      const { error } = await verifyOtp(email, finalCode);

      if (error) {
        // Handle failed attempt tracking
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setCode(['', '', '', '', '', '']);
        triggerShake();

        if (nextAttempts >= 3) {
          setLockoutTime(30);
          showToast('Invalid code. Locked out for 30 seconds.', 'error');
        } else {
          showToast(`Invalid verification code. ${3 - nextAttempts} attempts remaining.`, 'error');
          inputRefs.current[0]?.focus();
        }
      } else {
        showToast('Email verified successfully!', 'success');
        // Navigation is handled automatically at root based on user profiles updates
      }
    } catch (err: any) {
      console.error(err);
      showToast('An unexpected error occurred.', 'error');
      triggerShake();
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const isLocked = lockoutTime > 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <KHeader title="Verify Email" onBackPress={handleBackPress} />

        <View style={styles.content}>
          <KCard backgroundColor={Colors.white} style={styles.card}>
            <Text style={[Typography.heading2, styles.title]}>
              Enter Code
            </Text>
            <Text style={[Typography.body, styles.subtitle]}>
              Enter the 6-digit code sent to:{'\n'}
              <Text style={Typography.bodyMedium}>{email}</Text>
            </Text>

            {/* Inputs Grid */}
            <Animated.View style={[styles.codeRow, animatedShakeStyle]}>
              {code.map((digit, idx) => (
                <View key={idx} style={[styles.inputBox, Brutalism.border]}>
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[idx] = ref;
                    }}
                    value={digit}
                    onChangeText={(txt) => handleCodeChange(txt, idx)}
                    onKeyPress={(e) => handleKeyPress(e, idx)}
                    style={[styles.textInput, Typography.heading1]}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLocked && !isLoading}
                    autoFocus={idx === 0}
                  />
                </View>
              ))}
            </Animated.View>

            {isLocked && (
              <View style={[styles.lockoutBox, Brutalism.borderLight]}>
                <Text style={[Typography.captionBold, { color: Colors.error }]}>
                  Too many failed attempts. Locked for {formatTime(lockoutTime)}.
                </Text>
              </View>
            )}

            {/* Actions */}
            <KButton
              label="Verify"
              variant="primary"
              size="lg"
              onPress={() => handleSubmit()}
              loading={isLoading}
              disabled={isLocked}
              style={styles.submitBtn}
            />

            <View style={styles.resendContainer}>
              {cooldown > 0 ? (
                <Text style={[Typography.caption, { color: Colors.deepClay }]}>
                  Resend in {formatTime(cooldown)}
                </Text>
              ) : (
                <Pressable onPress={handleResend} disabled={isLocked || isLoading}>
                  <Text style={[Typography.captionBold, styles.resendText]}>
                    Resend Code
                  </Text>
                </Pressable>
              )}
            </View>
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
  title: {
    color: Colors.jetBlack,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.deepClay,
    lineHeight: 20,
    marginBottom: 28,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    width: '100%',
  },
  inputBox: {
    width: 42,
    height: 52,
    borderRadius: Brutalism.borderRadius,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    color: Colors.jetBlack,
  },
  lockoutBox: {
    backgroundColor: Colors.sand,
    borderColor: Colors.error,
    padding: 10,
    borderRadius: Brutalism.borderRadius,
    marginBottom: 16,
    alignItems: 'center',
  },
  submitBtn: {
    marginTop: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: Colors.terracotta,
    textDecorationLine: 'underline',
  },
});
