import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Brutalism } from '../constants/theme';
import { KHeader } from '../components/ui/KHeader';
import { KCard } from '../components/ui/KCard';
import { KButton } from '../components/ui/KButton';
import { useAuthStore } from '../stores/authStore';
import { useSpotsStore } from '../stores/spotsStore';
import { Image } from 'expo-image';

export const ProfileScreen = () => {
  const { profile, signOut } = useAuthStore();
  const { clearUserSavesAndVisits } = useSpotsStore();

  const handleSignOut = async () => {
    await signOut();
    clearUserSavesAndVisits();
  };

  const getJoinedYear = () => {
    if (!profile?.created_at) return '2026';
    const date = new Date(profile.created_at);
    return date.getFullYear().toString();
  };

  return (
    <View style={styles.container}>
      <KHeader title="My Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <KCard backgroundColor={Colors.white} style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={[styles.avatar, Brutalism.border]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, Brutalism.border, { backgroundColor: Colors.saffron }]}>
                <Text style={styles.avatarLetter}>
                  {(profile?.username || 'E').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.profileText}>
              <Text style={[Typography.heading2, { color: Colors.jetBlack }]}>
                {profile?.full_name || 'Kohsar Explorer'}
              </Text>
              <Text style={[Typography.caption, { color: Colors.deepClay }]}>
                @{profile?.username || 'username'}
              </Text>
              {profile?.city && (
                <View style={styles.cityRow}>
                  <Ionicons name="business" size={14} color={Colors.terracotta} />
                  <Text style={[Typography.captionBold, { color: Colors.terracotta }]}>
                    {profile.city}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {profile?.bio && (
            <Text style={[Typography.body, styles.bio, { color: Colors.jetBlack }]}>
              {profile.bio}
            </Text>
          )}

          <Text style={[Typography.label, { color: Colors.deepClay, marginTop: 12 }]}>
            Member Since {getJoinedYear()}
          </Text>
        </KCard>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          {/* Submissions */}
          <KCard backgroundColor={Colors.white} style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.iconBox, { backgroundColor: Colors.categories.viewpoint }]}>
                <Ionicons name="cloud-upload" size={24} color={Colors.sand} />
              </View>
              <Text style={[Typography.display, styles.statValue, { color: Colors.jetBlack }]}>
                {profile?.spots_submitted || 0}
              </Text>
              <Text style={[Typography.captionBold, { color: Colors.deepClay }]}>
                Spots Shared
              </Text>
            </View>
          </KCard>

          {/* Visits */}
          <KCard backgroundColor={Colors.white} style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.iconBox, { backgroundColor: Colors.categories.beach }]}>
                <Ionicons name="checkmark-done" size={24} color={Colors.sand} />
              </View>
              <Text style={[Typography.display, styles.statValue, { color: Colors.jetBlack }]}>
                {profile?.spots_visited || 0}
              </Text>
              <Text style={[Typography.captionBold, { color: Colors.deepClay }]}>
                Spots Visited
              </Text>
            </View>
          </KCard>
        </View>

        {/* Explorer Badge Highlight */}
        <KCard backgroundColor={Colors.sand} style={styles.badgeCard}>
          <View style={styles.badgeContent}>
            <View style={[styles.badgeIconBox, Brutalism.border, { backgroundColor: Colors.saffron }]}>
              <Ionicons name="trophy" size={32} color={Colors.jetBlack} />
            </View>
            <View style={styles.badgeText}>
              <Text style={[Typography.heading3, { color: Colors.jetBlack }]}>
                First Explorer Badges: {profile?.explorer_count || 0}
              </Text>
              <Text style={[Typography.caption, { color: Colors.deepClay, marginTop: 2 }]}>
                Earned by being the first person to log and visit a hidden spot in Balochistan.
              </Text>
            </View>
          </View>
        </KCard>

        {/* Sign Out Button */}
        <KButton
          label="Sign Out"
          variant="primary"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...Typography.display,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.jetBlack,
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bio: {
    lineHeight: 20,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 36,
    lineHeight: 42,
    marginVertical: 4,
  },
  badgeCard: {
    padding: 16,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  badgeIconBox: {
    width: 56,
    height: 56,
    borderRadius: Brutalism.borderRadiusLarge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    flex: 1,
  },
  signOutBtn: {
    marginTop: 12,
  },
});
