import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  FlatList,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KCard } from '../../components/ui/KCard';
import { KBadge } from '../../components/ui/KBadge';
import { KButton } from '../../components/ui/KButton';
import { KInput } from '../../components/ui/KInput';
import { KSeparator } from '../../components/ui/KSeparator';
import { KLoadingSpinner } from '../../components/ui/KLoadingSpinner';
import { KEmptyState } from '../../components/ui/KEmptyState';
import { BalochPattern } from '../../components/ui/BalochPattern';
import { useAuthStore } from '../../stores/authStore';
import { useSpotsStore } from '../../stores/spotsStore';
import { useUIStore } from '../../stores/uiStore';
import { supabase } from '../../lib/supabase';
import { AppStackParamList } from '../../navigation/types';

type ProfileScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 48 - 10) / 2; // 16px padding each side + 10px gap

const BALOCHISTAN_CITIES = [
  'Quetta', 'Turbat', 'Gwadar', 'Khuzdar', 'Hub', 'Kalat',
  'Chaman', 'Loralai', 'Ziarat', 'Ormara', 'Panjgur', 'Nushki', 'Dalbandin',
] as const;

// Types
interface ProfileData {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  explorer_count: number;
  spots_submitted: number;
  spots_visited: number;
  created_at: string;
}

interface ExplorerBadgeItem {
  id: string;
  spot_id: string;
  spots: {
    name: string;
    cover_photo_url: string | null;
  } | null;
}

interface SpotGridItem {
  id: string;
  name: string;
  category: string;
  cover_photo_url: string | null;
  city: string;
}

