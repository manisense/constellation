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
import { supabase } from '../utils/supabase';
import { StarType, Question, Option } from '../types';
import { useAuth } from '../hooks/useAuth';

type QuizScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
};

// Extended Answer interface with additional properties needed for our calculations
interface Answer {
  questionId: string;
  optionId: string;
  value: number;
  type: StarType;
}

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
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState<'waiting' | 'ready' | 'completed'>('waiting');
  const [partnerProgress, setPartnerProgress] = useState(0);
  const [constellationId, setConstellationId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadConstellationInfo();
    }
    
    return () => {
      // Clean up subscription
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const loadConstellationInfo = async () => {
    if (!user) return;
    
    try {
      // Get user's constellation membership
      const { data: memberData, error: memberError } = await supabase
        .from('constellation_members')
        .select('constellation_id')
        .eq('user_id', user.id)
        .single();
      
      if (memberError) {
        // User doesn't have a constellation yet
        return;
      }
      
      if (memberData && memberData.constellation_id) {
        setConstellationId(memberData.constellation_id);
        
        // Get partner data
        const { data: partners, error: partnersError } = await supabase
          .from('constellation_members')
          .select('user_id')
          .eq('constellation_id', memberData.constellation_id)
          .neq('user_id', user.id);
        
        if (partnersError) throw partnersError;
        
        if (partners && partners.length > 0) {
          const partnerId = partners[0].user_id;
          setPartnerId(partnerId);
          listenToPartnerProgress(partnerId, memberData.constellation_id);
        }
      }
    } catch (error) {
      console.error('Error loading constellation info:', error);
    } finally {
      setLoading(false);
    }
  };

  const listenToPartnerProgress = (partnerId: string, constId: string) => {
    // Create a listener for partner's quiz progress using Supabase realtime
    const newSubscription = supabase
      .channel(`quiz_progress:user_id=eq.${partnerId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'quiz_progress',
        filter: `user_id=eq.${partnerId} AND constellation_id=eq.${constId}`
      }, (payload: any) => {
        if (payload.new) {
          const newData = payload.new;
          setPartnerProgress(newData.progress || 0);
          
          if (newData.completed) {
            setPartnerStatus('completed');
          } else if (newData.progress > 0) {
            setPartnerStatus('ready');
          }
        }
      })
      .subscribe();
    
    setSubscription(newSubscription);

    // Update our progress for partner to see
    updateQuizProgress(0);

    return () => {
      if (newSubscription) {
        newSubscription.unsubscribe();
      }
    };
  };

  const updateQuizProgress = async (progress: number, completed = false) => {
    try {
      if (!user || !constellationId) return;

      // Check if a record exists
      const { data: existingProgress } = await supabase
        .from('quiz_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('constellation_id', constellationId)
        .single();
      
      if (existingProgress) {
        // Update existing record
        await supabase
          .from('quiz_progress')
          .update({
            progress,
            completed,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      } else {
        // Insert new record
        await supabase
          .from('quiz_progress')
          .insert({
            user_id: user.id,
            constellation_id: constellationId,
            progress,
            completed,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating quiz progress:', error);
    }
  };

  const handleSelectOption = (option: Option) => {
    // Add answer to list
    const newAnswer: Answer = {
      questionId: quizQuestions[currentQuestionIndex].id,
      optionId: option.id,
      value: option.value,
      type: option.type,
    };
    
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);
    
    // Update progress
    const progress = Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);
    updateQuizProgress(progress);
    
    // Move to next question or finish quiz
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const calculateStarType = (quizAnswers: Answer[]): StarType => {
    // Count points for each star type
    let luminaryPoints = 0;
    let navigatorPoints = 0;
    
    quizAnswers.forEach(answer => {
      if (answer.type === StarType.LUMINARY) {
        luminaryPoints += answer.value;
      } else if (answer.type === StarType.NAVIGATOR) {
        navigatorPoints += answer.value;
      }
    });
    
    // Determine star type based on points
    if (luminaryPoints > navigatorPoints) {
      return StarType.LUMINARY;
    } else {
      return StarType.NAVIGATOR;
    }
  };

  const finishQuiz = async (finalAnswers: Answer[]) => {
    try {
      if (!user || !constellationId) return;

      // Calculate star type
      const starType = calculateStarType(finalAnswers);

      // Create quiz result
      const quizResultId = `quiz_${Date.now()}`;
      
      // Update user profile with star type
      await supabase
        .from('profiles')
        .update({
          starType,
          quizCompleted: true
        })
        .eq('id', user.id);

      // Insert quiz result
      await supabase
        .from('quiz_results')
        .insert({
          id: quizResultId,
          quiz_id: 'personality_quiz',
          user_id: user.id,
          constellation_id: constellationId,
          answers: finalAnswers,
          result: starType,
          created_at: new Date().toISOString()
        });

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
    <Screen showHeader={true} headerTitle="Personality Quiz">
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