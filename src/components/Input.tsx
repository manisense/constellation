import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, TouchableOpacity } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  onRightIconPress?: () => void;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className,
  labelClassName,
  inputClassName,
  errorClassName,
  onRightIconPress,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`mb-4 w-full ${className || ''}`}>
      {label && (
        <Text className={`text-white text-sm mb-1 ${labelClassName || ''}`}>{label}</Text>
      )}
      <View
        className={`flex-row items-center bg-input rounded-ios border h-12 border-gray-700 ${
          isFocused ? 'border-primary' : ''
        } ${error ? 'border-error' : ''}`}
      >
        {leftIcon && <View className="pl-4">{leftIcon}</View>}
        <TextInput
          className={`flex-1 text-white text-base px-4 h-full ${
            leftIcon ? 'pl-1' : ''
          } ${rightIcon ? 'pr-1' : ''} ${inputClassName || ''}`}
          placeholderTextColor="#9E9E9E"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {rightIcon && (
          <TouchableOpacity
            className="pr-4"
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className={`text-error text-xs mt-1 ${errorClassName || ''}`}>{error}</Text>
      )}
    </View>
  );
};

export default Input;