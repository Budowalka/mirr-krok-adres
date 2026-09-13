import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Api } from '../api';
import { EkranMapy } from '../EkranMapy';
import { FalszywyAdapterMapy } from '../mapa/falszywy';
import { DOMYSLNE_TEKSTY } from '../teksty';
import type { Adres, OdpowiedzBudynek } from '../typy';

const OBRYS_198 = {
  type: 'Polygon' as const,
  coordinates: [[
    [20.288892546, 52.270475483], [20.288916507, 52.270568667], [20.288865044, 52.270573546], [20.288869397, 52.270592206],
    [20.288822027, 52.27059668], [20.288817384, 52.270578114], [20.288778491, 52.270581686], [20.28875497, 52.270488497],
    [20.288892546, 52.270475483],
  ]],
};
// prostokąt ~10 × 10 m obok domu
const PROSTOKAT = {
  type: 'Polygon' as const,
  coordinates: [[[20.2890, 52.2706], [20.2890 + 0.0001466, 52.2706], [20.2890 + 0.0001466, 52.2706 + 0.0000899], [20.2890, 52.2706 + 0.0000899], [20.2890, 52.2706]]],
};

const ADRES: Adres = {
  ulica: 'Zwierzyniecka', numer: '5', kod: null, miasto: 'Sochaczew', gmina: null, powiat: null, wojewodztwo: null,
  teryt_gmina: null, simc: null, ulic: null, lat: 52.2705286, lon: 20.2888357, zrodlo: 'podpowiedz', tekst: 'Zwierzyniecka 5, Sochaczew',
};

const EWIDENCJA: OdpowiedzBudynek = {
  obrys: OBRYS_198, zrodlo_obrysu: 'ewidencja', obwod_m: 44.2, rzut_m2: 106.6, kondygnacje: 1, zrodlo_kondygnacji: 'ewidencja',
  identyfikator_egib: '142801_1.0001.198.1_BUD', identyfikator_uldk: '142801_1.0001.300_BUD',
  budynek: { funkcja: 'budynek jednorodzinny', funkcja_ogolna: 'budynki mieszkalne', kod_kst: '110', kategoria_istnienia: 'eksploatowany', zrodlo_geometrii: 'EGiB', wersja_danych: '2023-12-31T12:00:00' },
  dzialka: { identyfikator: '142801_1.0001.198/2', numer: '198/2', obreb: 'Chodaków', gmina: 'Sochaczew (miasto)', powiat: 'powiat sochaczewski', wojewodztwo: 'mazowieckie', powierzchnia_m2: 612.3, obrys: OBRYS_198 },
  inne_budynki_na_dzialce: [{ funkcja: 'budynek gospodarczy', rzut_m2: 31.2, kondygnacje: null }],
  powiat: { teryt: '1428', w_bazie: true },
  teryt: { teryt_gmina: '142801', simc: '0977120', ulic: '26305', kod: '96-500' },
};
const BRAK: OdpowiedzBudynek = { ...EWIDENCJA, obrys: null, zrodlo_obrysu: 'brak', obwod_m: null, rzut_m2: null, kondygnacje: null, zrodlo_kondygnacji: null, identyfikator_egib: null, identyfikator_uldk: null, budynek: null, inne_budynki_na_dzialce: [] };

function renderuj(odpowiedz: OdpowiedzBudynek | Error, props: Partial<Parameters<typeof EkranMapy>[0]> = {}) {
  const adapter = new FalszywyAdapterMapy();
  const api = { podpowiedzi: vi.fn(), budynek: vi.fn(async () => { if (odpowiedz instanceof Error) throw odpowiedz; return odpowiedz; }) } as unknown as Api;
  const onGotowe = vi.fn();
  const onPomin = vi.fn();
  render(
    <EkranMapy api={api} adres={ADRES} teksty={DOMYSLNE_TEKSTY} wysokoscKondygnacji={3} adapter={() => adapter} zrodloKafli={{ typ: 'wmts' }}
      pokazMape onGotowe={onGotowe} onPomin={onPomin} onWstecz={vi.fn()} {...props} />
  );
  return { adapter, api, onGotowe, onPomin };
}

