import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Brutalism } from '../../constants/theme';

interface KBadgeProps {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const KBadge: React.FC<KBadgeProps> = ({
  label,
  color = Colors.terracotta,
  size = 'md',
  style,
}) => {
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        Brutalism.borderLight,
        {
          backgroundColor: color,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 8 : 12,
          borderRadius: Brutalism.borderRadius,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          isSm ? Typography.label : Typography.captionBold,
          { color: Colors.sand }, // Clean contrasting color for label text
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
