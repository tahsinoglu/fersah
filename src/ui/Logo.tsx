import { useId } from 'react';

/**
 * Fersah işareti (Kimlik Rehberi 01): dört parsel, beyaz yollar, ortada mercan nokta.
 * 24 px ve altında nokta kalkar. `ground`: işaretin oturduğu zemin rengi (yolların rengi).
 */
export function FersahMark({ size = 40, ground = 'var(--bg)', mono }: { size?: number; ground?: string; mono?: string }) {
  const id = useId().replace(/:/g, '');
  const small = size <= 24;
  const road = small ? 9 : 6;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id={`fm${id}`}>
          <rect x="6" y="6" width="88" height="88" rx="18" />
        </clipPath>
      </defs>
      <g clipPath={`url(#fm${id})`}>
        {mono ? (
          <rect x="0" y="0" width="100" height="100" fill={mono} />
        ) : (
          <>
            <polygon points="0,0 57,0 51,49 0,44" fill="#3C78C8" />
            <polygon points="57,0 100,0 100,43 51,49" fill="#F2B33D" />
            <polygon points="0,44 51,49 60,100 0,100" fill="#5BC0CF" />
            <polygon points="51,49 100,43 100,100 60,100" fill="#34A169" />
          </>
        )}
        <polyline points="57,0 51,49 60,100" fill="none" stroke={ground} strokeWidth={road} strokeLinejoin="round" />
        <polyline points="0,44 51,49 100,43" fill="none" stroke={ground} strokeWidth={road} strokeLinejoin="round" />
      </g>
      {!small && (
        <>
          <circle cx="51" cy="49" r="10" fill={ground} />
          <circle cx="51" cy="49" r="6.5" fill={mono ? ground === '#FFFFFF' ? mono : '#E2574C' : '#E2574C'} />
        </>
      )}
    </svg>
  );
}

/** Yatay logo: işaret + "fersah" (Poppins SemiBold) */
export function FersahLogo({ size = 32, ground }: { size?: number; ground?: string }) {
  return (
    <span className="inline-flex items-center gap-[0.3em] text-[var(--ink)]" style={{ fontSize: size }} aria-label="fersah">
      <FersahMark size={Math.round(size * 1.1)} ground={ground} />
      <span className="font-display font-semibold leading-none tracking-[-0.02em]" aria-hidden="true">
        fersah
      </span>
    </span>
  );
}
