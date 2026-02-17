import React from 'react';
import { View, ViewProps, TouchableOpacity, TouchableOpacityProps } from 'react-native';

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
  // NativeWind utility classes for card variants
  const base = 'rounded-ios p-4 bg-card';
  const variantClass =
    variant === 'elevated'
      ? 'shadow-md shadow-black/30'
      : variant === 'outlined'
      ? 'border border-gray-700 bg-transparent'
      : '';
  return (
    <View className={`${base} ${variantClass}`} style={style} {...rest}>
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
  const base = 'rounded-ios p-4 bg-card';
  const variantClass =
    variant === 'elevated'
      ? 'shadow-md shadow-black/30'
      : variant === 'outlined'
      ? 'border border-gray-700 bg-transparent'
      : '';
  return (
    <TouchableOpacity
      className={`${base} ${variantClass}`}
      style={style}
      onPress={onPress}
      activeOpacity={0.8}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
};

export default Card;