import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Modal,
  Keyboard,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KCard } from '../../components/ui/KCard';
import { KBadge } from '../../components/ui/KBadge';
import { KButton } from '../../components/ui/KButton';
import { KSeparator } from '../../components/ui/KSeparator';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { supabase } from '../../lib/supabase';
import { AppStackParamList } from '../../navigation/types';

type SearchScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORY_CARD_WIDTH = (SCREEN_WIDTH - 32 - 10) / 2; // 16px padding on sides + 10px gap

const CATEGORIES = [
  { id: 'beach', label: 'Beach', emoji: '🏖️' },
  { id: 'waterfall', label: 'Waterfall', emoji: '🌊' },
  { id: 'mountain', label: 'Mountain', emoji: '⛰️' },
  { id: 'valley', label: 'Valley', emoji: '🌿' },
  { id: 'viewpoint', label: 'Viewpoint', emoji: '👁️' },
  { id: 'historical', label: 'Historical', emoji: '🏛️' },
  { id: 'desert', label: 'Desert', emoji: '🏜️' },
  { id: 'forest', label: 'Forest', emoji: '🌲' },
] as const;

const TOP_CITIES = [
  'Quetta',
  'Gwadar',
  'Turbat',
  'Ziarat',
  'Makran Coast',
  'Hingol',
  'Kalat',
] as const;

interface SearchedSpot {
  id: string;
  name: string;
  category: string;
  city: string;
  cover_photo_url: string | null;
  save_count: number;
  lat: number;
  lng: number;
}

