import { describe, expect, it } from 'vitest';
import { adresZPunktu, opisDzialki, parsujNumerDzialki, powierzchniaDzialki, scalDzialke } from '../dzialka';
import type { DzialkaZListy, OdpowiedzBudynek } from '../typy';

// Prostokąt ~36 × 33 m wokół punktu parytetu w Pruszkowie (geometria przykładowa, nie z ewidencji).
const OBRYS = { type: 'Polygon' as const, coordinates: [[[20.813817, 52.182448], [20.814257, 52.182448], [20.814257, 52.182808], [20.813817, 52.182808], [20.813817, 52.182448]]] };
const WYBRANA: DzialkaZListy = { identyfikator: '142102_1.0010.64/4', gmina: 'Pruszków', obreb: '0010', numer: '64/4', punkt: { lat: 52.182628, lon: 20.814037 }, obrys: OBRYS };
const Z_BUDYNKU: NonNullable<OdpowiedzBudynek['dzialka']> = { identyfikator: '142102_1.0010.64/4', numer: '64/4', obreb: '0010', gmina: 'Pruszków', powiat: 'pruszkowski', wojewodztwo: 'mazowieckie', powierzchnia_m2: 1200.5, obrys: OBRYS };

describe('parsujNumerDzialki', () => {
  it.each([
    ['10 64/4', { obreb: '10', numer: '64/4' }],
    ['0010 64/4', { obreb: '0010', numer: '64/4' }],
    ['  10   64/4  ', { obreb: '10', numer: '64/4' }],
    ['obręb 10, dz. 64/4', { obreb: '10', numer: '64/4' }],
    ['10, 64/4', { obreb: '10', numer: '64/4' }],
    ['10-64/4', { obreb: '10', numer: '64/4' }],
    ['Pruszków 10 64/4', { obreb: '10', numer: '64/4' }],
    ['10 64/4 Pruszków', { obreb: '10', numer: '64/4' }],
    ['3 1006', { obreb: '3', numer: '1006' }],
    ['10 64/4a', { obreb: '10', numer: '64/4a' }],
    ['10 64/4, Pruszków', { obreb: '10', numer: '64/4' }],
    ['10 64/4.', { obreb: '10', numer: '64/4' }],
    ['dz. 64 obręb 10', { obreb: '10', numer: '64' }],
    ['działka nr 123, obręb 0005', { obreb: '0005', numer: '123' }],
    ['nr 1006 obr. 3', { obreb: '3', numer: '1006' }],
    ['dz. nr ewid. 64/4, obręb 0010', { obreb: '0010', numer: '64/4' }],
    ['64/4 obręb 10', { obreb: '10', numer: '64/4' }],
    ['64/4 10', { obreb: '10', numer: '64/4' }],
  ])('„%s" → obręb i numer', (we, wy) => {
    expect(parsujNumerDzialki(we)).toEqual(wy);
  });

  it.each(['', '64/4', '10', 'abc', '10 64 5', '12345 1'])('„%s" → null (komunikat zamiast zapytania)', (we) => {
    expect(parsujNumerDzialki(we)).toBeNull();
  });
});

describe('opisDzialki', () => {
  it('składa „Działka X, obręb Y, gmina" i pomija puste części', () => {
    expect(opisDzialki({ numer: '64/4', obreb: '0010', gmina: 'Pruszków' })).toBe('Działka 64/4, obręb 0010, Pruszków');
    expect(opisDzialki({ numer: '64/4', obreb: null, gmina: 'Pruszków' })).toBe('Działka 64/4, Pruszków');
    expect(opisDzialki({ numer: '64/4', obreb: '0010', gmina: null })).toBe('Działka 64/4, obręb 0010');
  });
});

describe('adresZPunktu', () => {
  it('bez działki: pusta ulica i numer, tekst z punktem, zrodlo reczny, współrzędne bez zaokrąglenia', () => {
    expect(adresZPunktu({ lat: 52.182628, lon: 20.814037 }, null)).toEqual({
      ulica: '', numer: '', kod: null, miasto: '', gmina: null, powiat: null, wojewodztwo: null,
      teryt_gmina: null, simc: null, ulic: null, lat: 52.182628, lon: 20.814037, zrodlo: 'reczny',
      tekst: 'Punkt na mapie 52.18263, 20.81404',
    });
  });

  it('z działką: tekst i miejscowość z działki; etykieta punktu nadpisywalna', () => {
    const a = adresZPunktu({ lat: 52.182628, lon: 20.814037 }, WYBRANA);
    expect(a).toMatchObject({ miasto: 'Pruszków', gmina: 'Pruszków', tekst: 'Działka 64/4, obręb 0010, Pruszków', zrodlo: 'reczny' });
    expect(adresZPunktu({ lat: 1, lon: 2 }, null, 'Miejsce').tekst).toBe('Miejsce 1.00000, 2.00000');
  });
});

describe('powierzchniaDzialki i scalDzialke', () => {
  it('powierzchnia z obrysu w m² (1 miejsce po przecinku)', () => {
    expect(powierzchniaDzialki(OBRYS)).toBeCloseTo(1204.3, 1);
  });

  it('ta sama działka z ewidencji ma pierwszeństwo (ma powiat, województwo i powierzchnię z MIRR)', () => {
    expect(scalDzialke(Z_BUDYNKU, WYBRANA)).toBe(Z_BUDYNKU);
  });

  it('inna albo brak działki z ewidencji: bierzemy wybraną z listy, powierzchnię liczymy z obrysu', () => {
    const inna = { ...Z_BUDYNKU, identyfikator: '142102_1.0010.65' };
    for (const zBudynku of [inna, null]) {
      const d = scalDzialke(zBudynku, WYBRANA)!;
      expect(d).toMatchObject({ identyfikator: '142102_1.0010.64/4', numer: '64/4', obreb: '0010', gmina: 'Pruszków', powiat: null, wojewodztwo: null, obrys: OBRYS });
      expect(d.powierzchnia_m2).toBeCloseTo(1204.3, 1);
    }
  });

  it('bez wybranej: działka z ewidencji bez zmian (także null)', () => {
    expect(scalDzialke(Z_BUDYNKU, null)).toBe(Z_BUDYNKU);
    expect(scalDzialke(null, null)).toBeNull();
  });
});
