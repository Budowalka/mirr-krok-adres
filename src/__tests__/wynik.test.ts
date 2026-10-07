import { describe, expect, it } from 'vitest';
import { adresZPunktu } from '../dzialka';
import { PUSTA, zlozWynik } from '../wynik';
import type { Adres, OdpowiedzBudynek } from '../typy';

const ADRES: Adres = {
  ulica: 'Zwierzyniecka', numer: '5', kod: null, miasto: 'Sochaczew', gmina: null, powiat: null, wojewodztwo: null,
  teryt_gmina: null, simc: null, ulic: null, lat: 52.2705286, lon: 20.2888357, zrodlo: 'podpowiedz', tekst: 'Zwierzyniecka 5, Sochaczew',
};
const KWADRAT = { type: 'Polygon' as const, coordinates: [[[20.2888, 52.2705], [20.2889, 52.2705], [20.2889, 52.2706], [20.2888, 52.2706], [20.2888, 52.2705]]] };
const Z_DZIALKA: OdpowiedzBudynek = {
  ...PUSTA,
  dzialka: { identyfikator: '142801_1.0001.198/2', numer: '198/2', obreb: 'Chodaków', gmina: 'Sochaczew (miasto)', powiat: 'powiat sochaczewski', wojewodztwo: 'mazowieckie', powierzchnia_m2: 612.3, obrys: KWADRAT },
};
const BEZ_OBRYSU = { obrys: null, zrodlo_obrysu: 'brak' as const, kondygnacje: null, zrodlo_kondygnacji: null };

describe('zlozWynik', () => {
  it('bez kontekstu (jak v0.2): zrodlo_punktu adres, punkt z adresu, tekst adresu bez zmian', () => {
    const w = zlozWynik(ADRES, Z_DZIALKA, BEZ_OBRYSU);
    expect(w.zrodlo_punktu).toBe('adres');
    expect(w.punkt).toEqual({ lat: 52.2705286, lon: 20.2888357 });
    expect(w.adres.tekst).toBe('Zwierzyniecka 5, Sochaczew');
    expect(w.adres.miasto).toBe('Sochaczew');
    expect(w.adres.gmina).toBe('Sochaczew (miasto)');
  });

  it('pinezka z działką: tekst i miejscowość z działki, punkt z kontekstu', () => {
    const punkt = { lat: 52.2705, lon: 20.2888 };
    const w = zlozWynik(adresZPunktu(punkt, null), Z_DZIALKA, BEZ_OBRYSU, { zrodlo_punktu: 'pinezka', punkt });
    expect(w.zrodlo_punktu).toBe('pinezka');
    expect(w.punkt).toEqual(punkt);
    expect(w.adres).toMatchObject({ ulica: '', numer: '', zrodlo: 'reczny', miasto: 'Sochaczew (miasto)', tekst: 'Działka 198/2, obręb Chodaków, Sochaczew (miasto)' });
  });

  it('pinezka bez działki: zostaje tekst „Punkt na mapie …”', () => {
    const punkt = { lat: 52.2705, lon: 20.2888 };
    const w = zlozWynik(adresZPunktu(punkt, null), PUSTA, BEZ_OBRYSU, { zrodlo_punktu: 'pinezka', punkt });
    expect(w.adres.tekst).toBe('Punkt na mapie 52.27050, 20.28880');
    expect(w.dzialka).toBeNull();
  });

  it('numer działki: zrodlo_punktu numer_dzialki', () => {
    const punkt = { lat: 52.2705, lon: 20.2888 };
    expect(zlozWynik(adresZPunktu(punkt, null), Z_DZIALKA, BEZ_OBRYSU, { zrodlo_punktu: 'numer_dzialki', punkt }).zrodlo_punktu).toBe('numer_dzialki');
  });
});
