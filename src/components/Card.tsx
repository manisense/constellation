import React from 'react';
import {
  View,
  StyleSheet,
  ViewProps,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS, SHADOWS, SIZES, SPACING } from '../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  ...rest
}) => {
  const getCardStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevatedCard;
      case 'outlined':
        return styles.outlinedCard;
      default:
        return styles.defaultCard;
    }
  };

  return (
    <View style={[styles.card, getCardStyle(), style]} {...rest}>
      {children}
    </View>
  );
};

interface TouchableCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  onPress: () => void;
}

export const TouchableCard: React.FC<TouchableCardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  ...rest
}) => {
  const getCardStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevatedCard;
      case 'outlined':
        return styles.outlinedCard;
      default:
        return styles.defaultCard;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, getCardStyle(), style]}
      onPress={onPress}
      activeOpacity={0.8}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.borderRadius,
    padding: SPACING.m,
    backgroundColor: COLORS.card,
  },
  defaultCard: {
    // Default card has no additional styles
  },
  elevatedCard: {
    ...SHADOWS.medium,
  },
  outlinedCard: {
    borderWidth: 1,
    borderColor: COLORS.gray700,
    backgroundColor: 'transparent',
  },
});

export default Card; 