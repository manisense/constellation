import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  useWindowDimensions,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

// Onboarding data
const slides = [
  {
    id: '1',
    title: 'Discover Your Star Type',
    description:
      "Take our personality quiz to discover if you're a Luminary or Navigator star. Each type has unique strengths that complement each other.",
    image: require('../assets/images/onboarding-1.png'),
  },
  {
    id: '2',
    title: 'Connect With Your Partner',
    description:
      "Create your constellation and invite your partner to join. Together, you'll form a unique celestial bond.",
    image: require('../assets/images/onboarding-2.png'),
  },
  {
    id: '3',
    title: 'Grow Together',
    description:
      'Take synced quizzes, chat, and watch your constellation grow stronger as your relationship deepens.',
    image: require('../assets/images/onboarding-3.png'),
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.navigate('CreateConstellation');
    }
  };

  const Paginator = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [10, 20, 10],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              style={[
                styles.dot,
                { width: dotWidth, opacity },
                index === currentIndex && styles.activeDot,
              ]}
              key={index}
            />
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }: { item: typeof slides[0] }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <Image
          source={item.image}
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <FlatList
          data={slides}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />

        <Paginator />

        <View style={styles.buttonContainer}>
          <Button
            title={currentIndex === slides.length - 1 ? "Let's Begin" : "Next"}
            onPress={scrollTo}
          />
          {currentIndex < slides.length - 1 && (
            <Button
              title="Skip"
              onPress={() => navigation.navigate('CreateConstellation')}
              variant="outline"
              style={styles.skipButton}
            />
          )}
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l,
  },
  image: {
    width: '80%',
    height: '50%',
    marginBottom: SPACING.l,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  description: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
    textAlign: 'center',
    paddingHorizontal: SPACING.m,
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginHorizontal: 8,
  },
  activeDot: {
    backgroundColor: COLORS.accent,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: SPACING.l,
    marginBottom: SPACING.xl,
  },
  skipButton: {
    marginTop: SPACING.m,
  },
});

export default OnboardingScreen; 