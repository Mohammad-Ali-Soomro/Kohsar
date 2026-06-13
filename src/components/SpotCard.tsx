import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Brutalism } from '../constants/theme';
import { KCard } from './ui/KCard';
import { KBadge } from './ui/KBadge';
import { KSeparator } from './ui/KSeparator';
import { Spot } from '../stores/spotsStore';

interface SpotCardProps {
  spot: Spot;
  onPress: () => void;
  onSavePress: () => void;
  onVisitPress: () => void;
  onSharePress: () => void;
  isSaved: boolean;
  isVisited: boolean;
  distance: string | null;
  isCached?: boolean;
}

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

export const SpotCard: React.FC<SpotCardProps> = ({
  spot,
  onPress,
  onSavePress,
  onVisitPress,
  onSharePress,
  isSaved,
  isVisited,
  distance,
  isCached = false,
}) => {
  const daysAgo = getDaysAgoString(spot.created_at);
  const username = spot.profiles?.username || 'anonymous';

  // Shimmer animation state
  const [imageLoading, setImageLoading] = useState(true);
  const shimmerOpacity = useSharedValue(0.35);

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withTiming(0.65, { duration: 750, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      true
    );
  }, []);

  const animatedShimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <KCard
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={`${spot.name}, spot in ${spot.city}. Tap to view details`}
      accessibilityRole="button"
    >
      {/* Cover Image Container */}
      <View style={styles.imageContainer}>
        {spot.cover_photo_url ? (
          <>
            <Image
              source={{ uri: spot.cover_photo_url }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
            {imageLoading && (
              <Animated.View style={[styles.imageShimmer, animatedShimmerStyle]} />
            )}
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={Colors.deepClay} />
          </View>
        )}

        {/* Floating Explorer Badge (Top Left) */}
        {spot.is_explorer_claimed && (
          <KBadge
            label="EXPLORER"
            color={Colors.saffron}
            size="sm"
            style={styles.explorerBadge}
          />
        )}

        {/* Floating Cached Badge */}
        {isCached && (
          <KBadge
            label="CACHED"
            color={Colors.saffron}
            size="sm"
            style={styles.cachedBadge}
          />
        )}

        {/* Floating Category Badge (Top Right) */}
        <KBadge
          label={spot.category.toUpperCase()}
          color={Colors.categories[spot.category] || Colors.terracotta}
          size="sm"
          style={styles.categoryBadge}
        />
      </View>

      {/* Card Content area */}
      <View style={styles.content}>
        {/* Row 1: Name and Distance */}
        <View style={styles.titleRow}>
          <Text style={[Typography.heading3, styles.spotName]} numberOfLines={1}>
            {spot.name}
          </Text>
          {distance && (
            <Text style={[Typography.captionBold, { color: Colors.makranTeal }]}>
              {distance}
            </Text>
          )}
        </View>

        {/* Row 2: Location line */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={Colors.terracotta} />
          <Text style={[Typography.caption, { color: Colors.deepClay, marginLeft: 2 }]} numberOfLines={1}>
            {spot.city}, {spot.district || 'Balochistan'}
          </Text>
        </View>

        {/* Row 3: Truncated Description */}
        <Text style={[Typography.body, styles.description]} numberOfLines={2}>
          {spot.description}
        </Text>

        {/* Row 4: Action buttons */}
        <View style={styles.actionRow}>
          {/* Save Action */}
          <Pressable
            onPress={onSavePress}
            style={[
              styles.actionButton,
              Brutalism.borderLight,
              { backgroundColor: isSaved ? Colors.terracotta : Colors.white },
            ]}
            hitSlop={8}
            accessibilityLabel={isSaved ? `Unsave spot. Current saves: ${spot.save_count || 0}` : `Save spot. Current saves: ${spot.save_count || 0}`}
            accessibilityRole="button"
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={16}
              color={isSaved ? Colors.sand : Colors.jetBlack}
            />
            <Text
              style={[
                Typography.captionBold,
                { color: isSaved ? Colors.sand : Colors.jetBlack, marginLeft: 4 },
              ]}
            >
              {spot.save_count || 0}
            </Text>
          </Pressable>

          {/* Visit Action */}
          <Pressable
            onPress={onVisitPress}
            style={[
              styles.actionButton,
              Brutalism.borderLight,
              { backgroundColor: isVisited ? Colors.makranTeal : Colors.white },
            ]}
            hitSlop={8}
            accessibilityLabel={isVisited ? `Mark as unvisited. Current visits: ${spot.visit_count || 0}` : `Mark as visited. Current visits: ${spot.visit_count || 0}`}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="foot-print"
              size={16}
              color={isVisited ? Colors.sand : Colors.jetBlack}
            />
            <Text
              style={[
                Typography.captionBold,
                { color: isVisited ? Colors.sand : Colors.jetBlack, marginLeft: 4 },
              ]}
            >
              {spot.visit_count || 0}
            </Text>
          </Pressable>

          {/* Share Action */}
          <Pressable
            onPress={onSharePress}
            style={[styles.shareButton, Brutalism.borderLight]}
            hitSlop={8}
            accessibilityLabel="Share spot"
            accessibilityRole="button"
          >
            <Ionicons name="share-social-outline" size={16} color={Colors.jetBlack} />
          </Pressable>
        </View>

        <KSeparator style={styles.cardSeparator} thickness={1} color={Colors.limestone} />

        {/* Bottom Explorer Tag */}
        <Text style={[Typography.caption, styles.authorText]}>
          Added by <Text style={Typography.captionBold}>@{username}</Text> · {daysAgo}
        </Text>
      </View>
    </KCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.limestone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 5,
  },
  cachedBadge: {
    position: 'absolute',
    top: 10,
    right: 85,
    zIndex: 5,
  },
  imageShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.limestone,
  },
  explorerBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 5,
  },
  content: {
    backgroundColor: Colors.white,
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  spotName: {
    flex: 1,
    marginRight: 10,
    color: Colors.jetBlack,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  description: {
    color: Colors.jetBlack,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Brutalism.borderRadius,
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: Brutalism.borderRadius,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSeparator: {
    marginVertical: 8,
  },
  authorText: {
    color: Colors.deepClay,
  },
});
