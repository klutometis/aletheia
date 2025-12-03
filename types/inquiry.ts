// Core types for the inquiry complex
export type QuestionId = string;
export type UserId = string;

export interface Question {
  id: QuestionId;
  text: string;
  importance: number; // 0-1, for equilibrium calculation
  camp?: 'traditionalist' | 'augmentationist' | 'post-expertise';
}

export interface ReferenceAnswer {
  camp: string;
  position: string;
  source?: string; // Citation
}

export interface UserAnswer {
  questionId: QuestionId;
  stance: string; // ~300 char nuanced position
  confidence: number; // 0-1
  timestamp: Date;
  considerations: string[]; // What factors matter
}

export interface Edge {
  from: QuestionId;
  to: QuestionId;
  type: 'dependency' | 'tension' | 'related';
  weight?: number;
}

export interface InquiryComplex {
  id: string;
  topic: string;
  questions: Question[];
  edges: Edge[];
  referenceAnswers: Map<QuestionId, ReferenceAnswer[]>;
}

export interface UserView {
  userId: UserId;
  answers: Map<QuestionId, UserAnswer>;
  equilibrium: EquilibriumScore;
}

export interface EquilibriumScore {
  coverage: number; // 0-1
  stability: number; // 0-1  
  consistency: number; // 0-1
  counterfactual: number; // 0-1
  overall: number; // 0-1
}
