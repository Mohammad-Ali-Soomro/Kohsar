import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Pressable,
  Alert,
  FlatList,
  Modal,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Circle, UrlTile } from 'react-native-maps';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KCard } from '../../components/ui/KCard';
import { KBadge } from '../../components/ui/KBadge';
import { KButton } from '../../components/ui/KButton';
import { KInput } from '../../components/ui/KInput';
import { useAuthStore } from '../../stores/authStore';
import { useLocationStore } from '../../stores/locationStore';
import { useUIStore } from '../../stores/uiStore';
import { supabase } from '../../lib/supabase';
import { AppStackParamList } from '../../navigation/types';

type MapScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Balochistan Default Region
const BALOCHISTAN_DEFAULT_REGION: Region = {
  latitude: 28.3,
  longitude: 65.7,
  latitudeDelta: 8.0,
  longitudeDelta: 8.0,
};

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

// Custom sandy/warm map style JSON
const CUSTOM_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#F5EDD8" }] // Warm sand
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }] // Remove generic POIs
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#F5EDD8" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#d9c5b6" }]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [{ "color": "#EEDEB7" }] // Slightly darker sand/soil
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#e2d5c3" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#D5E5CF" }] // Soft green parks
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#E4D3A9" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4e4e4e" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#B4D3C5" }] // Teal water
  }
];

