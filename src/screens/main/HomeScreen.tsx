import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KSeparator } from '../../components/ui/KSeparator';
import { KEmptyState } from '../../components/ui/KEmptyState';
import { KLoadingSpinner } from '../../components/ui/KLoadingSpinner';
import { KCard } from '../../components/ui/KCard';
import { KBadge } from '../../components/ui/KBadge';
import { KButton } from '../../components/ui/KButton';
import { SpotCard } from '../../components/SpotCard';
import { useSpotsStore, Spot } from '../../stores/spotsStore';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';
import { useUIStore } from '../../stores/uiStore';
import { supabase } from '../../lib/supabase';
import { AppStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type HomeScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🏖️' },
  { id: 'beach', label: 'Beach', emoji: '🏖️' },
  { id: 'waterfall', label: 'Waterfall', emoji: '🌊' },
  { id: 'mountain', label: 'Mountain', emoji: '⛰️' },
  { id: 'valley', label: 'Valley', emoji: '🌿' },
  { id: 'viewpoint', label: 'Viewpoint', emoji: '👁️' },
  { id: 'historical', label: 'Historical', emoji: '🏛️' },
  { id: 'desert', label: 'Desert', emoji: '🏜️' },
  { id: 'forest', label: 'Forest', emoji: '🌲' },
] as const;

