import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  Pattern,
  Rect,
  G,
  Line,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  interpolateColor,
  Extrapolate,
} from 'react-native-reanimated';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KButton } from '../../components/ui/KButton';
import { BalochPattern } from '../../components/ui/BalochPattern';
import { useAuthStore } from '../../stores/authStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 1. Slide 1 SVG: Discovery Mountain
const DiscoverySVG = () => (
  <View style={styles.svgContainer}>
    <Svg width="260" height="220" viewBox="0 0 260 220">
      {/* Background Sun */}
      <Circle cx="130" cy="110" r="50" fill={Colors.saffron} opacity="0.8" />
      
      {/* Back Mountain Layer */}
      <Path
        d="M 30 190 L 110 80 L 170 190 Z"
        fill={Colors.deepClay}
        opacity="0.9"
        stroke={Colors.jetBlack}
        strokeWidth="2"
      />
      
      {/* Front Mountains */}
      <Path
        d="M 80 190 L 160 50 L 230 190 Z"
        fill={Colors.terracotta}
        stroke={Colors.jetBlack}
        strokeWidth="2.5"
      />
      <Path
        d="M -10 190 L 60 110 L 130 190 Z"
        fill={Colors.mountainSlate}
        stroke={Colors.jetBlack}
        strokeWidth="2"
      />
      
      {/* Sea / Coastal water base */}
      <Path
        d="M 10 190 Q 60 175 130 190 T 250 190 L 250 210 L 10 210 Z"
        fill={Colors.makranTeal}
        stroke={Colors.jetBlack}
        strokeWidth="2.5"
      />
      <Path
        d="M 0 200 Q 70 190 140 200 T 260 200"
        fill="none"
        stroke={Colors.sand}
        strokeWidth="2"
        strokeDasharray="4,4"
      />

      {/* Decorative Baloch diamond border */}
      <G transform="translate(10, 10)">
        <Rect x="0" y="0" width="240" height="20" fill="none" stroke={Colors.jetBlack} strokeWidth="1.5" />
        <Path d="M 10 10 L 20 5 L 30 10 L 20 15 Z M 40 10 L 50 5 L 60 10 L 50 15 Z M 70 10 L 80 5 L 90 10 L 80 15 Z M 100 10 L 110 5 L 120 10 L 110 15 Z M 130 10 L 140 5 L 150 10 L 140 15 Z M 160 10 L 170 5 L 180 10 L 170 15 Z M 190 10 L 200 5 L 210 10 L 200 15 Z M 220 10 L 230 5 L 240 10 L 230 15 Z" fill={Colors.terracotta} />
      </G>
    </Svg>
  </View>
);

// 2. Slide 2 SVG: Community Topographic Grid
const CommunitySVG = () => (
  <View style={styles.svgContainer}>
    <Svg width="260" height="220" viewBox="0 0 260 220">
      {/* Topo lines */}
      <Path d="M 20 70 Q 80 30 130 70 T 240 70" fill="none" stroke={Colors.limestone} strokeWidth="2" />
      <Path d="M 10 110 Q 70 80 130 110 T 250 110" fill="none" stroke={Colors.limestone} strokeWidth="2.5" />
      <Path d="M 20 150 Q 80 120 130 150 T 240 150" fill="none" stroke={Colors.limestone} strokeWidth="2" />

      {/* Connection Links */}
      <Line x1="70" y1="130" x2="130" y2="70" stroke={Colors.jetBlack} strokeWidth="2" strokeDasharray="5,5" />
      <Line x1="130" y1="70" x2="190" y2="140" stroke={Colors.jetBlack} strokeWidth="2" strokeDasharray="5,5" />
      <Line x1="70" y1="130" x2="190" y2="140" stroke={Colors.jetBlack} strokeWidth="1.5" strokeDasharray="5,5" />

      {/* Pin 1 (Gwadar Teal) */}
      <G transform="translate(60, 100)">
        <Circle cx="10" cy="30" r="12" fill={Colors.makranTeal} stroke={Colors.jetBlack} strokeWidth="2" />
        <Path d="M 10 28 L 10 42" stroke={Colors.jetBlack} strokeWidth="2.5" />
        <Circle cx="10" cy="18" r="4" fill={Colors.sand} />
      </G>

      {/* Pin 2 (Quetta Terracotta) */}
      <G transform="translate(120, 40)">
        <Circle cx="10" cy="30" r="14" fill={Colors.terracotta} stroke={Colors.jetBlack} strokeWidth="2.5" />
        <Path d="M 10 26 L 10 44" stroke={Colors.jetBlack} strokeWidth="3" />
        <Circle cx="10" cy="18" r="5" fill={Colors.sand} />
      </G>

      {/* Pin 3 (Saffron Desert) */}
      <G transform="translate(180, 110)">
        <Circle cx="10" cy="30" r="12" fill={Colors.saffron} stroke={Colors.jetBlack} strokeWidth="2" />
        <Path d="M 10 28 L 10 42" stroke={Colors.jetBlack} strokeWidth="2.5" />
        <Circle cx="10" cy="18" r="4" fill={Colors.sand} />
      </G>

      {/* Scattered community avatars circles */}
      <Circle cx="45" cy="65" r="7" fill={Colors.limestone} stroke={Colors.jetBlack} strokeWidth="1" />
      <Circle cx="215" cy="55" r="8" fill={Colors.limestone} stroke={Colors.jetBlack} strokeWidth="1" />
    </Svg>
  </View>
);

