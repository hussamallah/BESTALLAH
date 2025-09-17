// API Types for PFF Quiz Engine

export interface SessionState {
  session_id: string;
  state: 'INIT' | 'PICKED' | 'IN_PROGRESS' | 'PAUSED' | 'FINALIZING' | 'FINALIZED' | 'ABORTED';
  started_at: string;
  picked_families?: string[];
  line_state?: Record<string, LineState>;
  face_ledger?: Record<string, FaceLedger>;
  schedule?: QuestionSchedule;
  answers_count?: number;
  remaining?: number;
}

export interface LineState {
  C: number;
  O_seen: boolean;
  F_seen: boolean;
}

export interface FaceLedger {
  questions_hit: string[];
  families_hit: number[];
  signature_qids: string[];
  context_counts: {
    Clean: number;
    Bent: number;
    Broken: number;
  };
  per_family_counts: Record<number, number>;
  contrast_seen: boolean;
}

export interface QuestionSchedule {
  family_order: string[];
  per_family: Record<string, {
    count: number;
    qids: string[];
  }>;
}

export interface Question {
  qid: string;
  familyScreen: string;
  order_in_family: 'C' | 'O' | 'F';
  options: QuestionOption[];
  index: number;
  total: number;
}

export interface QuestionOption {
  key: 'A' | 'B';
  text: string;
  lineCOF: 'C' | 'O' | 'F';
  tells: Tell[];
}

export interface Tell {
  face_id: string;
  tell_id: string;
}

export interface AnswerEvent {
  qid: string;
  familyScreen: string;
  picked_key: 'A' | 'B';
  lineCOF: 'C' | 'O' | 'F';
  tells: Tell[];
  ts: string;
  latency_ms: number;
}

export interface FinalizeResponse {
  session_id: string;
  state: 'FINALIZED';
  line_verdicts: Record<string, 'C' | 'O' | 'F'>;
  face_states: Record<string, FaceState>;
  family_reps: FamilyRep[];
  anchor_family?: string;
}

export interface FaceState {
  state: 'LIT' | 'LEAN' | 'GHOST' | 'COLD' | 'ABSENT';
  familiesHit: number;
  signatureHits: number;
  clean: number;
  bent: number;
  broken: number;
  contrastSeen: boolean;
}

export interface FamilyRep {
  family: string;
  rep: string;
  rep_state: 'LIT' | 'LEAN' | 'GHOST' | 'COLD' | 'ABSENT';
  co_present: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Runtime configuration
export interface RuntimeConfig {
  resultsEnabled: boolean;
  allowedBankHashes: string[];
  picksPolicy: 'at_least_one' | 'all_21_on_zero';
}

// Analytics events
export interface AnalyticsEvent {
  type: 'session_start' | 'question_shown' | 'answer_submit' | 'agree_click' | 'session_complete';
  session_id?: string;
  bank_hash?: string;
  qid?: string;
  index?: number;
  total?: number;
  key?: 'A' | 'B';
  duration?: number;
}