export const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const inputRef = useRef<TextInput>(null);

  // Global states
  const { isGuest, setGuestMode } = useAuthStore();
  const { setCategory } = useUIStore();

  // Local states
  const [query, setQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Search results states
  const [results, setResults] = useState<SearchedSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Guest modal control
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  // Debouncing ref
  const debounceTimeoutRef = useRef<any>(null);

  // Fetch recent searches from AsyncStorage
  const loadRecentSearches = async () => {
    try {
      const recents = await AsyncStorage.getItem('@search_recents');
      if (recents) {
        setRecentSearches(JSON.parse(recents));
      }
    } catch (err) {
      console.error('Failed to load recent searches:', err);
    }
  };

  // Add query to recent searches
  const saveRecentSearch = async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    try {
      let updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())];
      updated = updated.slice(0, 5); // Keep last 5 searches
      setRecentSearches(updated);
      await AsyncStorage.setItem('@search_recents', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save recent search:', err);
    }
  };

  // Remove a single query from recents
  const removeRecentSearch = async (searchTerm: string) => {
    try {
      const updated = recentSearches.filter((s) => s !== searchTerm);
      setRecentSearches(updated);
      await AsyncStorage.setItem('@search_recents', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to remove recent search:', err);
    }
  };

  // Clear all recent searches
  const clearAllRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('@search_recents');
    } catch (err) {
      console.error('Failed to clear recent searches:', err);
    }
  };

  // Sanitize search query to prevent PostgREST syntax issues in .or()
  const sanitizeQuery = (str: string) => {
    return str.replace(/[()[\],.:;]/g, '').trim();
  };

  // Execute database search
  const executeSearch = useCallback(async (searchQuery: string, pageNum: number, isLoadMore = false) => {
    const cleanedQuery = sanitizeQuery(searchQuery);
    if (cleanedQuery.length < 2) {
      if (!isLoadMore) {
        setResults([]);
        setHasMore(false);
      }
      return;
    }

    // Check internet connection
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      setIsConnected(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    setIsConnected(true);

    if (pageNum === 0 && !isLoadMore) {
      setLoading(true);
    } else if (isLoadMore) {
      setLoadingMore(true);
    }

    try {
      const limit = 30;
      const startRange = pageNum * limit;
      const endRange = startRange + limit - 1;

      // Construct parameterized ilike search using supabase OR filter
      const { data, error } = await supabase
        .from('spots')
        .select('id, name, category, city, cover_photo_url, save_count, lat, lng')
        .eq('is_approved', true)
        .or(`name.ilike.%${cleanedQuery}%,city.ilike.%${cleanedQuery}%,description.ilike.%${cleanedQuery}%,district.ilike.%${cleanedQuery}%`)
        .order('save_count', { ascending: false })
        .range(startRange, endRange);

      if (error) throw error;

      const newResults = (data || []) as SearchedSpot[];

      if (isLoadMore) {
        setResults((prev) => [...prev, ...newResults]);
      } else {
        setResults(newResults);
        // Save to recent searches when a search succeeds
        saveRecentSearch(cleanedQuery);
      }

      setHasMore(newResults.length === limit);
      setPage(pageNum);
    } catch (err) {
      console.error('Search query failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [recentSearches]);

  // Handle input change
  const handleQueryChange = (text: string) => {
    setQuery(text);

    // Cancel active debounce timer
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (text.trim().length >= 2) {
      debounceTimeoutRef.current = setTimeout(() => {
        executeSearch(text, 0);
      }, 400);
    } else {
      setResults([]);
      setHasMore(false);
    }
  };

  // Handle city chip press
  const handleCityPress = (city: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery(city);
    setIsInputFocused(false);
    Keyboard.dismiss();
    executeSearch(city, 0);
  };

  // Handle category card press
  const handleCategoryPress = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCategory(categoryId);
    // Navigate to Discover tab
    navigation.navigate('MainTabs', { screen: 'Discover' });
  };

  // Handle guest check for adding spots
  const handleAddSpotPress = () => {
    if (isGuest) {
      setGuestModalVisible(true);
    } else {
      navigation.navigate('SubmitSpot');
    }
  };

  // Load recents and handle network changes on mount
  useEffect(() => {
    loadRecentSearches();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => {
      unsubscribe();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Autofocus on screen focus
  useFocusEffect(
    useCallback(() => {
      // Small timeout to ensure input focuses after screen transitions finish
      const focusTimeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);

      loadRecentSearches();

      return () => clearTimeout(focusTimeout);
    }, [])
  );

  // Render skeletons for loading items
  const renderLoadingSkeletons = () => (
    <View style={styles.loadingListContainer}>
      {[1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={[styles.skeletonRow, Brutalism.borderLight]}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={[styles.skeletonLine, { width: 140, height: 14 }]} />
            <View style={[styles.skeletonLine, { width: 80, height: 10, marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 1. Brutalist Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBarShadow} />
        <View style={styles.searchBarFace}>
          <Ionicons name="search" size={20} color={Colors.jetBlack} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, Typography.body]}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search spots, cities, or categories..."
            placeholderTextColor={Colors.deepClay}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              // Wait slightly for tap events to register before hiding recents
              setTimeout(() => setIsInputFocused(false), 200);
            }}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                setResults([]);
                setHasMore(false);
                inputRef.current?.focus();
              }}
              hitSlop={8}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color={Colors.deepClay} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Offline Alert Banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.sand} />
          <Text style={styles.offlineText}>Search requires an internet connection</Text>
        </View>
      )}

      {/* Main content body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* State A: Input Focused and Query Empty (Recent Searches) */}
        {isInputFocused && query.trim().length === 0 && recentSearches.length > 0 && (
          <View style={styles.recentsSection}>
            <View style={styles.recentsHeader}>
              <Text style={styles.recentsTitle}>RECENT SEARCHES</Text>
              <Pressable onPress={clearAllRecentSearches} hitSlop={8}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </Pressable>
            </View>

            <View style={styles.recentsContainer}>
              {recentSearches.map((item, idx) => (
                <View key={idx} style={[styles.recentChip, Brutalism.borderLight]}>
                  <Pressable
                    onPress={() => {
                      setQuery(item);
                      setIsInputFocused(false);
                      Keyboard.dismiss();
                      executeSearch(item, 0);
                    }}
                    style={styles.recentChipTextPressable}
                  >
                    <Ionicons name="time-outline" size={14} color={Colors.deepClay} style={{ marginRight: 6 }} />
                    <Text style={styles.recentChipText} numberOfLines={1}>
                      {item}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeRecentSearch(item)}
                    style={styles.recentChipClose}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={14} color={Colors.jetBlack} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* State B: Query is short (Keep typing prompt) */}
        {query.trim().length === 1 && (
          <View style={styles.shortQueryPrompt}>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={32} color={Colors.deepClay} />
            <Text style={[Typography.bodyMedium, { color: Colors.deepClay, marginTop: 8 }]}>
              Keep typing to search...
            </Text>
          </View>
        )}

        {/* State C: Loading Search Results */}
        {loading && renderLoadingSkeletons()}

        {/* State D: Search results rendering */}
        {query.trim().length >= 2 && !loading && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsHeading}>SEARCH RESULTS ({results.length})</Text>
            
            {results.map((spot) => (
              <Pressable
                key={spot.id}
                onPress={() => navigation.navigate('SpotDetails', { spotId: spot.id })}
                style={({ pressed }) => [
                  styles.spotListItem,
                  Brutalism.border,
                  pressed && { backgroundColor: Colors.limestone },
                ]}
              >
                {/* Spot Thumb */}
                {spot.cover_photo_url ? (
                  <Image
                    source={{ uri: spot.cover_photo_url }}
                    style={styles.spotThumb}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.spotThumbPlaceholder,
                      { backgroundColor: (Colors.categories as any)[spot.category] || Colors.terracotta },
                    ]}
                  >
                    <Ionicons name="image-outline" size={18} color={Colors.sand} />
                  </View>
                )}

                {/* Spot Info */}
                <View style={styles.spotInfoBlock}>
                  <Text style={styles.spotItemName} numberOfLines={1}>
                    {spot.name}
                  </Text>
                  
                  <View style={styles.spotSubRow}>
                    <Text style={styles.spotCityText}>{spot.city}</Text>
                    <View style={styles.badgeWrapper}>
                      <KBadge
                        label={spot.category.toUpperCase()}
                        color={(Colors.categories as any)[spot.category] || Colors.terracotta}
                        size="sm"
                      />
                    </View>
                  </View>
                </View>

                {/* Save Count & Chevron */}
                <View style={styles.spotItemRight}>
                  <View style={styles.saveBadge}>
                    <Ionicons name="heart" size={12} color={Colors.terracotta} />
                    <Text style={styles.saveBadgeText}>{spot.save_count}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.jetBlack} />
                </View>
              </Pressable>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <KButton
                label="Load More Results"
                variant="ghost"
                loading={loadingMore}
                onPress={() => executeSearch(query, page + 1, true)}
                style={styles.loadMoreBtn}
              />
            )}
          </View>
        )}

        {/* State E: No results state */}
        {query.trim().length >= 2 && !loading && results.length === 0 && (
          <View style={styles.noResultsCard}>
            <View style={[styles.noResultsIconCircle, Brutalism.border]}>
              <Ionicons name="search" size={40} color={Colors.terracotta} />
            </View>
            <Text style={[Typography.heading2, styles.noResultsTitle]}>No spots found</Text>
            <Text style={[Typography.body, styles.noResultsSubtitle]}>
              Try a different name or city. Or be the first to add "{query}" to Kohsar!
            </Text>
            <KButton
              label="Add This Spot"
              onPress={handleAddSpotPress}
              variant="primary"
              style={styles.addSpotBtn}
              icon={<Ionicons name="add" size={18} color={Colors.sand} />}
            />
          </View>
        )}

        {/* State F: Default screen layout (Categories & Top Cities) - only visible when not showing query results */}
        {(query.trim().length < 2) && (
          <View style={styles.defaultExploreContainer}>
            {/* Category Grid */}
            <Text style={styles.sectionHeader}>EXPLORE BY CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.id)}
                  style={[styles.categoryCardPressable]}
                >
                  <KCard
                    backgroundColor={(Colors.categories as any)[cat.id] || Colors.terracotta}
                    style={styles.categoryCard}
                  >
                    <View style={styles.categoryCardContent}>
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                      <Text style={styles.categoryLabel} numberOfLines={1}>
                        {cat.label}
                      </Text>
                    </View>
                  </KCard>
                </Pressable>
              ))}
            </View>

            <KSeparator style={styles.defaultDivider} />

            {/* Top Cities */}
            <Text style={styles.sectionHeader}>TOP CITIES IN BALOCHISTAN</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.citiesScroll}
            >
              {TOP_CITIES.map((city) => (
                <Pressable
                  key={city}
                  onPress={() => handleCityPress(city)}
                  style={[styles.cityChip, Brutalism.borderLight]}
                >
                  <Text style={[Typography.captionBold, { color: Colors.jetBlack }]}>
                    {city}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Guest Intercept modal */}
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
    paddingTop: 50,
  },
  searchBarWrapper: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 16,
    height: 52,
  },
  searchBarShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: Colors.jetBlack,
  },
  searchBarFace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2.5,
    borderColor: Colors.jetBlack,
    height: '100%',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 10,
    color: Colors.jetBlack,
  },
  clearButton: {
    padding: 4,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    paddingVertical: 8,
    gap: 8,
  },
  offlineText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.sand,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Recents searches styling
  recentsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  recentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentsTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.jetBlack,
  },
  clearAllText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.terracotta,
  },
  recentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: Brutalism.borderRadius,
  },
  recentChipTextPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 160,
  },
  recentChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.jetBlack,
  },
  recentChipClose: {
    marginLeft: 8,
    padding: 2,
  },
  // Prompts
  shortQueryPrompt: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  // Default explorer grids
  defaultExploreContainer: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    letterSpacing: 1.5,
    color: Colors.jetBlack,
    marginBottom: 14,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCardPressable: {
    width: CATEGORY_CARD_WIDTH,
    height: 110,
    marginBottom: 2,
  },
  categoryCard: {
    width: '100%',
    height: '100%',
    padding: 0,
  },
  categoryCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: Colors.sand,
  },
  defaultDivider: {
    marginVertical: 24,
  },
  citiesScroll: {
    paddingRight: 16,
    gap: 10,
    paddingBottom: 8,
  },
  cityChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Brutalism.borderRadius,
  },
  // Skeletons
  loadingListContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
  },
  skeletonImage: {
    width: 56,
    height: 56,
    borderRadius: Brutalism.borderRadius,
    backgroundColor: Colors.limestone,
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonLine: {
    backgroundColor: Colors.limestone,
    borderRadius: 4,
  },
  // Results rendering
  resultsSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  resultsHeading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.deepClay,
    marginBottom: 4,
  },
  spotListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: Brutalism.borderRadius,
  },
  spotThumb: {
    width: 56,
    height: 56,
    borderRadius: Brutalism.borderRadius - 2,
    borderWidth: 1.5,
    borderColor: Colors.jetBlack,
  },
  spotThumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: Brutalism.borderRadius - 2,
    borderWidth: 1.5,
    borderColor: Colors.jetBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotInfoBlock: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    gap: 4,
  },
  spotItemName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: Colors.jetBlack,
  },
  spotSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotCityText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.deepClay,
  },
  badgeWrapper: {
    transform: [{ scale: 0.85 }],
    marginLeft: -4,
  },
  spotItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sand,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  saveBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.jetBlack,
  },
  loadMoreBtn: {
    marginTop: 12,
    width: '100%',
  },
  // No results styling
  noResultsCard: {
    backgroundColor: Colors.white,
    borderWidth: 2.5,
    borderColor: Colors.jetBlack,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    borderRadius: Brutalism.borderRadius,
  },
  noResultsIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noResultsTitle: {
    color: Colors.jetBlack,
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    color: Colors.deepClay,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addSpotBtn: {
    width: '100%',
  },
  // Guest sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  guestSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Brutalism.borderRadiusLarge,
    borderTopRightRadius: Brutalism.borderRadiusLarge,
    paddingBottom: 40,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.limestone,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  guestModalContent: {
    alignItems: 'center',
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