// 3. Slide 3 SVG: Explorer Compass
const ExplorerSVG = () => (
  <View style={styles.svgContainer}>
    <Svg width="260" height="220" viewBox="0 0 260 220">
      {/* Outer Dial */}
      <Circle cx="130" cy="110" r="65" fill={Colors.white} stroke={Colors.jetBlack} strokeWidth="3" />
      <Circle cx="130" cy="110" r="58" fill="none" stroke={Colors.limestone} strokeWidth="1.5" strokeDasharray="3,3" />

      {/* Compass Points / Segments */}
      <G transform="translate(130, 110)">
        {/* N / S */}
        <Path d="M 0 0 L -12 -50 L 0 -55 Z" fill={Colors.terracotta} stroke={Colors.jetBlack} strokeWidth="1.5" />
        <Path d="M 0 0 L 12 -50 L 0 -55 Z" fill={Colors.sand} stroke={Colors.jetBlack} strokeWidth="1.5" />
        <Path d="M 0 0 L -12 50 L 0 55 Z" fill={Colors.mountainSlate} stroke={Colors.jetBlack} strokeWidth="1.5" />
        <Path d="M 0 0 L 12 50 L 0 55 Z" fill={Colors.sand} stroke={Colors.jetBlack} strokeWidth="1.5" />

        {/* E / W */}
        <Path d="M 0 0 L -50 -12 L -55 0 Z" fill={Colors.makranTeal} stroke={Colors.jetBlack} strokeWidth="1.5" />
        <Path d="M 0 0 L -50 12 L -55 0 Z" fill={Colors.sand} stroke={Colors.jetBlack} strokeWidth="1.5" />
        <Path d="M 0 0 L 50 -12 L 55 0 Z" fill={Colors.makranTeal} stroke={Colors.jetBlack} strokeWidth="1.5" />
        <Path d="M 0 0 L 50 12 L 55 0 Z" fill={Colors.sand} stroke={Colors.jetBlack} strokeWidth="1.5" />
        
        {/* Center Hub */}
        <Circle cx="0" cy="0" r="10" fill={Colors.saffron} stroke={Colors.jetBlack} strokeWidth="2" />
        {/* Hub cross-stitch diamond */}
        <Path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" fill={Colors.terracotta} />
      </G>

      {/* Compass Directions Letters */}
      <Text style={styles.compassLabelN}>N</Text>
    </Svg>
  </View>
);

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  illustration: React.ReactNode;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Discover Hidden Wonders',
    subtitle: 'Thousands of secret spots across Balochistan — beaches, waterfalls, mountains — waiting to be found.',
    illustration: <DiscoverySVG />,
  },
  {
    id: '2',
    title: 'Added by Locals',
    subtitle: 'Every spot is submitted by real people from Balochistan who have been there and want to share it.',
    illustration: <CommunitySVG />,
  },
  {
    id: '3',
    title: 'Become an Explorer',
    subtitle: 'Be the first to add an undiscovered spot. Earn the Explorer badge. Leave your mark on the map.',
    illustration: <ExplorerSVG />,
  },
];

export const OnboardingScreen = () => {
  const { completeOnboarding } = useAuthStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  // Reanimated scroll X shared value
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const handleNext = async () => {
    if (activeIndex < SLIDES.length - 1) {
      // Scroll to next slide
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    } else {
      // Save status and exit onboarding
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const renderDot = (index: number) => {
    const dotStyle = useAnimatedStyle(() => {
      // Active dot expands width from 10 to 24
      const width = interpolate(
        scrollX.value,
        [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
        [10, 24, 10],
        Extrapolate.CLAMP
      );

      // Active dot transitions from limestone to terracotta
      const backgroundColor = interpolateColor(
        scrollX.value,
        [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
        [Colors.limestone, Colors.terracotta, Colors.limestone]
      );

      return {
        width,
        backgroundColor,
      };
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          Brutalism.borderLight,
          dotStyle,
        ]}
      />
    );
  };

  const renderSlideItem = ({ item }: { item: OnboardingSlide }) => {
    return (
      <View style={styles.slideContainer}>
        {/* Top 55% Illustration Area */}
        <View style={styles.illustrationArea}>
          {item.illustration}
        </View>

        {/* Lower 45% Content Area */}
        <View style={styles.contentArea}>
          <Text style={[Typography.display, styles.slideTitle]}>
            {item.title}
          </Text>
          <Text style={[Typography.body, styles.slideSubtitle]}>
            {item.subtitle}
          </Text>
        </View>
      </View>
    );
  };

  const showSkip = activeIndex < 2;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Row (Progress dots and Skip Button) */}
      <View style={styles.topRow}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, idx) => renderDot(idx))}
        </View>

        {showSkip ? (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={[Typography.captionBold, { color: Colors.terracotta }]}>
              SKIP
            </Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      {/* Slide Carousel */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlideItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.carousel}
      />

      {/* Baloch pattern stitch line divider */}
      <BalochPattern height={16} style={styles.stitchLine} />

      {/* Navigation action button */}
      <View style={styles.footer}>
        <KButton
          label={activeIndex === SLIDES.length - 1 ? 'Start Exploring' : 'Next'}
          variant="primary"
          size="lg"
          onPress={handleNext}
          style={styles.actionButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sand,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 56,
    marginTop: Platform.OS === 'android' ? 12 : 0,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipPlaceholder: {
    width: 50,
  },
  carousel: {
    flex: 1,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'space-between',
  },
  illustrationArea: {
    height: SCREEN_HEIGHT * 0.44, // 55% of content area roughly
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassLabelN: {
    position: 'absolute',
    top: 36,
    alignSelf: 'center',
    ...Typography.captionBold,
    color: Colors.terracotta,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  slideTitle: {
    color: Colors.jetBlack,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideSubtitle: {
    color: Colors.deepClay,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 15,
    paddingHorizontal: 8,
  },
  stitchLine: {
    width: '100%',
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  actionButton: {
    width: '100%',
  },
});
