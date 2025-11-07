export interface QuestionSection {
  title: string;
  prompts: string[];
}

export type RecordingState = 'idle' | 'permission-denied' | 'recording' | 'stopped' | 'playing';

export type Answer = {
  text: string;
  audioBlob: Blob | null;
};

export type AppState = 'welcome' | 'survey' | 'submitting' | 'submitted' | 'error';
