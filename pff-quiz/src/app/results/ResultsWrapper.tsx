'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { FinalizeResponse } from '@/types/api';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [results, setResults] = useState<FinalizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankHash, setBankHash] = useState<string>('');

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    // In a real implementation, you would fetch results from the session
    // For now, we'll simulate the results structure
    const loadResults = async () => {
      try {
        // Simulate loading results
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock results for demonstration
        const mockResults: FinalizeResponse = {
          session_id: sessionId,
          state: 'FINALIZED',
          line_verdicts: {
            Control: 'C',
            Pace: 'O',
            Boundary: 'C',
            Truth: 'F',
            Recognition: 'C',
            Bonding: 'O',
            Stress: 'C'
          },
          face_states: {
            'FACE/Control/Sovereign': {
              state: 'LIT',
              familiesHit: 5,
              signatureHits: 2,
              clean: 4,
              bent: 1,
              broken: 0,
              contrastSeen: true
            },
            'FACE/Control/Rebel': {
              state: 'LEAN',
              familiesHit: 3,
              signatureHits: 1,
              clean: 2,
              bent: 1,
              broken: 0,
              contrastSeen: false
            },
            'FACE/Pace/Visionary': {
              state: 'GHOST',
              familiesHit: 2,
              signatureHits: 0,
              clean: 1,
              bent: 2,
              broken: 1,
              contrastSeen: false
            },
            'FACE/Pace/Navigator': {
              state: 'COLD',
              familiesHit: 2,
              signatureHits: 0,
              clean: 1,
              bent: 1,
              broken: 0,
              contrastSeen: false
            }
          },
          family_reps: [
            {
              family: 'Control',
              rep: 'FACE/Control/Sovereign',
              rep_state: 'LIT',
              co_present: false
            },
            {
              family: 'Pace',
              rep: 'FACE/Pace/Navigator',
              rep_state: 'COLD',
              co_present: false
            }
          ],
          anchor_family: 'Boundary'
        };

        setResults(mockResults);
        // Use a consistent mock hash for development
        setBankHash('f3b83f5647111864456d1d73accf7fd4936139e95381c827b0c4d2353749c6df');
        
        apiClient.trackEvent({
          type: 'agree_click',
          session_id: sessionId
        });
      } catch (err) {
        setError('Failed to load results');
        console.error('Load results error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [sessionId, router]);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'LIT': return 'text-green-600 bg-green-100';
      case 'LEAN': return 'text-blue-600 bg-blue-100';
      case 'GHOST': return 'text-purple-600 bg-purple-100';
      case 'COLD': return 'text-gray-600 bg-gray-100';
      case 'ABSENT': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'C': return 'text-green-600 bg-green-100';
      case 'O': return 'text-yellow-600 bg-yellow-100';
      case 'F': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your results...</p>
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

  if (!results) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Your Results
          </h1>

          {/* Line Verdicts */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Family Line Verdicts</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(results.line_verdicts).map(([family, verdict]) => (
                <div key={family} className="text-center">
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getVerdictColor(verdict)}`}>
                    {family}: {verdict}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Face States */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Face States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(results.face_states).map(([faceId, state]) => (
                <div key={faceId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      {faceId.split('/').pop()}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(state.state)}`}>
                      {state.state}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Families Hit: {state.familiesHit}</div>
                    <div>Signature Hits: {state.signatureHits}</div>
                    <div>Clean: {state.clean} | Bent: {state.bent} | Broken: {state.broken}</div>
                    <div>Contrast Seen: {state.contrastSeen ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Family Representatives */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Family Representatives</h2>
            <div className="space-y-2">
              {results.family_reps.map((rep) => (
                <div key={rep.family} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{rep.family}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{rep.rep.split('/').pop()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(rep.rep_state)}`}>
                      {rep.rep_state}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anchor Family */}
          {results.anchor_family && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Anchor Family</h2>
              <div className="text-center">
                <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium">
                  {results.anchor_family}
                </span>
              </div>
            </div>
          )}

          {/* Bank Hash Verification */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <p>Bank Hash: {bankHash}</p>
              {bankHash !== process.env.NEXT_PUBLIC_BANK_HASH && process.env.NODE_ENV === 'production' && (
                <p className="text-red-500 mt-1">⚠️ Hash mismatch detected</p>
              )}
              {process.env.NODE_ENV === 'development' && (
                <p className="text-blue-500 mt-1">🔧 Development mode - Mock data</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white py-3 px-8 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Take Quiz Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
