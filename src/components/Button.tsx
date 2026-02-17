import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle
} from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...rest
}) => {
  // Determine button styles based on variant
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      default:
        return styles.primaryButton;
    }
  };

  // Determine text styles based on variant
  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      default:
        return styles.primaryText;
    }
  };

  // Determine button size
  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'medium':
        return styles.mediumButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        getButtonSize(),
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? COLORS.primary : COLORS.white} 
        />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), icon ? styles.textWithIcon : null, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZES.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Variants
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  // Text styles
  primaryText: {
    color: COLORS.white,
    fontSize: FONTS.button,
    fontWeight: 'bold',
  },
  secondaryText: {
    color: COLORS.white,
    fontSize: FONTS.button,
    fontWeight: 'bold',
  },
  outlineText: {
    color: COLORS.primary,
    fontSize: FONTS.button,
    fontWeight: 'bold',
  },
  textWithIcon: {
    marginLeft: SPACING.xs,
  },
  // Sizes
  smallButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.m,
    height: SIZES.buttonHeight - 16,
  },
  mediumButton: {
    paddingVertical: SPACING.s,
    paddingHorizontal: SPACING.l,
    height: SIZES.buttonHeight,
  },
  largeButton: {
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.xl,
    height: SIZES.buttonHeight + 8,
  },
  // States
  disabledButton: {
    opacity: 0.5,
  },
});

export default Button; 