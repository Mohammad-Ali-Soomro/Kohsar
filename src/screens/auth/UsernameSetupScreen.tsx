import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KHeader } from '../../components/ui/KHeader';
import { KInput } from '../../components/ui/KInput';
import { KButton } from '../../components/ui/KButton';
import { KCard } from '../../components/ui/KCard';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

const BALOCHISTAN_CITIES = [
  'Quetta',
  'Turbat',
  'Gwadar',
  'Khuzdar',
  'Hub',
  'Kalat',
  'Chaman',
  'Loralai',
  'Ziarat',
  'Ormara',
  'Panjgur',
  'Nushki',
  'Dalbandin',
] as const;

export const UsernameSetupScreen = () => {
  const { updateProfile, checkUsernameAvailable, profile, isLoading } = useAuthStore();
  const { showToast } = useUIStore();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  
  // Realtime checks
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // City Picker Modal
  const [cityModalVisible, setCityModalVisible] = useState(false);

  // Debouncing timeout reference
  const checkTimeoutRef = useRef<any>(null);

  // Handle debounce username check
  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    setUsernameAvailable(null);
    setUsernameError(null);

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setCheckingUsername(false);
      return;
    }

    // Client-side validation: alphanumeric & underscores
    if (cleanUsername.length < 3) {
      setUsernameError('Must be at least 3 characters');
      setCheckingUsername(false);
      return;
    }
    
    if (cleanUsername.length > 20) {
      setUsernameError('Cannot exceed 20 characters');
      setCheckingUsername(false);
      return;
    }

    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(cleanUsername)) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      setCheckingUsername(false);
      return;
    }

    // Set checking state and start debounce timer (500ms)
    setCheckingUsername(true);
    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(cleanUsername);
        setUsernameAvailable(available);
        if (!available) {
          setUsernameError('Username is already taken');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [username, checkUsernameAvailable]);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || usernameError || usernameAvailable === false) {
      showToast('Please select a valid, unique username.', 'warning');
      return;
    }

    // Submit-time safety double check (race condition check)
    setCheckingUsername(true);
    try {
      const isStillAvailable = await checkUsernameAvailable(cleanUsername);
      if (!isStillAvailable) {
        setUsernameAvailable(false);
        setUsernameError('Username was just taken. Choose another!');
        setCheckingUsername(false);
        showToast('Username was just taken. Choose another!', 'error');
        return;
      }

      // Update profile in database
      const { error } = await updateProfile({
        username: cleanUsername,
        full_name: fullName.trim() || null,
        city: city || null,
      });

      if (error) {
        showToast(error.message || 'Failed to update profile.', 'error');
      } else {
        showToast('Welcome to Kohsar!', 'success');
        // Navigation is handled automatically at root based on user profiles updates
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred during setup.', 'error');
    } finally {
      setCheckingUsername(false);
    }
  };

  const renderCityItem = ({ item }: { item: string }) => (
    <Pressable
      onPress={() => {
        setCity(item);
        setCityModalVisible(false);
      }}
      style={[
        styles.modalItem,
        city === item && { backgroundColor: Colors.limestone },
      ]}
    >
      <Text style={[Typography.bodyMedium, { color: Colors.jetBlack }]}>
        {item}
      </Text>
      {city === item && (
        <Ionicons name="checkmark" size={18} color={Colors.terracotta} />
      )}
    </Pressable>
  );

  const isValid = username.length >= 3 && !usernameError && usernameAvailable === true;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <KHeader title="Choose a Username" />

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <KCard backgroundColor={Colors.white} style={styles.card}>
            <Text style={[Typography.heading3, styles.cardTitle]}>
              Setup Explorer Profile
            </Text>
            <Text style={[Typography.body, styles.cardSubtitle]}>
              This is how other explorers will know you when you share spots or check in.
            </Text>

            {/* Username input */}
            <View style={styles.inputContainer}>
              <KInput
                label="Username (Required)"
                placeholder="username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                icon={<Text style={[Typography.heading3, styles.atPrefix]}>@</Text>}
                containerStyle={styles.usernameInput}
              />
              
              {/* Availability indicators */}
              <View style={styles.feedbackRow}>
                {checkingUsername && (
                  <Text style={[Typography.caption, { color: Colors.deepClay }]}>
                    Checking availability...
                  </Text>
                )}
                {usernameError && (
                  <Text style={[Typography.captionBold, { color: Colors.error }]}>
                    {usernameError}
                  </Text>
                )}
                {usernameAvailable && (
                  <Text style={[Typography.captionBold, { color: Colors.success }]}>
                    <Ionicons name="checkmark-circle" size={12} color={Colors.success} /> Username available!
                  </Text>
                )}
              </View>
            </View>

            {/* Full Name input */}
            <KInput
              label="Full Name (Optional)"
              placeholder="e.g. Zarrar Baloch"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              icon={<Ionicons name="person-outline" size={20} color={Colors.jetBlack} />}
            />

            {/* Custom Modal City Picker */}
            <View style={styles.cityPickerSection}>
              <Text style={[Typography.bodyMedium, styles.cityPickerLabel]}>
                City in Balochistan (Optional)
              </Text>
              
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setCityModalVisible(true);
                }}
                style={[
                  styles.cityPickerButton,
                  Brutalism.border,
                  { backgroundColor: Colors.white },
                ]}
              >
                <View style={styles.cityPickerContent}>
                  <Ionicons name="business-outline" size={20} color={Colors.jetBlack} />
                  <Text
                    style={[
                      Typography.body,
                      { color: city ? Colors.jetBlack : Colors.deepClay, marginLeft: 8, flex: 1 },
                    ]}
                  >
                    {city || 'Select your city...'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={Colors.jetBlack} />
              </Pressable>
            </View>

            <KButton
              label="Let's Go"
              variant="primary"
              size="lg"
              onPress={handleSubmit}
              loading={isLoading || checkingUsername}
              disabled={!isValid || checkingUsername}
              style={styles.submitBtn}
            />
          </KCard>
        </ScrollView>

        {/* City Selection Modal */}
        <Modal
          visible={cityModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCityModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KCard backgroundColor={Colors.white} style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={Typography.heading2}>Select City</Text>
                <Pressable onPress={() => setCityModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={Colors.jetBlack} />
                </Pressable>
              </View>

              <FlatList
                data={BALOCHISTAN_CITIES as any}
                renderItem={renderCityItem}
                keyExtractor={(item) => item}
                ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
                style={styles.modalList}
              />
            </KCard>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  scrollContent: {
    flexGrow: 1,
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
  inputContainer: {
    marginBottom: 16,
  },
  usernameInput: {
    marginBottom: 4,
  },
  atPrefix: {
    color: Colors.deepClay,
    marginRight: -4,
  },
  feedbackRow: {
    minHeight: 18,
    paddingLeft: 4,
  },
  cityPickerSection: {
    marginBottom: 24,
  },
  cityPickerLabel: {
    color: Colors.jetBlack,
    marginBottom: 6,
  },
  cityPickerButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  cityPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  submitBtn: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalList: {
    width: '100%',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: Brutalism.borderRadius,
  },
  modalSeparator: {
    height: 1.5,
    backgroundColor: Colors.limestone,
  },
});
