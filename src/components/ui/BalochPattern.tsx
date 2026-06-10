import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Path, Defs, Pattern } from 'react-native-svg';
import { Colors } from '../../constants/theme';

interface BalochPatternProps {
  height?: number;
  width?: string | number;
  style?: ViewStyle;
  backgroundColor?: string;
  patternColor?: string;
}

export const BalochPattern: React.FC<BalochPatternProps> = ({
  height = 32,
  width = '100%',
  style,
  backgroundColor = Colors.sand,
  patternColor = Colors.terracotta,
}) => {
  return (
    <View style={[styles.container, { height, width: width as any, backgroundColor }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          {/* Define repeating pattern tile of width 40, height 40 */}
          <Pattern
            id="baloch-embroidery"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            {/* Outer Diamond */}
            <Path
              d="M 20 2 L 38 20 L 20 38 L 2 20 Z"
              fill="none"
              stroke={patternColor}
              strokeWidth="2.5"
            />
            {/* Inner Diamond */}
            <Path
              d="M 20 8 L 32 20 L 20 32 L 8 20 Z"
              fill="none"
              stroke={patternColor}
              strokeWidth="1.5"
              strokeDasharray="2,2"
            />
            {/* Center Cross Stitch (Kashida) */}
            <Path
              d="M 15 15 L 25 25 M 25 15 L 15 25"
              stroke={patternColor}
              strokeWidth="2"
            />
            {/* Top & Bottom Accent Dots / Stitches */}
            <Path
              d="M 20 5 L 20 11 M 17 8 L 23 8"
              stroke={patternColor}
              strokeWidth="1.5"
            />
            <Path
              d="M 20 29 L 20 35 M 17 32 L 23 32"
              stroke={patternColor}
              strokeWidth="1.5"
            />
            {/* Left & Right Accent Dots / Stitches */}
            <Path
              d="M 5 20 L 11 20 M 8 17 L 8 23"
              stroke={patternColor}
              strokeWidth="1.5"
            />
            <Path
              d="M 29 20 L 35 20 M 32 17 L 32 23"
              stroke={patternColor}
              strokeWidth="1.5"
            />
            
            {/* Border Connecting Lines (horizontal/vertical grid look) */}
            <Path
              d="M 0 20 L 2 20 M 38 20 L 40 20 M 20 0 L 20 2 M 20 38 L 20 40"
              stroke={patternColor}
              strokeWidth="1.5"
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#baloch-embroidery)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