describe('EkranMapy', () => {
  it('dom z ewidencji: obrys na mapie, panel z obwodem, rzutem i kondygnacjami; „Zgadza się” zwraca pełny kontrakt', async () => {
    const { adapter, onGotowe, api } = renderuj(EWIDENCJA, { linia: (c) => ({ etykieta: 'Elewacja', wartosc: `ok. ${Math.round((c.obwod_m ?? 0) * (c.kondygnacje ?? 0) * 3)} m²` }) });
    expect(screen.getByText('Szukamy Twojego domu w ewidencji budynków…')).toBeTruthy();
    await screen.findByText('Zgadza się, dalej');
    expect((api.budynek as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([52.2705286, 20.2888357, { miasto: 'Sochaczew', ulica: 'Zwierzyniecka', numer: '5' }]);
    expect(adapter.zamontowany).toBe(true);
    expect(adapter.obrys).toEqual(OBRYS_198);
    expect(screen.getByText('44,2 m')).toBeTruthy();
    expect(screen.getByText('106,7 m²')).toBeTruthy();
    expect(screen.getByText('1, dom parterowy')).toBeTruthy();
    expect(screen.getByText('ok. 133 m²')).toBeTruthy();

    fireEvent.click(screen.getByText('Zgadza się, dalej'));
    const wynik = onGotowe.mock.calls[0][0];
    expect(wynik.zrodlo_obrysu).toBe('ewidencja');
    expect(wynik.obwod_m).toBeCloseTo(44.2, 1);
    expect(wynik.rzut_m2).toBeCloseTo(106.7, 1);
    expect(wynik.kondygnacje).toBe(1);
    expect(wynik.zrodlo_kondygnacji).toBe('ewidencja');
    expect(wynik.identyfikator_egib).toBe('142801_1.0001.198.1_BUD');
    expect(wynik.budynek.funkcja).toBe('budynek jednorodzinny');
    expect(wynik.dzialka.numer).toBe('198/2');
    expect(wynik.inne_budynki_na_dzialce).toHaveLength(1);
    expect(wynik.powiat).toEqual({ teryt: '1428', w_bazie: true });
    expect(wynik.adres).toMatchObject({ gmina: 'Sochaczew (miasto)', powiat: 'powiat sochaczewski', wojewodztwo: 'mazowieckie', teryt_gmina: '142801', simc: '0977120', ulic: '26305', kod: '96-500' });
  });

  it('„Popraw” pozwala zmienić kondygnacje i oznacza je jako podane ręcznie', async () => {
    const { onGotowe } = renderuj(EWIDENCJA);
    await screen.findByText('Popraw');
    fireEvent.click(screen.getByText('Popraw'));
    fireEvent.click(screen.getByText('Parter i piętro'));
    expect(screen.getByText('2, parter i piętro')).toBeTruthy();
    fireEvent.click(screen.getByText('Zgadza się, dalej'));
    expect(onGotowe.mock.calls[0][0]).toMatchObject({ kondygnacje: 2, zrodlo_kondygnacji: 'reczne', zrodlo_obrysu: 'ewidencja' });
  });

  it('brak obrysu: tekst o ręcznym zaznaczeniu, rysowanie po rogach, pytanie o kondygnacje, wynik „reczne” bez identyfikatora', async () => {
    const { adapter, onGotowe } = renderuj(BRAK);
    await screen.findByText('Zaznacz dom na mapie');
    expect(screen.getByText(DOMYSLNE_TEKSTY.brakObrysu)).toBeTruthy();
    fireEvent.click(screen.getByText('Zaznacz dom na mapie'));
    expect(adapter.rysowanie).toBeTypeOf('function');
    act(() => adapter.zakonczRysowanie(PROSTOKAT));
    expect(adapter.obrys).toEqual(PROSTOKAT);
    await screen.findByText('Ile kondygnacji ma dom?');
    const dalej = screen.getByText('Dalej') as HTMLButtonElement;
    expect(dalej.disabled).toBe(true);
    fireEvent.click(screen.getByText('Parter'));
    fireEvent.click(screen.getByText('Dalej'));
    const wynik = onGotowe.mock.calls[0][0];
    expect(wynik.zrodlo_obrysu).toBe('reczne');
    expect(wynik.obwod_m).toBeGreaterThan(38);
    expect(wynik.obwod_m).toBeLessThan(42);
    expect(wynik.rzut_m2).toBeGreaterThan(95);
    expect(wynik.rzut_m2).toBeLessThan(105);
    expect(wynik.kondygnacje).toBe(1);
    expect(wynik.zrodlo_kondygnacji).toBe('reczne');
    expect(wynik.identyfikator_egib).toBeNull();
    expect(wynik.budynek).toBeNull();
    expect(wynik.inne_budynki_na_dzialce).toEqual([]);
    expect(wynik.dzialka.numer).toBe('198/2');
  });

  it('„Zaznaczę dom sam” z obrysem z ewidencji przechodzi do rysowania, „Cofnij” wraca do obrysu z ewidencji', async () => {
    const { adapter } = renderuj(EWIDENCJA);
    await screen.findByText('Zaznaczę dom sam');
    fireEvent.click(screen.getByText('Zaznaczę dom sam'));
    expect(adapter.obrys).toBeNull();
    expect(screen.getByText(DOMYSLNE_TEKSTY.rysowanie)).toBeTruthy();
    fireEvent.click(screen.getByText('Cofnij'));
    expect(adapter.obrys).toEqual(OBRYS_198);
    expect(screen.getByText('Zgadza się, dalej')).toBeTruthy();
  });

  it('awaria API to stan „brak”, a „Wolę podać powierzchnię ręcznie” woła onPomin', async () => {
    const { onPomin } = renderuj(new Error('502'));
    await screen.findByText('Zaznacz dom na mapie');
    fireEvent.click(screen.getByText('Wolę podać powierzchnię ręcznie'));
    expect(onPomin).toHaveBeenCalled();
  });

  it('pokazMape=false: dane zbierane, bez mapy; przy kondygnacjach z ewidencji od razu onGotowe, bez nich pytanie', async () => {
    const a = renderuj(EWIDENCJA, { pokazMape: false });
    await waitFor(() => expect(a.onGotowe).toHaveBeenCalled());
    expect(a.adapter.zamontowany).toBe(false);
    expect(a.onGotowe.mock.calls[0][0]).toMatchObject({ zrodlo_obrysu: 'ewidencja', kondygnacje: 1, identyfikator_egib: '142801_1.0001.198.1_BUD' });

    const b = renderuj({ ...EWIDENCJA, kondygnacje: null, zrodlo_kondygnacji: null }, { pokazMape: false });
    await screen.findByText('Ile kondygnacji ma dom?');
    fireEvent.click(screen.getByText('Dwa piętra lub więcej'));
    await waitFor(() => expect(b.onGotowe).toHaveBeenCalled());
    expect(b.onGotowe.mock.calls[0][0]).toMatchObject({ kondygnacje: 3, zrodlo_kondygnacji: 'reczne' });
  });
});
