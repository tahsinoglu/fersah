// Küçük Seyyah'ta sesli okunan tüm cümleler. Ses paketi (public/ses) bu listeden üretilir;
// phrases.test.ts her cümlenin kaydı olduğunu denetler.
import { BOLGELER } from '../data/memleket';
import { KITALAR } from '../data/cihan';
import { EXPLORE } from './data';

export const PRAISE = ['Harika!', 'Süpersin!', 'Bravo!', 'Aferin sana!', 'Çok güzel!', 'Mükemmel!'];
export const ENCOURAGE = ['Bir daha dene, yapabilirsin!', 'Çok yaklaştın, bir daha dene!', 'Neredeyse oldu!'];
export const HINT = 'Parlayan yere bak!';
export const DONE_PUZZLE = 'Tebrikler! Hepsini yerleştirdin!';
export const DONE_FIND = 'Harika! Hepsini buldun!';

export const findQuestion = (name: string, atlas: 'memleket' | 'cihan') => `${name} ${atlas === 'cihan' ? 'kıtasını' : 'bölgesini'} bul!`;
export const thisIs = (name: string) => `Bu ${name}.`;
export const placeIt = (name: string) => `${name} parçasını yerine koy.`;

export function allPhrases(): string[] {
  const out = new Set<string>([...PRAISE, ...ENCOURAGE, HINT, DONE_PUZZLE, DONE_FIND]);
  for (const [atlas, groups] of [['memleket', BOLGELER], ['cihan', KITALAR]] as const) {
    for (const g of groups) {
      out.add(findQuestion(g.ad, atlas));
      out.add(thisIs(g.ad));
      out.add(placeIt(g.ad));
    }
  }
  for (const it of [...EXPLORE.memleket, ...EXPLORE.cihan]) out.add(it.text);
  return [...out];
}
