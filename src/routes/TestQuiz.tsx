import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../i18n';
import type { Atlas } from '../map-engine/types';
import { BOLGELER, ILLER } from '../data/memleket';
import ilcelerJson from '../data/generated/ilceler.json';
import karayoluJson from '../data/generated/karayolu.json';
import mahalleJson from '../data/generated/mahalle-sayisi.json';
import { generateMemleketTest, type TestData, type TextQuestion } from '../quiz-engine/memleketTest';
import { answerScore } from '../scoring/score';
import { weightOf } from '../progress/leitner';
import { cardKey, getProgress, recordAnswer, recordRound } from '../progress/store';
import type { Answer } from '../game/evaluate';
import { scopeName } from '../game/content';
import { useSafeArea } from '../lib/viewport';
import { FeedbackCard, GameHud, OptionGrid, PromptCard, type OptionState } from '../ui/game';
import { ResultView } from '../ui/ResultView';
import { ModeIcon } from '../ui/ModeIcon';
import { onRoundFinished } from '../account/hooks';

/** Memleket Testi: haritasız, metin tabanlı sorular (ilçeler, komşular, bölgeler, karayolu mesafeleri) */
export function TestQuiz({ atlas, scope, exitTo }: { atlas: Atlas; scope: string; exitTo: string }) {
  const navigate = useNavigate();
  const safe = useSafeArea();
  const [round, setRound] = useState(0);
  const data: TestData = useMemo(
    () => ({
      iller: ILLER,
      bolgeAd: Object.fromEntries(BOLGELER.map((b) => [b.id, b.ad])),
      ilceler: ilcelerJson as Record<string, string[]>,
      komsular: Object.fromEntries(atlas.units.map((u) => [u.id, u.neighbors])),
      karayolu: karayoluJson as Record<string, number>,
      buyukluk: mahalleJson as Record<string, Record<string, number>>,
    }),
    [atlas],
  );
  const questions = useMemo(() => {
    const cards = getProgress().cards;
    return generateMemleketTest({ data, scope, seed: `${Date.now()}:${round}`, weight: (p) => weightOf(cards[cardKey('memleket', p)]) });
  }, [data, scope, round]);

  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const start = useRef(performance.now());
  const qStart = useRef(performance.now());
  const q: TextQuestion | undefined = questions[i];
  const names = useMemo(() => Object.fromEntries(atlas.units.map((u) => [u.id, u.name])), [atlas]);

  useEffect(() => {
    qStart.current = performance.now();
    setPicked(null);
  }, [i, round]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && navigate(exitTo);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitTo, navigate]);

  const score = answers.reduce((s, a) => s + a.score, 0);

  const finish = (all: Answer[]) => {
    setDone(true);
    const ms = performance.now() - start.current;
    const total = all.reduce((s, a) => s + a.score, 0);
    const rec = { at: Date.now(), atlas: 'memleket', scope, mode: 'test', total: all.length, correct: all.filter((a) => a.correct).length, score: total, ms };
    recordRound(rec);
    onRoundFinished(rec);
  };

  const choose = (idx: number) => {
    if (!q || picked !== null) return;
    setPicked(idx);
    const correct = idx === q.answer;
    const a: Answer = { target: q.about, kind: 'neresi', correct, score: answerScore(correct, performance.now() - qStart.current), ms: performance.now() - qStart.current };
    setAnswers((x) => [...x, a]);
    recordAnswer('memleket', q.about, correct);
    try {
      navigator.vibrate?.(correct ? 10 : 30);
    } catch {
      /* yok */
    }
  };

  const next = () => {
    if (i + 1 >= questions.length) finish(answers);
    else setI(i + 1);
  };

  if (done) {
    return (
      <ResultView
        title={`${t.modes.test.name} · ${scopeName('memleket', atlas, scope)}`}
        answers={answers}
        names={names}
        score={score}
        ms={performance.now() - start.current}
        onAgain={() => {
          setAnswers([]);
          setI(0);
          setDone(false);
          start.current = performance.now();
          setRound((r) => r + 1);
        }}
        onBack={() => navigate(exitTo)}
        backLabel={t.game.backToMap}
      />
    );
  }
  if (!q) return null;

  const states: Record<string, OptionState> = {};
  if (picked !== null) q.options.forEach((_, k) => (states[k] = k === q.answer ? 'ok' : k === picked ? 'bad' : 'dim'));
  const optNames = Object.fromEntries(q.options.map((o, k) => [k, o]));
  const correct = picked === q.answer;

  return (
    <div className="flex h-full flex-col px-3" style={{ paddingTop: safe.top + 10, paddingBottom: safe.bottom + 12 }}>
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-3">
        <GameHud onExit={() => navigate(exitTo)} progress={t.game.question(i + 1, questions.length)} score={score} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent-tint)] text-[var(--accent)]" aria-hidden="true">
            <ModeIcon mode="test" size={34} />
          </span>
          <div className="w-full">
            <PromptCard label={t.modes.test.name} title={q.prompt} />
          </div>
        </div>
        {picked !== null ? (
          <FeedbackCard
            ok={correct}
            title={correct ? t.game.correct : t.game.wrong}
            lines={correct ? [] : [t.game.answerWas(q.options[q.answer])]}
            fact={{ metin: q.explain, kaynak: '', dogrulandi: true }}
            onNext={next}
            nextLabel={i + 1 >= questions.length ? t.game.finish : t.game.next}
          />
        ) : (
          <OptionGrid options={q.options.map((_, k) => String(k))} names={optNames} states={states} disabled={false} onPick={(id) => choose(Number(id))} />
        )}
      </div>
    </div>
  );
}
