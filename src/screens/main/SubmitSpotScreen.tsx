import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KHeader } from '../../components/ui/KHeader';
import { KInput } from '../../components/ui/KInput';
import { KButton } from '../../components/ui/KButton';
import { KCard } from '../../components/ui/KCard';
import { KSeparator } from '../../components/ui/KSeparator';
import { KBadge } from '../../components/ui/KBadge';
import { useSpotsStore } from '../../stores/spotsStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { AppStackParamList } from '../../navigation/types';

type SubmitSpotScreenNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BALOCHISTAN_CITIES = [
  'Quetta',
  'Turbat',
  'Gwadar',
  'Khuzdar',
  'Hub',
  'Kalat',
  'Chaman',
  'Loralai',
  'Ziarat',
  'Ormara',
  'Panjgur',
  'Nushki',
  'Dalbandin',
  'Hingol',
  'Jiwani',
  'Pasni',
  'Bela',
  'Sibi',
  'Harnai',
  'Lasbela',
  'Astola Island',
  'Uthal',
  'Mastung',
  'Pishin',
  'Sui',
  'Dera Bugti',
] as const;

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

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

// Balochistan boundary checks
const BALOCHISTAN_BOUNDS = {
  minLat: 24.5,
  maxLat: 32.5,
  minLng: 60.5,
  maxLng: 70.5,
};

// Initial Map Region (Balochistan center)
const MAP_INITIAL_REGION: Region = {
  latitude: 28.3,
  longitude: 65.7,
  latitudeDelta: 3.5,
  longitudeDelta: 3.5,
};

interface PhotoItem {
  uri: string;
  sizeKb: number;
  uploadFailed?: boolean;
}

// Draggable Thumbnail Item Component
interface DraggableThumbnailProps {
  item: PhotoItem;
  index: number;
  onRemove: (idx: number) => void;
  onSwap: (fromIdx: number, toIdx: number) => void;
  isFirst: boolean;
  isLast: boolean;
}

const DraggableThumbnail: React.FC<DraggableThumbnailProps> = ({
  item,
  index,
  onRemove,
  onSwap,
  isFirst,
  isLast,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        const dragThreshold = 55;
        if (gestureState.dx > dragThreshold && !isLast) {
          onSwap(index, index + 1);
        } else if (gestureState.dx < -dragThreshold && !isFirst) {
          onSwap(index, index - 1);
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.thumbWrapper,
        Brutalism.borderLight,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbImage} />
      
      {/* Cover Label Badge */}
      {index === 0 && (
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>COVER</Text>
        </View>
      )}

      {/* Drag handle */}
      <View {...panResponder.panHandlers} style={styles.dragHandleThumb}>
        <Ionicons name="resize-outline" size={14} color={Colors.sand} />
      </View>

      {/* Remove Button */}
      <Pressable
        onPress={() => onRemove(index)}
        style={[styles.removeThumbBtn, Brutalism.borderLight]}
        hitSlop={6}
      >
        <Ionicons name="close" size={12} color={Colors.sand} />
      </Pressable>
    </Animated.View>
  );
};

