import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';

interface HeaderProps {
  title: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  showBorder?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  containerStyle,
  titleStyle,
  showBorder = true,
}) => {
  return (
    <View
      style={[
        styles.container,
        showBorder && styles.borderBottom,
        containerStyle,
      ]}
    >
      <View style={styles.leftContainer}>
        {leftIcon && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onLeftPress}
            disabled={!onLeftPress}
          >
            {leftIcon}
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.title, titleStyle]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightContainer}>
        {rightIcon && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onRightPress}
            disabled={!onRightPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: SPACING.m,
    backgroundColor: COLORS.background,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray800,
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  iconContainer: {
    padding: SPACING.xs,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default Header; 