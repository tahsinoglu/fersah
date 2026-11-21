export type ModeId = 'bul' | 'neresi' | 'yakin' | 'siluet' | 'hepsi';
export const MODES: ModeId[] = ['bul', 'neresi', 'yakin', 'siluet', 'hepsi'];

/** Sorulabilecek bir yer (il, ülke) */
export interface QuizItem {
  id: string;
  name: string;
  groupId: string;
}

export type QuestionKind = 'bul' | 'neresi' | 'yakin' | 'siluet';

export interface Question {
  kind: QuestionKind;
  target: string;
  /** "Bu Neresi?" ve "Siluet" için dört şık (hedef dahil, karışık) */
  options?: string[];
}

export interface RoundPlan {
  mode: ModeId | 'gunluk';
  questions: Question[];
}
