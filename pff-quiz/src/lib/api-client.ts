import { 
  SessionState, 
  Question, 
  AnswerEvent, 
  FinalizeResponse, 
  ApiResponse,
  AnalyticsEvent 
} from '@/types/api';

const API_BASE = '/api/engine';

class ApiClient {
  private baseUrl: string;
  private mockMode: boolean;

  constructor() {
    this.baseUrl = API_BASE;
    // Use mock mode if no real engine URL is set or if explicitly disabled
    this.mockMode = !process.env.NEXT_PUBLIC_ENGINE_URL || 
                   process.env.NEXT_PUBLIC_ENGINE_URL.includes('api.yourquiz.com') ||
                   process.env.NEXT_PUBLIC_FORCE_REAL_API !== 'true';
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: errorData.error || 'UNKNOWN_ERROR',
            message: errorData.message || 'An unknown error occurred',
            details: errorData
          }
        };
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
          details: error
        }
      };
    }
  }

  // Initialize a new session
  async initSession(sessionSeed: string): Promise<ApiResponse<SessionState>> {
    if (this.mockMode) {
      // Mock session for development
      const sessionId = `mock-${Date.now()}`;
      const mockSession: SessionState = {
        session_id: sessionId,
        state: 'INIT',
        started_at: new Date().toISOString(),
        line_state: {},
        face_ledger: {}
      };
      
      // Initialize answer count in session storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`mock_answers_${sessionId}`, '0');
      }
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            data: mockSession
          });
        }, 500); // Simulate network delay
      });
    }

    return this.request<SessionState>('/session/init', {
      method: 'POST',
      body: JSON.stringify({ session_seed: sessionSeed })
    });
  }

  // Set family picks
  async setPicks(sessionId: string, pickedFamilies: string[]): Promise<ApiResponse<SessionState>> {
    if (this.mockMode) {
      const mockSession: SessionState = {
        session_id: sessionId,
        state: 'PICKED',
        started_at: new Date().toISOString(),
        picked_families: pickedFamilies,
        line_state: {},
        face_ledger: {},
        schedule: {
          family_order: ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'],
          per_family: {}
        }
      };
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            data: mockSession
          });
        }, 300);
      });
    }

    return this.request<SessionState>('/session/picks', {
      method: 'POST',
      body: JSON.stringify({ 
        session_id: sessionId, 
        picked_families: pickedFamilies 
      })
    });
  }

  // Get next question
  async getNextQuestion(sessionId: string): Promise<ApiResponse<Question>> {
    if (this.mockMode) {
      // Get current answers count to determine question index
      const currentAnswers = parseInt(sessionStorage.getItem(`mock_answers_${sessionId}`) || '0');
      const questionIndex = currentAnswers + 1;
      
      // Mock different families and question types
      const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
      const orders = ['C', 'O', 'F'];
      
      const familyIndex = Math.floor((questionIndex - 1) / 3) % families.length;
      const orderIndex = (questionIndex - 1) % 3;
      
      const mockQuestion: Question = {
        qid: `mock-q-${questionIndex}`,
        familyScreen: families[familyIndex],
        order_in_family: orders[orderIndex] as 'C' | 'O' | 'F',
        options: [
          {
            key: 'A',
            text: `Option A - Question ${questionIndex} about ${families[familyIndex]} (${orders[orderIndex]})`,
            lineCOF: 'C',
            tells: []
          },
          {
            key: 'B',
            text: `Option B - Alternative for question ${questionIndex} about ${families[familyIndex]} (${orders[orderIndex]})`,
            lineCOF: 'O',
            tells: []
          }
        ],
        index: questionIndex,
        total: 18
      };
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            data: mockQuestion
          });
        }, 200);
      });
    }

    return this.request<Question>(`/session/next?session_id=${sessionId}`);
  }

  // Submit answer
  async submitAnswer(
    sessionId: string, 
    qid: string, 
    pickedKey: 'A' | 'B',
    ts?: string,
    latencyMs?: number
  ): Promise<ApiResponse<SessionState>> {
    if (this.mockMode) {
      // Get current answers count from session storage or default to 0
      const currentAnswers = parseInt(sessionStorage.getItem(`mock_answers_${sessionId}`) || '0');
      const newAnswersCount = currentAnswers + 1;
      const remaining = Math.max(0, 18 - newAnswersCount);
      
      // Store updated count
      sessionStorage.setItem(`mock_answers_${sessionId}`, newAnswersCount.toString());
      
      const mockSession: SessionState = {
        session_id: sessionId,
        state: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        answers_count: newAnswersCount,
        remaining: remaining
      };
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            data: mockSession
          });
        }, 200);
      });
    }

    const answerEvent: Partial<AnswerEvent> = {
      qid,
      picked_key: pickedKey,
      ts: ts || new Date().toISOString(),
      latency_ms: latencyMs || 0
    };

    return this.request<SessionState>('/session/answer', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        ...answerEvent
      })
    });
  }

  // Finalize session
  async finalizeSession(sessionId: string): Promise<ApiResponse<FinalizeResponse>> {
    if (this.mockMode) {
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
          }
        },
        family_reps: [
          {
            family: 'Control',
            rep: 'FACE/Control/Sovereign',
            rep_state: 'LIT',
            co_present: false
          }
        ],
        anchor_family: 'Boundary'
      };
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            data: mockResults
          });
        }, 1000);
      });
    }

    return this.request<FinalizeResponse>('/session/finalize', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId })
    });
  }

  // Resume session
  async resumeSession(sessionId: string): Promise<ApiResponse<SessionState>> {
    return this.request<SessionState>('/session/resume', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId })
    });
  }

  // Abort session
  async abortSession(sessionId: string, reason?: string): Promise<ApiResponse<SessionState>> {
    return this.request<SessionState>('/session/abort', {
      method: 'POST',
      body: JSON.stringify({ 
        session_id: sessionId, 
        reason: reason 
      })
    });
  }

  // Analytics tracking
  trackEvent(event: AnalyticsEvent) {
    // In a real implementation, this would send to your analytics service
    console.log('Analytics Event:', event);
    
    // Example: Send to analytics service
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', event.type, {
        session_id: event.session_id,
        bank_hash: event.bank_hash,
        qid: event.qid,
        index: event.index,
        total: event.total,
        key: event.key,
        duration: event.duration
      });
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
