import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textClassName?: string;
  textStyle?: TextStyle;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
  textClassName,
  textStyle,
  className,
  style,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));


  // NativeWind utility classes for variant/size
  const base = 'rounded-ios flex-row items-center justify-center';
  const variantClass =
    variant === 'secondary'
      ? 'bg-secondary'
      : variant === 'outline'
      ? 'bg-transparent border border-primary'
      : 'bg-primary';
  const textVariantClass =
    variant === 'outline' ? 'text-primary font-bold' : 'text-white font-bold';
  const sizeClass =
    size === 'small'
      ? 'py-1 px-4 h-10'
      : size === 'large'
      ? 'py-4 px-8 h-14'
      : 'py-2 px-6 h-12';
  const disabledClass = disabled ? 'opacity-50' : '';

  return (
    <AnimatedTouchableOpacity
      className={`${base} ${variantClass} ${sizeClass} ${disabledClass} ${className || ''}`}
      style={[animatedStyle, style]}
      onPress={onPress}
      onPressIn={(event) => {
        scale.value = withSpring(0.97, {
          damping: 20,
          stiffness: 280,
          mass: 0.35,
        });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, {
          damping: 20,
          stiffness: 280,
          mass: 0.35,
        });
        onPressOut?.(event);
      }}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? '#3E54AC' : '#fff'} />
      ) : (
        <>
          {icon}
          <Text
            className={`${textVariantClass} ${icon ? 'ml-1' : ''} ${textClassName || ''}`}
            style={textStyle}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedTouchableOpacity>
  );
};

export default Button;