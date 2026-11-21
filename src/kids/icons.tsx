// Çocuk Köşesi simgeleri: projede elle çizildi (telifli karakter yok).
import type { ReactElement } from 'react';

const S = (children: ReactElement | ReactElement[], bg: string) => (
  <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
    <circle cx="24" cy="24" r="23" fill={bg} />
    {children}
  </svg>
);

export const KIDS_ICONS: Record<string, () => ReactElement> = {
  cay: () =>
    S(
      <>
        <ellipse cx="24" cy="37" rx="11" ry="2.6" fill="#d9a56b" />
        <path d="M17 13h14c0 4-2.4 6-2.4 9.5S31 29 30 33c-.6 2-3 3-6 3s-5.4-1-6-3c-1-4 1.4-7 1.4-10.5S17 17 17 13Z" fill="#fff" stroke="#c8d4dc" strokeWidth="1.2" />
        <path d="M18.6 19h10.8c-.6 1.3-.8 2.3-.8 3.5 0 3 2.2 6.3 1.5 10-.4 1.6-2.6 2.4-6.1 2.4s-5.7-.8-6.1-2.4c-.7-3.7 1.5-7 1.5-10 0-1.2-.2-2.2-.8-3.5Z" fill="#b8431f" />
      </>,
      '#fde7c8',
    ),
  kayisi: () =>
    S(
      <>
        <circle cx="23" cy="27" r="11" fill="#f7a23b" />
        <path d="M23 16.5c-1.5 3.5-1.5 15 0 21" stroke="#e07f1c" strokeWidth="1.6" fill="none" />
        <path d="M24 16c3-5 8-6 11-5-1.5 4-6 6.5-11 5Z" fill="#5fae5a" />
      </>,
      '#fff0d6',
    ),
  findik: () =>
    S(
      <>
        <ellipse cx="24" cy="28" rx="10" ry="11" fill="#a86a3a" />
        <ellipse cx="21" cy="25" rx="3" ry="4" fill="#c58b57" />
        <path d="M13 19c3-6 19-6 22 0-2 2.5-20 2.5-22 0Z" fill="#7fae56" />
      </>,
      '#f4e6d4',
    ),
  fistik: () =>
    S(
      <>
        <path d="M14 30c-2-8 6-17 14-16 6 1 8 7 5 13-3 7-17 11-19 3Z" fill="#d9c49b" />
        <path d="M18 28c-1-5 4-10 9-10 3 .2 4 4 2 8-2.5 4.5-10.5 6-11 2Z" fill="#8ec25d" />
      </>,
      '#eef6e2',
    ),
  gul: () =>
    S(
      <>
        <path d="M24 30v10" stroke="#4f9a4c" strokeWidth="2.4" />
        <path d="M24 36c3-3 7-3 8-1-2 2-5 2-8 1Z" fill="#5fae5a" />
        <circle cx="24" cy="21" r="10" fill="#f28fb0" />
        <path d="M24 15c4 0 6 3 5 6s-6 4-8 1 0-5 3-4" stroke="#d65f8a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </>,
      '#fde4ee',
    ),
  uzum: () =>
    S(
      <>
        <path d="M24 9v6" stroke="#6b8f3a" strokeWidth="2.2" />
        <path d="M25 12c3-3 7-3 9-1-3 2-6 2-9 1Z" fill="#7fae56" />
        {[[19, 18], [24, 17], [29, 18], [21.5, 23], [26.5, 23], [17, 23], [31, 23], [19, 28], [24, 28], [29, 28], [21.5, 33], [26.5, 33], [24, 38]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.4" fill="#7b4fa0" stroke="#68408c" strokeWidth=".6" />
        ))}
      </>,
      '#efe4f7',
    ),
  zeytin: () =>
    S(
      <>
        <path d="M10 33c8-2 18-10 26-20" stroke="#7a6a3e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="17" cy="24" rx="6" ry="2.4" transform="rotate(-35 17 24)" fill="#8fb36b" />
        <ellipse cx="29" cy="25" rx="6" ry="2.4" transform="rotate(30 29 25)" fill="#8fb36b" />
        <ellipse cx="21" cy="33" rx="4" ry="5" fill="#4d6b2a" />
        <ellipse cx="30" cy="16" rx="3.6" ry="4.6" fill="#5e7f33" />
      </>,
      '#eef3e3',
    ),
  incir: () =>
    S(
      <>
        <path d="M24 12c2 0 3 2 3 4 6 3 9 8 8 13-1 6-6 9-11 9s-10-3-11-9c-1-5 2-10 8-13 0-2 1-4 3-4Z" fill="#8a4e86" />
        <path d="M24 12v-3" stroke="#5f7d3a" strokeWidth="2" />
        <ellipse cx="20" cy="27" rx="2.5" ry="4" fill="#a8689f" />
      </>,
      '#f2e3ef',
    ),
  balon: () =>
    S(
      <>
        <path d="M24 8c8 0 13 6 13 12 0 7-8 12-10 15h-6c-2-3-10-8-10-15 0-6 5-12 13-12Z" fill="#ef6f5e" />
        <path d="M24 8c3 0 5 6 5 12s-3 12-3.5 15h-3C22 32 19 26 19 20s2-12 5-12Z" fill="#ffd166" />
        <path d="M21 35l1 4M27 35l-1 4" stroke="#7a5a3a" strokeWidth="1.2" />
        <rect x="21" y="39" width="6" height="4" rx="1" fill="#a2703f" />
      </>,
      '#dff0fb',
    ),
  dag: () =>
    S(
      <>
        <path d="M6 38 21 13l7 11 4-5 10 19Z" fill="#7b8aa6" />
        <path d="M21 13l-5 8 3-1 2 2 2-2 2.4 1.8Z" fill="#fff" />
        <path d="M32 19l-2.2 3.2 1.6-.4 1 1 1.4-1Z" fill="#fff" />
      </>,
      '#e3edf7',
    ),
  kedi: () =>
    S(
      <>
        <path d="M12 16l3 9h18l3-9-7 4h-10Z" fill="#fff" stroke="#d9dee5" />
        <ellipse cx="24" cy="29" rx="12" ry="10" fill="#fff" stroke="#d9dee5" />
        <circle cx="19.5" cy="27" r="2.6" fill="#3a8ee0" />
        <circle cx="28.5" cy="27" r="2.6" fill="#e0a93a" />
        <path d="M24 31l-1.6 1.4h3.2Z" fill="#f2a0a8" />
        <path d="M24 32.4v1.6M24 34c-1.2 1-2.6 1-3.4.2M24 34c1.2 1 2.6 1 3.4.2" stroke="#9aa5b4" strokeWidth=".9" fill="none" />
      </>,
      '#e8f1fb',
    ),
  koala: () =>
    S(
      <>
        <circle cx="13" cy="19" r="7" fill="#9aa4b2" />
        <circle cx="35" cy="19" r="7" fill="#9aa4b2" />
        <circle cx="13" cy="19" r="3.5" fill="#e9d7dc" />
        <circle cx="35" cy="19" r="3.5" fill="#e9d7dc" />
        <circle cx="24" cy="27" r="12" fill="#aab4c1" />
        <circle cx="19" cy="25" r="1.8" fill="#2b2f36" />
        <circle cx="29" cy="25" r="1.8" fill="#2b2f36" />
        <ellipse cx="24" cy="30" rx="3.4" ry="4.4" fill="#3b3f47" />
      </>,
      '#e6f2e4',
    ),
  panda: () =>
    S(
      <>
        <circle cx="14" cy="15" r="5" fill="#2b2f36" />
        <circle cx="34" cy="15" r="5" fill="#2b2f36" />
        <circle cx="24" cy="26" r="13" fill="#fff" stroke="#d9dee5" />
        <ellipse cx="18.5" cy="24" rx="3.6" ry="4.6" transform="rotate(-25 18.5 24)" fill="#2b2f36" />
        <ellipse cx="29.5" cy="24" rx="3.6" ry="4.6" transform="rotate(25 29.5 24)" fill="#2b2f36" />
        <circle cx="19" cy="24" r="1.1" fill="#fff" />
        <circle cx="29" cy="24" r="1.1" fill="#fff" />
        <ellipse cx="24" cy="30" rx="2.4" ry="1.6" fill="#2b2f36" />
      </>,
      '#e5f3e0',
    ),
  piramit: () =>
    S(
      <>
        <circle cx="35" cy="14" r="4" fill="#ffcf5a" />
        <path d="M5 37 19 15l14 22Z" fill="#e4b866" />
        <path d="M19 15l14 22h-7Z" fill="#c99a48" />
        <path d="M24 37l10-14 10 14Z" fill="#d8aa58" />
      </>,
      '#fff1d6',
    ),
  eyfel: () =>
    S(
      <>
        <path d="M24 7v4M22.5 11h3l1.5 9h-6Z" fill="#5c6a80" stroke="#5c6a80" strokeWidth="1" />
        <path d="M20 20h8l3 9H17Z" fill="#6b7a91" />
        <path d="M17 29h14l5 11h-6c-1-4-3.4-6-6-6s-5 2-6 6h-6Z" fill="#7b8aa1" />
        <path d="M18 24h12M16 33h16" stroke="#e3e8ef" strokeWidth="1" />
      </>,
      '#e5ecf6',
    ),
  penguen: () =>
    S(
      <>
        <ellipse cx="24" cy="27" rx="10" ry="13" fill="#2b2f36" />
        <ellipse cx="24" cy="30" rx="6.5" ry="9" fill="#fff" />
        <circle cx="21" cy="20" r="1.5" fill="#fff" />
        <circle cx="27" cy="20" r="1.5" fill="#fff" />
        <path d="M22 23h4l-2 2.4Z" fill="#f2a33a" />
        <path d="M18 40h5M25 40h5" stroke="#f2a33a" strokeWidth="2.4" strokeLinecap="round" />
      </>,
      '#e2f0fb',
    ),
  zurafa: () =>
    S(
      <>
        <path d="M22 40V20c0-3 1-6 4-7l6-2c2 0 3 2 2 3l-5 4v22Z" fill="#f2c25a" />
        <path d="M27 10v-3M31 9V6" stroke="#a2703f" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="30" cy="13" r="1.1" fill="#2b2f36" />
        {[[24.5, 24], [26.5, 30], [24, 35], [27, 19]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill="#b5762f" />
        ))}
      </>,
      '#fdf0d4',
    ),
  fil: () =>
    S(
      <>
        <ellipse cx="13" cy="23" rx="7" ry="9" fill="#a7b1c0" />
        <ellipse cx="35" cy="23" rx="7" ry="9" fill="#a7b1c0" />
        <circle cx="24" cy="22" r="10" fill="#b8c1ce" />
        <path d="M21 27c0 5 1 9 4 11 2 1 4 0 3-2-2-1-3-4-3-9Z" fill="#b8c1ce" />
        <circle cx="20" cy="20" r="1.5" fill="#2b2f36" />
        <circle cx="28" cy="20" r="1.5" fill="#2b2f36" />
      </>,
      '#e8eef5',
    ),
  papagan: () =>
    S(
      <>
        <path d="M24 38c-6-2-9-8-8-15 1-6 6-10 11-9 4 1 6 5 5 9l-3 6c-1 4-2 7-5 9Z" fill="#e94b3c" />
        <path d="M19 30c-2 3-2 7 0 10l4-2c-2-2-3-5-4-8Z" fill="#3a8ee0" />
        <path d="M22 28c1 3 1 6 0 9l3-1c0-3-1-6-3-8Z" fill="#f2c23a" />
        <path d="M29 17c3 0 5 2 5 5-2-1-4-1-5 0Z" fill="#f4f1ea" />
        <circle cx="27" cy="17" r="1.4" fill="#2b2f36" />
      </>,
      '#e3f4e6',
    ),
};