export const ProfileScreen = ({ userId: propUserId }: { userId?: string } = {}) => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const route = useRoute<any>();

  // Determine if viewing own profile or another user's
  const routeUserId = route.params?.userId || propUserId;

  const { user, profile: ownProfile, isGuest, setGuestMode, signOut, updateProfile } = useAuthStore();
  const { clearUserSavesAndVisits, savedSpotIds } = useSpotsStore();
  const { showToast } = useUIStore();

  const isOwnProfile = !routeUserId || (user?.id && routeUserId === user.id);

  // Profile data
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Explorer Badges
  const [explorerBadges, setExplorerBadges] = useState<ExplorerBadgeItem[]>([]);

  // Tabs
  const [activeTab, setActiveTab] = useState<'submitted' | 'visited' | 'saved'>('submitted');
  const tabIndicatorX = useSharedValue(0);

  // Spot grids data
  const [submittedSpots, setSubmittedSpots] = useState<SpotGridItem[]>([]);
  const [visitedSpots, setVisitedSpots] = useState<SpotGridItem[]>([]);
  const [savedSpots, setSavedSpots] = useState<SpotGridItem[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(false);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Skeleton loading state
  const shimmerOpacity = useSharedValue(0.3);

  useEffect(() => {
    shimmerOpacity.value = withTiming(1, { duration: 800 }, () => {
      shimmerOpacity.value = withTiming(0.3, { duration: 800 });
    });
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  // Fetch profile data
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);

    try {
      if (isOwnProfile) {
        // Use local auth store profile
        if (ownProfile) {
          setProfileData(ownProfile as ProfileData);
        } else if (user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error || !data) {
            setNotFound(true);
          } else {
            setProfileData(data as ProfileData);
          }
        }
      } else {
        // Fetch other user's profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', routeUserId!)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setProfileData(data as ProfileData);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, ownProfile, user?.id, routeUserId]);

  // Fetch explorer badges
  const fetchExplorerBadges = useCallback(async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('explorer_badges')
        .select('id, spot_id, spots:spot_id (name, cover_photo_url)')
        .eq('user_id', targetUserId)
        .order('awarded_at', { ascending: false });

      if (!error && data) {
        setExplorerBadges(data as any[]);
      }
    } catch (err) {
      console.error('Error fetching explorer badges:', err);
    }
  }, []);

  // Fetch spots for tabs
  const fetchTabSpots = useCallback(async (tab: 'submitted' | 'visited' | 'saved', targetUserId: string) => {
    setLoadingSpots(true);
    try {
      if (tab === 'submitted') {
        const { data, error } = await supabase
          .from('spots')
          .select('id, name, category, cover_photo_url, city')
          .eq('submitted_by', targetUserId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });

        if (!error) setSubmittedSpots((data || []) as SpotGridItem[]);
      } else if (tab === 'visited') {
        const { data, error } = await supabase
          .from('visits')
          .select('spot_id, spots:spot_id (id, name, category, cover_photo_url, city)')
          .eq('user_id', targetUserId)
          .order('visited_at', { ascending: false });

        if (!error && data) {
          const spots = data
            .map((v: any) => v.spots)
            .filter((s: any) => s !== null) as SpotGridItem[];
          setVisitedSpots(spots);
        }
      } else if (tab === 'saved' && isOwnProfile) {
        const { data, error } = await supabase
          .from('saves')
          .select('spot_id, spots:spot_id (id, name, category, cover_photo_url, city)')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const spots = data
            .map((v: any) => v.spots)
            .filter((s: any) => s !== null) as SpotGridItem[];
          setSavedSpots(spots);
        }
      }
    } catch (err) {
      console.error('Error fetching tab spots:', err);
    } finally {
      setLoadingSpots(false);
    }
  }, [isOwnProfile]);

  // Initial data load
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Load explorer badges and initial tab when profile data arrives
  useEffect(() => {
    if (profileData?.id) {
      fetchExplorerBadges(profileData.id);
      fetchTabSpots('submitted', profileData.id);
    }
  }, [profileData?.id, fetchExplorerBadges, fetchTabSpots]);

  // Refresh own profile from auth store when it changes
  useEffect(() => {
    if (isOwnProfile && ownProfile) {
      setProfileData(ownProfile as ProfileData);
    }
  }, [isOwnProfile, ownProfile]);

  // Handle tab change
  const handleTabChange = (tab: 'submitted' | 'visited' | 'saved') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);

    const tabIndex = tab === 'submitted' ? 0 : tab === 'visited' ? 1 : 2;
    const tabWidth = isOwnProfile ? (SCREEN_WIDTH - 32) / 3 : (SCREEN_WIDTH - 32) / 2;
    tabIndicatorX.value = withSpring(tabIndex * tabWidth, { damping: 15 });

    if (profileData?.id) {
      fetchTabSpots(tab, profileData.id);
    }
  };

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  // Sign out handler
  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      "You'll need to sign back in to submit or save spots.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            clearUserSavesAndVisits();
          },
        },
      ]
    );
  };

  // Edit Profile Modal Handlers
  const openEditModal = () => {
    setEditFullName(profileData?.full_name || '');
    setEditBio(profileData?.bio || '');
    setEditCity(profileData?.city || '');
    setEditAvatarUri(null);
    setEditModalVisible(true);
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setEditAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    setUploadingAvatar(true);
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user!.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Read the file as a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl.publicUrl;
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      showToast('Failed to upload avatar. Keeping previous.', 'error');
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    Keyboard.dismiss();

    try {
      let avatarUrl = profileData?.avatar_url || null;

      // Upload new avatar if changed
      if (editAvatarUri) {
        const uploaded = await uploadAvatar(editAvatarUri);
        if (uploaded) {
          avatarUrl = uploaded;
        }
      }

      const { error } = await updateProfile({
        full_name: editFullName.trim() || null,
        bio: editBio.trim() || null,
        city: editCity || null,
        avatar_url: avatarUrl,
      });

      if (error) {
        showToast(error.message || 'Failed to update profile.', 'error');
      } else {
        showToast('Profile updated!', 'success');
        setEditModalVisible(false);
        // Refresh profile data
        fetchProfileData();
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // City picker for Edit Profile
  const renderCityItem = ({ item }: { item: string }) => (
    <Pressable
      onPress={() => {
        setEditCity(item);
        setCityModalVisible(false);
      }}
      style={[
        styles.modalItem,
        editCity === item && { backgroundColor: Colors.limestone },
      ]}
    >
      <Text style={[Typography.bodyMedium, { color: Colors.jetBlack }]}>{item}</Text>
      {editCity === item && (
        <Ionicons name="checkmark" size={18} color={Colors.terracotta} />
      )}
    </Pressable>
  );

  // Get current tab data
  const getCurrentTabSpots = () => {
    switch (activeTab) {
      case 'submitted': return submittedSpots;
      case 'visited': return visitedSpots;
      case 'saved': return savedSpots;
    }
  };

  // Get current tab empty message
  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'submitted':
        return {
          title: 'No spots submitted yet',
          subtitle: isOwnProfile ? 'Add your first spot!' : 'This explorer hasn\'t shared any spots yet.',
          icon: 'map-marker-plus-outline' as const,
        };
      case 'visited':
        return {
          title: 'No spots visited yet',
          subtitle: isOwnProfile ? 'Start exploring Balochistan!' : 'This explorer hasn\'t visited any spots yet.',
          icon: 'foot-print' as const,
        };
      case 'saved':
        return {
          title: 'No spots saved yet',
          subtitle: 'Save spots to find them later.',
          icon: 'heart-outline' as const,
        };
    }
  };

  // Guest state
  if (isOwnProfile && isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.guestContainer}>
          <BalochPattern height={15} />
          <View style={styles.guestContent}>
            <View style={[styles.guestIconCircle, Brutalism.border]}>
              <Ionicons name="person-outline" size={48} color={Colors.terracotta} />
            </View>
            <Text style={[Typography.heading1, styles.guestTitle]}>Explorer Profile</Text>
            <Text style={[Typography.body, styles.guestSubtitle]}>
              Create an account to track your spots and badges
            </Text>
            <KButton
              label="Sign In / Register"
              variant="primary"
              onPress={() => setGuestMode(false)}
              style={styles.guestButton}
            />
          </View>
        </View>
      </View>
    );
  }

  // Loading state with skeleton
  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Skeleton Header */}
          <KCard style={styles.profileHeaderCard}>
            <BalochPattern height={15} />
            <View style={styles.skeletonProfileHeader}>
              <Animated.View style={[styles.skeletonAvatar, shimmerStyle]} />
              <View style={styles.skeletonTextBlock}>
                <Animated.View style={[styles.skeletonLine, { width: 120 }, shimmerStyle]} />
                <Animated.View style={[styles.skeletonLine, { width: 80 }, shimmerStyle]} />
              </View>
            </View>
          </KCard>
          {/* Skeleton Stats */}
          <Animated.View style={[styles.skeletonStatsRow, shimmerStyle]} />
          {/* Skeleton Grid */}
          <View style={styles.skeletonGrid}>
            <Animated.View style={[styles.skeletonGridItem, shimmerStyle]} />
            <Animated.View style={[styles.skeletonGridItem, shimmerStyle]} />
            <Animated.View style={[styles.skeletonGridItem, shimmerStyle]} />
            <Animated.View style={[styles.skeletonGridItem, shimmerStyle]} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // Not found state
  if (notFound || !profileData) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.terracotta} />
          <Text style={[Typography.heading2, styles.errorTitle]}>Explorer not found</Text>
          <Text style={[Typography.body, styles.errorSubtitle]}>
            This profile doesn't exist or has been removed.
          </Text>
          <KButton
            label="Go Back"
            onPress={() => navigation.goBack()}
            variant="primary"
            style={{ width: 160 }}
          />
        </View>
      </View>
    );
  }

  const currentTabSpots = getCurrentTabSpots();
  const emptyMessage = getEmptyMessage();
  const tabWidth = isOwnProfile ? (SCREEN_WIDTH - 32) / 3 : (SCREEN_WIDTH - 32) / 2;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Profile Header Card */}
        <KCard style={styles.profileHeaderCard}>
          <BalochPattern height={15} />
          <View style={styles.headerContent}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              {profileData.avatar_url ? (
                <Image
                  source={{ uri: profileData.avatar_url }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>
                    {(profileData.username || 'E').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Username */}
            <Text style={styles.usernameText}>@{profileData.username}</Text>

            {/* Full name */}
            {profileData.full_name && (
              <Text style={styles.fullNameText}>{profileData.full_name}</Text>
            )}

            {/* City chip */}
            {profileData.city && (
              <View style={[styles.cityChip, Brutalism.borderLight]}>
                <Text style={styles.cityChipText}>📍 {profileData.city}, Balochistan</Text>
              </View>
            )}

            {/* Bio */}
            {profileData.bio && (
              <Text style={styles.bioText}>{profileData.bio}</Text>
            )}

            {/* Edit Profile button (own profile only) */}
            {isOwnProfile && (
              <KButton
                label="Edit Profile"
                variant="ghost"
                size="sm"
                onPress={openEditModal}
                icon={<Ionicons name="pencil-outline" size={14} color={Colors.jetBlack} />}
                style={styles.editBtn}
              />
            )}
          </View>
        </KCard>

        {/* 2. Stats Row */}
        <View style={[styles.statsRow, Brutalism.border]}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileData.spots_submitted}</Text>
            <Text style={styles.statLabel}>Submitted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileData.spots_visited}</Text>
            <Text style={styles.statLabel}>Places</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>⭐ {profileData.explorer_count}</Text>
            <Text style={styles.statLabel}>Explorer</Text>
          </View>
        </View>

        {/* 3. Explorer Badges Section */}
        {explorerBadges.length > 0 && (
          <View style={styles.badgesSection}>
            <KSeparator style={styles.sectionSeparator} />
            <Text style={styles.sectionHeader}>EXPLORER BADGES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScrollContent}
            >
              {explorerBadges.map((badge) => (
                <Pressable
                  key={badge.id}
                  onPress={() =>
                    (navigation as any).navigate('SpotDetails', { spotId: badge.spot_id })
                  }
                  style={[styles.badgeChip, Brutalism.borderLight]}
                >
                  {/* Badge shadow */}
                  <View style={styles.badgeChipShadow} />
                  <View style={styles.badgeChipFace}>
                    {badge.spots?.cover_photo_url ? (
                      <Image
                        source={{ uri: badge.spots.cover_photo_url }}
                        style={styles.badgeThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.badgeThumbPlaceholder, Brutalism.borderLight]}>
                        <Ionicons name="star" size={14} color={Colors.saffron} />
                      </View>
                    )}
                    <Text style={styles.badgeSpotName} numberOfLines={1}>
                      First at {(badge.spots?.name || 'Spot').substring(0, 12)}
                      {(badge.spots?.name || '').length > 12 ? '…' : ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 4. Tab Switcher */}
        <View style={styles.tabContainer}>
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => handleTabChange('submitted')}
              style={[styles.tabButton, { width: tabWidth }]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'submitted' && styles.tabLabelActive,
                ]}
              >
                Submitted
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleTabChange('visited')}
              style={[styles.tabButton, { width: tabWidth }]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'visited' && styles.tabLabelActive,
                ]}
              >
                Visited
              </Text>
            </Pressable>

            {isOwnProfile && (
              <Pressable
                onPress={() => handleTabChange('saved')}
                style={[styles.tabButton, { width: tabWidth }]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === 'saved' && styles.tabLabelActive,
                  ]}
                >
                  Saved
                </Text>
              </Pressable>
            )}
          </View>

          {/* Animated indicator bar */}
          <Animated.View
            style={[
              styles.tabIndicator,
              { width: tabWidth },
              tabIndicatorStyle,
            ]}
          />
        </View>

        {/* 5. Spot Grid */}
        {loadingSpots ? (
          <View style={styles.loadingSpots}>
            <KLoadingSpinner />
          </View>
        ) : currentTabSpots.length === 0 ? (
          <KEmptyState
            iconName={emptyMessage.icon as any}
            title={emptyMessage.title}
            subtitle={emptyMessage.subtitle}
            actionLabel={isOwnProfile && activeTab === 'submitted' ? 'Add a Spot' : undefined}
            onActionPress={
              isOwnProfile && activeTab === 'submitted'
                ? () => (navigation as any).navigate('SubmitSpot')
                : undefined
            }
            style={styles.emptyState}
          />
        ) : (
          <View style={styles.spotGrid}>
            {currentTabSpots.map((spot) => (
              <Pressable
                key={spot.id}
                onPress={() => (navigation as any).navigate('SpotDetails', { spotId: spot.id })}
                style={[styles.gridItem, Brutalism.border]}
              >
                {spot.cover_photo_url ? (
                  <Image
                    source={{ uri: spot.cover_photo_url }}
                    style={styles.gridImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.gridImagePlaceholder}>
                    <Ionicons name="image-outline" size={28} color={Colors.deepClay} />
                  </View>
                )}

                {/* Category Badge Overlay (top-left) */}
                <View style={styles.gridCategoryOverlay}>
                  <KBadge
                    label={spot.category.toUpperCase()}
                    color={(Colors.categories as any)[spot.category] || Colors.terracotta}
                    size="sm"
                  />
                </View>

                {/* Name Overlay (bottom, gradient) */}
                <View style={styles.gridNameOverlay}>
                  <Text style={styles.gridSpotName} numberOfLines={1}>
                    {spot.name}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Sign Out (own profile only) */}
        {isOwnProfile && !isGuest && (
          <View style={styles.signOutSection}>
            <KButton
              label="Sign Out"
              variant="ghost"
              onPress={handleSignOut}
              textColor={Colors.terracotta}
              icon={<Ionicons name="log-out-outline" size={18} color={Colors.terracotta} />}
              style={styles.signOutBtn}
            />
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.editModalContainer}
        >
          {/* Edit Header */}
          <View style={[styles.editHeader, Brutalism.border]}>
            <Pressable onPress={() => setEditModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.jetBlack} />
            </Pressable>
            <Text style={[Typography.heading2, { color: Colors.jetBlack }]}>Edit Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.editScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar Picker */}
            <View style={styles.editAvatarSection}>
              <Pressable onPress={handlePickAvatar} style={styles.editAvatarWrapper}>
                {editAvatarUri ? (
                  <Image
                    source={{ uri: editAvatarUri }}
                    style={styles.editAvatar}
                    contentFit="cover"
                  />
                ) : profileData.avatar_url ? (
                  <Image
                    source={{ uri: profileData.avatar_url }}
                    style={styles.editAvatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.editAvatarPlaceholder}>
                    <Text style={styles.editAvatarLetter}>
                      {(profileData.username || 'E').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={[styles.editAvatarBadge, Brutalism.borderLight]}>
                  <Ionicons name="camera" size={14} color={Colors.sand} />
                </View>
              </Pressable>
              {uploadingAvatar && (
                <ActivityIndicator
                  color={Colors.terracotta}
                  style={{ marginTop: 8 }}
                />
              )}
            </View>

            {/* Username (disabled) */}
            <View style={styles.disabledField}>
              <Text style={styles.disabledFieldLabel}>Username</Text>
              <View style={[styles.disabledInputRow, Brutalism.borderLight]}>
                <Text style={styles.disabledInputText}>@{profileData.username}</Text>
                <Ionicons name="lock-closed" size={16} color={Colors.deepClay} />
              </View>
              <Text style={styles.disabledHelpText}>
                Username cannot be changed after setup
              </Text>
            </View>

            {/* Full Name */}
            <KInput
              label="Full Name"
              placeholder="e.g. Zarrar Baloch"
              value={editFullName}
              onChangeText={setEditFullName}
              autoCapitalize="words"
              icon={<Ionicons name="person-outline" size={20} color={Colors.jetBlack} />}
            />

            {/* Bio */}
            <View style={styles.bioInputSection}>
              <KInput
                label="Bio"
                placeholder="Tell explorers about yourself..."
                value={editBio}
                onChangeText={(text) => {
                  if (text.length <= 150) setEditBio(text);
                }}
                multiline
                numberOfLines={3}
                style={styles.bioInput}
              />
              <Text style={styles.bioCharCount}>
                {editBio.length}/150
              </Text>
            </View>

            {/* City Picker */}
            <View style={styles.cityPickerSection}>
              <Text style={styles.cityPickerLabel}>City in Balochistan</Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setCityModalVisible(true);
                }}
                style={[styles.cityPickerButton, Brutalism.border]}
              >
                <View style={styles.cityPickerContent}>
                  <Ionicons name="location-outline" size={20} color={Colors.jetBlack} />
                  <Text
                    style={[
                      Typography.body,
                      {
                        color: editCity ? Colors.jetBlack : Colors.deepClay,
                        marginLeft: 8,
                        flex: 1,
                      },
                    ]}
                  >
                    {editCity || 'Select your city...'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={Colors.jetBlack} />
              </Pressable>
            </View>

            {/* Save Changes Button */}
            <KButton
              label="Save Changes"
              variant="primary"
              onPress={handleSaveProfile}
              loading={savingProfile}
              disabled={savingProfile}
              style={styles.saveChangesBtn}
            />
          </ScrollView>

          {/* City Selection Modal (nested) */}
          <Modal
            visible={cityModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setCityModalVisible(false)}
          >
            <View style={styles.cityModalOverlay}>
              <KCard backgroundColor={Colors.white} style={styles.cityModalCard}>
                <View style={styles.cityModalHeader}>
                  <Text style={Typography.heading2}>Select City</Text>
                  <Pressable onPress={() => setCityModalVisible(false)} hitSlop={8}>
                    <Ionicons name="close" size={24} color={Colors.jetBlack} />
                  </Pressable>
                </View>
                <FlatList
                  data={BALOCHISTAN_CITIES as any}
                  renderItem={renderCityItem}
                  keyExtractor={(item) => item}
                  ItemSeparatorComponent={() => (
                    <View style={styles.cityModalSeparator} />
                  )}
                  style={styles.cityModalList}
                />
              </KCard>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 40,
  },
  // Profile Header Card
  profileHeaderCard: {
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  avatarSection: {
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.terracotta,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.terracotta,
  },
  avatarLetter: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    color: Colors.sand,
  },
  usernameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: Colors.jetBlack,
    marginBottom: 2,
  },
  fullNameText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.deepClay,
    marginBottom: 6,
  },
  cityChip: {
    backgroundColor: Colors.limestone,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Brutalism.borderRadius,
    marginBottom: 8,
  },
  cityChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.jetBlack,
  },
  bioText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.jetBlack,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  editBtn: {
    marginTop: 12,
    alignSelf: 'center',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: Colors.jetBlack,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: Colors.deepClay,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 2.5,
    backgroundColor: Colors.jetBlack,
  },
  // Explorer Badges
  badgesSection: {
    marginBottom: 16,
  },
  sectionSeparator: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.jetBlack,
    marginBottom: 10,
  },
  badgesScrollContent: {
    paddingRight: 16,
    gap: 10,
  },
  badgeChip: {
    position: 'relative',
    marginBottom: 4,
  },
  badgeChipShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: Colors.jetBlack,
    borderRadius: Brutalism.borderRadius,
  },
  badgeChipFace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.saffron,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 14,
    borderRadius: Brutalism.borderRadius,
    gap: 8,
  },
  badgeThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.jetBlack,
  },
  badgeThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.limestone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSpotName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.jetBlack,
    maxWidth: 120,
  },
  // Tab Switcher
  tabContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: Colors.limestone,
  },
  tabButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.deepClay,
  },
  tabLabelActive: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.jetBlack,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: Colors.terracotta,
  },
  // Spot Grid
  loadingSpots: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    marginVertical: 8,
  },
  spotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
    borderRadius: Brutalism.borderRadius,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.limestone,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCategoryOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 2,
  },
  gridNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26,26,26,0.65)',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  gridSpotName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  // Sign Out
  signOutSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  signOutBtn: {
    alignSelf: 'center',
  },
  // Guest State
  guestContainer: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  guestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  guestIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    color: Colors.jetBlack,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    color: Colors.deepClay,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  guestButton: {
    width: 200,
  },
  // Error/Not Found
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: Colors.jetBlack,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: Colors.deepClay,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  // Skeleton
  skeletonProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  skeletonAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.limestone,
  },
  skeletonTextBlock: {
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: Colors.limestone,
    borderRadius: 4,
  },
  skeletonStatsRow: {
    height: 80,
    backgroundColor: Colors.limestone,
    borderRadius: Brutalism.borderRadius,
    marginBottom: 16,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skeletonGridItem: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
    backgroundColor: Colors.limestone,
    borderRadius: Brutalism.borderRadius,
  },
  // Edit Profile Modal
  editModalContainer: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 2.5,
    borderBottomColor: Colors.jetBlack,
  },
  editScrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  editAvatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  editAvatarWrapper: {
    position: 'relative',
  },
  editAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.terracotta,
  },
  editAvatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.terracotta,
  },
  editAvatarLetter: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 36,
    color: Colors.sand,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledField: {
    marginBottom: 16,
  },
  disabledFieldLabel: {
    ...Typography.bodyMedium,
    color: Colors.jetBlack,
    marginBottom: 6,
  },
  disabledInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minHeight: 50,
    borderRadius: Brutalism.borderRadius,
    backgroundColor: Colors.limestone,
    opacity: 0.7,
  },
  disabledInputText: {
    ...Typography.body,
    color: Colors.deepClay,
  },
  disabledHelpText: {
    ...Typography.caption,
    color: Colors.deepClay,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bioInputSection: {
    position: 'relative',
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bioCharCount: {
    ...Typography.caption,
    color: Colors.deepClay,
    textAlign: 'right',
    marginTop: -10,
    marginBottom: 8,
  },
  cityPickerSection: {
    marginBottom: 24,
  },
  cityPickerLabel: {
    ...Typography.bodyMedium,
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
    backgroundColor: Colors.white,
  },
  cityPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  saveChangesBtn: {
    marginTop: 8,
  },
  // City Modal (nested in edit)
  cityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 32,
  },
  cityModalCard: {
    padding: 20,
    maxHeight: '70%',
  },
  cityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cityModalList: {
    width: '100%',
  },
  cityModalSeparator: {
    height: 1.5,
    backgroundColor: Colors.limestone,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: Brutalism.borderRadius,
  },
});
