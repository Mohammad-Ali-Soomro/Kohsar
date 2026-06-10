import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KSeparator } from './KSeparator';

interface KHeaderProps {
  title: string;
  onBackPress?: () => void;
  rightSlot?: React.ReactNode;
  style?: ViewStyle;
}

export const KHeader: React.FC<KHeaderProps> = ({
  title,
  onBackPress,
  rightSlot,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[{ paddingTop: insets.top }, styles.outerContainer, style]}>
      <View style={styles.headerRow}>
        <View style={styles.leftContainer}>
          {onBackPress && (
            <Pressable
              onPress={onBackPress}
              style={[
                styles.backButton,
                Brutalism.borderLight,
                { backgroundColor: Colors.white },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.jetBlack} />
            </Pressable>
          )}
        </View>

        <View style={styles.titleContainer}>
          <View style={styles.titleWrapper}>
            <Text
              style={[Typography.heading2, { color: Colors.jetBlack }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {/* Terracotta accent underline */}
            <View style={styles.underline} />
          </View>
        </View>

        <View style={styles.rightContainer}>
          {rightSlot ? rightSlot : null}
        </View>
      </View>
      <KSeparator style={styles.separator} />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: Colors.sand,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  underline: {
    position: 'absolute',
    bottom: -4,
    height: 4,
    width: '100%',
    backgroundColor: Colors.terracotta,
    borderRadius: 1,
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Brutalism.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    marginTop: 4,
  },
});
