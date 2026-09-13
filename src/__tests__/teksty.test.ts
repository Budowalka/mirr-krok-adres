import { describe, expect, it } from 'vitest';
import { opisKondygnacji, wstaw } from '../teksty';

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
