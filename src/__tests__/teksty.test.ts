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
    expect(DOMYSLNE_TEKSTY.wejsciePinezka).toBe('Wskażę na mapie');
    expect(DOMYSLNE_TEKSTY.naglowekPinezka).toBe('Gdzie jest działka?');
    expect(DOMYSLNE_TEKSTY.przykladDzialki).toBe('np. Dobra 1006');
    expect(DOMYSLNE_TEKSTY.naglowekPotwierdzDzialke).toBe('To ta działka?');
    expect(DOMYSLNE_TEKSTY_KARTY.naglowek).toBe('To Państwa budowa?');
    expect(DOMYSLNE_TEKSTY_KARTY.tak).toBe('Tak, to moja budowa');
    expect(DOMYSLNE_TEKSTY_KARTY.nie).toBe('To inny budynek');
  });
});

describe('forma grzecznościowa (decyzja 08.10.2026)', () => {
  // Forma „Państwo” albo bezosobowo; przyciski w głosie klienta („Zaznaczę…”, „Tak, to moja budowa”).
  const FORMA_TY =
    /(^|[^\p{L}])(twoj\p{L}*|twoi\p{L}*|twych|cię|ciebie|tobie|zostaw|wybierz|sprawdź|wpisz|zobaczysz|dostajesz|masz|możesz|zadzwoń|umów|opisz|zaznacz|podaj|podałeś|podasz|odpowiedz|kliknij|wróć|dotknij|dotykaj|przeciągnij|przybliż|spróbuj|znajdź|znajdziesz|popraw|cofnij|zmień|chcesz)(?![\p{L}])/iu;

  it('żaden tekst domyślny nie zwraca się do klienta na Ty', () => {
    for (const zbior of [DOMYSLNE_TEKSTY, DOMYSLNE_TEKSTY_KARTY]) {
      for (const [klucz, v] of Object.entries(zbior)) {
        for (const tekst of [v].flat()) {
          expect(FORMA_TY.test(tekst), `${klucz}: ${tekst}`).toBe(false);
        }
      }
    }
  });

  it('strażnik łapie formę Ty (kontrola samego wzorca)', () => {
    expect(FORMA_TY.test('To Twoja budowa?')).toBe(true);
    expect(FORMA_TY.test('Zaznacz dom na mapie')).toBe(true);
    expect(FORMA_TY.test('Zaznaczę dom na mapie')).toBe(false);
  });
});
