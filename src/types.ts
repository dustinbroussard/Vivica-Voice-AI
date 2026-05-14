export type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
}

export interface UserProfile {
  name: string;
  occupation: string;
  interests: string;
  additionalContext: string;
  rssFeeds?: string[];
}

export interface VoiceAssistantState {
  state: AssistantState;
  statusText: string;
  isActive: boolean;
  toggleListening: () => void;
  runNewsUpdate: () => Promise<void>;
}
