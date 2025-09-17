'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { SessionState, Question } from '@/types/api';

const FAMILIES = [
  'Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'
];

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionSeed = searchParams.get('seed');

  const [session, setSession] = useState<SessionState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizPhase, setQuizPhase] = useState<'picks' | 'questions' | 'finalizing'>('picks');

  // Initialize session
  useEffect(() => {
    if (!sessionSeed) {
      router.push('/');
      return;
    }

    const initSession = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.initSession(sessionSeed);
        if (response.success && response.data) {
          setSession(response.data);
          apiClient.trackEvent({
            type: 'session_start',
            session_id: response.data.session_id,
            bank_hash: process.env.NEXT_PUBLIC_BANK_HASH
          });
        } else {
          setError(response.error?.message || 'Failed to initialize session');
        }
      } catch (err) {
        setError('Failed to initialize session');
        console.error('Session init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [sessionSeed, router]);

  // Handle family selection
  const handleFamilyToggle = (family: string) => {
    setSelectedFamilies(prev => {
      if (prev.includes(family)) {
        return prev.filter(f => f !== family);
      } else {
        return [...prev, family];
      }
    });
  };

  // Submit family picks
  const handleSubmitPicks = async () => {
    if (!session || selectedFamilies.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.setPicks(session.session_id, selectedFamilies);
      if (response.success && response.data) {
        setSession(response.data);
        setQuizPhase('questions');
        loadNextQuestion(response.data.session_id);
      } else {
        setError(response.error?.message || 'Failed to set family picks');
      }
    } catch (err) {
      setError('Failed to set family picks');
      console.error('Set picks error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load next question
  const loadNextQuestion = useCallback(async (sessionId: string) => {
    try {
      console.log('Loading next question for session:', sessionId);
      const response = await apiClient.getNextQuestion(sessionId);
      if (response.success && response.data) {
        console.log('Question loaded:', { 
          qid: response.data.qid, 
          index: response.data.index, 
          total: response.data.total 
        });
        setCurrentQuestion(response.data);
        apiClient.trackEvent({
          type: 'question_shown',
          session_id: sessionId,
          qid: response.data.qid,
          index: response.data.index,
          total: response.data.total
        });
      } else {
        console.error('Failed to load question:', response.error);
        setError(response.error?.message || 'Failed to load question');
      }
    } catch (err) {
      console.error('Load question error:', err);
      setError('Failed to load question');
    }
  }, []);

  // Submit answer
  const handleAnswerSubmit = async (optionKey: 'A' | 'B') => {
    if (!session || !currentQuestion) return;

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const response = await apiClient.submitAnswer(
        session.session_id, 
        currentQuestion.qid, 
        optionKey,
        new Date().toISOString(),
        Date.now() - startTime
      );

      if (response.success && response.data) {
        setSession(response.data);
        
        apiClient.trackEvent({
          type: 'answer_submit',
          session_id: session.session_id,
          qid: currentQuestion.qid,
          key: optionKey
        });

        // Check if quiz is complete
        console.log('Answer submitted:', { 
          remaining: response.data.remaining, 
          answers_count: response.data.answers_count 
        });
        
        if (response.data.remaining === 0) {
          console.log('Quiz complete, finalizing...');
          setQuizPhase('finalizing');
          await finalizeQuiz(response.data.session_id);
        } else {
          console.log('Loading next question...');
          // Load next question
          await loadNextQuestion(response.data.session_id);
        }
      } else {
        setError(response.error?.message || 'Failed to submit answer');
      }
    } catch (err) {
      setError('Failed to submit answer');
      console.error('Submit answer error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Finalize quiz
  const finalizeQuiz = async (sessionId: string) => {
    try {
      const response = await apiClient.finalizeSession(sessionId);
      if (response.success && response.data) {
        apiClient.trackEvent({
          type: 'session_complete',
          session_id: sessionId,
          duration: Date.now() - new Date(session?.started_at || '').getTime()
        });
        
        // Navigate to results
        router.push(`/results?session=${sessionId}`);
      } else {
        setError(response.error?.message || 'Failed to finalize quiz');
      }
    } catch (err) {
      setError('Failed to finalize quiz');
      console.error('Finalize error:', err);
    }
  };

  if (isLoading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizPhase === 'picks') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Select Your Families
            </h1>
            <p className="text-gray-600 mb-8 text-center">
              Choose the families that resonate with you. You can select 1-7 families.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {FAMILIES.map((family) => (
                <button
                  key={family}
                  onClick={() => handleFamilyToggle(family)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedFamilies.includes(family)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {family}
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleSubmitPicks}
                disabled={selectedFamilies.length === 0 || isLoading}
                className="bg-blue-600 text-white py-3 px-8 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizPhase === 'questions' && currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Question {currentQuestion.index} of {currentQuestion.total}</span>
                <span>{Math.round((currentQuestion.index / currentQuestion.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentQuestion.index / currentQuestion.total) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {currentQuestion.familyScreen} - {currentQuestion.order_in_family}
              </h2>
              <p className="text-gray-700">
                Question content would go here (loaded from bank)
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleAnswerSubmit(option.key)}
                  disabled={isLoading}
                  className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center">
                    <span className="font-semibold text-blue-600 mr-3">{option.key}.</span>
                    <span className="text-gray-700">{option.text}</span>
                  </div>
                </button>
              ))}
            </div>

            {isLoading && (
              <div className="mt-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Processing...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (quizPhase === 'finalizing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Finalizing your results...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function QuizWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
