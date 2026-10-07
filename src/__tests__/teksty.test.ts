import { describe, expect, it } from 'vitest';
import { opisKondygnacji, wstaw } from '../teksty';
import { DOMYSLNE_TEKSTY, DOMYSLNE_TEKSTY_KARTY } from '../teksty';

describe('opisKondygnacji', () => {
  it('opisuje słownie, bez powtarzania liczby z panelu', () => {
    expect(opisKondygnacji(1)).toBe('dom parterowy');
    expect(opisKondygnacji(2)).toBe('parter i piętro');
    expect(opisKondygnacji(3)).toBe('parter i dwa piętra');
    expect(opisKondygnacji(4)).toBe('parter i trzy piętra');
    expect(opisKondygnacji(6)).toBe('parter i 5 pięter');
    expect(opisKondygnacji(null)).toBe('nie wiemy');
  });
});

describe('wstaw', () => {
  it('podstawia zmienne w szablonie', () => {
    expect(wstaw('Krok {x} z {y}', { x: 2, y: 5 })).toBe('Krok 2 z 5');
  });
});

describe('teksty domyślne v0.3.0', () => {
  it('żaden tekst dla klienta nie ma długiego myślnika ani pustej wartości', () => {
    for (const zbior of [DOMYSLNE_TEKSTY, DOMYSLNE_TEKSTY_KARTY]) {
      for (const v of Object.values(zbior).flat()) {
        expect(v).not.toContain('—');
        expect(v.trim()).not.toBe('');
      }
    }
  });

  it('nowe teksty mają brzmienie z planu', () => {
    expect(DOMYSLNE_TEKSTY.wejsciePinezka).toBe('Zaznacz na mapie');
    expect(DOMYSLNE_TEKSTY.naglowekPinezka).toBe('Zaznacz swoją działkę');
    expect(DOMYSLNE_TEKSTY.przykladDzialki).toBe('np. 10 64/4');
    expect(DOMYSLNE_TEKSTY.naglowekPotwierdzDzialke).toBe('To Twoja działka?');
    expect(DOMYSLNE_TEKSTY_KARTY.naglowek).toBe('To Twoja budowa?');
    expect(DOMYSLNE_TEKSTY_KARTY.tak).toBe('Tak, to moja budowa');
    expect(DOMYSLNE_TEKSTY_KARTY.nie).toBe('To inny budynek');
  });
});
