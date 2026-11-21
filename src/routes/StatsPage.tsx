import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../i18n';
import { loadAtlas, type AtlasId } from '../data/atlases';
import type { Atlas } from '../map-engine/types';
import { resetProgress, streaks, useProgress } from '../progress/store';
import { formatDuration } from '../scoring/score';
import { scopeName } from '../game/content';
import { SectionTitle, Shell } from '../ui/Shell';
import { IconLayers } from '../ui/icons';
import { AccountCard, Leaderboard, LoginDialog, PresenceLine, usePano } from '../account/ui';

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--ink-3)]">{label}</p>
      <p className="mt-1 text-[28px] font-extrabold leading-none tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[12.5px] font-semibold text-[var(--ink-3)]">{sub}</p>}
    </div>
  );
}

export function StatsPage() {
  const p = useProgress();
  const navigate = useNavigate();
  const [atlases, setAtlases] = useState<Partial<Record<AtlasId, Atlas>>>({});
  const [confirm, setConfirm] = useState(false);
  const [login, setLogin] = useState(false);
  const view = usePano(30_000);

  useEffect(() => {
    loadAtlas('memleket').then((a) => setAtlases((x) => ({ ...x, memleket: a })));
    loadAtlas('cihan').then((a) => setAtlases((x) => ({ ...x, cihan: a })));
  }, []);

  const cards = Object.entries(p.cards);
  const seen = cards.reduce((s, [, c]) => s + c.seen, 0);
  const correct = cards.reduce((s, [, c]) => s + c.correct, 0);
  const { current, longest } = streaks(p.days);

  const weakest = useMemo(
    () =>
      cards
        .filter(([, c]) => c.wrong > 0)
        .sort((a, b) => b[1].wrong / b[1].seen - a[1].wrong / a[1].seen || b[1].wrong - a[1].wrong)
        .slice(0, 12)
        .map(([k, c]) => {
          const [atlasId, id] = k.split(':') as [AtlasId, string];
          return { k, atlasId, name: atlases[atlasId]?.unitById.get(id)?.name ?? id, c };
        }),
    [cards, atlases],
  );

  const best = Object.entries(p.best).map(([k, ms]) => {
    const [atlasId, scope] = k.split(':') as [AtlasId, string];
    const a = atlases[atlasId];
    return { k, label: a ? scopeName(atlasId, a, scope) : scope, ms };
  });

  const openLearn = (id: AtlasId) => {
    try {
      sessionStorage.setItem('mc-learn', '1');
    } catch {
      /* yok say */
    }
    navigate(`/${id}`);
  };

  return (
    <Shell section="istatistik" title={t.stats.title}>
      <AccountCard onLogin={() => setLogin(true)} />
      <PresenceLine view={view} />
      <Leaderboard view={view} onLogin={() => setLogin(true)} />
      {login && <LoginDialog onClose={() => setLogin(false)} />}
      <SectionTitle>İstatistiklerim</SectionTitle>
      {seen === 0 && <p className="glass rounded-2xl p-4 text-[15px] font-semibold text-[var(--ink-2)]">{t.stats.noData}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Tile label={t.stats.accuracy} value={seen ? `%${Math.round((correct / seen) * 100)}` : '–'} sub={`${correct}/${seen}`} />
        <Tile label={t.stats.streak} value={t.stats.streakDays(current)} sub={t.stats.longest(longest)} />
        <Tile label={t.stats.rounds} value={String(p.rounds.length)} />
        <Tile label={t.stats.answered} value={String(seen)} />
      </div>

      <section>
        <SectionTitle>{t.game.learningMap}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {(['memleket', 'cihan'] as AtlasId[]).map((id) => (
            <button key={id} type="button" data-atlas={id} onClick={() => openLearn(id)} className="glass pressable flex h-14 items-center justify-center gap-2 rounded-2xl text-[16px] font-bold text-[var(--accent)]">
              <IconLayers size={20} />
              {id === 'memleket' ? t.nav.memleket : t.nav.cihan}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>{t.stats.best}</SectionTitle>
        {best.length ? (
          <ul className="glass divide-y divide-[var(--hairline)] rounded-2xl">
            {best.map((b) => (
              <li key={b.k} className="flex items-center justify-between px-4 py-3 text-[15px] font-semibold">
                <span>{b.label}</span>
                <span className="tabular-nums font-extrabold">{formatDuration(b.ms)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] font-medium text-[var(--ink-3)]">{t.stats.noBest}</p>
        )}
      </section>

      {weakest.length > 0 && (
        <section>
          <SectionTitle>{t.stats.weakest}</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {weakest.map((w) => (
              <li key={w.k} className="glass rounded-xl px-3 py-2 text-[15px] font-semibold">
                {w.name} <span className="text-[13px] text-[var(--ink-3)] tabular-nums">{w.c.correct}/{w.c.seen}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-[var(--ink-3)]">
          Gizlilik: Fersah yalnızca seçtiğin kullanıcı adını, 4 haneli şifrenin geri çözülemez özetini, puanlarını ve öğrenme ilerlemeni saklar.
          Gerçek adın, e-postan, konumun ya da reklam kimliğin istenmez ve toplanmaz. Hesabını yukarıdan istediğin an silebilirsin. Küçük Seyyah
          bölümünde hiçbir hesap ve veri kullanılmaz; ilerleme yalnızca cihazda kalır.
        </p>
        {confirm ? (
          <div className="glass flex flex-col gap-2 rounded-2xl p-4" role="alertdialog" aria-label={t.stats.resetConfirm}>
            <p className="text-[15px] font-semibold">{t.stats.resetConfirm}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { resetProgress(); setConfirm(false); }} className="pressable h-12 flex-1 rounded-xl bg-[var(--wrong)] font-bold text-white">
                {t.stats.resetYes}
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="glass pressable h-12 flex-1 rounded-xl font-bold">
                {t.stats.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="self-start text-[14px] font-semibold text-[var(--ink-3)] underline">
            {t.stats.reset}
          </button>
        )}
      </section>
    </Shell>
  );
}
