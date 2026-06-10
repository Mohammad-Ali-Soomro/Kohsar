import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Linking,
  Modal,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Colors, Typography, Brutalism } from '../constants/theme';
import { KHeader } from '../components/ui/KHeader';
import { KCard } from '../components/ui/KCard';
import { KBadge } from '../components/ui/KBadge';
import { KButton } from '../components/ui/KButton';
import { KInput } from '../components/ui/KInput';
import { KSeparator } from '../components/ui/KSeparator';
import { KLoadingSpinner } from '../components/ui/KLoadingSpinner';
import { useSpotsStore, Spot } from '../stores/spotsStore';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { AppStackParamList } from '../navigation/types';

type SpotDetailsRouteProp = RouteProp<AppStackParamList, 'SpotDetails'>;

export const SpotDetailsScreen = () => {
  const route = useRoute<SpotDetailsRouteProp>();
  const navigation = useNavigation();
  const { spotId } = route.params;

  const { savedSpotIds, visitedSpotIds, saveSpot, unsaveSpot, markVisited } = useSpotsStore();
  const { showToast } = useUIStore();
  const { profile } = useAuthStore();

  const [spot, setSpot] = useState<Spot | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Visit check-in modal
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  const isSaved = savedSpotIds.has(spotId);
  const isVisited = visitedSpotIds.has(spotId);

  const fetchSpotDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch spot details with submitter and photos
      const { data, error } = await supabase
        .from('spots')
        .select('*, profiles(username, full_name, avatar_url), spot_photos(*)')
        .eq('id', spotId)
        .single();

      if (error) throw error;
      setSpot(data as Spot);

      // 2. Fetch reviews/visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('*, profiles(username, avatar_url)')
        .eq('spot_id', spotId)
        .order('visited_at', { ascending: false });

      if (visitsError) throw visitsError;
      setReviews(visitsData || []);
    } catch (err: any) {
      console.error(err);
      showToast('Could not load spot details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpotDetails();
  }, [spotId]);

  const handleToggleSave = async () => {
    if (isSaved) {
      await unsaveSpot(spotId);
      showToast('Removed from saved spots.', 'info');
    } else {
      await saveSpot(spotId);
      showToast('Added to saved spots!', 'success');
    }
  };

  const handleDirections = () => {
    if (!spot) return;
    const lat = spot.lat;
    const lng = spot.lng;
    const label = encodeURIComponent(spot.name);
    
    // Open in native map directions
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}(${label})`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web url
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  const handleShare = async () => {
    if (!spot) return;
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing is not available on this device');
      return;
    }

    try {
      await Sharing.shareAsync(spot.cover_photo_url || '', {
        dialogTitle: `Explore ${spot.name}`,
        mimeType: 'image/jpeg',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCheckIn = async () => {
    setSubmittingCheckIn(true);
    try {
      await markVisited(spotId, reviewText);
      setCheckInVisible(false);
      setReviewText('');
      showToast('Checked in! Spot marked as visited.', 'success');
      
      // Reload details to reflect new visit and badges
      fetchSpotDetails();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to check in.', 'error');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingCenter]}>
        <KLoadingSpinner />
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.container}>
        <KHeader title="Details" onBackPress={() => navigation.goBack()} />
        <Text style={[Typography.bodyMedium, styles.errorText]}>Spot not found.</Text>
      </View>
    );
  }

  // Compile photos gallery (cover photo + extra photos)
  const galleryPhotos = [
    spot.cover_photo_url,
    ...(spot.spot_photos?.map((p) => p.photo_url) || []),
  ].filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      <KHeader title={spot.name} onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo Gallery Carousel */}
        <View style={[styles.galleryWrapper, Brutalism.border]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryScroll}
          >
            {galleryPhotos.map((url, index) => (
              <Image
                key={index}
                source={{ uri: url }}
                style={styles.galleryImage}
                contentFit="cover"
              />
            ))}
          </ScrollView>
          <View style={styles.photoCountBadge}>
            <Text style={[Typography.captionBold, { color: Colors.sand }]}>
              1 / {galleryPhotos.length}
            </Text>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <KButton
            label={isSaved ? 'Saved' : 'Save Spot'}
            onPress={handleToggleSave}
            variant={isSaved ? 'primary' : 'secondary'}
            size="sm"
            style={styles.actionBtn}
            icon={<Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={16} />}
          />
          <KButton
            label={isVisited ? 'Visited' : 'Check In'}
            onPress={() => setCheckInVisible(true)}
            variant={isVisited ? 'primary' : 'secondary'}
            size="sm"
            disabled={isVisited}
            style={styles.actionBtn}
            icon={<Ionicons name="checkmark-circle-outline" size={16} />}
          />
          <KButton
            label="Share"
            onPress={handleShare}
            variant="secondary"
            size="sm"
            style={styles.shareBtn}
            icon={<Ionicons name="share-social-outline" size={16} />}
          />
        </View>

        {/* Spot Identity Info */}
        <KCard backgroundColor={Colors.white} style={styles.detailsCard}>
          <View style={styles.metaRow}>
            <KBadge
              label={spot.category.toUpperCase()}
              color={Colors.categories[spot.category] || Colors.terracotta}
            />
            {spot.is_explorer_claimed && (
              <View style={styles.explorerClaimedBadge}>
                <Ionicons name="trophy" size={12} color={Colors.jetBlack} />
                <Text style={Typography.label}>EXPLORED</Text>
              </View>
            )}
          </View>

          <Text style={[Typography.heading1, styles.spotName]}>{spot.name}</Text>
          <Text style={[Typography.caption, styles.locationText]}>
            <Ionicons name="location" size={14} color={Colors.terracotta} />{' '}
            {spot.city}, {spot.district || 'Balochistan'}
          </Text>

          <KSeparator style={styles.metaSeparator} />

          <Text style={[Typography.body, styles.descriptionText]}>
            {spot.description}
          </Text>
        </KCard>

        {/* Travel Guide Card */}
        <KCard backgroundColor={Colors.sand} style={styles.guideCard}>
          <Text style={[Typography.heading3, { color: Colors.jetBlack, marginBottom: 12 }]}>
            Travel & Hike Guide
          </Text>

          <View style={styles.guideGrid}>
            <View style={styles.guideItem}>
              <Ionicons name="time-outline" size={20} color={Colors.terracotta} />
              <View>
                <Text style={Typography.captionBold}>Best Season</Text>
                <Text style={Typography.caption}>{spot.best_season || 'Anytime'}</Text>
              </View>
            </View>

            <View style={styles.guideItem}>
              <Ionicons name="speedometer-outline" size={20} color={Colors.terracotta} />
              <View>
                <Text style={Typography.captionBold}>Difficulty</Text>
                <Text style={Typography.caption}>{spot.difficulty?.toUpperCase() || 'Not rated'}</Text>
              </View>
            </View>
          </View>

          {spot.access_notes && (
            <View style={styles.accessNotesContainer}>
              <Text style={Typography.captionBold}>Road Conditions & Access:</Text>
              <Text style={[Typography.caption, { marginTop: 2, color: Colors.deepClay }]}>
                {spot.access_notes}
              </Text>
            </View>
          )}

          <KButton
            label="Get Directions"
            variant="secondary"
            onPress={handleDirections}
            icon={<Ionicons name="map-outline" size={16} />}
            style={styles.directionsBtn}
          />
        </KCard>

        {/* Submitter Info */}
        <View style={styles.submitterSection}>
          <Text style={[Typography.captionBold, { color: Colors.deepClay }]}>LOGGED BY</Text>
          <View style={styles.submitterRow}>
            <Ionicons name="person-circle" size={32} color={Colors.terracotta} />
            <View>
              <Text style={Typography.bodyMedium}>@{spot.profiles?.username || 'anonymous'}</Text>
              <Text style={Typography.caption}>Explorer in Balochistan</Text>
            </View>
          </View>
        </View>

        {/* Community Check-Ins & Reviews */}
        <View style={styles.reviewsSection}>
          <Text style={[Typography.heading2, styles.sectionTitle]}>Explorer Check-ins</Text>
          {reviews.length === 0 ? (
            <Text style={[Typography.body, { color: Colors.deepClay, fontStyle: 'italic' }]}>
              No one has checked in here yet. Be the first to claim a visit!
            </Text>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((rev, index) => (
                <KCard key={rev.id || index} backgroundColor={Colors.white} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Ionicons name="person-circle-outline" size={24} color={Colors.makranTeal} />
                    <View style={styles.reviewUser}>
                      <Text style={Typography.bodyMedium}>@{rev.profiles?.username || 'explorer'}</Text>
                      <Text style={Typography.caption}>
                        {new Date(rev.visited_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  {rev.review ? (
                    <Text style={[Typography.body, styles.reviewComment]}>"{rev.review}"</Text>
                  ) : (
                    <Text style={[Typography.caption, styles.reviewComment, { fontStyle: 'italic', color: Colors.deepClay }]}>
                      Checked in and visited.
                    </Text>
                  )}
                </KCard>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Check In Modal */}
      <Modal
        visible={checkInVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckInVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KCard backgroundColor={Colors.white} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={Typography.heading2}>Log Your Visit</Text>
              <Pressable onPress={() => setCheckInVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={Colors.jetBlack} />
              </Pressable>
            </View>
            
            <Text style={[Typography.body, { color: Colors.deepClay, marginBottom: 16 }]}>
              Confirm that you have reached this spot. Leaving a note helps fellow explorers travel safely!
            </Text>

            <KInput
              label="Leave a travel note (Optional)"
              placeholder="e.g. Clean water source nearby, road is muddy but passable..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />

            <KButton
              label={submittingCheckIn ? 'Confirming...' : 'I Am Here Now!'}
              onPress={handleCheckIn}
              loading={submittingCheckIn}
              style={styles.modalSubmitBtn}
            />
          </KCard>
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
  loadingCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    margin: 20,
    textAlign: 'center',
    color: Colors.error,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  galleryWrapper: {
    height: 220,
    position: 'relative',
    borderRadius: Brutalism.borderRadiusLarge,
    overflow: 'hidden',
    backgroundColor: Colors.limestone,
  },
  galleryScroll: {
    flexGrow: 1,
  },
  galleryImage: {
    width: Dimensions.get('window').width - 32, // Match parent padding width
    height: '100%',
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(26,26,26,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Brutalism.borderRadius,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 2,
  },
  shareBtn: {
    flex: 1,
  },
  detailsCard: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  explorerClaimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.saffron,
    borderColor: Colors.jetBlack,
    borderWidth: 1.5,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Brutalism.borderRadius,
  },
  spotName: {
    color: Colors.jetBlack,
    marginBottom: 4,
  },
  locationText: {
    color: Colors.deepClay,
    alignItems: 'center',
  },
  metaSeparator: {
    marginVertical: 12,
  },
  descriptionText: {
    lineHeight: 22,
    color: Colors.jetBlack,
  },
  guideCard: {
    padding: 16,
  },
  guideGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  guideItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accessNotesContainer: {
    borderTopWidth: 1.5,
    borderColor: Colors.limestone,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  directionsBtn: {
    width: '100%',
  },
  submitterSection: {
    backgroundColor: Colors.white,
    borderColor: Colors.jetBlack,
    borderWidth: 1.5,
    borderRadius: Brutalism.borderRadius,
    padding: 12,
    gap: 8,
  },
  submitterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    color: Colors.jetBlack,
    marginBottom: 12,
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    padding: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reviewUser: {
    flex: 1,
  },
  reviewComment: {
    marginLeft: 32,
    color: Colors.jetBlack,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    marginTop: 8,
  },
});
