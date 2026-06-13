import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  Linking,
  Alert,
  FlatList,
  Modal,
  PanResponder,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KHeader } from '../../components/ui/KHeader';
import { KCard } from '../../components/ui/KCard';
import { KBadge } from '../../components/ui/KBadge';
import { KButton } from '../../components/ui/KButton';
import { KInput } from '../../components/ui/KInput';
import { KSeparator } from '../../components/ui/KSeparator';
import { KLoadingSpinner } from '../../components/ui/KLoadingSpinner';

import { supabase } from '../../lib/supabase';
import { useSpotsStore, Spot, NearbySpot } from '../../stores/spotsStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useLocationStore } from '../../stores/locationStore';

type SpotDetailRouteProp = RouteProp<
  { SpotDetails: { spotId: string } },
  'SpotDetails'
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_EMOJIS: Record<string, string> = {
  beach: '🏖️',
  waterfall: '🌊',
  mountain: '⛰️',
  valley: '🌿',
  viewpoint: '👁️',
  historical: '🏛️',
  desert: '🏜️',
  forest: '🌲',
};

const getCategoryEmoji = (category: string) => {
  return CATEGORY_EMOJIS[category.toLowerCase()] || '🏖️';
};

const getDaysAgoString = (dateString: string) => {
  try {
    const createdDate = new Date(dateString);
    const currentDate = new Date();
    const differenceInTime = currentDate.getTime() - createdDate.getTime();
    const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));

    if (differenceInDays <= 0) {
      return 'today';
    }
    if (differenceInDays === 1) {
      return '1 day ago';
    }
    return `${differenceInDays} days ago`;
  } catch (err) {
    return 'recently';
  }
};

// Earthy custom map style for preview
const CUSTOM_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#F5EDD8' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#F5EDD8' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#d9c5b6' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#EEDEB7' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#e2d5c3' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#D5E5CF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#E4D3A9' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4e4e4e' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#B4D3C5' }],
  },
];

