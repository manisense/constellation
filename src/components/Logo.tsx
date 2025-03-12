import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';

interface LogoProps {
  size?: number;
  style?: ViewStyle;
}

const Logo: React.FC<LogoProps> = ({ size = 40, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../assets/images/constellation.png')}
        style={[styles.image, { width: size, height: size }]}
        resizeMode="contain"
        onError={(e) => {
          console.error('Error loading logo image:', e.nativeEvent.error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 40,
    height: 40,
  },
});

export default Logo; 