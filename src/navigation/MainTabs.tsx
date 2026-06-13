import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Modal } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Brutalism } from '../constants/theme';
import { HomeScreen } from '../screens/main/HomeScreen';
import { MapScreen } from '../screens/main/MapScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { MainTabParamList } from './types';
import { useAuthStore } from '../stores/authStore';
import { KButton } from '../components/ui/KButton';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom Compass SVG Icon (Hand-drawn / raw brutalist style)
const CompassIcon = ({ color }: { color: string }) => {
  const isActive = color === Colors.terracotta;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Hand-drawn effect compass circle */}
      <Circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth="2.2"
      />
      <Circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth="1.2"
        strokeDasharray="2,2"
        opacity={0.6}
      />
      {/* Dial ticks */}
      <Line x1="12" y1="3" x2="12" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="19" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="3" y1="12" x2="5" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="19" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Needle */}
      <Path
        d="M12,5 L14.5,12 L12,19 L9.5,12 Z"
        stroke={color}
        strokeWidth="2"
        fill={isActive ? Colors.saffron : 'none'}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Svg>
  );
};

// Custom Folded Map SVG Icon
const MapIcon = ({ color }: { color: string }) => {
  const isActive = color === Colors.terracotta;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M3,6 L9,3 L15,6 L21,3 L21,18 L15,21 L9,18 L3,21 Z"
        stroke={color}
        strokeWidth="2.2"
        fill={isActive ? `${Colors.saffron}30` : 'none'}
        strokeLinejoin="round"
      />
      <Path d="M9,3 L9,18" stroke={color} strokeWidth="1.8" strokeDasharray="2,2" />
      <Path d="M15,6 L15,21" stroke={color} strokeWidth="1.8" strokeDasharray="2,2" />
    </Svg>
  );
};

// Custom Magnifying Glass SVG Icon
const SearchIcon = ({ color }: { color: string }) => {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle
        cx="10.5"
        cy="10.5"
        r="6"
        stroke={color}
        strokeWidth="2.2"
      />
      <Line
        x1="15"
        y1="15"
        x2="20.5"
        y2="20.5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
};

// Custom Profile SVG Icon
const ProfileIcon = ({ color }: { color: string }) => {
  const isActive = color === Colors.terracotta;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="8"
        r="3.5"
        stroke={color}
        strokeWidth="2.2"
        fill={isActive ? Colors.saffron : 'none'}
      />
      <Path
        d="M5,19.5 C5,16 8.5,14 12,14 C15.5,14 19,16 19,19.5"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isGuest, setGuestMode } = useAuthStore();
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  // FAB Press collapsing animation values
  const pressTranslation = useSharedValue(0);

  const handleFABPressIn = () => {
    pressTranslation.value = withTiming(4, { duration: 60 });
  };

  const handleFABPressOut = () => {
    pressTranslation.value = withSpring(0, { damping: 12, stiffness: 200 });
  };

  const handleFABPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isGuest) {
      setGuestModalVisible(true);
    } else {
      navigation.navigate('SubmitSpot');
    }
  };

  const fabFaceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pressTranslation.value },
      { translateY: pressTranslation.value },
    ],
  }));

  const fabShadowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: 4 - pressTranslation.value },
      { translateY: 4 - pressTranslation.value },
    ],
    opacity: 1 - pressTranslation.value / 4,
  }));

  const tabHeight = 60 + insets.bottom;

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color }) => {
            if (route.name === 'Discover') {
              return <CompassIcon color={color} />;
            } else if (route.name === 'Map') {
              return <MapIcon color={color} />;
            } else if (route.name === 'Search') {
              return <SearchIcon color={color} />;
            } else if (route.name === 'Profile') {
              return <ProfileIcon color={color} />;
            }
            return null;
          },
          tabBarActiveTintColor: Colors.terracotta,
          tabBarInactiveTintColor: `${Colors.jetBlack}59`, // 35% opacity
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Inter-Regular',
            marginTop: -2,
            marginBottom: insets.bottom > 0 ? 0 : 4,
          },
          // Format label text size & font family per active status
          tabBarLabel: ({ focused, children }) => {
            const labelStyle = focused
              ? [styles.labelActive, { color: Colors.terracotta }]
              : [styles.labelInactive, { color: `${Colors.jetBlack}59` }];
            return <Text style={labelStyle}>{children}</Text>;
          },
          tabBarStyle: {
            backgroundColor: '#FAFAF5',
            borderTopWidth: 2.5,
            borderTopColor: Colors.jetBlack,
            height: tabHeight,
            paddingTop: 6,
            paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 4,
            elevation: 0,
            shadowOpacity: 0,
          },
        })}
      >
        <Tab.Screen
          name="Discover"
          component={HomeScreen}
          options={{ tabBarLabel: 'Discover' }}
        />
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{ tabBarLabel: 'Map View' }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{ tabBarLabel: 'Search' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarLabel: 'My Profile' }}
        />
      </Tab.Navigator>

      {/* Floating Action Button Layer */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 14 }]}>
        {/* Shadow Layer */}
        <Animated.View style={[styles.fabShadow, fabShadowAnimatedStyle]} />
        {/* Face Layer */}
        <Pressable
          onPressIn={handleFABPressIn}
          onPressOut={handleFABPressOut}
          onPress={handleFABPress}
          style={styles.fabTouchTarget}
        >
          <Animated.View style={[styles.fabFace, Brutalism.border, fabFaceAnimatedStyle]}>
            <Text style={styles.fabPlusText}>+</Text>
          </Animated.View>
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
    position: 'relative',
  },
  labelActive: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-SemiBold',
    textAlign: 'center',
  },
  labelInactive: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  // Absolute floating button centering layout
  fabContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -26, // 52px diameter FAB / 2
    width: 52,
    height: 52,
    zIndex: 999,
  },
  fabTouchTarget: {
    width: 52,
    height: 52,
  },
  fabFace: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.jetBlack,
    zIndex: -1,
  },
  fabPlusText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  // Guest intercept sheets
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
