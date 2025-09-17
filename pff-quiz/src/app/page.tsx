'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRuntimeConfig } from '@/hooks/useRuntimeConfig';

export default function HomePage() {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { config, loading: configLoading } = useRuntimeConfig();

  const handleAgeConfirm = () => {
    setAgeConfirmed(true);
  };

  const handleStartQuiz = async () => {
    if (!ageConfirmed) return;
    
    setIsLoading(true);
    
    try {
      // Generate a session seed
      const sessionSeed = crypto.randomUUID();
      
      // Navigate to quiz with session seed
      router.push(`/quiz?seed=${sessionSeed}`);
    } catch (error) {
      console.error('Failed to start quiz:', error);
      setIsLoading(false);
    }
  };

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!ageConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              PFF Quiz
            </h1>
            <p className="text-gray-600 mb-8">
              This quiz is designed for individuals 16 years and older.
            </p>
            <button
              onClick={handleAgeConfirm}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              I&apos;m 16 or older
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Welcome to the PFF Quiz
          </h1>
          <p className="text-gray-600 mb-8">
            Discover your personality patterns through this interactive assessment.
            The quiz will take approximately 10-15 minutes to complete.
          </p>
          <div className="space-y-4">
            <button
              onClick={handleStartQuiz}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Starting...' : 'Start Quiz'}
            </button>
            <p className="text-sm text-gray-500">
              Bank Hash: {config?.allowedBankHashes[0]?.substring(0, 16)}...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}