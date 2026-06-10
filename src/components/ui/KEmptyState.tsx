import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Brutalism } from '../../constants/theme';
import { KCard } from './KCard';
import { KButton } from './KButton';

interface KEmptyStateProps {
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  subtitle: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const KEmptyState: React.FC<KEmptyStateProps> = ({
  iconName = 'map-marker-outline',
  title,
  subtitle,
  actionLabel,
  onActionPress,
  style,
}) => {
  return (
    <KCard
      backgroundColor={Colors.white}
      style={[styles.card, style]}
    >
      <View style={styles.content}>
        <View style={[styles.iconCircle, Brutalism.border, { backgroundColor: Colors.sand }]}>
          <MaterialCommunityIcons
            name={iconName as any}
            size={36}
            color={Colors.terracotta}
          />
        </View>

        <Text style={[styles.title, Typography.heading2]}>{title}</Text>
        <Text style={[styles.subtitle, Typography.body, { color: Colors.deepClay }]}>
          {subtitle}
        </Text>

        {actionLabel && onActionPress && (
          <KButton
            label={actionLabel}
            onPress={onActionPress}
            variant="secondary"
            size="sm"
            style={styles.button}
          />
        )}
      </View>
    </KCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.jetBlack,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  button: {
    marginTop: 4,
    width: 'auto',
    alignSelf: 'center',
  },
});
