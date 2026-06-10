import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { Colors, Typography, Brutalism } from '../constants/theme';
import { KHeader } from '../components/ui/KHeader';
import { KInput } from '../components/ui/KInput';
import { KButton } from '../components/ui/KButton';
import { KCard } from '../components/ui/KCard';
import { useSpotsStore } from '../stores/spotsStore';
import { useUIStore } from '../stores/uiStore';
import { supabase } from '../lib/supabase';
import { Image } from 'expo-image';

const CATEGORIES = [
  { id: 'beach', label: 'Beach' },
  { id: 'waterfall', label: 'Waterfall' },
  { id: 'mountain', label: 'Mountain' },
  { id: 'valley', label: 'Valley' },
  { id: 'viewpoint', label: 'Viewpoint' },
  { id: 'historical', label: 'Historical' },
  { id: 'desert', label: 'Desert' },
  { id: 'forest', label: 'Forest' },
] as const;

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'hard', label: 'Hard' },
] as const;

export const AddSpotScreen = () => {
  const navigation = useNavigation();
  const { submitSpot } = useSpotsStore();
  const { showToast } = useUIStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]['id'] | null>(null);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [bestSeason, setBestSeason] = useState('');
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]['id'] | null>(null);
  
  // Coordinates
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Photos
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Auto-fetch location on load
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const fetchCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied. Enter coordinates manually.', 'warning');
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLat(location.coords.latitude);
      setLng(location.coords.longitude);
      showToast('Location coordinates pinned!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Could not fetch location. Enter manually.', 'error');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handlePickImage = async (isCover: boolean) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Photo library permission is required.', 'warning');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        
        // Compress Image immediately to save data
        const compressed = await ImageManipulator.manipulateAsync(
          pickedUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        if (isCover) {
          setCoverPhoto(compressed.uri);
        } else {
          setExtraPhotos((prev) => [...prev, compressed.uri]);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to select photo.', 'error');
    }
  };

  const uploadToStorage = async (uri: string, bucket: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err.message);
      return null;
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!name) errors.name = 'Spot name is required';
    if (!description) errors.description = 'Description is required';
    if (!category) errors.category = 'Please select a category';
    if (!city) errors.city = 'Nearest city is required';
    if (lat === null || lng === null) errors.location = 'Coordinates are required';
    if (!coverPhoto) errors.cover = 'Cover photo is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showToast('Please fill all required fields.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Cover photo to storage
      const coverUrl = await uploadToStorage(coverPhoto!, 'spot-photos');
      if (!coverUrl) {
        showToast('Failed to upload cover photo.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Upload Extra photos to storage
      const extraUrls: string[] = [];
      for (const uri of extraPhotos) {
        const url = await uploadToStorage(uri, 'spot-photos');
        if (url) {
          extraUrls.push(url);
        }
      }

      // 3. Submit Spot details
      const { data, error } = await submitSpot(
        {
          name,
          description,
          category: category!,
          city,
          district: district || undefined,
          access_notes: accessNotes || undefined,
          best_season: bestSeason || undefined,
          difficulty: difficulty || undefined,
          lat: lat!,
          lng: lng!,
          cover_photo_url: coverUrl,
        },
        extraUrls
      );

      if (error) {
        showToast(`Submission failed: ${error.message}`, 'error');
      } else {
        showToast('Spot submitted successfully!', 'success');
        // Reset form
        setName('');
        setDescription('');
        setCategory(null);
        setCity('');
        setDistrict('');
        setAccessNotes('');
        setBestSeason('');
        setDifficulty(null);
        setCoverPhoto(null);
        setExtraPhotos([]);
        
        // Go back
        navigation.goBack();
      }
    } catch (err: any) {
      console.error(err);
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <KHeader title="Share Hidden Spot" onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <KCard backgroundColor={Colors.white} style={styles.formCard}>
          {/* Main Info */}
          <KInput
            label="Spot Name (Required)"
            placeholder="e.g. Kund Malir Princess of Hope"
            value={name}
            onChangeText={setName}
            error={validationErrors.name}
          />

          <KInput
            label="Description (Required)"
            placeholder="Describe the spot, its beauty, and why it is special..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            error={validationErrors.description}
            style={styles.textArea}
          />

          {/* Category Picker */}
          <View style={styles.section}>
            <Text style={[Typography.bodyMedium, styles.label]}>Category (Required)</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[
                      styles.chip,
                      Brutalism.borderLight,
                      {
                        backgroundColor: isSelected ? Colors.terracotta : Colors.sand,
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
            </View>
            {validationErrors.category && (
              <Text style={styles.errorText}>{validationErrors.category}</Text>
            )}
          </View>

          {/* Location details */}
          <KInput
            label="Nearest Town / City (Required)"
            placeholder="e.g. Gwadar, Bela, Ormara"
            value={city}
            onChangeText={setCity}
            error={validationErrors.city}
          />

          <KInput
            label="District (Optional)"
            placeholder="e.g. Lasbela, Kech, Quetta"
            value={district}
            onChangeText={setDistrict}
          />

          {/* Location coordinates */}
          <View style={styles.section}>
            <Text style={[Typography.bodyMedium, styles.label]}>Coordinates (Required)</Text>
            
            <View style={styles.coordinatesRow}>
              <View style={styles.coordinateInput}>
                <KInput
                  placeholder="Latitude"
                  value={lat !== null ? lat.toString() : ''}
                  onChangeText={(val) => setLat(val ? Number(val) : null)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.coordinateInput}>
                <KInput
                  placeholder="Longitude"
                  value={lng !== null ? lng.toString() : ''}
                  onChangeText={(val) => setLng(val ? Number(val) : null)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <KButton
              label={loadingLocation ? 'Fetching...' : 'Pin Current Location'}
              variant="secondary"
              size="sm"
              onPress={fetchCurrentLocation}
              icon={loadingLocation ? <ActivityIndicator size="small" color={Colors.jetBlack} /> : <Ionicons name="location" size={16} />}
              style={styles.locationBtn}
            />
            {validationErrors.location && (
              <Text style={styles.errorText}>{validationErrors.location}</Text>
            )}
          </View>

          <KInput
            label="Access Notes (Optional)"
            placeholder="e.g. Need 4x4 vehicle, 2 hours hike from coastal highway..."
            value={accessNotes}
            onChangeText={setAccessNotes}
            multiline
            style={styles.textArea}
          />

          <KInput
            label="Best Season to Visit (Optional)"
            placeholder="e.g. October to February (Winter)"
            value={bestSeason}
            onChangeText={setBestSeason}
          />

          {/* Difficulty Picker */}
          <View style={styles.section}>
            <Text style={[Typography.bodyMedium, styles.label]}>Hike / Travel Difficulty</Text>
            <View style={styles.chipGrid}>
              {DIFFICULTIES.map((diff) => {
                const isSelected = difficulty === diff.id;
                return (
                  <Pressable
                    key={diff.id}
                    onPress={() => setDifficulty(diff.id)}
                    style={[
                      styles.chip,
                      Brutalism.borderLight,
                      {
                        backgroundColor: isSelected ? Colors.makranTeal : Colors.sand,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.captionBold,
                        { color: isSelected ? Colors.sand : Colors.jetBlack },
                      ]}
                    >
                      {diff.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Photo Picker */}
          <View style={styles.section}>
            <Text style={[Typography.bodyMedium, styles.label]}>Cover Photo (Required)</Text>
            {coverPhoto ? (
              <View style={[styles.coverContainer, Brutalism.border]}>
                <Image source={{ uri: coverPhoto }} style={styles.coverPreview} />
                <Pressable
                  onPress={() => setCoverPhoto(null)}
                  style={[styles.removeBadge, Brutalism.borderLight]}
                >
                  <Ionicons name="close" size={16} color={Colors.sand} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => handlePickImage(true)}
                style={[styles.photoPlaceholder, Brutalism.border, { backgroundColor: Colors.sand }]}
              >
                <Ionicons name="camera" size={32} color={Colors.terracotta} />
                <Text style={[Typography.captionBold, { marginTop: 4 }]}>Select Main Photo</Text>
              </Pressable>
            )}
            {validationErrors.cover && (
              <Text style={styles.errorText}>{validationErrors.cover}</Text>
            )}
          </View>

          {/* Extra photos */}
          <View style={styles.section}>
            <Text style={[Typography.bodyMedium, styles.label]}>More Gallery Photos (Optional)</Text>
            <View style={styles.galleryContainer}>
              {extraPhotos.map((uri, index) => (
                <View key={index} style={[styles.galleryThumb, Brutalism.border]}>
                  <Image source={{ uri }} style={styles.galleryImage} />
                  <Pressable
                    onPress={() => setExtraPhotos((prev) => prev.filter((_, i) => i !== index))}
                    style={[styles.removeBadge, Brutalism.borderLight]}
                  >
                    <Ionicons name="close" size={12} color={Colors.sand} />
                  </Pressable>
                </View>
              ))}
              
              {extraPhotos.length < 4 && (
                <Pressable
                  onPress={() => handlePickImage(false)}
                  style={[
                    styles.galleryThumb,
                    styles.galleryAdd,
                    Brutalism.border,
                    { backgroundColor: Colors.sand },
                  ]}
                >
                  <Ionicons name="add" size={24} color={Colors.deepClay} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Submit button */}
          <KButton
            label={isSubmitting ? 'Uploading & Saving...' : 'Submit Spot'}
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitBtn}
          />
        </KCard>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  formCard: {
    padding: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  label: {
    color: Colors.jetBlack,
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  coordinateInput: {
    flex: 1,
    marginBottom: 0,
  },
  locationBtn: {
    alignSelf: 'flex-start',
    width: 'auto',
  },
  photoPlaceholder: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Brutalism.borderRadius,
    borderStyle: 'dashed',
  },
  coverContainer: {
    height: 180,
    position: 'relative',
    borderRadius: Brutalism.borderRadius,
    overflow: 'hidden',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  removeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.terracotta,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryThumb: {
    width: 70,
    height: 70,
    position: 'relative',
    borderRadius: Brutalism.borderRadius,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  submitBtn: {
    marginTop: 16,
  },
  errorText: {
    ...Typography.captionBold,
    color: Colors.error,
    marginTop: 4,
  },
});