export const MapScreen = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  
  // Zustand States
  const { isGuest, setGuestMode } = useAuthStore();
  const { coords, permissionStatus, requestLocationPermission, fetchLocation } = useLocationStore();
  const { showToast } = useUIStore();

  // Component States
  const [mapSpots, setMapSpots] = useState<any[]>([]);
  const [activeMapItems, setActiveMapItems] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(BALOCHISTAN_DEFAULT_REGION);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Search & Filter state
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Guest warning Modal
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  // Reanimated Sheet Animation
  const sheetTranslateY = useSharedValue(300);

  // Check if Google Maps API Key is missing (fallback to OSM)
  const apiKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  const isGoogleKeyMissing = !apiKey || apiKey.includes('YOUR_GOOGLE_MAPS_API_KEY') || apiKey === '';

  // Distance helper
  const getDistanceString = (spotLat: number, spotLng: number) => {
    if (!coords) return null;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
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

  // 1. Fetch Spots
  const loadMapSpots = useCallback(async () => {
    setIsLoading(true);
    const netState = await NetInfo.fetch();
    
    if (!netState.isConnected) {
      setIsOffline(true);
      const cached = await AsyncStorage.getItem('@map_spots_cache');
      if (cached) {
        const spots = JSON.parse(cached);
        setMapSpots(spots);
        runClustering(spots, currentRegion);
      } else {
        setMapSpots([]);
        setActiveMapItems([]);
      }
      setIsLoading(false);
      return;
    }

    setIsOffline(false);
    try {
      const { data, error } = await supabase
        .from('spots')
        .select('id, lat, lng, name, category, cover_photo_url, save_count, is_explorer_claimed, city')
        .eq('is_approved', true);

      if (error) throw error;

      const spots = data || [];
      setMapSpots(spots);
      runClustering(spots, currentRegion);
      await AsyncStorage.setItem('@map_spots_cache', JSON.stringify(spots));
    } catch (err) {
      console.error(err);
      // Fallback
      const cached = await AsyncStorage.getItem('@map_spots_cache');
      if (cached) {
        const spots = JSON.parse(cached);
        setMapSpots(spots);
        runClustering(spots, currentRegion);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentRegion]);

  // Refresh spots on focus
  useFocusEffect(
    useCallback(() => {
      loadMapSpots();
    }, [])
  );

  // 2. Clustering algorithm
  const runClustering = (allSpots: any[], region: Region) => {
    if (region.latitudeDelta < 0.06) {
      // Zoomed in close: don't cluster
      setActiveMapItems(allSpots);
      return;
    }

    const radius = region.latitudeDelta / 8; // radius sensitivity
    const clusters: any[] = [];

    for (const spot of allSpots) {
      let joined = false;
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(Number(spot.lat) - cluster.lat, 2) +
          Math.pow(Number(spot.lng) - cluster.lng, 2)
        );
        if (distance < radius) {
          cluster.spots.push(spot);
          cluster.lat = (cluster.lat * cluster.count + Number(spot.lat)) / (cluster.count + 1);
          cluster.lng = (cluster.lng * cluster.count + Number(spot.lng)) / (cluster.count + 1);
          cluster.count += 1;
          joined = true;
          break;
        }
      }
      if (!joined) {
        clusters.push({
          id: `cluster-${spot.id}`,
          lat: Number(spot.lat),
          lng: Number(spot.lng),
          isCluster: true,
          count: 1,
          spots: [spot],
        });
      }
    }

    // Expand clusters with <= 3 items
    const finalItems: any[] = [];
    for (const item of clusters) {
      if (item.count > 3) {
        finalItems.push(item);
      } else {
        finalItems.push(...item.spots);
      }
    }

    setActiveMapItems(finalItems);
  };

  const handleRegionChangeComplete = (region: Region) => {
    setCurrentRegion(region);
    runClustering(mapSpots, region);
  };

  // Center / Zoom on cluster tap
  const handleClusterPress = (cluster: any) => {
    const nextRegion = {
      latitude: cluster.lat,
      longitude: cluster.lng,
      latitudeDelta: currentRegion.latitudeDelta / 2.5,
      longitudeDelta: currentRegion.longitudeDelta / 2.5,
    };
    mapRef.current?.animateToRegion(nextRegion, 600);
  };

  // Selected Pin details sheet transitions
  useEffect(() => {
    if (selectedSpot) {
      sheetTranslateY.value = withSpring(0, { damping: 15 });
    } else {
      sheetTranslateY.value = withSpring(300);
    }
  }, [selectedSpot]);

  const handleSpotPress = (spot: any) => {
    setSelectedSpot(spot);
    mapRef.current?.animateCamera(
      {
        center: {
          latitude: Number(spot.lat),
          longitude: Number(spot.lng),
        },
      },
      { duration: 500 }
    );
  };

  const handleGetDirections = (spot: any) => {
    const latLng = `${spot.lat},${spot.lng}`;
    const label = encodeURIComponent(spot.name);
    const url = Platform.select({
      ios: `maps://0,0?q=${label}@${latLng}`,
      android: `geo:0,0?q=${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
      });
    }
  };

  // Locate User Action
  const handleLocateUser = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        "Location Permission Required",
        "Kohsar needs your location to show spots near you and calculate your distance to each spot.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Allow Location Access",
            onPress: async () => {
              const granted = await requestLocationPermission();
              if (granted) {
                const loc = await fetchLocation();
                if (loc) {
                  mapRef.current?.animateToRegion({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                  }, 1000);
                }
              } else {
                showToast("Enable location in Settings to see nearby spots", "warning");
              }
            }
          }
        ]
      );
    } else {
      const loc = await fetchLocation();
      if (loc) {
        mapRef.current?.animateToRegion({
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }, 800);
      } else {
        showToast("Couldn't retrieve current GPS coordinates.", "error");
      }
    }
  };

  const handleFABPress = () => {
    if (isGuest) {
      setGuestModalVisible(true);
    } else {
      navigation.navigate('SubmitSpot' as any);
    }
  };

  // Search filter matching
  const searchResults = searchQuery.trim() === ''
    ? []
    : mapSpots.filter(spot =>
        spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        spot.city.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSelectSearchResult = (spot: any) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    handleSpotPress(spot);
  };

  const getCategoryEmoji = (catId: string) => {
    return CATEGORIES.find(c => c.id === catId)?.emoji || '🏖️';
  };

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Filtering opacity
  const isItemHighlighted = (item: any) => {
    if (activeCategory === 'all') return true;
    if (item.isCluster) {
      return item.spots.some((s: any) => s.category === activeCategory);
    }
    return item.category === activeCategory;
  };

  return (
    <View style={styles.container}>
      {/* Map Element */}
      <MapView
        ref={mapRef}
        provider={isGoogleKeyMissing ? undefined : PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={BALOCHISTAN_DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={permissionStatus === 'granted'}
        showsMyLocationButton={false}
        customMapStyle={isGoogleKeyMissing ? undefined : CUSTOM_MAP_STYLE}
        onPress={() => setSelectedSpot(null)}
      >
        {/* Render OSM Tiles if Google Key is missing on Android */}
        {isGoogleKeyMissing && Platform.OS === 'android' && (
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        )}

        {/* User location accuracy circle */}
        {coords && coords.accuracy && coords.accuracy < 500 && (
          <Circle
            center={{
              latitude: coords.latitude,
              longitude: coords.longitude,
            }}
            radius={coords.accuracy}
            strokeColor="rgba(193, 68, 14, 0.4)"
            fillColor="rgba(193, 68, 14, 0.15)"
          />
        )}

        {/* Clustered Pins and Spots */}
        {activeMapItems.map((item) => {
          const highlighted = isItemHighlighted(item);
          const opacity = highlighted ? 1.0 : 0.3;

          if (item.isCluster) {
            return (
              <Marker
                key={item.id}
                coordinate={{ latitude: item.lat, longitude: item.lng }}
                onPress={() => handleClusterPress(item)}
                tracksViewChanges={false}
              >
                <View style={[styles.clusterContainer, { opacity }]}>
                  <View style={styles.clusterShadow} />
                  <View style={styles.clusterCircle}>
                    <Text style={styles.clusterText}>{item.count}</Text>
                  </View>
                </View>
              </Marker>
            );
          }

          const isSelected = selectedSpot?.id === item.id;

          return (
            <Marker
              key={item.id}
              coordinate={{ latitude: Number(item.lat), longitude: Number(item.lng) }}
              onPress={(e) => {
                e.stopPropagation();
                handleSpotPress(item);
              }}
              tracksViewChanges={false}
            >
              <View style={[styles.pinWrapper, { opacity, transform: [{ scale: isSelected ? 1.15 : 1.0 }] }]}>
                {/* Offset Shadow Layer */}
                <View style={styles.pinShadow} />

                {/* Main Pin */}
                <View
                  style={[
                    styles.customMarker,
                    {
                      backgroundColor: (Colors.categories as any)[item.category] || Colors.terracotta,
                      borderColor: isSelected ? Colors.terracotta : Colors.jetBlack,
                    },
                  ]}
                >
                  <Text style={styles.pinEmoji}>{getCategoryEmoji(item.category)}</Text>
                </View>

                {/* Star overlay for explorer-claimed spots */}
                {item.is_explorer_claimed && (
                  <View style={styles.starOverlay}>
                    <Ionicons name="star" size={10} color={Colors.saffron} />
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top Floating Search/Filter Bar */}
      <View style={[styles.floatingSearchBar, Brutalism.border, Brutalism.shadowSmall]}>
        <Pressable
          onPress={() => setFilterModalVisible(true)}
          style={styles.filterButton}
          hitSlop={8}
        >
          <Ionicons
            name={activeCategory === 'all' ? 'funnel-outline' : 'funnel'}
            size={20}
            color={activeCategory === 'all' ? Colors.jetBlack : Colors.terracotta}
          />
        </Pressable>

        <Pressable
          onPress={() => setIsSearchOpen(true)}
          style={styles.searchField}
        >
          <Text style={[Typography.body, { color: Colors.deepClay }]} numberOfLines={1}>
            Search spots on map...
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLocateUser}
          style={styles.searchLocateBtn}
          hitSlop={8}
        >
          <Ionicons name="locate-outline" size={20} color={Colors.jetBlack} />
        </Pressable>
      </View>

      {/* Offline Alert Banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, Brutalism.border]}>
          <Ionicons name="cloud-offline" size={16} color={Colors.sand} />
          <Text style={[Typography.captionBold, { color: Colors.sand, marginLeft: 6 }]}>
            Offline — showing cached spots
          </Text>
        </View>
      )}

      {/* Locate Me Floating Button (Compass) */}
      <View style={[styles.locateFloatingButton, { bottom: selectedSpot ? 240 : 30 }]}>
        <KButton
          label=""
          onPress={handleLocateUser}
          variant="secondary"
          size="sm"
          icon={<Ionicons name="compass-outline" size={22} color={Colors.jetBlack} />}
          style={styles.fabBtnIcon}
        />
      </View>

      {/* Add Spot FAB */}
      <View style={[styles.addSpotFAB, { bottom: selectedSpot ? 240 : 30 }]}>
        <Pressable
          onPress={handleFABPress}
          style={[styles.fabCircle, Brutalism.border, Brutalism.shadow]}
        >
          <Ionicons name="add" size={28} color={Colors.sand} />
        </Pressable>
      </View>

      {/* Empty State Overlay */}
      {mapSpots.length === 0 && !isLoading && (
        <View style={styles.emptyStateOverlay}>
          <KCard style={styles.emptyStateCard}>
            <Text style={[Typography.heading3, { textAlign: 'center', color: Colors.jetBlack }]}>
              📍 No Spots Discovered Yet
            </Text>
            <Text style={[Typography.body, { textAlign: 'center', color: Colors.deepClay, marginTop: 8 }]}>
              Balochistan map is blank. Explore the mountains and add the first spot!
            </Text>
            <KButton
              label="Add First Spot"
              onPress={handleFABPress}
              variant="primary"
              style={{ marginTop: 16 }}
            />
          </KCard>
        </View>
      )}

      {/* Selected Spot Detail Preview Sheet */}
      {selectedSpot && (
        <Animated.View style={[styles.sheetContainer, Brutalism.border, animatedSheetStyle]}>
          <View style={styles.dragHandle} />
          
          <View style={styles.sheetLayoutRow}>
            {/* Thumbnail */}
            {selectedSpot.cover_photo_url ? (
              <Image
                source={{ uri: selectedSpot.cover_photo_url }}
                style={[styles.sheetThumbnail, Brutalism.borderLight]}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.sheetThumbnail, styles.sheetImagePlaceholder, Brutalism.borderLight]}>
                <Ionicons name="image-outline" size={28} color={Colors.deepClay} />
              </View>
            )}

            {/* Details */}
            <View style={styles.sheetDetails}>
              <Text style={[Typography.heading3, styles.sheetTitle]} numberOfLines={1}>
                {selectedSpot.name}
              </Text>
              
              <View style={styles.sheetBadgeRow}>
                <KBadge
                  label={selectedSpot.category.toUpperCase()}
                  color={(Colors.categories as any)[selectedSpot.category] || Colors.terracotta}
                  size="sm"
                />
                <Text style={[Typography.caption, { color: Colors.deepClay, marginLeft: 8 }]}>
                  {selectedSpot.city}
                </Text>
              </View>

              <View style={styles.sheetStatsRow}>
                <View style={styles.sheetStatItem}>
                  <Ionicons name="heart" size={14} color={Colors.terracotta} />
                  <Text style={[Typography.captionBold, { color: Colors.jetBlack, marginLeft: 4 }]}>
                    {selectedSpot.save_count || 0} saves
                  </Text>
                </View>
                {coords && (
                  <Text style={[Typography.captionBold, { color: Colors.makranTeal, marginLeft: 12 }]}>
                    {getDistanceString(Number(selectedSpot.lat), Number(selectedSpot.lng))}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.sheetButtonRow}>
            <View style={{ flex: 1.2 }}>
              <KButton
                label="View Details"
                onPress={() => {
                  setSelectedSpot(null);
                  navigation.navigate('SpotDetails', { spotId: selectedSpot.id });
                }}
                variant="primary"
                size="sm"
              />
            </View>
            <View style={{ flex: 1 }}>
              <KButton
                label="Directions"
                onPress={() => handleGetDirections(selectedSpot)}
                variant="ghost"
                size="sm"
                icon={<Ionicons name="navigate-outline" size={16} color={Colors.jetBlack} />}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Category Filter Bottom Modal */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={[styles.filterSheet, Brutalism.border]}>
            <View style={styles.dragHandle} />
            <Text style={[Typography.heading2, styles.filterTitle]}>Filter by Category</Text>
            
            <View style={styles.filterGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = activeCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setActiveCategory(cat.id)}
                      style={[
                        styles.filterChipItem,
                        Brutalism.borderLight,
                        {
                          backgroundColor: isSelected
                            ? (Colors.categories as any)[cat.id] || Colors.terracotta
                            : Colors.white,
                        },
                      ]}
                  >
                    <Text
                      style={[
                        Typography.captionBold,
                        { color: isSelected ? Colors.sand : Colors.jetBlack }
                      ]}
                    >
                      {cat.emoji} {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <KButton
              label="Apply Filter"
              onPress={() => {
                setFilterModalVisible(false);
                runClustering(mapSpots, currentRegion);
              }}
              variant="primary"
              style={{ marginTop: 24 }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Map Search Overlay Modal */}
      <Modal
        visible={isSearchOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsSearchOpen(false)}
      >
        <View style={styles.searchOverlay}>
          {/* Header */}
          <View style={styles.searchHeader}>
            <Pressable
              onPress={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              style={styles.searchBackBtn}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.jetBlack} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <KInput
                placeholder="Search spots, cities..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
                icon={<Ionicons name="search" size={18} color={Colors.jetBlack} />}
              />
            </View>
          </View>

          {/* Results list */}
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.searchResultsList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectSearchResult(item)}
                style={[styles.searchResultItem, Brutalism.borderLight]}
              >
                <View style={styles.searchResultLeft}>
                  <Text style={[Typography.body, { fontFamily: 'Inter-SemiBold', color: Colors.jetBlack }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[Typography.caption, { color: Colors.deepClay, marginTop: 2 }]}>
                    {item.city}
                  </Text>
                </View>
                <KBadge
                  label={item.category.toUpperCase()}
                  color={(Colors.categories as any)[item.category] || Colors.terracotta}
                  size="sm"
                />
              </Pressable>
            )}
            ListEmptyComponent={
              searchQuery.trim().length > 0 ? (
                <View style={styles.searchEmptyContainer}>
                  <Text style={[Typography.body, { color: Colors.deepClay }]}>No matching spots found.</Text>
                </View>
              ) : (
                <View style={styles.searchEmptyContainer}>
                  <Text style={[Typography.body, { color: Colors.deepClay }]}>Type Gwadar, Waterfall, etc. to search...</Text>
                </View>
              )
            }
          />
        </View>
      </Modal>

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
          <Pressable style={[styles.filterSheet, Brutalism.border]}>
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
  map: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  clusterContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  clusterShadow: {
    position: 'absolute',
    width: 32,
    height: 32,
    backgroundColor: Colors.jetBlack,
    borderRadius: 16,
    top: 5,
    left: 5,
  },
  clusterCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: Colors.jetBlack,
    borderRadius: 16,
    backgroundColor: Colors.terracotta,
    top: 1,
    left: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: Colors.sand,
  },
  pinWrapper: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pinShadow: {
    position: 'absolute',
    width: 26,
    height: 26,
    backgroundColor: Colors.jetBlack,
    borderRadius: 6,
    top: 5,
    left: 5,
  },
  customMarker: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: Colors.jetBlack,
    borderRadius: 6,
    top: 1,
    left: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEmoji: {
    fontSize: 12,
    lineHeight: 14,
  },
  starOverlay: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: Colors.jetBlack,
    borderRadius: 6,
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingSearchBar: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    height: 52,
    backgroundColor: Colors.white,
    borderRadius: Brutalism.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  filterButton: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  searchLocateBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: {
    position: 'absolute',
    top: 116,
    left: 16,
    right: 16,
    backgroundColor: Colors.terracotta,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Brutalism.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  locateFloatingButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  addSpotFAB: {
    position: 'absolute',
    right: 16,
    marginRight: 64, // Keep spacing between Locate Me andFAB
    zIndex: 10,
  },
  fabBtnIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Brutalism.borderRadius,
  },
  fabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateOverlay: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    zIndex: 10,
  },
  emptyStateCard: {
    padding: 24,
    backgroundColor: Colors.white,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    height: 220,
    backgroundColor: Colors.white,
    borderRadius: Brutalism.borderRadiusLarge,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    zIndex: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.limestone,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetLayoutRow: {
    flexDirection: 'row',
    height: 96,
  },
  sheetThumbnail: {
    width: 96,
    height: 96,
    borderRadius: Brutalism.borderRadius,
    backgroundColor: Colors.limestone,
  },
  sheetImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  sheetTitle: {
    color: Colors.jetBlack,
    marginBottom: 4,
  },
  sheetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sheetStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: Colors.sand,
    borderTopLeftRadius: Brutalism.borderRadiusLarge,
    borderTopRightRadius: Brutalism.borderRadiusLarge,
    padding: 20,
    paddingBottom: 34,
  },
  filterTitle: {
    color: Colors.jetBlack,
    marginBottom: 16,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChipItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Brutalism.borderRadius,
    width: '48%', // 2 columns layout
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchOverlay: {
    flex: 1,
    backgroundColor: Colors.sand,
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  searchBackBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsList: {
    padding: 16,
    gap: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: Brutalism.borderRadius,
  },
  searchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  searchEmptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
