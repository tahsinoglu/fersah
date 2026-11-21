export type ModeId = 'bul' | 'neresi' | 'yakin' | 'plaka' | 'bayrak' | 'test' | 'hepsi';
export const MODES: ModeId[] = ['bul', 'neresi', 'yakin', 'plaka', 'bayrak', 'test', 'hepsi'];

/** Bölüme özel mod: Memleket'te plaka, Cihan'da bayrak */
export const specialMode = (atlas: string): 'plaka' | 'bayrak' => (atlas === 'memleket' ? 'plaka' : 'bayrak');
export const modesFor = (atlas: string): ModeId[] =>
  atlas === 'memleket' ? ['bul', 'neresi', 'yakin', 'plaka', 'test', 'hepsi'] : ['bul', 'neresi', 'yakin', 'bayrak', 'hepsi'];

/** Sorulabilecek bir yer (il, ülke) */
export interface QuizItem {
  id: string;
  name: string;
  groupId: string;
}

export type QuestionKind = 'bul' | 'neresi' | 'yakin' | 'plaka' | 'bayrak';

export interface Question {
  kind: QuestionKind;
  target: string;
  /** "Burası Neresi?", "Plaka" ve "Bayrak" için dört şık (hedef dahil, karışık) */
  options?: string[];
  /** Plaka/Bayrak yönü: 'kod' = plaka ya da bayrak gösterilir, ad seçilir; 'ad' = ad gösterilir, plaka ya da bayrak seçilir */
  variant?: 'kod' | 'ad';
}

export interface RoundPlan {
  mode: ModeId | 'gunluk';
  questions: Question[];
}
