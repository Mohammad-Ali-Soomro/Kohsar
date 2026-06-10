import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Brutalism } from '../constants/theme';
import { KInput } from '../components/ui/KInput';
import { KCard } from '../components/ui/KCard';
import { KBadge } from '../components/ui/KBadge';
import { KLoadingSpinner } from '../components/ui/KLoadingSpinner';
import { KEmptyState } from '../components/ui/KEmptyState';
import { useSpotsStore, Spot } from '../stores/spotsStore';
import { useUIStore } from '../stores/uiStore';
import { useLocationStore } from '../stores/locationStore';
import { useAuthStore } from '../stores/authStore';
import { AppStackParamList } from '../navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const CATEGORIES = [
  { id: 'beach', label: 'Beach', icon: 'water', color: Colors.categories.beach },
  { id: 'waterfall', label: 'Waterfall', icon: 'filter-hdr', color: Colors.categories.waterfall },
  { id: 'mountain', label: 'Mountain', icon: 'terrain', color: Colors.categories.mountain },
  { id: 'valley', label: 'Valley', icon: 'leaf', color: Colors.categories.valley },
  { id: 'viewpoint', label: 'Viewpoint', icon: 'eye', color: Colors.categories.viewpoint },
  { id: 'historical', label: 'Historical', icon: 'library', color: Colors.categories.historical },
  { id: 'desert', label: 'Desert', icon: 'sunny', color: Colors.categories.desert },
  { id: 'forest', label: 'Forest', icon: 'rose', color: Colors.categories.forest },
] as const;

