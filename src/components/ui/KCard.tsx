import React from 'react';
import {
  StyleSheet,
  Pressable,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Brutalism } from '../../constants/theme';

interface KCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  shadowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'imagebutton' | 'link' | 'none';
  accessibilityHint?: string;
}

export const KCard: React.FC<KCardProps> = ({
  children,
  style,
  onPress,
  shadowColor = Colors.jetBlack,
  backgroundColor = Colors.white,
  borderRadius = Brutalism.borderRadius,
  accessibilityLabel,
  accessibilityRole,
  accessibilityHint,
}) => {
  const isPressable = typeof onPress === 'function';

  // Shared values for translations on press
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const shadowOffset = 4;

  const handlePressIn = () => {
    if (!isPressable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    translateX.value = withSpring(shadowOffset, { damping: 12, stiffness: 300 });
    translateY.value = withSpring(shadowOffset, { damping: 12, stiffness: 300 });
  };

  const handlePressOut = () => {
    if (!isPressable) return;
    translateX.value = withSpring(0, { damping: 12, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 12, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const CardComponent = isPressable ? Pressable : View;

  return (
    <CardComponent
      onPress={onPress}
      onPressIn={isPressable ? handlePressIn : undefined}
      onPressOut={isPressable ? handlePressOut : undefined}
      style={[styles.container, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityHint={accessibilityHint}
    >
      {/* Shadow layer */}
      <View
        style={[
          styles.shadow,
          {
            backgroundColor: shadowColor,
            borderRadius,
            transform: [{ translateX: shadowOffset }, { translateY: shadowOffset }],
          },
        ]}
      />

      {/* Card face layer */}
      <Animated.View
        style={[
          styles.cardFace,
          Brutalism.border,
          {
            borderRadius,
            backgroundColor,
          },
          animatedStyle,
        ]}
      >
        {children}
      </Animated.View>
    </CardComponent>
  );
};


const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'stretch',
    marginBottom: 4, // Make room for the shadow offset at the bottom
  },
  cardFace: {
    width: '100%',
    overflow: 'hidden',
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
