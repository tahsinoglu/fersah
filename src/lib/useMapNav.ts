import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { Atlas, Selection } from '../map-engine/types';
import { depthOf } from '../map-engine/types';
import { pathFor } from './routes';

interface NavState {
  /** Bu kayda kadar art arda "aşağı inerek" eklenmiş geçmiş kaydı sayısı */
  stack?: number;
}

/**
 * Harita gezinmesi. Aşağı inmek geçmişe kayıt ekler; yana geçmek kaydı değiştirir;
 * yukarı çıkmak mümkünse tarayıcı geçmişinde geri gider. Böylece geri tuşu daima bir üst seviyeye döner.
 */
export function useMapNav(atlasId: string, atlas: Atlas | null, current: Selection) {
  const navigate = useNavigate();
  const location = useLocation();
  const stack = (location.state as NavState | null)?.stack ?? 0;

  const go = useCallback(
    (next: Selection) => {
      const from = depthOf(current);
      const to = depthOf(next);
      if (to > from) {
        // Aradaki seviyeleri de geçmişe ekle (aramadan doğrudan ile gidince geri tuşu bölgeye dönsün)
        let s = stack;
        const sameBranch = !current.groupId || current.groupId === next.groupId;
        let start = from;
        if (!sameBranch) {
          // Önce bulunduğun seviyede yana geç
          const side: Selection = from === 2 ? { groupId: next.groupId, unitId: undefined } : { groupId: next.groupId };
          navigate(pathFor(atlasId, atlas, from === 2 ? { groupId: next.groupId } : side), { replace: true, state: { stack: s } });
          start = from === 2 ? 1 : from;
        }
        for (let d = start + 1; d <= to; d++) {
          const step: Selection = d === 1 ? { groupId: next.groupId } : next;
          s += 1;
          navigate(pathFor(atlasId, atlas, step), { state: { stack: s } });
        }
      } else if (to === from) {
        navigate(pathFor(atlasId, atlas, next), { replace: true, state: { stack } });
      } else {
        const n = from - to;
        const ancestor = !next.groupId || next.groupId === current.groupId;
        const target = pathFor(atlasId, atlas, next);
        if (stack >= n) {
          if (!ancestor) {
            // Geri git, sonra aynı seviyede yana geç
            const s = stack - n;
            window.addEventListener('popstate', () => setTimeout(() => navigate(target, { replace: true, state: { stack: s } }), 0), { once: true });
          }
          navigate(-n);
        } else {
          navigate(target, { replace: true, state: { stack: Math.max(0, stack - n) } });
        }
      }
    },
    [atlas, atlasId, current, navigate, stack],
  );

  const up = useCallback(() => {
    if (current.unitId) go({ groupId: current.groupId });
    else if (current.groupId) go({});
  }, [current, go]);

  return { go, up };
}
