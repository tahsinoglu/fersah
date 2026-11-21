const MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u',
  é: 'e', è: 'e', ë: 'e', á: 'a', à: 'a', ã: 'a', å: 'a', ó: 'o', ô: 'o', í: 'i', ñ: 'n',
};

/** Türkçe metni arama için sadeleştirir: küçük harf, aksansız. */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/[^\u0000-\u007f]/g, (ch) => MAP[ch] ?? ch.normalize('NFD').replace(/[̀-ͯ]/g, ''));
}

/** Adres parçası: "İç Anadolu" → "ic-anadolu" */
export function slugify(text: string): string {
  return fold(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