// Shimmer Skeleton Card Component
const ShimmerCard = () => {
  const shimmerOpacity = useSharedValue(0.3);

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withTiming(0.7, { duration: 750, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <KCard style={styles.shimmerCard}>
      <Animated.View style={[styles.shimmerImage, animatedStyle]} />
      <View style={styles.shimmerContent}>
        <Animated.View style={[styles.shimmerLineLong, animatedStyle, { marginBottom: 10 }]} />
        <Animated.View style={[styles.shimmerLineShort, animatedStyle, { marginBottom: 16 }]} />
        <Animated.View style={[styles.shimmerLineLong, animatedStyle]} />
      </View>
    </KCard>
  );
};

// Category Chip with Spring Animation
interface CategoryChipProps {
  id: string;
  label: string;
  emoji: string;
  isActive: boolean;
  onPress: () => void;
}

const CategoryChip: React.FC<CategoryChipProps> = ({ id, label, emoji, isActive, onPress }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.08 : 1.0, {
      damping: 10,
      stiffness: 220,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        style={[
          styles.categoryChip,
          Brutalism.borderLight,
          {
            backgroundColor: isActive
              ? (Colors.categories as any)[id] || Colors.terracotta
              : Colors.white,
          },
        ]}
      >
        <Text
          style={[
            Typography.captionBold,
            { color: isActive ? Colors.sand : Colors.jetBlack },
          ]}
        >
          {emoji} {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

export const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  
  // Zustand Store mappings
  const { profile, isGuest, setGuestMode } = useAuthStore();
  const { coords, requestLocationPermission } = useLocationStore();
  const { savedSpotIds, visitedSpotIds, saveSpot, unsaveSpot, markVisited } = useSpotsStore();
  const { showToast, selectedCategory, setCategory } = useUIStore();

  const [draftExists, setDraftExists] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  // Check if draft exists on mount/focus
  const checkDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem('@submit_spot_draft');
      setDraftExists(!!draft);
    } catch {
      setDraftExists(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkDraft();
    }, [])
  );

  const handleFABPress = () => {
    if (isGuest) {
      setGuestModalVisible(true);
    } else {
      navigation.navigate('SubmitSpot' as any);
    }
  };

  // Feed pagination / loading states
  const [spots, setSpots] = useState<Spot[]>([]);
  const [featuredSpots, setFeaturedSpots] = useState<Spot[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  
  // Filter settings
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const debounceTimerRef = useRef<any>(null);

  const ITEMS_PER_PAGE = 15;

  const fetchFeaturedSpots = async () => {
    try {
      const { data, error } = await supabase
        .from('spots')
        .select('*, profiles(username, full_name, avatar_url)')
        .eq('is_approved', true)
        .order('save_count', { ascending: false })
        .limit(3);

      if (!error && data) {
        setFeaturedSpots(data as Spot[]);
      }
    } catch (err) {
      console.error('Error fetching featured spots:', err);
    }
  };

  const fetchFeedSpots = async (pageNum: number, categoryId: string, isRefresh = false) => {
    // Net status validation
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setNetworkError(true);
      setLoadingInitial(false);
      setLoadingMore(false);
      setRefreshing(false);
      return;
    }
    
    setNetworkError(false);

    try {
      const startRange = pageNum * ITEMS_PER_PAGE;
      const endRange = startRange + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('spots')
        .select('*, profiles(username, full_name, avatar_url), spot_photos(*)')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .range(startRange, endRange);

      if (categoryId !== 'all') {
        query = query.eq('category', categoryId as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      const newSpots = (data || []) as Spot[];
      
      if (isRefresh || pageNum === 0) {
        setSpots(newSpots);
      } else {
        setSpots((prev) => [...prev, ...newSpots]);
      }

      setHasMore(newSpots.length === ITEMS_PER_PAGE);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      setNetworkError(true);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Initial Load
  useEffect(() => {
    requestLocationPermission();
    fetchFeaturedSpots();
    fetchFeedSpots(0, 'all');
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    fetchFeaturedSpots();
    await fetchFeedSpots(0, activeCategory, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loadingInitial) {
      setLoadingMore(true);
      fetchFeedSpots(page + 1, activeCategory);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setLoadingInitial(true);
    setSpots([]);

    // Debounce rapid filter clicks
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchFeedSpots(0, categoryId);
    }, 300);
  };

  useFocusEffect(
    useCallback(() => {
      if (selectedCategory) {
        handleCategoryChange(selectedCategory);
        setCategory(null);
      }
    }, [selectedCategory])
  );

  // Helper to calculate distance in km using coords
  const getDistanceString = (spotLat: number, spotLng: number) => {
    if (!coords) return null;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Earth's mean radius in km
    const dLat = toRad(spotLat - coords.latitude);
    const dLon = toRad(spotLng - coords.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(coords.latitude)) *
        Math.cos(toRad(spotLat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return `${d.toFixed(0)} km away`;
  };

  // Guest warning alert
  const checkGuestAction = (message: string) => {
    if (isGuest) {
      Alert.alert(
        'Explorer Account Required',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In / Register',
            onPress: () => setGuestMode(false),
          },
        ]
      );
      return true; // Action intercepted
    }
    return false; // User authenticated, proceed
  };

  const handleSavePress = async (spot: Spot) => {
    if (checkGuestAction('Sign in to save Balochistan’s hidden spots!')) return;

    if (savedSpotIds.has(spot.id)) {
      await unsaveSpot(spot.id);
    } else {
      await saveSpot(spot.id);
    }
  };

  const handleVisitPress = async (spot: Spot) => {
    if (checkGuestAction('Sign in to check-in and claim your visits!')) return;

    if (visitedSpotIds.has(spot.id)) {
      showToast('You already visited this spot.', 'info');
      return;
    }

    // Prompt user to write a travel note
    Alert.prompt(
      'Log Your Visit',
      'Add a brief travel note for fellow explorers (Optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Check-In',
          onPress: async (reviewText?: string) => {
            await markVisited(spot.id, reviewText);
            // Reload spots to update counts
            fetchFeedSpots(0, activeCategory, true);
          },
        },
      ]
    );
  };

  const handleSharePress = async (spot: Spot) => {
    Alert.alert('Share Spot', `Explore ${spot.name} in Balochistan! Shared via Kohsar.`);
  };

  const renderFeaturedItem = ({ item }: { item: Spot }) => (
    <KCard
      onPress={() => navigation.navigate('SpotDetails', { spotId: item.id })}
      style={styles.featuredCard}
    >
      <Image
        source={{ uri: item.cover_photo_url || '' }}
        style={styles.featuredImage}
        contentFit="cover"
      />
      {/* Bottom Gradient overlay simulation */}
      <View style={styles.featuredOverlay}>
        <View style={styles.featuredTextRow}>
          <Text style={[Typography.heading3, { color: Colors.sand }]} numberOfLines={1}>
            {item.name}
          </Text>
          <KBadge
            label={item.category.toUpperCase()}
            color={Colors.categories[item.category] || Colors.terracotta}
            size="sm"
          />
        </View>
      </View>
      {/* Top Left "FEATURED" label */}
      <View style={[styles.featuredLabel, Brutalism.borderLight]}>
        <Text style={[Typography.label, { color: Colors.jetBlack, fontSize: 9 }]}>FEATURED</Text>
      </View>
    </KCard>
  );

  const showFeatured = featuredSpots.length > 0 && activeCategory === 'all';

  return (
    <View style={styles.container}>
      {/* 1. Header Area */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>KOHSAR</Text>
          <View style={styles.logoUnderline} />
        </View>

        <View style={styles.headerRight}>
          <Pressable style={styles.headerIconButton} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={Colors.jetBlack} />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Profile' as any)}
            style={[styles.avatarFrame, Brutalism.borderLight]}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImagePlaceholder, { backgroundColor: Colors.saffron }]}>
                <Text style={styles.avatarLetter}>
                  {(profile?.username || 'E').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* 2. Category Filter Strip */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat.id}
              id={cat.id}
              label={cat.label}
              emoji={cat.emoji}
              isActive={activeCategory === cat.id}
              onPress={() => handleCategoryChange(cat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Connection Offline Banner */}
      {networkError && (
        <View style={[styles.errorBanner, Brutalism.border]}>
          <Text style={[Typography.captionBold, { color: Colors.sand, flex: 1 }]}>
            Couldn't load spots. Check connection.
          </Text>
          <Pressable
            onPress={() => {
              setLoadingInitial(true);
              fetchFeaturedSpots();
              fetchFeedSpots(0, activeCategory);
            }}
            style={styles.retryBtn}
          >
            <Text style={[Typography.label, { color: Colors.jetBlack }]}>RETRY</Text>
          </Pressable>
        </View>
      )}

      {/* Main Content Area */}
      {loadingInitial ? (
        <ScrollView contentContainerStyle={styles.listContainer}>
          <ShimmerCard />
          <ShimmerCard />
          <ShimmerCard />
        </ScrollView>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <SpotCard
              spot={item}
              onPress={() => navigation.navigate('SpotDetails', { spotId: item.id })}
              onSavePress={() => handleSavePress(item)}
              onVisitPress={() => handleVisitPress(item)}
              onSharePress={() => handleSharePress(item)}
              isSaved={savedSpotIds.has(item.id)}
              isVisited={visitedSpotIds.has(item.id)}
              distance={getDistanceString(Number(item.lat), Number(item.lng))}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.terracotta}
              colors={[Colors.terracotta]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View>
              {/* 3. Featured Spots Carousel */}
              {showFeatured && (
                <View style={styles.featuredSection}>
                  <FlatList
                    data={featuredSpots}
                    renderItem={renderFeaturedItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredScrollContainer}
                  />
                </View>
              )}

              {/* 5. Section Label recently added */}
              {spots.length > 0 && (
                <View style={styles.sectionDividerWrapper}>
                  <Text style={[Typography.heading3, styles.sectionDividerLabel]}>
                    RECENTLY ADDED
                  </Text>
                  <KSeparator style={styles.divider} />
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !networkError ? (
              <KEmptyState
                title="No Spots Yet"
                subtitle={
                  activeCategory !== 'all'
                    ? `No ${activeCategory} spots discovered yet. Be the first!`
                    : "Balochistan's map is empty — be the first explorer."
                }
                actionLabel="Add First Spot"
                onActionPress={handleFABPress}
              />
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={Colors.terracotta} />
              </View>
            ) : null
          }
        />
      )}

      {/* Draft Recovery Banner */}
      {draftExists && (
        <View style={[styles.draftBanner, Brutalism.border, Brutalism.shadowSmall]}>
          <Ionicons name="document-text-outline" size={18} color={Colors.sand} />
          <Text style={[Typography.captionBold, { color: Colors.sand, flex: 1, marginLeft: 6 }]}>
            You have an unfinished spot submission.
          </Text>
          <Pressable
            onPress={() => {
              navigation.navigate('SubmitSpot' as any);
            }}
            style={styles.draftBannerBtn}
          >
            <Text style={[Typography.label, { color: Colors.jetBlack }]}>CONTINUE</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              await AsyncStorage.removeItem('@submit_spot_draft');
              setDraftExists(false);
            }}
            style={styles.draftBannerClose}
          >
            <Ionicons name="close" size={16} color={Colors.sand} />
          </Pressable>
        </View>
      )}

      {/* Add Spot FAB */}
      <View style={styles.fabWrapper}>
        <View style={styles.fabShadow} />
        <Pressable
          onPress={handleFABPress}
          style={[styles.fabCircle, { backgroundColor: Colors.terracotta }]}
        >
          <Ionicons name="add" size={28} color={Colors.sand} />
        </Pressable>
      </View>

      {/* Guest Intercept Modal */}
      <Modal
        visible={guestModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGuestModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setGuestModalVisible(false)}
        >
          <Pressable style={[styles.guestSheet, Brutalism.border]}>
            <View style={styles.dragHandle} />
            <View style={styles.guestModalContent}>
              <View style={styles.guestIconCircle}>
                <Ionicons name="lock-closed" size={32} color={Colors.terracotta} />
              </View>
              <Text style={[Typography.heading2, { textAlign: 'center', color: Colors.jetBlack, marginTop: 12 }]}>
                Explorer Account Required
              </Text>
              <Text style={[Typography.body, { textAlign: 'center', color: Colors.deepClay, marginTop: 8, paddingHorizontal: 16 }]}>
                Become a Kohsar explorer to submit and share hidden spots in Balochistan!
              </Text>

              <KButton
                label="Sign In / Register"
                onPress={() => {
                  setGuestModalVisible(false);
                  setGuestMode(false);
                }}
                variant="primary"
                style={{ width: '100%', marginTop: 24 }}
              />

              <KButton
                label="Explore as Guest"
                onPress={() => setGuestModalVisible(false)}
                variant="ghost"
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 10,
    backgroundColor: Colors.sand,
  },
  headerLeft: {
    position: 'relative',
    height: 32,
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: Colors.jetBlack,
  },
  logoUnderline: {
    height: 4,
    width: 60,
    backgroundColor: Colors.terracotta,
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderRadius: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFrame: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...Typography.captionBold,
    color: Colors.jetBlack,
    fontSize: 14,
  },
  categoriesWrapper: {
    height: 48,
    marginVertical: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  featuredSection: {
    marginBottom: 20,
    height: 200,
  },
  featuredScrollContainer: {
    gap: 12,
  },
  featuredCard: {
    width: SCREEN_WIDTH - 32,
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Brutalism.borderRadiusLarge,
    marginBottom: 0,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26,26,26,0.65)',
    padding: 12,
  },
  featuredTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredLabel: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.saffron,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Brutalism.borderRadius,
  },
  sectionDividerWrapper: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionDividerLabel: {
    color: Colors.jetBlack,
    marginBottom: 6,
  },
  divider: {
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.terracotta,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    gap: 12,
  },
  retryBtn: {
    backgroundColor: Colors.white,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Brutalism.borderRadius,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  shimmerCard: {
    height: 280,
    marginBottom: 16,
    overflow: 'hidden',
  },
  shimmerImage: {
    height: 180,
    backgroundColor: Colors.limestone,
  },
  shimmerContent: {
    padding: 12,
    backgroundColor: Colors.white,
    flex: 1,
  },
  shimmerLineLong: {
    height: 14,
    width: '80%',
    backgroundColor: Colors.limestone,
    borderRadius: 2,
  },
  shimmerLineShort: {
    height: 12,
    width: '40%',
    backgroundColor: Colors.limestone,
    borderRadius: 2,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    zIndex: 100,
  },
  fabShadow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.jetBlack,
    bottom: 0,
    right: 0,
  },
  fabCircle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Colors.jetBlack,
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
  },
  draftBanner: {
    position: 'absolute',
    bottom: 84,
    left: 16,
    right: 16,
    backgroundColor: Colors.terracotta,
    padding: 10,
    borderRadius: Brutalism.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 90,
  },
  draftBannerBtn: {
    backgroundColor: Colors.white,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Brutalism.borderRadius,
    marginRight: 10,
  },
  draftBannerClose: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.5)',
    justifyContent: 'flex-end',
  },
  guestSheet: {
    backgroundColor: Colors.sand,
    borderTopLeftRadius: Brutalism.borderRadiusLarge,
    borderTopRightRadius: Brutalism.borderRadiusLarge,
    padding: 20,
    paddingBottom: 34,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.limestone,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  guestModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.limestone,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
