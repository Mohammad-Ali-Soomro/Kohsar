import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Pressable,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Brutalism } from '../constants/theme';
import { KCard } from '../components/ui/KCard';
import { KBadge } from '../components/ui/KBadge';
import { KButton } from '../components/ui/KButton';
import { useSpotsStore, NearbySpot } from '../stores/spotsStore';
import { useLocationStore } from '../stores/locationStore';
import { AppStackParamList } from '../navigation/types';

type MapScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const { width } = Dimensions.get('window');

// Default center region: Balochistan, Pakistan coordinates
const BALOCHISTAN_DEFAULT_REGION: Region = {
  latitude: 28.5000,
  longitude: 65.5000,
  latitudeDelta: 4.5,
  longitudeDelta: 4.5,
};

export const MapScreen = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  
  const { coords, requestLocationPermission } = useLocationStore();
  const { nearbySpots, fetchNearby, isLoading } = useSpotsStore();
  
  const [selectedSpot, setSelectedSpot] = useState<NearbySpot | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(BALOCHISTAN_DEFAULT_REGION);

  // Request location on mount and center if location available
  useEffect(() => {
    const initLocation = async () => {
      const granted = await requestLocationPermission();
      if (granted && coords) {
        const userRegion = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        };
        setCurrentRegion(userRegion);
        mapRef.current?.animateToRegion(userRegion, 1000);
        fetchNearby(coords.latitude, coords.longitude);
      } else {
        // Fetch using default coordinates
        fetchNearby(BALOCHISTAN_DEFAULT_REGION.latitude, BALOCHISTAN_DEFAULT_REGION.longitude);
      }
    };
    initLocation();
  }, [coords?.latitude, coords?.longitude, requestLocationPermission]);

  const handleRegionChangeComplete = (region: Region) => {
    setCurrentRegion(region);
    // Fetch spots near the new map center when user stops panning
    fetchNearby(region.latitude, region.longitude, Math.max(50, Math.round(region.latitudeDelta * 111)));
  };

  const handleRecenter = () => {
    if (coords) {
      const userRegion = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      mapRef.current?.animateToRegion(userRegion, 800);
      fetchNearby(coords.latitude, coords.longitude);
    } else {
      requestLocationPermission();
    }
  };

  const handleMarkerPress = (spot: NearbySpot) => {
    setSelectedSpot(spot);
    
    // Smoothly pan camera to center the tapped marker
    mapRef.current?.animateCamera({
      center: {
        latitude: Number(spot.lat),
        longitude: Number(spot.lng),
      }
    }, { duration: 500 });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={BALOCHISTAN_DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedSpot(null)}
      >
        {nearbySpots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{
              latitude: Number(spot.lat),
              longitude: Number(spot.lng),
            }}
            onPress={(e) => {
              e.stopPropagation();
              handleMarkerPress(spot);
            }}
            tracksViewChanges={false}
          >
            {/* Custom Neo-Brutalist Map Pin */}
            <View
              style={[
                styles.customMarker,
                Brutalism.shadowSmall,
                {
                  backgroundColor: Colors.categories[spot.category] || Colors.terracotta,
                  transform: [{ scale: selectedSpot?.id === spot.id ? 1.2 : 1.0 }],
                },
              ]}
            >
              <Ionicons
                name={selectedSpot?.id === spot.id ? 'pin' : 'pin-outline'}
                size={14}
                color={Colors.sand}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Recenter Button */}
      <Pressable
        onPress={handleRecenter}
        style={[
          styles.recenterButton,
          Brutalism.border,
          Brutalism.shadowSmall,
          { backgroundColor: Colors.white },
        ]}
      >
        <Ionicons name="locate" size={24} color={Colors.terracotta} />
      </Pressable>

      {/* Floating Header */}
      <View style={[styles.floatingHeader, Brutalism.border, { backgroundColor: Colors.sand }]}>
        <Ionicons name="map" size={18} color={Colors.jetBlack} />
        <Text style={[Typography.bodyMedium, { color: Colors.jetBlack }]}>
          {isLoading ? 'Scanning Balochistan...' : `${nearbySpots.length} spots nearby`}
        </Text>
      </View>

      {/* Floating Detail Preview Card */}
      {selectedSpot && (
        <View style={styles.previewContainer}>
          <KCard
            onPress={() => navigation.navigate('SpotDetails', { spotId: selectedSpot.id })}
            style={styles.previewCard}
          >
            <View style={styles.previewContent}>
              {selectedSpot.cover_photo_url ? (
                <Image
                  source={{ uri: selectedSpot.cover_photo_url }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.previewImage, styles.previewImagePlaceholder]}>
                  <Ionicons name="image" size={32} color={Colors.deepClay} />
                </View>
              )}

              <View style={styles.previewDetails}>
                <KBadge
                  label={selectedSpot.category.toUpperCase()}
                  color={Colors.categories[selectedSpot.category] || Colors.terracotta}
                  size="sm"
                  style={styles.previewBadge}
                />
                
                <Text style={[Typography.heading3, styles.previewTitle]} numberOfLines={1}>
                  {selectedSpot.name}
                </Text>
                
                <Text style={[Typography.caption, { color: Colors.deepClay }]} numberOfLines={1}>
                  <Ionicons name="location" size={12} color={Colors.deepClay} />{' '}
                  {selectedSpot.city}
                </Text>

                <View style={styles.previewFooter}>
                  <Text style={[Typography.captionBold, { color: Colors.terracotta }]}>
                    {selectedSpot.distance_km} km away
                  </Text>
                  <View style={styles.goButton}>
                    <Text style={[Typography.captionBold, { color: Colors.sand }]}>Open</Text>
                    <Ionicons name="chevron-forward" size={12} color={Colors.sand} />
                  </View>
                </View>
              </View>
            </View>
          </KCard>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  customMarker: {
    padding: 8,
    borderWidth: 1.5,
    borderColor: Colors.jetBlack,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Brutalism.borderRadiusLarge,
    zIndex: 10,
  },
  previewContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: width - 90, // Leave space for recenter button
    zIndex: 10,
  },
  previewCard: {
    marginBottom: 0,
  },
  previewContent: {
    flexDirection: 'row',
    padding: 10,
    height: 124,
  },
  previewImage: {
    width: 100,
    height: '100%',
    borderRadius: Brutalism.borderRadius,
  },
  previewImagePlaceholder: {
    backgroundColor: Colors.limestone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  previewBadge: {
    marginBottom: 2,
  },
  previewTitle: {
    color: Colors.jetBlack,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  goButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.jetBlack,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Brutalism.borderRadius,
  },
});
