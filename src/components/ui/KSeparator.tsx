import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/theme';

interface KSeparatorProps {
  style?: ViewStyle;
  color?: string;
  thickness?: number;
}

export const KSeparator: React.FC<KSeparatorProps> = ({
  style,
  color = Colors.jetBlack,
  thickness = 2,
}) => {
  return (
    <View
      style={[
        styles.line,
        {
          backgroundColor: color,
          height: thickness,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  line: {
    width: '100%',
    alignSelf: 'stretch',
  },
});