export const SubmitSpotScreen = () => {
  const navigation = useNavigation<SubmitSpotScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  
  // Zustand Store mappings
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const { submitSpot } = useSpotsStore();

  // Wizard Steps: 1 -> Photos, 2 -> Details, 3 -> Location, 4 -> Review/Submission
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [bestSeasons, setBestSeasons] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('');

  // Location Fields
  const [lat, setLat] = useState<number>(28.3);
  const [lng, setLng] = useState<number>(65.7);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [nearbyDuplicates, setNearbyDuplicates] = useState<any[]>([]);

  // City modal picker
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  // Submission Progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<'uploading' | 'saving' | 'idle'>('idle');
  const [failedUploads, setFailedUploads] = useState<number[]>([]);

  // Validation Errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 1. Initial Draft Recovery checks
  useEffect(() => {
    checkForDraft();
  }, []);

  const checkForDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem('@submit_spot_draft');
      if (draft) {
        Alert.alert(
          "Draft Recovered",
          "You have an unfinished spot submission. Continue where you left off?",
          [
            { text: "Discard", style: "destructive", onPress: () => AsyncStorage.removeItem('@submit_spot_draft') },
            { text: "Resume", onPress: () => restoreDraft(JSON.parse(draft)) }
          ]
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveDraft = async () => {
    try {
      const draftData = {
        photos,
        name,
        description,
        category,
        city,
        district,
        accessNotes,
        bestSeasons,
        difficulty,
        lat,
        lng,
        step,
      };
      await AsyncStorage.setItem('@submit_spot_draft', JSON.stringify(draftData));
      showToast("Draft saved successfully.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const restoreDraft = (draft: any) => {
    if (draft.photos) setPhotos(draft.photos);
    if (draft.name) setName(draft.name);
    if (draft.description) setDescription(draft.description);
    if (draft.category) setCategory(draft.category);
    if (draft.city) setCity(draft.city);
    if (draft.district) setDistrict(draft.district);
    if (draft.accessNotes) setAccessNotes(draft.accessNotes);
    if (draft.bestSeasons) setBestSeasons(draft.bestSeasons);
    if (draft.difficulty) setDifficulty(draft.difficulty);
    if (draft.lat) setLat(draft.lat);
    if (draft.lng) setLng(draft.lng);
    if (draft.step) setStep(draft.step);
  };

  // 2. Image Selection & Compression
  const handlePickImage = async (useCamera: boolean) => {
    if (photos.length >= 3) {
      showToast("Maximum of 3 photos allowed.", "warning");
      return;
    }

    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        showToast("Camera/Gallery permissions are required.", "warning");
        return;
      }

      const pickerResult = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.9 });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const originalUri = pickerResult.assets[0].uri;

        // Perform Background Compression to max 800px width, quality 0.8
        const compressed = await ImageManipulator.manipulateAsync(
          originalUri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Fetch compressed file size using blob check
        const response = await fetch(compressed.uri);
        const blob = await response.blob();
        const sizeKb = Math.round(blob.size / 1024);

        setPhotos((prev) => [...prev, { uri: compressed.uri, sizeKb }]);
        showToast(`Photo compressed to ${sizeKb}KB`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Error processing chosen photo.", "error");
    }
  };

  const handleSwapPhotos = (fromIdx: number, toIdx: number) => {
    const updated = [...photos];
    const temp = updated[fromIdx];
    updated[fromIdx] = updated[toIdx];
    updated[toIdx] = temp;
    setPhotos(updated);
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // 3. Step Validations
  const validateStep1 = () => {
    if (photos.length === 0) {
      showToast("At least 1 photo is required to submit a spot.", "warning");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "What do locals call this place?";
    if (!category) errors.category = "Please select a category";
    if (!city) errors.city = "Choose the nearest town or city";
    if (!description.trim() || description.length < 20) {
      errors.description = "Provide a description (minimum 20 characters)";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    // Check Balochistan bounds
    const insideLat = lat >= BALOCHISTAN_BOUNDS.minLat && lat <= BALOCHISTAN_BOUNDS.maxLat;
    const insideLng = lng >= BALOCHISTAN_BOUNDS.minLng && lng <= BALOCHISTAN_BOUNDS.maxLng;

    if (!insideLat || !insideLng) {
      showToast("This location appears to be outside Balochistan boundaries.", "error");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    } else if (step === 3) {
      if (validateStep3()) {
        checkForDuplicates();
        setStep(4);
      }
    }
  };

  // 4. Step 3 - Location coordinates map centering & duplicates
  const handleMapRegionChangeComplete = (region: Region) => {
    // Pin is center of map
    setLat(region.latitude);
    setLng(region.longitude);
  };

  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast("GPS location permission was denied.", "warning");
        setLoadingLocation(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;
      const accuracy = position.coords.accuracy || 0;

      setLat(currentLat);
      setLng(currentLng);
      setGpsAccuracy(accuracy);

      if (accuracy > 100) {
        showToast(`Low GPS accuracy: ±${accuracy.toFixed(0)} meters`, "warning");
      } else {
        showToast("Accurate GPS coordinates resolved!", "success");
      }

      mapRef.current?.animateToRegion({
        latitude: currentLat,
        longitude: currentLng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 800);
    } catch (err) {
      console.error(err);
      showToast("Could not resolve current GPS position.", "error");
    } finally {
      setLoadingLocation(false);
    }
  };

  const checkForDuplicates = async () => {
    try {
      const { data, error } = await supabase.rpc('check_duplicate_spot', {
        new_lat: lat,
        new_lng: lng,
        radius_meters: 100,
      });

      if (!error && data) {
        setNearbyDuplicates(data);
      }
    } catch (err) {
      console.error('Error checking duplicate spots:', err);
    }
  };

  const getCoordinateLabel = (latitude: number, longitude: number) => {
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lngDir = longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(latitude).toFixed(4)}°${latDir}, ${Math.abs(longitude).toFixed(4)}°${lngDir}`;
  };

  // 5. Final Submitting Flow
  const uploadPhotoToBucket = async (uri: string, index: number, retryCount = 0): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('spot-photos')
        .upload(filePath, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('spot-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      if (retryCount < 2) {
        // Auto-retry up to 2 times
        return uploadPhotoToBucket(uri, index, retryCount + 1);
      } else {
        setFailedUploads((prev) => [...prev, index]);
        throw err;
      }
    }
  };

  const handleFinalSubmit = async () => {
    // Check internet connection
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      showToast("No internet connection. Saving draft locally...", "warning");
      await saveDraft();
      navigation.goBack();
      return;
    }

    setIsSubmitting(true);
    setFailedUploads([]);
    setSubmissionPhase('uploading');

    try {
      // Step A: Upload photos in parallel
      const uploadPromises = photos.map((photo, index) =>
        uploadPhotoToBucket(photo.uri, index)
      );

      const uploadedUrls = await Promise.all(uploadPromises);

      setSubmissionPhase('saving');

      // Step B: Submit spot details
      const coverUrl = uploadedUrls[0];
      const extraUrls = uploadedUrls.slice(1);

      const { data: spot, error } = await submitSpot(
        {
          name,
          description,
          category: category as any,
          city,
          district: district || undefined,
          access_notes: accessNotes || undefined,
          best_season: bestSeasons.join(', ') || undefined,
          difficulty: difficulty as any || undefined,
          lat,
          lng,
          cover_photo_url: coverUrl,
        },
        extraUrls
      );

      if (error) {
        throw error;
      }

      // Step C: Insert visitor check-in to auto-claim explorer badge
      if (user?.id && spot) {
        await supabase.from('visits').insert({
          user_id: user.id,
          spot_id: spot.id,
          review: 'First submitted and logged as discoverer!',
        });
      }

      // Clear draft on success
      await AsyncStorage.removeItem('@submit_spot_draft');
      showToast("Spot shared successfully! Welcome explorer.", "success");

      // Reset Wizard
      setIsSubmitting(false);
      setSubmissionPhase('idle');

      // Navigate to Detail Screen
      navigation.replace('SpotDetails', { spotId: spot!.id });
    } catch (err: any) {
      console.error(err);
      showToast("Submission failed. Review failed uploads.", "error");
      setIsSubmitting(false);
      setSubmissionPhase('idle');
    }
  };

  const handleIndividualRetry = async (failedIdx: number) => {
    setIsSubmitting(true);
    setSubmissionPhase('uploading');
    try {
      const uri = photos[failedIdx].uri;
      const uploadedUrl = await uploadPhotoToBucket(uri, failedIdx);
      
      // Update photos item state on successful retry
      const updatedPhotos = [...photos];
      updatedPhotos[failedIdx].uploadFailed = false;
      
      showToast("Photo uploaded successfully!", "success");
      setFailedUploads((prev) => prev.filter((i) => i !== failedIdx));
    } catch (err) {
      showToast("Retry failed. Try again.", "error");
    } finally {
      setIsSubmitting(false);
      setSubmissionPhase('idle');
    }
  };

  // City modal list matching
  const filteredCities = BALOCHISTAN_CITIES.filter((c) =>
    c.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  const handleSelectCity = (chosenCity: string) => {
    setCity(chosenCity);
    setCityModalVisible(false);
    setCitySearchQuery('');
  };

  const toggleSeason = (season: string) => {
    if (bestSeasons.includes(season)) {
      setBestSeasons((prev) => prev.filter((s) => s !== season));
    } else {
      setBestSeasons((prev) => [...prev, season]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <KHeader
        title="Share Hidden Spot"
        onBackPress={() => {
          if (step > 1) {
            setStep((prev) => (prev - 1) as any);
          } else {
            // Confirm draft saving
            Alert.alert(
              "Discard Draft?",
              "Do you want to save a draft before exiting?",
              [
                { text: "Discard", style: "destructive", onPress: () => navigation.goBack() },
                { text: "Save Draft", onPress: async () => { await saveDraft(); navigation.goBack(); } }
              ]
            );
          }
        }}
      />

      {/* Progress Indicators */}
      <View style={styles.progressBarWrapper}>
        <View style={styles.progressLabelRow}>
          <Text style={[styles.progressStepLabel, step === 1 && styles.activeStepText]}>Photos</Text>
          <Text style={[styles.progressStepLabel, step === 2 && styles.activeStepText]}>Details</Text>
          <Text style={[styles.progressStepLabel, step === 3 && styles.activeStepText]}>Location</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressBarFill, { width: `${(step - 1) * 33.3 + 15}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <KCard backgroundColor={Colors.white} style={styles.formCard}>
          {/* STEP 1: Photos Selector */}
          {step === 1 && (
            <View>
              <Text style={[Typography.heading2, styles.sectionTitle]}>Upload Photos</Text>
              <Text style={[Typography.body, { color: Colors.deepClay, marginBottom: 20 }]}>
                Share the beauty of this spot. Add 1 to 3 photos. Drag thumbnails to reorder. Cover photo is first.
              </Text>

              {/* Dash zone */}
              {photos.length < 3 && (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Add Photos",
                      "Choose an option:",
                      [
                        { text: "Take Photo (Camera)", onPress: () => handlePickImage(true) },
                        { text: "Choose from Gallery", onPress: () => handlePickImage(false) },
                        { text: "Cancel", style: "cancel" }
                      ]
                    );
                  }}
                  style={[styles.dashZone, Brutalism.border, { backgroundColor: Colors.sand }]}
                >
                  <Ionicons name="camera-outline" size={40} color={Colors.terracotta} />
                  <Text style={[Typography.body, { fontFamily: 'Inter-SemiBold', marginTop: 8, color: Colors.jetBlack }]}>
                    Choose or Snap Photos
                  </Text>
                  <Text style={[Typography.caption, { color: Colors.deepClay, marginTop: 4 }]}>
                    Supported formats: JPEG, PNG
                  </Text>
                </Pressable>
              )}

              {/* Photo horizontal strip */}
              {photos.length > 0 && (
                <View style={styles.thumbStripContainer}>
                  <Text style={[Typography.captionBold, { color: Colors.jetBlack, marginBottom: 8 }]}>
                    Gallery strip (drag handle to reorder):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
                    {photos.map((item, index) => (
                      <DraggableThumbnail
                        key={index}
                        item={item}
                        index={index}
                        onRemove={handleRemovePhoto}
                        onSwap={handleSwapPhotos}
                        isFirst={index === 0}
                        isLast={index === photos.length - 1}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Photo size information */}
              {photos.length > 0 && (
                <View style={styles.photoInfoBox}>
                  {photos.map((item, idx) => (
                    <Text key={idx} style={[Typography.caption, { color: Colors.deepClay, marginBottom: 2 }]}>
                      📷 Photo {idx + 1}: size {item.sizeKb}KB (compressed)
                    </Text>
                  ))}
                </View>
              )}

              <KButton
                label="Proceed to Details"
                onPress={handleNextStep}
                variant="primary"
                style={{ marginTop: 24 }}
                disabled={photos.length === 0}
              />
            </View>
          )}

          {/* STEP 2: Details Inputs */}
          {step === 2 && (
            <View>
              <Text style={[Typography.heading2, styles.sectionTitle]}>Spot Details</Text>
              
              <KInput
                label="Spot Name (Required)"
                placeholder="What do locals call this place?"
                value={name}
                onChangeText={setName}
                maxLength={60}
                error={validationErrors.name}
              />
              <Text style={styles.charCounter}>{name.length}/60 chars</Text>

              {/* Category Picker */}
              <View style={styles.sectionMargin}>
                <Text style={[Typography.bodyMedium, styles.fieldLabel]}>Category (Required)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsRow}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        style={[
                          styles.categoryChip,
                          Brutalism.borderLight,
                          {
                            backgroundColor: isSelected ? Colors.terracotta : Colors.sand,
                          },
                        ]}
                      >
                        <Text style={[Typography.captionBold, { color: isSelected ? Colors.sand : Colors.jetBlack }]}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {validationErrors.category && (
                  <Text style={styles.errorText}>{validationErrors.category}</Text>
                )}
              </View>

              {/* Nearest City Dropdown Selection */}
              <View style={styles.sectionMargin}>
                <Text style={[Typography.bodyMedium, styles.fieldLabel]}>Nearest Town / City (Required)</Text>
                <Pressable
                  onPress={() => setCityModalVisible(true)}
                  style={[styles.cityPickerTrigger, Brutalism.borderLight]}
                >
                  <Text style={[Typography.body, { color: city ? Colors.jetBlack : Colors.deepClay }]}>
                    {city || "Select nearest town/city..."}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.jetBlack} />
                </Pressable>
                {validationErrors.city && (
                  <Text style={styles.errorText}>{validationErrors.city}</Text>
                )}
              </View>

              <KInput
                label="District (Optional)"
                placeholder="e.g. Lasbela, Gwadar, Quetta"
                value={district}
                onChangeText={setDistrict}
              />

              <KInput
                label="Description (Required)"
                placeholder="Describe what makes this place special, its visual environment, landscape features..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
                error={validationErrors.description}
                style={styles.textArea}
              />
              <Text style={styles.charCounter}>{description.length}/500 chars (min 20)</Text>

              <KInput
                label="How to Get There (Optional)"
                placeholder="Road conditions, turn-by-turn directions, hiking difficulty landmarks..."
                value={accessNotes}
                onChangeText={setAccessNotes}
                multiline
                numberOfLines={3}
                style={styles.textArea}
              />

              {/* Best Seasons Picker */}
              <View style={styles.sectionMargin}>
                <Text style={[Typography.bodyMedium, styles.fieldLabel]}>Best Season to Visit (Select multiple)</Text>
                <View style={styles.seasonChipsRow}>
                  {SEASONS.map((season) => {
                    const isSelected = bestSeasons.includes(season);
                    return (
                      <Pressable
                        key={season}
                        onPress={() => toggleSeason(season)}
                        style={[
                          styles.seasonChip,
                          Brutalism.borderLight,
                          {
                            backgroundColor: isSelected ? Colors.terracotta : Colors.white,
                          },
                        ]}
                      >
                        <Text style={[Typography.captionBold, { color: isSelected ? Colors.sand : Colors.jetBlack }]}>
                          {season}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Difficulty Selection */}
              <View style={styles.sectionMargin}>
                <Text style={[Typography.bodyMedium, styles.fieldLabel]}>Hike / Access Difficulty</Text>
                <View style={styles.difficultyChipsRow}>
                  {DIFFICULTIES.map((diff) => {
                    const isSelected = difficulty === diff.id;
                    return (
                      <Pressable
                        key={diff.id}
                        onPress={() => setDifficulty(diff.id)}
                        style={[
                          styles.difficultyChip,
                          Brutalism.borderLight,
                          {
                            backgroundColor: isSelected ? Colors.makranTeal : Colors.white,
                          },
                        ]}
                      >
                        <Text style={[Typography.captionBold, { color: isSelected ? Colors.sand : Colors.jetBlack }]}>
                          {diff.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <KButton
                label="Proceed to Location"
                onPress={handleNextStep}
                variant="primary"
                style={{ marginTop: 24 }}
              />
            </View>
          )}

          {/* STEP 3: Location Pin placement */}
          {step === 3 && (
            <View>
              <Text style={[Typography.heading2, styles.sectionTitle]}>Exact Location</Text>
              <Text style={[Typography.body, { color: Colors.deepClay, marginBottom: 12 }]}>
                Drag the map to position the central crosshair pin on the exact spot.
              </Text>

              {/* Map container */}
              <View style={[styles.mapContainer, Brutalism.border]}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.embeddedMap}
                  initialRegion={MAP_INITIAL_REGION}
                  onRegionChangeComplete={handleMapRegionChangeComplete}
                />
                {/* Central pin crosshair */}
                <View style={styles.centralPinOverlay} pointerEvents="none">
                  <Ionicons name="location" size={32} color={Colors.terracotta} />
                </View>
              </View>

              {/* Coordinates label */}
              <View style={[styles.coordsIndicator, Brutalism.borderLight, { backgroundColor: Colors.sand }]}>
                <Text style={[Typography.captionBold, { color: Colors.jetBlack }]}>
                  📍 Coordinates: {getCoordinateLabel(lat, lng)}
                </Text>
              </View>

              {/* GPS Position buttons */}
              <KButton
                label={loadingLocation ? "Locating..." : "Use Current GPS Location"}
                onPress={handleUseCurrentLocation}
                variant="secondary"
                size="sm"
                icon={<Ionicons name="navigate-outline" size={16} color={Colors.jetBlack} />}
                style={{ marginTop: 12 }}
              />

              {gpsAccuracy !== null && (
                <Text style={[Typography.caption, { color: Colors.deepClay, marginTop: 4 }]}>
                  GPS Accuracy: ±{gpsAccuracy.toFixed(0)} meters
                </Text>
              )}

              <KButton
                label="Review & Submit"
                onPress={handleNextStep}
                variant="primary"
                style={{ marginTop: 24 }}
              />
            </View>
          )}

          {/* STEP 4: Review Details & Submission */}
          {step === 4 && (
            <View>
              <Text style={[Typography.heading2, styles.sectionTitle]}>Review & Submit</Text>

              {/* Duplicate warnings */}
              {nearbyDuplicates.length > 0 && (
                <View style={[styles.warningCard, Brutalism.border]}>
                  <Ionicons name="warning-outline" size={20} color={Colors.jetBlack} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[Typography.body, { fontFamily: 'Inter-SemiBold', color: Colors.jetBlack }]}>
                      Similar spots found nearby:
                    </Text>
                    {nearbyDuplicates.map((dup, dIdx) => (
                      <Text key={dIdx} style={[Typography.caption, { color: Colors.jetBlack, marginTop: 2 }]}>
                        • {dup.name} (~{dup.distance_m} meters away)
                      </Text>
                    ))}
                    <Text style={[Typography.caption, { color: Colors.deepClay, marginTop: 6 }]}>
                      Make sure you are not creating a duplicate before submitting.
                    </Text>
                  </View>
                </View>
              )}

              {/* Review summary info */}
              <KCard style={styles.reviewCard}>
                {photos.length > 0 && (
                  <Image source={{ uri: photos[0].uri }} style={styles.reviewImage} contentFit="cover" />
                )}
                
                <View style={styles.reviewContent}>
                  <Text style={[Typography.heading3, { color: Colors.jetBlack }]}>{name}</Text>
                  
                  <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
                    <KBadge
                      label={category.toUpperCase()}
                      color={(Colors.categories as any)[category] || Colors.terracotta}
                      size="sm"
                    />
                    <KBadge
                      label={city}
                      color={Colors.makranTeal}
                      size="sm"
                    />
                  </View>

                  <Text style={[Typography.body, { color: Colors.deepClay }]} numberOfLines={3}>
                    {description}
                  </Text>

                  <KSeparator style={{ marginVertical: 8 }} thickness={1} color={Colors.limestone} />
                  
                  <Text style={[Typography.captionBold, { color: Colors.jetBlack }]}>
                    📍 Coordinates: {getCoordinateLabel(lat, lng)}
                  </Text>
                </View>
              </KCard>

              {/* Submitting Status bar */}
              {isSubmitting && (
                <View style={[styles.loadingProgressBox, Brutalism.border]}>
                  <ActivityIndicator size="small" color={Colors.terracotta} />
                  <Text style={[Typography.body, { fontFamily: 'Inter-SemiBold', color: Colors.jetBlack, marginLeft: 10 }]}>
                    {submissionPhase === 'uploading'
                      ? "Uploading compressed photos..."
                      : "Saving spot details..."}
                  </Text>
                </View>
              )}

              {/* Failed Upload zones */}
              {failedUploads.length > 0 && (
                <View style={styles.failedUploadZone}>
                  <Text style={[Typography.captionBold, { color: Colors.error, marginBottom: 8 }]}>
                    Some photos failed to upload. Tap to retry:
                  </Text>
                  {failedUploads.map((fIdx) => (
                    <View key={fIdx} style={styles.failedUploadItem}>
                      <Text style={[Typography.caption, { flex: 1, color: Colors.jetBlack }]}>
                        Photo {fIdx + 1}
                      </Text>
                      <KButton
                        label="Retry"
                        onPress={() => handleIndividualRetry(fIdx)}
                        variant="secondary"
                        size="sm"
                        style={{ minWidth: 60 }}
                      />
                    </View>
                  ))}
                </View>
              )}

              <KButton
                label={isSubmitting ? "Submitting..." : "Submit Spot"}
                onPress={handleFinalSubmit}
                variant="primary"
                disabled={isSubmitting || failedUploads.length > 0}
                style={{ marginTop: 20 }}
              />
            </View>
          )}
        </KCard>
      </ScrollView>

      {/* City Dropdown Modal Selection */}
      <Modal
        visible={cityModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCityModalVisible(false)}
        >
          <View style={[styles.cityModalContainer, Brutalism.border]}>
            <Text style={[Typography.heading3, { color: Colors.jetBlack, marginBottom: 12 }]}>
              Select Nearest Town
            </Text>

            <KInput
              placeholder="Search towns/cities..."
              value={citySearchQuery}
              onChangeText={setCitySearchQuery}
              icon={<Ionicons name="search" size={16} color={Colors.jetBlack} />}
            />

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              style={{ maxHeight: 250, marginTop: 12 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectCity(item)}
                  style={styles.cityListItem}
                >
                  <Text style={[Typography.body, { color: Colors.jetBlack }]}>
                    📍 {item}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={[Typography.caption, { color: Colors.deepClay, textAlign: 'center', marginVertical: 12 }]}>
                  No matching towns found.
                </Text>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
  },
  progressBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.sand,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressStepLabel: {
    ...Typography.captionBold,
    color: Colors.deepClay,
  },
  activeStepText: {
    color: Colors.terracotta,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.limestone,
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: Colors.terracotta,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    padding: 16,
  },
  sectionTitle: {
    color: Colors.jetBlack,
    marginBottom: 8,
  },
  dashZone: {
    height: 150,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.jetBlack,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  thumbStripContainer: {
    marginBottom: 16,
  },
  thumbStrip: {
    gap: 12,
    paddingVertical: 4,
  },
  thumbWrapper: {
    width: 90,
    height: 90,
    borderRadius: Brutalism.borderRadius,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.limestone,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.terracotta,
    paddingVertical: 2,
    alignItems: 'center',
  },
  coverBadgeText: {
    ...Typography.label,
    color: Colors.sand,
    fontSize: 8,
  },
  removeThumbBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleThumb: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(26,26,26,0.6)',
    borderRadius: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInfoBox: {
    padding: 8,
    backgroundColor: Colors.sand,
    borderRadius: Brutalism.borderRadius,
    marginBottom: 16,
  },
  charCounter: {
    ...Typography.caption,
    textAlign: 'right',
    color: Colors.deepClay,
    marginTop: -8,
    marginBottom: 16,
  },
  sectionMargin: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: Colors.jetBlack,
    marginBottom: 8,
  },
  categoryChipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Brutalism.borderRadius,
  },
  cityPickerTrigger: {
    height: 48,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Brutalism.borderRadius,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  seasonChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  seasonChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Brutalism.borderRadius,
  },
  difficultyChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Brutalism.borderRadius,
  },
  errorText: {
    ...Typography.captionBold,
    color: Colors.error,
    marginTop: 4,
  },
  mapContainer: {
    height: 200,
    borderRadius: Brutalism.borderRadius,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 12,
  },
  embeddedMap: {
    width: '100%',
    height: '100%',
  },
  centralPinOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -32,
    zIndex: 5,
  },
  coordsIndicator: {
    padding: 10,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningCard: {
    backgroundColor: Colors.saffron,
    padding: 14,
    borderRadius: Brutalism.borderRadius,
    flexDirection: 'row',
    marginBottom: 16,
  },
  reviewCard: {
    overflow: 'hidden',
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  reviewImage: {
    height: 150,
    width: '100%',
  },
  reviewContent: {
    padding: 14,
  },
  loadingProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: Brutalism.borderRadius,
    marginTop: 12,
  },
  failedUploadZone: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.sand,
    borderRadius: Brutalism.borderRadius,
  },
  failedUploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cityModalContainer: {
    width: '100%',
    backgroundColor: Colors.sand,
    borderRadius: Brutalism.borderRadiusLarge,
    padding: 20,
  },
  cityListItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.limestone,
  },
});
