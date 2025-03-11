import React from 'react';
import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  return (
    <ImageBackground
      source={require('../assets/images/night-sky.png')}
      style={styles.backgroundImage}
    >
      <Screen showHeader={true} showLogo={true}>
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/constellation-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Constellation</Text>
            <Text style={styles.tagline}>For couples who shine together</Text>
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.description}>
              Discover your complementary personalities and visualize your unique bond as a constellation in the night sky.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Sign In"
              onPress={() => {
                navigation.navigate('Login');
              }}
              style={styles.button}
            />
            <Button
              title="Create Account"
              onPress={() => {
                navigation.navigate('Register');
              }}
              variant="outline"
              style={styles.secondaryButton}
            />
          </View>
        </View>
      </Screen>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: SPACING.l,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: SPACING.m,
  },
  appName: {
    fontSize: FONTS.h1,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  tagline: {
    fontSize: FONTS.body1,
    color: COLORS.accent,
    textAlign: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
  },
  description: {
    fontSize: FONTS.body1,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    marginBottom: SPACING.xl,
  },
  button: {
    marginBottom: SPACING.m,
  },
  secondaryButton: {
    marginBottom: SPACING.m,
  },
});

export default WelcomeScreen; 