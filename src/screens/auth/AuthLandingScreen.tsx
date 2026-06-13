import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { BalochPattern } from '../../components/ui/BalochPattern';
import { KButton } from '../../components/ui/KButton';
import { KCard } from '../../components/ui/KCard';
import { useAuthStore } from '../../stores/authStore';
import { AuthStackParamList } from '../../navigation/types';

type AuthLandingNavProp = NativeStackNavigationProp<AuthStackParamList, 'AuthLanding'>;

export const AuthLandingScreen = () => {
  const navigation = useNavigation<AuthLandingNavProp>();
  const { setGuestMode } = useAuthStore();

  const handleGuestMode = () => {
    setGuestMode(true);
  };

  return (
    <View style={styles.container}>
      {/* Embroidery visual header */}
      <BalochPattern height={44} style={styles.topPattern} />

      <View style={styles.content}>
        {/* Brand Logo / Header */}
        <View style={styles.logoContainer}>
          <Text style={[Typography.display, styles.title]}>KOHSAR</Text>
          <View style={styles.underline} />
          
          <Text style={[Typography.bodyMedium, styles.urduTitle]}>
            بلوچستان کی چھپی جنت
          </Text>
        </View>

        {/* English Tagline */}
        <KCard backgroundColor={Colors.white} style={styles.taglineCard}>
          <Text style={[Typography.bodyMedium, styles.taglineText]}>
            Discover Balochistan's hidden wonders, added by locals like you.
          </Text>
        </KCard>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <KButton
            label="Sign In / Register"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('Auth')}
            style={styles.button}
          />
          
          <KButton
            label="Explore as Guest"
            variant="ghost"
            size="md"
            onPress={handleGuestMode}
            style={styles.guestButton}
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[Typography.captionBold, { color: Colors.deepClay }]}>
          Made with ❤️ for Balochistan
        </Text>
        <BalochPattern height={20} style={styles.bottomPattern} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
    justifyContent: 'space-between',
  },
  topPattern: {
    marginTop: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
    position: 'relative',
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 48,
    lineHeight: 54,
    color: Colors.jetBlack,
    textAlign: 'center',
    letterSpacing: -1,
  },
  underline: {
    height: 6,
    width: 140,
    backgroundColor: Colors.terracotta,
    marginTop: 4,
    borderRadius: 2,
  },
  urduTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    color: Colors.deepClay,
    textAlign: 'center',
    marginTop: 12,
  },
  taglineCard: {
    padding: 20,
    marginBottom: 44,
  },
  taglineText: {
    color: Colors.jetBlack,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  button: {
    width: '100%',
  },
  guestButton: {
    width: '100%',
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  bottomPattern: {
    marginBottom: 20,
  },
});
