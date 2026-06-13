import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Brutalism } from '../../constants/theme';

interface KButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  textColor?: string;
}

export const KButton: React.FC<KButtonProps> = ({
  variant = 'primary',
  size = 'md',
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  backgroundColor,
  textColor,
}) => {
  // Shared values for translation coordinates
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const shadowOffset = size === 'sm' ? 2.5 : 4;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    translateX.value = withSpring(shadowOffset, { damping: 12, stiffness: 300 });
    translateY.value = withSpring(shadowOffset, { damping: 12, stiffness: 300 });
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    translateX.value = withSpring(0, { damping: 12, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 12, stiffness: 300 });
  };

  // Animated styles for the button face
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Styles based on variant
  const getVariantStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          button: { backgroundColor: backgroundColor || Colors.terracotta },
          text: { color: textColor || Colors.sand },
        };
      case 'secondary':
        return {
          button: { backgroundColor: backgroundColor || Colors.white },
          text: { color: textColor || Colors.jetBlack },
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent', borderWidth: 0 },
          text: { color: textColor || Colors.jetBlack },
        };
    }
  };

  // Styles based on size
  const getSizeStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          button: { paddingVertical: 8, paddingHorizontal: 14 },
          text: Typography.captionBold,
        };
      case 'md':
        return {
          button: { paddingVertical: 12, paddingHorizontal: 20 },
          text: Typography.bodyMedium,
        };
      case 'lg':
        return {
          button: { paddingVertical: 16, paddingHorizontal: 26 },
          text: Typography.heading3,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[styles.container, style]}
    >
      {/* Shadow layer (only for non-ghost buttons) */}
      {!isGhost && (
        <View
          style={[
            styles.shadow,
            {
              borderRadius: Brutalism.borderRadius,
              transform: [{ translateX: shadowOffset }, { translateY: shadowOffset }],
            },
          ]}
        />
      )}

      {/* Button face layer */}
      <Animated.View
        style={[
          styles.buttonFace,
          isGhost ? null : Brutalism.border,
          { borderRadius: Brutalism.borderRadius },
          variantStyles.button,
          sizeStyles.button,
          animatedStyle,
          disabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={textColor || (variant === 'primary' ? Colors.sand : Colors.terracotta)}
            size="small"
          />
        ) : (
          <View style={styles.content}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[variantStyles.text, sizeStyles.text]}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  buttonFace: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.jetBlack,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.65,
  },
});
