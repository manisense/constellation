import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Card from '../components/Card';
import { auth, db } from '../services/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { StarType, Question, Option, Answer } from '../types';

type QuizScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
};

// Sample quiz questions
const quizQuestions: Question[] = [
  {
    id: '1',
    text: 'In social situations, you typically:',
    options: [
      {
        id: '1a',
        text: 'Energize the room and initiate conversations',
        value: 3,
        type: StarType.LUMINARY,
      },
      {
        id: '1b',
        text: 'Observe first, then engage in meaningful conversations',
        value: 3,
        type: StarType.NAVIGATOR,
      },
      {
        id: '1c',
        text: "Enjoy being part of the group but don't need to lead",
        value: 1,
        type: StarType.NAVIGATOR,
      },
      {
        id: '1d',
        text: 'Prefer one-on-one interactions over group settings',
        value: 2,
        type: StarType.NAVIGATOR,
      },
    ],
  },
  {
    id: '2',
    text: 'When making decisions, you tend to:',
    options: [
      {
        id: '2a',
        text: 'Follow your intuition and emotions',
        value: 2,
        type: StarType.LUMINARY,
      },
      {
        id: '2b',
        text: 'Analyze all options logically before deciding',
        value: 3,
        type: StarType.NAVIGATOR,
      },
      {
        id: '2c',
        text: 'Consider how it affects others first',
        value: 2,
        type: StarType.LUMINARY,
      },
      {
        id: '2d',
        text: 'Weigh pros and cons carefully',
        value: 2,
        type: StarType.NAVIGATOR,
      },
    ],
  },
  {
    id: '3',
    text: 'Your approach to the future is:',
    options: [
      {
        id: '3a',
        text: 'Optimistic and focused on possibilities',
        value: 3,
        type: StarType.LUMINARY,
      },
      {
        id: '3b',
        text: 'Realistic and focused on practical outcomes',
        value: 3,
        type: StarType.NAVIGATOR,
      },
      {
        id: '3c',
        text: 'Excited but with contingency plans',
        value: 1,
        type: StarType.NAVIGATOR,
      },
      {
        id: '3d',
        text: 'Dreaming big while inspiring others',
        value: 2,
        type: StarType.LUMINARY,
      },
    ],
  },
  {
    id: '4',
    text: 'In a relationship, you value:',
    options: [
      {
        id: '4a',
        text: 'Spontaneity and new experiences',
        value: 3,
        type: StarType.LUMINARY,
      },
      {
        id: '4b',
        text: 'Stability and deep connection',
        value: 3,
        type: StarType.NAVIGATOR,
      },
      {
        id: '4c',
        text: 'Open communication and honesty',
        value: 1,
        type: StarType.NAVIGATOR,
      },
      {
        id: '4d',
        text: 'Growth and mutual inspiration',
        value: 2,
        type: StarType.LUMINARY,
      },
    ],
  },
  {
    id: '5',
    text: 'When facing challenges, you typically:',
    options: [
      {
        id: '5a',
        text: 'Find creative solutions and stay positive',
        value: 3,
        type: StarType.LUMINARY,
      },
      {
        id: '5b',
        text: 'Analyze the problem methodically',
        value: 3,
        type: StarType.NAVIGATOR,
      },
      {
        id: '5c',
        text: 'Seek advice from others you trust',
        value: 1,
        type: StarType.NAVIGATOR,
      },
      {
        id: '5d',
        text: 'Trust your ability to adapt and overcome',
        value: 2,
        type: StarType.LUMINARY,
      },
    ],
  },
];

