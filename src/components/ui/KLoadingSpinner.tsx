import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Brutalism } from '../../constants/theme';

interface KLoadingSpinnerProps {
  size?: number;
  style?: ViewStyle;
  color?: string;
}

export const KLoadingSpinner: React.FC<KLoadingSpinnerProps> = ({
  size = 40,
  style,
  color = Colors.terracotta,
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1200,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Do not reverse
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const borderSize = size + 16;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.spinnerBorder,
          Brutalism.borderLight,
          {
            width: borderSize,
            height: borderSize,
            borderRadius: borderSize / 2,
            backgroundColor: Colors.white,
          },
        ]}
      >
        <Animated.View style={[{ width: size, height: size }, animatedStyle, styles.spinnerIcon]}>
          <MaterialCommunityIcons
            name="compass-rose"
            size={size}
            color={color}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  spinnerBorder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
