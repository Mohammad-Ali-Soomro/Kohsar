import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { useUIStore } from '../../stores/uiStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const KToast = () => {
  const { toastMessage, clearToast } = useUIStore();
  const [localMsg, setLocalMsg] = useState<typeof toastMessage>(null);

  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toastMessage) {
      setLocalMsg(toastMessage);
      // Slide up on show
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      // Fade + slide down on dismiss
      translateY.value = withTiming(80, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setLocalMsg)(null);
        }
      });
    }
  }, [toastMessage]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!localMsg) return null;

  const getAccentColor = (type: string) => {
    switch (type) {
      case 'success':
        return Colors.success;
      case 'error':
        return Colors.error;
      case 'warning':
        return Colors.warning;
      case 'info':
      default:
        return Colors.makranTeal;
    }
  };

  const accentColor = getAccentColor(localMsg.type);

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
      <Pressable
        onPress={clearToast}
        style={[
          styles.toastFace,
          Brutalism.border,
          { backgroundColor: Colors.white },
        ]}
      >
        {/* Shadow layer */}
        <View style={styles.toastShadow} />

        {/* Left accent bar (4px) */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        {/* Content */}
        <View style={styles.content}>
          <Text style={[Typography.bodyMedium, styles.text]}>
            {localMsg.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 84, // Float comfortably above the 60px bottom tab bar
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastFace: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    width: '100%',
    paddingLeft: 0, // Left accent bar is at the border
    paddingRight: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  toastShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    backgroundColor: Colors.jetBlack,
    zIndex: -1,
  },
  accentBar: {
    width: 4,
    height: '100%',
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  text: {
    color: Colors.jetBlack,
    lineHeight: 18,
  },
});
