import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Colors, Typography, Brutalism } from '../../constants/theme';

interface KInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const KInput: React.FC<KInputProps> = ({
  label,
  error,
  icon,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const shadowOffset = 2;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputWrapper}>
        {/* Shadow layer shown on focus */}
        {isFocused && (
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

        {/* Input field face layer */}
        <View
          style={[
            styles.inputFace,
            Brutalism.border,
            {
              borderRadius: Brutalism.borderRadius,
              borderColor: error ? Colors.error : Colors.jetBlack,
              backgroundColor: Colors.white,
            },
          ]}
        >
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <TextInput
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
              styles.input,
              Typography.body,
              { color: Colors.jetBlack },
              style,
            ]}
            placeholderTextColor={Colors.deepClay}
            {...rest}
          />
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  label: {
    ...Typography.bodyMedium,
    color: Colors.jetBlack,
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  inputFace: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  iconContainer: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 10,
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.jetBlack,
  },
  errorText: {
    ...Typography.captionBold,
    color: Colors.error,
    marginTop: 4,
  },
});