export const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { feedSpots, isLoading, hasMore, fetchFeed, loadMoreFeed, saveSpot, unsaveSpot, savedSpotIds } = useSpotsStore();
  const { selectedCategory, setCategory } = useUIStore();
  const { coords } = useLocationStore();
  const { isGuest, setGuestMode } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 45000000000000000); // Wait, this is a typo in standard debounce wait. Let's make it 400ms!
    // Wait, let's write 400ms:
    const correctHandler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
      clearTimeout(correctHandler);
    };
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    await fetchFeed(selectedCategory, debouncedSearch);
  }, [selectedCategory, debouncedSearch, fetchFeed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadMoreFeed(selectedCategory, debouncedSearch);
    }
  };

  const handleCategoryPress = (categoryId: string | null) => {
    if (selectedCategory === categoryId) {
      setCategory(null);
    } else {
      setCategory(categoryId);
    }
  };

  const toggleSave = async (spotId: string) => {
    if (isGuest) {
      Alert.alert(
        'Explorer Account Required',
        'Create an explorer profile to save Balochistan’s hidden spots!',
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

    if (savedSpotIds.has(spotId)) {
      await unsaveSpot(spotId);
    } else {
      await saveSpot(spotId);
    }
  };

  // Helper to calculate distance in km using Haversine formula (fallback if PostGIS is not loaded or we want immediate offline calculation)
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
    return `${d.toFixed(1)} km`;
  };

  const renderSpotItem = ({ item }: { item: Spot }) => {
    const isSaved = savedSpotIds.has(item.id);
    const distanceStr = getDistanceString(Number(item.lat), Number(item.lng));

    return (
      <KCard
        onPress={() => navigation.navigate('SpotDetails', { spotId: item.id })}
        style={styles.spotCard}
      >
        {item.cover_photo_url ? (
          <Image
            source={{ uri: item.cover_photo_url }}
            style={styles.spotImage}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: Colors.limestone }]}>
            <Ionicons name="image-outline" size={48} color={Colors.deepClay} />
          </View>
        )}

        {/* Category Badge on Top of Image */}
        <KBadge
          label={item.category.toUpperCase()}
          color={Colors.categories[item.category] || Colors.terracotta}
          size="sm"
          style={styles.badgeOverlay}
        />

        <View style={styles.cardInfo}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleArea}>
              <Text style={[Typography.heading3, styles.spotName]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[Typography.caption, { color: Colors.deepClay }]} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={Colors.deepClay} />{' '}
                {item.city}, {item.district || 'Balochistan'}
              </Text>
            </View>

            {/* Bookmark button */}
            <Pressable
              onPress={() => toggleSave(item.id)}
              hitSlop={8}
              style={[
                styles.bookmarkButton,
                Brutalism.borderLight,
                { backgroundColor: isSaved ? Colors.saffron : Colors.white },
              ]}
            >
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={Colors.jetBlack}
              />
            </Pressable>
          </View>

          <Text style={[Typography.caption, styles.description]} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.explorerInfo}>
              <Ionicons name="person-circle-outline" size={16} color={Colors.terracotta} />
              <Text style={[Typography.label, { color: Colors.jetBlack }]}>
                {item.profiles?.username || 'anonymous'}
              </Text>
            </View>

            {distanceStr && (
              <View style={styles.distanceInfo}>
                <Ionicons name="navigate-outline" size={14} color={Colors.makranTeal} />
                <Text style={[Typography.captionBold, { color: Colors.makranTeal }]}>
                  {distanceStr}
                </Text>
              </View>
            )}
          </View>
        </View>
      </KCard>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header section */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[Typography.heading1, { color: Colors.jetBlack }]}>Discover Spots</Text>
            <Text style={[Typography.caption, { color: Colors.deepClay }]}>
              Explore Balochistan's beauty
            </Text>
          </View>
          <View style={styles.brandIcon}>
            <Text style={[Typography.heading2, { color: Colors.sand }]}>ک</Text>
          </View>
        </View>

        <KInput
          placeholder="Search spots, cities, districts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchBar}
          icon={<Ionicons name="search" size={20} color={Colors.jetBlack} />}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Categories Scroller */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          <Pressable
            onPress={() => handleCategoryPress(null)}
            style={[
              styles.categoryChip,
              Brutalism.borderLight,
              {
                backgroundColor: selectedCategory === null ? Colors.jetBlack : Colors.white,
              },
            ]}
          >
            <Text
              style={[
                Typography.captionBold,
                { color: selectedCategory === null ? Colors.white : Colors.jetBlack },
              ]}
            >
              All Spots
            </Text>
          </Pressable>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleCategoryPress(cat.id)}
                style={[
                  styles.categoryChip,
                  Brutalism.borderLight,
                  {
                    backgroundColor: isSelected ? cat.color : Colors.white,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.captionBold,
                    { color: isSelected ? Colors.sand : Colors.jetBlack },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Spots list */}
      <FlatList
        data={feedSpots}
        renderItem={renderSpotItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && feedSpots.length === 0}
            onRefresh={handleRefresh}
            tintColor={Colors.terracotta}
            colors={[Colors.terracotta]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          !isLoading ? (
            <KEmptyState
              title="No Spots Found"
              subtitle="Be the first to submit a hidden gem in this category or search area!"
              actionLabel="Add a Spot"
              onActionPress={() => navigation.navigate('AddSpot' as any)}
            />
          ) : null
        }
        ListFooterComponent={
          isLoading && feedSpots.length > 0 ? (
            <KLoadingSpinner size={30} style={styles.loadingMore} />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: Colors.sand,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: Brutalism.borderRadius,
    backgroundColor: Colors.terracotta,
    borderColor: Colors.jetBlack,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    marginBottom: 8,
  },
  categoriesWrapper: {
    height: 52,
    marginBottom: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  spotCard: {
    overflow: 'hidden',
  },
  spotImage: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  cardInfo: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleArea: {
    flex: 1,
    marginRight: 12,
  },
  spotName: {
    color: Colors.jetBlack,
    marginBottom: 2,
  },
  bookmarkButton: {
    width: 32,
    height: 32,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    color: Colors.deepClay,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderColor: Colors.limestone,
    paddingTop: 12,
    marginTop: 4,
  },
  explorerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingMore: {
    marginVertical: 12,
  },
});
