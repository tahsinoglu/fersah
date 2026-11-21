import type { Feature, Geometry } from 'geojson';
import { distanceToFeatureKm } from '../scoring/geo';
import { answerScore, nearIsCorrect, nearShotScore } from '../scoring/score';
import type { QuestionKind } from '../quiz-engine/types';

export interface Answer {
  target: string;
  kind: QuestionKind;
  correct: boolean;
  score: number;
  ms: number;
  picked?: string | null;
  km?: number;
  /** Yakın Atış'ta tıklanan nokta ve hedefteki en yakın nokta */
  at?: [number, number];
  nearest?: [number, number];
}

/** Seçmeli sorular (bul, neresi, siluet) */
export function evaluateChoice(kind: QuestionKind, target: string, picked: string | null, ms: number): Answer {
  const correct = picked === target;
  return { target, kind, correct, score: answerScore(correct, ms), ms, picked };
}

/** Yakın Atış: tıklanan noktanın hedefe uzaklığı */
export function evaluateNear(target: string, feature: Feature<Geometry>, at: [number, number] | null, ms: number, scaleKm: number): Answer {
  if (!at) return { target, kind: 'yakin', correct: false, score: 0, ms, km: undefined };
  const { km, nearest } = distanceToFeatureKm(feature, at);
  const score = nearShotScore(km, scaleKm);
  return { target, kind: 'yakin', correct: nearIsCorrect(score), score, ms, km: Math.round(km), at, nearest };
}
