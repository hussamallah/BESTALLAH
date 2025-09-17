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

  constructor() {
    this.baseUrl = API_BASE;
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
    return this.request<SessionState>('/session/init', {
      method: 'POST',
      body: JSON.stringify({ session_seed: sessionSeed })
    });
  }

  // Set family picks
  async setPicks(sessionId: string, pickedFamilies: string[]): Promise<ApiResponse<SessionState>> {
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