const QuizScreen: React.FC<QuizScreenProps> = ({ navigation }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState<'waiting' | 'ready' | 'completed'>('waiting');
  const [partnerProgress, setPartnerProgress] = useState(0);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Load user's constellation info
    loadConstellationInfo();
  }, []);

  const loadConstellationInfo = async () => {
    try {
      // Get the current user ID from local storage
      // In a real app, we would use auth.currentUser.uid
      // For our demo, we'll use the latest user created
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const userId = querySnapshot.docs[0].id;
        
        setUserId(userId);
        
        // Get constellation data
        if (userData.constellationId) {
          setConstellationId(userData.constellationId);
          
          const constellationDoc = await getDoc(doc(db, 'constellations', userData.constellationId));
          if (constellationDoc.exists()) {
            const constellationData = constellationDoc.data();
            
            // Find partner
            const partnerIds = constellationData.partnerIds || [];
            const partnerId = partnerIds.find((id: string) => id !== userId);
            
            if (partnerId) {
              setPartnerId(partnerId);
              listenToPartnerProgress(partnerId, userData.constellationId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading constellation info:', error);
    } finally {
      setLoading(false);
    }
  };

  const listenToPartnerProgress = (partnerId: string, constId: string) => {
    // Create a listener for partner's quiz progress
    const quizProgressRef = collection(db, 'quizProgress');
    const q = query(
      quizProgressRef, 
      where('userId', '==', partnerId),
      where('constellationId', '==', constId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const progressData = snapshot.docs[0].data();
        setPartnerProgress(progressData.progress || 0);
        
        if (progressData.completed) {
          setPartnerStatus('completed');
        } else if (progressData.progress > 0) {
          setPartnerStatus('ready');
        }
      }
    });

    // Update our progress for partner to see
    updateQuizProgress(0);

    return unsubscribe;
  };

  const updateQuizProgress = async (progress: number, completed = false) => {
    try {
      if (!userId || !constellationId) return;

      // Update user's quiz progress
      await updateDoc(doc(db, 'users', userId), {
        quizProgress: {
          progress,
          completed,
          updatedAt: serverTimestamp(),
        },
      });
    } catch (error) {
      console.error('Error updating quiz progress:', error);
    }
  };

  const handleSelectOption = (option: Option) => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    
    // Add answer
    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      optionId: option.id,
    };
    
    setAnswers([...answers, newAnswer]);
    
    // Update progress
    const progress = Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);
    updateQuizProgress(progress);
    
    // Move to next question or finish quiz
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishQuiz([...answers, newAnswer]);
    }
  };

  const calculateStarType = (quizAnswers: Answer[]): StarType => {
    let luminaryScore = 0;
    let navigatorScore = 0;

    quizAnswers.forEach((answer) => {
      const question = quizQuestions.find((q) => q.id === answer.questionId);
      if (question) {
        const option = question.options.find((o) => o.id === answer.optionId);
        if (option) {
          if (option.type === StarType.LUMINARY) {
            luminaryScore += option.value;
          } else {
            navigatorScore += option.value;
          }
        }
      }
    });

    return luminaryScore >= navigatorScore ? StarType.LUMINARY : StarType.NAVIGATOR;
  };

  const finishQuiz = async (finalAnswers: Answer[]) => {
    try {
      if (!userId || !constellationId) return;

      // Calculate star type
      const starType = calculateStarType(finalAnswers);

      // Create quiz result
      const quizResultId = `quiz_${Date.now()}`;
      const quizResult = {
        id: quizResultId,
        quizId: 'personality_quiz',
        userId,
        answers: finalAnswers,
        result: starType,
        createdAt: serverTimestamp(),
      };

      // Update user with star type
      await updateDoc(doc(db, 'users', userId), {
        starType,
        quizCompleted: true,
      });

      // Update constellation with quiz result
      const constellationRef = doc(db, 'constellations', constellationId);
      const constellationDoc = await getDoc(constellationRef);
      
      if (constellationDoc.exists()) {
        const constellationData = constellationDoc.data();
        const quizResults = constellationData.quizResults || [];
        const partnerIds = constellationData.partnerIds || [];
        
        // Add user to constellation if not already added
        if (!partnerIds.includes(userId)) {
          partnerIds.push(userId);
        }
        
        // Add quiz result
        quizResults.push(quizResult);
        
        await updateDoc(constellationRef, {
          partnerIds,
          quizResults,
        });
      }

      // Update quiz progress
      await updateQuizProgress(100, true);

      // Navigate to star reveal
      navigation.navigate('StarReveal');
    } catch (error) {
      console.error('Error finishing quiz:', error);
      setLoading(false);
    }
  };

  const renderQuestion = () => {
    const question = quizQuestions[currentQuestionIndex];
    
    return (
      <View style={styles.questionContainer}>
        <Text style={styles.questionNumber}>
          Question {currentQuestionIndex + 1} of {quizQuestions.length}
        </Text>
        <Text style={styles.questionText}>{question.text}</Text>
        
        <View style={styles.optionsContainer}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleSelectOption(option)}
            >
              <Text style={styles.optionText}>{option.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPartnerStatus = () => {
    return (
      <Card style={styles.partnerCard}>
        <Text style={styles.partnerTitle}>Partner Status</Text>
        {partnerStatus === 'waiting' ? (
          <Text style={styles.partnerWaiting}>Waiting for partner to start...</Text>
        ) : (
          <View style={styles.partnerProgressContainer}>
            <Text style={styles.partnerReady}>
              {partnerStatus === 'completed' 
                ? 'Partner has completed the quiz!' 
                : `Partner is taking the quiz: ${partnerProgress}%`}
            </Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${partnerProgress}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Personality Quiz</Text>
        <Text style={styles.subtitle}>
          Discover your star type: Luminary or Navigator
        </Text>

        {renderPartnerStatus()}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Calculating your star type...</Text>
          </View>
        ) : (
          renderQuestion()
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.l,
  },
  title: {
    fontSize: FONTS.h2,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.body1,
    color: COLORS.gray300,
    marginBottom: SPACING.l,
    textAlign: 'center',
  },
  partnerCard: {
    marginBottom: SPACING.l,
    padding: SPACING.m,
  },
  partnerTitle: {
    fontSize: FONTS.body1,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.s,
  },
  partnerWaiting: {
    color: COLORS.gray400,
    fontSize: FONTS.body2,
  },
  partnerReady: {
    color: COLORS.accent,
    fontSize: FONTS.body2,
    marginBottom: SPACING.xs,
  },
  partnerProgressContainer: {
    width: '100%',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.gray700,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  questionContainer: {
    flex: 1,
  },
  questionNumber: {
    fontSize: FONTS.body2,
    color: COLORS.accent,
    marginBottom: SPACING.m,
  },
  questionText: {
    fontSize: FONTS.h3,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.l,
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.borderRadius,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.gray700,
  },
  optionText: {
    fontSize: FONTS.body1,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONTS.body1,
    color: COLORS.white,
    marginTop: SPACING.m,
  },
});

export default QuizScreen; 