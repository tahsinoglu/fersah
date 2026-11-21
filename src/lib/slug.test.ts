import { describe, expect, it } from 'vitest';
import { fold, slugify } from './slug';

describe('slug', () => {
  it('Türkçe karakterleri sadeleştirir', () => {
    expect(slugify('İç Anadolu')).toBe('ic-anadolu');
    expect(slugify('Şanlıurfa')).toBe('sanliurfa');
    expect(slugify('Güneydoğu Anadolu')).toBe('guneydogu-anadolu');
    expect(slugify('Iğdır')).toBe('igdir');
    expect(slugify("Côte d'Ivoire")).toBe('cote-d-ivoire');
  });
  it('aramada büyük/küçük ve aksan farkını yok sayar', () => {
    expect(fold('İSTANBUL')).toBe('istanbul');
    expect(fold('ISPARTA')).toBe('isparta');
    expect(fold('Çanakkale')).toBe(fold('canakkale'));
  });
});
