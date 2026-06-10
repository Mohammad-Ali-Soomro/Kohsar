import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Brutalism } from '../constants/theme';
import { BalochPattern } from '../components/ui/BalochPattern';
import { KButton } from '../components/ui/KButton';
import { KCard } from '../components/ui/KCard';
import { AuthStackParamList } from '../navigation/types';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  return (
    <View style={styles.container}>
      {/* Embroidery visual header */}
      <BalochPattern height={28} style={styles.topPattern} />

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={[Typography.display, styles.title]}>KOHSAR</Text>
          <Text style={[Typography.heading1, styles.urduTitle]}>کوہسار</Text>
        </View>

        <KCard backgroundColor={Colors.white} style={styles.infoCard}>
          <View style={styles.cardContent}>
            <Text style={[Typography.heading3, styles.cardTitle]}>
              Explore Balochistan's Hidden Beauty
            </Text>
            <Text style={[Typography.body, styles.cardDescription]}>
              Discover community-sourced, untouched spots from the golden cliffs of the Makran Coast to the high mountains of Kalat.
            </Text>
          </View>
        </KCard>

        <View style={styles.buttonContainer}>
          <KButton
            label="Start Exploring"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('Auth', { isSignUpInitial: true })}
            style={styles.button}
          />
          
          <KButton
            label="Already a Member? Sign In"
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate('Auth', { isSignUpInitial: false })}
            style={styles.button}
          />
        </View>
      </View>

      <BalochPattern height={28} style={styles.bottomPattern} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  topPattern: {
    marginTop: 24,
  },
  bottomPattern: {
    marginBottom: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: Colors.terracotta,
    fontSize: 48,
    lineHeight: 54,
    textAlign: 'center',
  },
  urduTitle: {
    color: Colors.makranTeal,
    fontSize: 36,
    lineHeight: 44,
    textAlign: 'center',
    marginTop: -8,
  },
  infoCard: {
    padding: 24,
    marginBottom: 40,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardTitle: {
    color: Colors.jetBlack,
    textAlign: 'center',
    marginBottom: 12,
  },
  cardDescription: {
    color: Colors.deepClay,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
  },
});