export const SpotDetailScreen = () => {
  const route = useRoute<SpotDetailRouteProp>();
  const navigation = useNavigation();
  const { spotId } = route.params;

  // Global Stores
  const { user, isGuest, setGuestMode } = useAuthStore();
  const { showToast } = useUIStore();
  const { coords } = useLocationStore();
  const { saveSpot, unsaveSpot, markVisited } = useSpotsStore();

  // Local Component States
  const [spot, setSpot] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [nearbySpots, setNearbySpots] = useState<any[]>([]);

  // Carousel indicator index
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Lightbox Viewer State
  const [lightboxVisible, setLightboxVisible] = useState(false);

  // Report Modal States
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  // PanResponder for Lightbox Swipe Down Dismissal
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 15 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.dy < -80) {
          setLightboxVisible(false);
        }
      },
    })
  ).current;

  // Calculate distance using local coords
  const computedDistance = (() => {
    if (!coords || !spot) return null;
    const lat1 = coords.latitude;
    const lon1 = coords.longitude;
    const lat2 = spot.lat;
    const lon2 = spot.lng;

    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return `${d.toFixed(1)} km away`;
  })();

  // Main Fetch Method
  const fetchSpotData = async () => {
    setLoading(true);
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
      setIsOfflineMode(true);
      const cached = await AsyncStorage.getItem(`@spot_cache_${spotId}`);
      if (cached) {
        const spotData = JSON.parse(cached);
        setSpot(spotData);
        setSaveCount(spotData.save_count || 0);
        setVisitCount(spotData.visit_count || 0);

        // Fetch user personal status from local Zustand stores since offline
        const localSaves = useSpotsStore.getState().savedSpotIds;
        const localVisits = useSpotsStore.getState().visitedSpotIds;
        setIsSaved(localSaves.has(spotId));
        setIsVisited(localVisits.has(spotId));
      } else {
        setSpot(null);
      }
      setLoading(false);
      return;
    }

    setIsOfflineMode(false);
    try {
      // 1. Fetch spot details with submitted_by profile, photos, and explorer badges
      const { data, error } = await supabase
        .from('spots')
        .select(`
          *,
          profiles:submitted_by (
            id,
            username,
            full_name,
            avatar_url,
            explorer_count
          ),
          spot_photos (
            id,
            photo_url,
            display_order
          ),
          explorer_badges (
            user_id,
            profiles:user_id (
              username
            )
          )
        `)
        .eq('id', spotId)
        .single();

      if (error) throw error;
      setSpot(data);
      setSaveCount(data.save_count || 0);
      setVisitCount(data.visit_count || 0);

      // Cache data locally
      await AsyncStorage.setItem(`@spot_cache_${spotId}`, JSON.stringify(data));

      // 2. Fetch User save/visit status and report status parallel (only if authenticated)
      if (user?.id) {
        const [saveRes, visitRes, reportRes] = await Promise.all([
          supabase
            .from('saves')
            .select('id')
            .eq('spot_id', spotId)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('visits')
            .select('id')
            .eq('spot_id', spotId)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('reports')
            .select('id')
            .eq('spot_id', spotId)
            .eq('reporter_id', user.id)
            .maybeSingle(),
        ]);

        setIsSaved(!!saveRes.data);
        setIsVisited(!!visitRes.data);
        setHasReported(!!reportRes.data);
      }

      // 3. Fetch nearby spots (delayed, doesn't block main render)
      fetchNearbySpots(data.lat, data.lng);
    } catch (err: any) {
      console.error('Error fetching spot:', err);
      // Fallback to cache if error
      const cached = await AsyncStorage.getItem(`@spot_cache_${spotId}`);
      if (cached) {
        const spotData = JSON.parse(cached);
        setSpot(spotData);
        setSaveCount(spotData.save_count || 0);
        setVisitCount(spotData.visit_count || 0);
      } else {
        setSpot(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Nearby Spots (within 50km)
  const fetchNearbySpots = async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.rpc('get_nearby_spots', {
        user_lat: lat,
        user_lng: lng,
        radius_km: 50.0,
        limit_count: 6, // fetch 6 to allow filter out current spot
      });

      if (error) throw error;

      const filtered = (data || [])
        .filter((s: any) => s.id !== spotId)
        .slice(0, 5);

      setNearbySpots(filtered);
    } catch (err) {
      console.error('Error fetching nearby spots:', err);
    }
  };

  useEffect(() => {
    fetchSpotData();
  }, [spotId]);

  // Sync offline saves queue when coming back online
  const syncOfflineSaves = useCallback(async () => {
    try {
      const queueStr = await AsyncStorage.getItem('@offline_saves_queue');
      if (!queueStr) return;

      const queue = JSON.parse(queueStr) as Record<string, boolean>;
      const keys = Object.keys(queue);
      if (keys.length === 0) return;

      showToast('Syncing offline actions...', 'info');

      for (const id of keys) {
        const shouldSave = queue[id];
        if (shouldSave) {
          await saveSpot(id);
        } else {
          await unsaveSpot(id);
        }
      }

      await AsyncStorage.removeItem('@offline_saves_queue');
      showToast('Offline changes synced!', 'success');
      // Refresh counts
      fetchSpotData();
    } catch (err) {
      console.error('Error syncing offline queue:', err);
    }
  }, [saveSpot, unsaveSpot, spotId]);

  // Network connection change listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncOfflineSaves();
      }
    });
    return () => unsubscribe();
  }, [syncOfflineSaves]);

  // Toggle Save Action
  const handleToggleSave = async () => {
    if (isGuest) {
      Alert.alert(
        'Explorer Account Required',
        'Create an explorer profile to save Balochistan’s hidden wonders!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In / Register',
            onPress: () => setGuestMode(false),
          },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextSavedState = !isSaved;
    setIsSaved(nextSavedState);
    setSaveCount((prev) => (nextSavedState ? prev + 1 : Math.max(0, prev - 1)));

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      // Queue action offline
      try {
        const queueStr = await AsyncStorage.getItem('@offline_saves_queue');
        const queue = queueStr ? JSON.parse(queueStr) : {};
        queue[spotId] = nextSavedState;
        await AsyncStorage.setItem('@offline_saves_queue', JSON.stringify(queue));
        showToast('Saved locally. Will sync when connected.', 'warning');
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      if (nextSavedState) {
        await saveSpot(spotId);
        showToast('Added to saved spots!', 'success');
      } else {
        await unsaveSpot(spotId);
        showToast('Removed from saved spots.', 'info');
      }
    } catch (err) {
      console.error(err);
      // Revert local state on error
      setIsSaved(!nextSavedState);
      setSaveCount((prev) => (nextSavedState ? prev - 1 : prev + 1));
      showToast('Error updating saved state.', 'error');
    }
  };

  // Toggle Visited Action
  const handleToggleVisited = async () => {
    if (isGuest) {
      Alert.alert(
        'Explorer Account Required',
        'Create an explorer profile to mark spots as visited!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In / Register',
            onPress: () => setGuestMode(false),
          },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      showToast('Cannot change visit status while offline.', 'error');
      return;
    }

    const nextVisitedState = !isVisited;
    setIsVisited(nextVisitedState);
    setVisitCount((prev) =>
      nextVisitedState ? prev + 1 : Math.max(0, prev - 1)
    );

    try {
      if (nextVisitedState) {
        await markVisited(spotId);
        showToast('Checked in! Spot marked as visited.', 'success');
      } else {
        // Delete visit from database
        const { error } = await supabase
          .from('visits')
          .delete()
          .eq('user_id', user!.id)
          .eq('spot_id', spotId);

        if (error) throw error;
        // Update local zustand store
        const visitedIds = new Set(useSpotsStore.getState().visitedSpotIds);
        visitedIds.delete(spotId);
        useSpotsStore.setState({ visitedSpotIds: visitedIds });
        showToast('Visit log removed.', 'info');
      }
    } catch (err) {
      console.error(err);
      // Revert state
      setIsVisited(!nextVisitedState);
      setVisitCount((prev) => (nextVisitedState ? prev - 1 : prev + 1));
      showToast('Error updating visited status.', 'error');
    }
  };

  // Map directions launcher
  const handleDirections = () => {
    if (!spot) return;
    const lat = spot.lat;
    const lng = spot.lng;
    const label = encodeURIComponent(spot.name);

    // Try Google Maps native scheme, fallback to web maps url
    const iosUrl = `comgooglemaps://?daddr=${lat},${lng}`;
    const androidUrl = `geo:0,0?q=${lat},${lng}(${label})`;
    const fallbackWebUrl = `https://maps.google.com/?q=${lat},${lng}`;

    const url = Platform.OS === 'ios' ? iosUrl : androidUrl;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(fallbackWebUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening maps directions:', err);
        Linking.openURL(fallbackWebUrl);
      });
  };

  // Share using native sharing dialog
  const handleShare = async () => {
    if (!spot) return;
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing is not available on this device');
      return;
    }

    try {
      const shareMessage = `Check out ${spot.name} on Kohsar — ${spot.city}, Balochistan`;
      await Sharing.shareAsync(spot.cover_photo_url || '', {
        dialogTitle: `Explore ${spot.name}`,
        mimeType: 'image/jpeg',
      });
    } catch (err: any) {
      // On some platforms sharing raw text message is easier without media:
      try {
        await Sharing.shareAsync('', {
          dialogTitle: `Explore ${spot.name}`,
        });
      } catch (innerErr) {
        console.error('Error sharing:', innerErr);
      }
    }
  };

  // Coordinates Copy
  const handleCopyCoords = async () => {
    if (!spot) return;
    const textCoords = `${spot.lat}, ${spot.lng}`;
    await Clipboard.setStringAsync(textCoords);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast('Coordinates copied', 'success');
  };

  // Report Form Validation and Submission
  const handleReportPress = () => {
    if (isGuest) {
      Alert.alert(
        'Explorer Account Required',
        'Create an explorer profile to submit reports!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In / Register',
            onPress: () => setGuestMode(false),
          },
        ]
      );
      return;
    }

    if (hasReported) {
      showToast('You have already reported this spot.', 'warning');
      return;
    }

    setReportReason('');
    setReportNote('');
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      showToast('Please select a reason.', 'warning');
      return;
    }

    if (reportReason === 'Other' && !reportNote.trim()) {
      showToast('Please describe the issue in the note.', 'warning');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const formattedReason = reportReason
        .toLowerCase()
        .replace(' ', '_') as any;

      const { error } = await supabase.from('reports').insert({
        spot_id: spotId,
        reporter_id: user!.id,
        reason: formattedReason,
        note: reportReason === 'Other' ? reportNote : null,
      });

      if (error) throw error;

      setHasReported(true);
      setReportModalVisible(false);
      showToast('Report submitted successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to submit report.', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: Colors.sand }]}>
        <KLoadingSpinner />
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.terracotta} />
        <Text style={[Typography.heading2, styles.errorTitle]}>
          This spot no longer exists
        </Text>
        <Text style={[Typography.body, styles.errorSubtitle]}>
          The spot you are looking for has been removed or is no longer available.
        </Text>
        <KButton
          label="Go Back"
          onPress={() => navigation.goBack()}
          variant="primary"
          style={styles.errorBtn}
        />
      </View>
    );
  }

  // Get photo URLs
  const photos = [];
  if (spot.cover_photo_url) {
    photos.push(spot.cover_photo_url);
  }
  if (spot.spot_photos && spot.spot_photos.length > 0) {
    const sortedPhotos = [...spot.spot_photos].sort(
      (a: any, b: any) => a.display_order - b.display_order
    );
    sortedPhotos.forEach((p: any) => {
      if (p.photo_url !== spot.cover_photo_url) {
        photos.push(p.photo_url);
      }
    });
  }

  const hasPhotos = photos.length > 0;

  // Submitter Profile info
  const submitter = spot.profiles;
  const username = submitter?.username || 'anonymous';
  const explorerCount = submitter?.explorer_count || 0;

  // Explorer Badge Info (who claimed the spot first)
  const explorerBadge = spot.explorer_badges?.[0] || null;
  const explorerUsername = explorerBadge?.profiles?.username || null;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Connection Offline Banner */}
        {isOfflineMode && (
          <View style={[styles.offlineBanner, Brutalism.border]}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.sand} />
            <Text style={[Typography.captionBold, { color: Colors.sand, marginLeft: 8 }]}>
              Viewing cached version
            </Text>
          </View>
        )}

        {/* Carousel Image Header */}
        <View style={styles.carouselContainer}>
          {hasPhotos ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              snapToAlignment="center"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setActivePhotoIndex(index);
              }}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setLightboxVisible(true)}
                  style={styles.carouselImageWrapper}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.carouselImage}
                    contentFit="cover"
                    transition={200}
                  />
                </Pressable>
              )}
            />
          ) : (
            // Placeholder terracotta view
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={64} color={Colors.sand} />
              <Text style={[Typography.heading3, styles.placeholderText]}>
                {spot.name}
              </Text>
            </View>
          )}

          {/* Photo Counter */}
          {hasPhotos && photos.length > 1 && (
            <View style={[styles.counterBadge, Brutalism.borderLight]}>
              <Text style={styles.counterText}>
                {activePhotoIndex + 1} / {photos.length}
              </Text>
            </View>
          )}

          {/* Floating Actions Row */}
          <View style={styles.floatingHeaderRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.backCircle, Brutalism.border]}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.jetBlack} />
            </Pressable>

            <View style={styles.rightFloatingStack}>
              <Pressable
                onPress={handleShare}
                style={[styles.smallFloatBtn, Brutalism.border]}
              >
                <Ionicons name="share-social-outline" size={18} color={Colors.jetBlack} />
              </Pressable>

              <Pressable
                onPress={handleReportPress}
                style={[styles.smallFloatBtn, Brutalism.border, { marginTop: 8 }]}
              >
                <Ionicons name="flag-outline" size={18} color={Colors.jetBlack} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Paginated Dots Indicator */}
        {hasPhotos && photos.length > 1 && (
          <View style={styles.dotsContainer}>
            {photos.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  Brutalism.borderLight,
                  {
                    width: activePhotoIndex === idx ? 24 : 10,
                    backgroundColor:
                      activePhotoIndex === idx
                        ? Colors.terracotta
                        : Colors.limestone,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Spot Info Section (KCard) */}
        <View style={styles.contentPadding}>
          <KCard style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={[Typography.heading1, styles.spotNameText]} numberOfLines={2}>
                {spot.name}
              </Text>
              <KBadge
                label={spot.category.toUpperCase()}
                color={(Colors.categories as any)[spot.category] || Colors.terracotta}
                style={styles.categoryBadge}
              />
            </View>

            {/* Explorer chip */}
            {spot.is_explorer_claimed && (
              <View style={[styles.explorerChip, Brutalism.borderLight]}>
                <Text style={styles.explorerChipText}>
                  ⭐ First explored by @{explorerUsername || username}
                </Text>
              </View>
            )}

            {/* Location row */}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color={Colors.terracotta} />
              <Text style={[Typography.bodyMedium, styles.locationText]} numberOfLines={1}>
                {spot.city}, {spot.district || 'Balochistan'} — Pakistan
              </Text>
            </View>

            {/* Distance display */}
            {computedDistance && (
              <View style={styles.distanceRow}>
                <Ionicons name="navigate-circle-outline" size={16} color={Colors.makranTeal} />
                <Text style={[Typography.captionBold, styles.distanceText]}>
                  {computedDistance}
                </Text>
              </View>
            )}

            {/* Difficulty + Best Season Chips */}
            <View style={styles.chipsRow}>
              {spot.difficulty && (
                <View
                  style={[
                    styles.readOnlyChip,
                    Brutalism.borderLight,
                    {
                      backgroundColor:
                        spot.difficulty === 'easy'
                          ? '#D5E5CF'
                          : spot.difficulty === 'moderate'
                          ? '#FCE3B4'
                          : '#FAD2E1',
                    },
                  ]}
                >
                  <Text style={[Typography.captionBold, { color: Colors.jetBlack }]}>
                    💪 {spot.difficulty.toUpperCase()}
                  </Text>
                </View>
              )}

              {spot.best_season && (
                <View style={[styles.readOnlyChip, Brutalism.borderLight, { backgroundColor: '#E8DFD0' }]}>
                  <Text style={[Typography.captionBold, { color: Colors.jetBlack }]}>
                    📅 {spot.best_season}
                  </Text>
                </View>
              )}
            </View>
          </KCard>

          {/* Action Buttons Row */}
          <View style={styles.actionsBar}>
            <View style={styles.actionButtonContainer}>
              <KButton
                variant={isSaved ? 'primary' : 'secondary'}
                label={`Save (${saveCount})`}
                icon={
                  <Ionicons
                    name={isSaved ? 'heart' : 'heart-outline'}
                    size={16}
                    color={isSaved ? Colors.sand : Colors.jetBlack}
                  />
                }
                onPress={handleToggleSave}
                style={styles.fullWidthButton}
              />
            </View>

            <View style={styles.actionButtonContainer}>
              <KButton
                variant={isVisited ? 'primary' : 'secondary'}
                backgroundColor={isVisited ? Colors.success : undefined}
                textColor={isVisited ? Colors.sand : undefined}
                label={`Visited (${visitCount})`}
                icon={
                  <MaterialCommunityIcons
                    name="foot-print"
                    size={16}
                    color={isVisited ? Colors.sand : Colors.jetBlack}
                  />
                }
                onPress={handleToggleVisited}
                style={styles.fullWidthButton}
              />
            </View>

            <View style={styles.actionButtonContainer}>
              <KButton
                variant="secondary"
                label="Directions"
                icon={<Ionicons name="navigate-outline" size={16} color={Colors.jetBlack} />}
                onPress={handleDirections}
                style={styles.fullWidthButton}
              />
            </View>
          </View>

          {/* Description Section */}
          <KSeparator style={styles.sectionSeparator} />
          <Text style={[Typography.label, styles.sectionHeader]}>ABOUT</Text>
          <Text style={styles.descriptionText}>{spot.description}</Text>

          {/* How to Get There Section */}
          {spot.access_notes ? (
            <>
              <KSeparator style={styles.sectionSeparator} />
              <Text style={[Typography.label, styles.sectionHeader]}>HOW TO GET THERE</Text>
              <View style={styles.notesRow}>
                <Ionicons
                  name="trail-sign-outline"
                  size={20}
                  color={Colors.makranTeal}
                  style={styles.notesIcon}
                />
                <Text style={styles.accessNotesText}>{spot.access_notes}</Text>
              </View>
            </>
          ) : null}

          {/* Map Preview Section */}
          <KSeparator style={styles.sectionSeparator} />
          <Text style={[Typography.label, styles.sectionHeader]}>LOCATION</Text>

          <Pressable
            onPress={() =>
              (navigation as any).navigate('MainTabs', {
                screen: 'Map',
                params: {
                  spotId: spot.id,
                  lat: spot.lat,
                  lng: spot.lng,
                  spotName: spot.name,
                  category: spot.category,
                },
              })
            }
            style={[styles.mapContainer, Brutalism.border]}
          >
            <MapView
              provider={PROVIDER_GOOGLE}
              customMapStyle={CUSTOM_MAP_STYLE}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              style={styles.mapPreview}
              initialRegion={{
                latitude: spot.lat,
                longitude: spot.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Marker
                coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                tracksViewChanges={false}
              >
                <View style={[styles.mapMarker, Brutalism.borderLight]}>
                  <Text style={styles.markerEmoji}>
                    {getCategoryEmoji(spot.category)}
                  </Text>
                </View>
              </Marker>
            </MapView>
            <View style={styles.mapClickOverlay} />
          </Pressable>

          <Pressable onLongPress={handleCopyCoords} style={styles.coordsWrapper}>
            <Text style={styles.coordsText}>
              {spot.lat.toFixed(6)}°N, {spot.lng.toFixed(6)}°E
            </Text>
            <Ionicons name="copy-outline" size={14} color={Colors.deepClay} style={{ marginLeft: 6 }} />
          </Pressable>
          <Text style={styles.coordsHelpText}>Hold coordinates to copy</Text>

          {/* Submitted By Section */}
          <KSeparator style={styles.sectionSeparator} />
          <Text style={[Typography.label, styles.sectionHeader]}>ADDED BY</Text>

          <View style={styles.submitterRow}>
            {submitter?.avatar_url ? (
              <Image
                source={{ uri: submitter.avatar_url }}
                style={[styles.avatar, Brutalism.borderLight]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, Brutalism.borderLight]}>
                <Ionicons name="person-outline" size={20} color={Colors.deepClay} />
              </View>
            )}

            <View style={styles.submitterInfo}>
              <Text style={styles.submitterUsername}>@{username}</Text>
              <Text style={[Typography.caption, { color: Colors.deepClay }]}>
                {getDaysAgoString(spot.created_at)}
              </Text>
            </View>

            {explorerCount > 0 && (
              <View style={[styles.explorerBadgeCount, Brutalism.borderLight]}>
                <Text style={styles.explorerBadgeCountText}>
                  ⭐ {explorerCount} Explorer Badge{explorerCount === 1 ? '' : 's'}
                </Text>
              </View>
            )}
          </View>

          {/* Nearby Spots Section */}
          {nearbySpots.length > 0 && (
            <>
              <KSeparator style={styles.sectionSeparator} />
              <View style={styles.nearbyHeaderRow}>
                <Text style={[Typography.label, styles.sectionHeader, { marginBottom: 0 }]}>
                  NEARBY SPOTS
                </Text>
                <Pressable
                  onPress={() =>
                    (navigation as any).navigate('MainTabs', {
                      screen: 'Map',
                      params: {
                        lat: spot.lat,
                        lng: spot.lng,
                      },
                    })
                  }
                >
                  <Text style={[Typography.captionBold, styles.seeAllLink]}>
                    See all on map
                  </Text>
                </Pressable>
              </View>

              <FlatList
                data={nearbySpots}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.nearbySpotsList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.nearbyCardWrapper}>
                    <KCard
                      onPress={() =>
                        (navigation as any).navigate('SpotDetails', { spotId: item.id })
                      }
                    >
                      <View style={styles.nearbyCardImageContainer}>
                        {item.cover_photo_url ? (
                          <Image
                            source={{ uri: item.cover_photo_url }}
                            style={styles.nearbyCardImage}
                          />
                        ) : (
                          <View style={styles.nearbyCardPlaceholder}>
                            <Ionicons name="image-outline" size={24} color={Colors.deepClay} />
                          </View>
                        )}
                        <View style={styles.nearbyCardCategory}>
                          <KBadge
                            label={item.category.toUpperCase()}
                            color={(Colors.categories as any)[item.category] || Colors.terracotta}
                            size="sm"
                          />
                        </View>
                      </View>
                      <View style={styles.nearbyCardContent}>
                        <Text
                          style={[Typography.captionBold, styles.nearbyCardName]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={[Typography.caption, { color: Colors.deepClay }]} numberOfLines={1}>
                          📍 {item.city}
                        </Text>
                        <Text style={styles.nearbyCardDist}>
                          {Number(item.distance_km).toFixed(1)} km away
                        </Text>
                      </View>
                    </KCard>
                  </View>
                )}
              />
            </>
          )}

          {/* Report Link */}
          <View style={styles.reportRow}>
            <Pressable onPress={handleReportPress}>
              <Text style={styles.reportText}>⚑ Report this spot</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightboxOverlay} {...panResponder.panHandlers}>
          {/* Lightbox Header Close Button */}
          <View style={styles.lightboxHeader}>
            <Pressable
              onPress={() => setLightboxVisible(false)}
              style={[styles.lightboxCloseBtn, Brutalism.border]}
            >
              <Ionicons name="close" size={24} color={Colors.jetBlack} />
            </Pressable>
          </View>

          {/* Zoomable Image Panel */}
          {Platform.OS === 'ios' ? (
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.lightboxScrollContainer}
            >
              <Image
                source={{ uri: photos[activePhotoIndex] }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
            </ScrollView>
          ) : (
            <View style={styles.lightboxScrollContainer}>
              <Image
                source={{ uri: photos[activePhotoIndex] }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
            </View>
          )}

          <View style={styles.lightboxFooter}>
            <Text style={styles.lightboxSwipeDismissText}>
              Swipe down or up to dismiss
            </Text>
          </View>
        </View>
      </Modal>

      {/* Report Modal (Bottom Sheet style) */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setReportModalVisible(false)}
          />
          <View style={[styles.reportSheet, Brutalism.border]}>
            <View style={styles.dragHandle} />
            <Text style={[Typography.heading2, styles.reportSheetTitle]}>
              Report Spot
            </Text>
            <Text style={[Typography.body, styles.reportSheetSubtitle]}>
              Why are you reporting this spot? Our moderators will review it.
            </Text>

            {/* Reason selection chips */}
            <View style={styles.reportReasonRow}>
              {['Duplicate', 'Wrong Location', 'Inappropriate', 'Spam', 'Other'].map(
                (reason) => {
                  const isSelected = reportReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      onPress={() => setReportReason(reason)}
                      style={[
                        styles.reasonChip,
                        Brutalism.borderLight,
                        {
                          backgroundColor: isSelected
                            ? Colors.terracotta
                            : Colors.white,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          Typography.captionBold,
                          { color: isSelected ? Colors.sand : Colors.jetBlack },
                        ]}
                      >
                        {reason}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            {/* Note field if 'Other' selected */}
            {reportReason === 'Other' && (
              <KInput
                label="Note"
                placeholder="Explain the issue..."
                value={reportNote}
                onChangeText={setReportNote}
                multiline
                numberOfLines={3}
                style={styles.noteInput}
              />
            )}

            <View style={styles.reportSubmitRow}>
              <KButton
                label="Submit Report"
                loading={isSubmittingReport}
                onPress={handleSubmitReport}
                variant="primary"
                style={styles.reportSubmitBtn}
              />
              <KButton
                label="Cancel"
                disabled={isSubmittingReport}
                onPress={() => setReportModalVisible(false)}
                variant="secondary"
                style={styles.reportCancelBtn}
              />
            </View>
          </View>
        </View>
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
    paddingBottom: 40,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: Colors.terracotta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: Brutalism.borderRadius,
  },
  carouselContainer: {
    height: 280,
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.limestone,
  },
  carouselImageWrapper: {
    width: SCREEN_WIDTH,
    height: 280,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: SCREEN_WIDTH,
    height: 280,
    backgroundColor: Colors.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: Colors.jetBlack,
  },
  placeholderText: {
    color: Colors.sand,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  counterBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: Colors.terracotta,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Brutalism.borderRadius,
    zIndex: 10,
  },
  counterText: {
    ...Typography.captionBold,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: Colors.sand,
  },
  floatingHeaderRow: {
    position: 'absolute',
    top: 45,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightFloatingStack: {
    alignItems: 'center',
  },
  smallFloatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 12,
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  contentPadding: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  infoCard: {
    padding: 16,
    backgroundColor: Colors.white,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  spotNameText: {
    color: Colors.jetBlack,
    flex: 1,
  },
  categoryBadge: {
    marginTop: 4,
  },
  explorerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.saffron,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Brutalism.borderRadius,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  explorerChipText: {
    ...Typography.captionBold,
    color: Colors.jetBlack,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  locationText: {
    color: Colors.jetBlack,
    marginLeft: 6,
    flex: 1,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 2,
  },
  distanceText: {
    color: Colors.makranTeal,
    marginLeft: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  readOnlyChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Brutalism.borderRadius,
  },
  actionsBar: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButtonContainer: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
  sectionSeparator: {
    marginVertical: 18,
    backgroundColor: Colors.limestone,
  },
  sectionHeader: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.jetBlack,
    marginBottom: 8,
  },
  descriptionText: {
    ...Typography.body,
    color: Colors.jetBlack,
    lineHeight: 22,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  notesIcon: {
    marginTop: 2,
  },
  accessNotesText: {
    ...Typography.body,
    color: Colors.jetBlack,
    lineHeight: 22,
    marginLeft: 8,
    flex: 1,
  },
  mapContainer: {
    height: 160,
    borderRadius: Brutalism.borderRadius,
    overflow: 'hidden',
    marginTop: 4,
    position: 'relative',
  },
  mapPreview: {
    width: '100%',
    height: '100%',
  },
  mapClickOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  mapMarker: {
    backgroundColor: Colors.white,
    padding: 6,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerEmoji: {
    fontSize: 14,
  },
  coordsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: Colors.limestone,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Brutalism.borderRadius,
  },
  coordsText: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.jetBlack,
  },
  coordsHelpText: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.deepClay,
    marginTop: 4,
  },
  submitterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.limestone,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.limestone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitterInfo: {
    marginLeft: 12,
    flex: 1,
  },
  submitterUsername: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: Colors.jetBlack,
  },
  explorerBadgeCount: {
    backgroundColor: Colors.saffron,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Brutalism.borderRadius,
  },
  explorerBadgeCountText: {
    ...Typography.captionBold,
    color: Colors.jetBlack,
  },
  nearbyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllLink: {
    color: Colors.terracotta,
    textDecorationLine: 'underline',
  },
  nearbySpotsList: {
    paddingRight: 16,
    marginTop: 4,
  },
  nearbyCardWrapper: {
    width: 160,
    marginRight: 14,
  },
  nearbyCardImageContainer: {
    height: 100,
    width: '100%',
    position: 'relative',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.jetBlack,
    backgroundColor: Colors.limestone,
  },
  nearbyCardImage: {
    width: '100%',
    height: '100%',
  },
  nearbyCardPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyCardCategory: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  nearbyCardContent: {
    padding: 8,
    backgroundColor: Colors.white,
  },
  nearbyCardName: {
    color: Colors.jetBlack,
  },
  nearbyCardDist: {
    ...Typography.label,
    fontSize: 9,
    color: Colors.makranTeal,
    marginTop: 2,
  },
  reportRow: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.deepClay,
    textDecorationLine: 'underline',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.sand,
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
  errorBtn: {
    width: 160,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  lightboxHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    width: '100%',
    zIndex: 10,
  },
  lightboxCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxScrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  lightboxFooter: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  lightboxSwipeDismissText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  reportSheet: {
    backgroundColor: Colors.sand,
    borderTopLeftRadius: Brutalism.borderRadiusLarge,
    borderTopRightRadius: Brutalism.borderRadiusLarge,
    padding: 20,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.limestone,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  reportSheetTitle: {
    color: Colors.jetBlack,
    marginBottom: 6,
  },
  reportSheetSubtitle: {
    color: Colors.deepClay,
    marginBottom: 20,
  },
  reportReasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  reasonChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Brutalism.borderRadius,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reportSubmitRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  reportSubmitBtn: {
    flex: 1,
  },
  reportCancelBtn: {
    flex: 1,
  },
});
