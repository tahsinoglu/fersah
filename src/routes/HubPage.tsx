import { Link } from 'react-router';
import { t } from '../i18n';
import type { AtlasId } from '../data/atlases';
import { dailyKey, dailyNumber } from '../quiz-engine/daily';
import { MODES } from '../quiz-engine/types';
import { useProgress } from '../progress/store';
import { formatDuration } from '../scoring/score';
import { ModeIcon } from '../ui/ModeIcon';
import { SectionTitle, Shell } from '../ui/Shell';
import { IconChevron } from '../ui/icons';

const TILE: Record<string, string> = { dogru: 'bg-[var(--correct)]', yakin: 'bg-[#e3b54a]', yanlis: 'bg-[var(--wrong)]' };

function DailyCard({ atlasId }: { atlasId: AtlasId }) {
  const p = useProgress();
  const key = dailyKey(atlasId);
  const rec = p.daily[`${atlasId}:${key}`];
  return (
    <Link
      to={`/gunluk/${atlasId}`}
      data-atlas={atlasId}
      className="glass-strong pressable flex flex-col gap-3 rounded-[22px] p-4"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent)]">
          <ModeIcon mode="gunluk" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">#{dailyNumber(key)}</p>
          <h3 className="text-[18px] font-extrabold leading-tight">{t.daily[`title_${atlasId}`]}</h3>
        </div>
        <IconChevron className="text-[var(--ink-3)]" />
      </div>
      {rec ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1" aria-label={t.daily.done}>
            {rec.tiles.map((x, i) => (
              <span key={i} className={`h-4 w-4 rounded-[4px] ${TILE[x]}`} />
            ))}
          </div>
          <span className="text-[14px] font-bold tabular-nums text-[var(--ink-2)]">
            {rec.score} · {formatDuration(rec.ms)}
          </span>
        </div>
      ) : (
        <p className="text-[15px] font-bold text-[var(--accent)]">{t.daily.play}</p>
      )}
      <p className="text-[12.5px] font-medium text-[var(--ink-3)]">{t.daily[`dayTz_${atlasId}`]}</p>
    </Link>
  );
}

function QuickRow({ atlasId }: { atlasId: AtlasId }) {
  return (
    <div data-atlas={atlasId}>
      <SectionTitle>{t.game[`scopeAll_${atlasId}`]}</SectionTitle>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {MODES.map((m) => (
          <Link
            key={m}
            to={`/oyun/${atlasId}/${m}/tum`}
            className="glass pressable flex w-[124px] shrink-0 flex-col gap-2 rounded-2xl p-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent)]">
              <ModeIcon mode={m} size={22} />
            </span>
            <span className="text-[15px] font-extrabold leading-tight">{t.modes[m].name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HubPage() {
  return (
    <Shell section="oyna" title={t.hub.title}>
      <Link
        to="/cocuk"
        className="kids-entry pressable relative overflow-hidden rounded-[26px] p-5 text-[#1d2433] shadow-md"
      >
        <span aria-hidden="true" className="kids-blob" />
        <p className="relative text-[28px] font-extrabold leading-tight">{t.hub.kidsTitle}</p>
        <p className="relative mt-1 max-w-[30ch] text-[15px] font-semibold opacity-80">{t.hub.kidsDesc}</p>
        <span className="relative mt-4 inline-flex h-14 items-center rounded-2xl bg-white/90 px-6 text-[18px] font-extrabold">Hadi başla!</span>
      </Link>

      <section>
        <SectionTitle>{t.modes.gunluk.name}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <DailyCard atlasId="memleket" />
          <DailyCard atlasId="cihan" />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <QuickRow atlasId="memleket" />
        <QuickRow atlasId="cihan" />
      </section>
    </Shell>
  );
}
