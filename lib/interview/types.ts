/**
 * Interview State Machine Types
 */

export type InterviewState = 
  | 'idle'
  | 'greeting'
  | 'company_intro'
  | 'position_intro'
  | 'asking_question'
  | 'listening'
  | 'processing'
  | 'bot_responding'
  | 'completed';

export interface InterviewQuestion {
  id: number;
  text: string;
  category?: string;
}

export interface InterviewConfig {
  companyName: string;
  positionName: string;
  questions: InterviewQuestion[];
  greetingMessage: string;
  companyIntro: string;
  positionIntro: string;
  closingMessage: string;
}

export interface InterviewStateData {
  currentState: InterviewState;
  currentQuestionIndex: number;
  userAnswers: Map<number, string>;
  config: InterviewConfig;
}

