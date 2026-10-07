import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KrokAdresu } from '../KrokAdresu';
import type { AdapterMapy } from '../mapa/adapter';
import { FalszywyAdapterMapy } from '../mapa/falszywy';

// Złoty wynik v0.2.2 dla „Klonowa 7, Sosnowiec" z obrysem z ewidencji (prostokąt 10 × 10 m).
// Konsument, który nie ustawia propsów dodanych w v0.3.0, ma dostawać DOKŁADNIE te pola i wartości.
// Nowe wersje mogą pola tylko dokładać (Task 8 dopisuje zrodlo_punktu i punkt), nigdy zmieniać.
const OBRYS = { type: 'Polygon' as const, coordinates: [[[20.2890, 52.2706], [20.2891466, 52.2706], [20.2891466, 52.2706899], [20.2890, 52.2706899], [20.2890, 52.2706]]] };
export const ZLOTY_V022 = {
  adres: {
    ulica: 'Klonowa', numer: '7', kod: '41-218', miasto: 'Sosnowiec', gmina: null, powiat: null, wojewodztwo: null,
    teryt_gmina: null, simc: null, ulic: null, lat: 50.27, lon: 19.16, zrodlo: 'podpowiedz', tekst: 'Klonowa 7, Sosnowiec',
  },
  obrys: OBRYS,
  zrodlo_obrysu: 'ewidencja',
  obwod_m: 40,
  rzut_m2: 100,
  kondygnacje: 2,
  zrodlo_kondygnacji: 'ewidencja',
  identyfikator_egib: '247501_1.0001.1.1_BUD',
  budynek: { funkcja: 'budynek jednorodzinny' },
  dzialka: null,
  inne_budynki_na_dzialce: [],
  powiat: { teryt: '2475', w_bazie: true },
};

function fetchMock() {
  return vi.fn(async (url: string) => {
    const u = new URL(url, 'http://localhost');
    if (u.pathname === '/api/geo/podpowiedzi') {
      return { ok: true, status: 200, json: async () => ({ podpowiedzi: [{ rodzaj: 'adres', tekst: 'Klonowa 7, Sosnowiec 41-218', ulica: 'Klonowa', numer: '7', kod: '41-218', miasto: 'Sosnowiec', lat: 50.27, lon: 19.16 }] }) };
    }
    if (u.pathname === '/api/geo/budynek') {
      return { ok: true, status: 200, json: async () => ({ obrys: OBRYS, zrodlo_obrysu: 'ewidencja', obwod_m: 40, rzut_m2: 100, kondygnacje: 2, zrodlo_kondygnacji: 'ewidencja', identyfikator_egib: '247501_1.0001.1.1_BUD', identyfikator_uldk: null, budynek: { funkcja: 'budynek jednorodzinny' }, dzialka: null, inne_budynki_na_dzialce: [], powiat: { teryt: '2475', w_bazie: true }, teryt: null }) };
    }
    return { ok: false, status: 404, json: async () => ({ error: 'Nieznana akcja.' }) };
  });
}

describe('zgodność z v0.2.2 (konsument bez nowych propsów)', () => {
  let f: ReturnType<typeof fetchMock>;
  beforeEach(() => { vi.useFakeTimers(); f = fetchMock(); vi.stubGlobal('fetch', f); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('adres → „Zgadza się, dalej" oddaje złoty wynik jednym argumentem, bez nowych zapytań i bez nowego interfejsu', async () => {
    const onGotowe = vi.fn();
    const adapter = new FalszywyAdapterMapy();
    const { container } = render(<KrokAdresu api="/api/geo" bias={{ lat: 50.28, lon: 19.13 }} onGotowe={onGotowe} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(container.querySelector('.ka-bok')).toBeNull();
    expect(container.querySelector('.ka-szeroki')).toBeNull();
    expect((container.firstChild as HTMLElement).className).toBe('ka ka-ekran ka-scena');

    fireEvent.change(screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7'), { target: { value: 'Klonowa 7' } });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    fireEvent.click(screen.getByRole('option'));
    vi.useRealTimers();
    await screen.findByText('Zgadza się, dalej');
    fireEvent.click(screen.getByText('Zgadza się, dalej'));

    expect(onGotowe).toHaveBeenCalledTimes(1);           // synchronicznie, jak w v0.2.2
    expect(onGotowe.mock.calls[0]).toHaveLength(1);       // bez drugiego argumentu
    const { zrodlo_punktu, punkt, ...stare } = onGotowe.mock.calls[0][0];
    expect(stare).toEqual(ZLOTY_V022);                 // wszystkie pola v0.2.2 bez zmian (asercja nie osłabiona)
    expect(zrodlo_punktu).toBe('adres');               // pola dodane w v0.3.0 (kontrakt tylko się rozszerza)
    expect(punkt).toEqual({ lat: 50.27, lon: 19.16 });
    const sciezki = f.mock.calls.map(([url]) => new URL(url, 'http://localhost').pathname);
    expect(new Set(sciezki)).toEqual(new Set(['/api/geo/podpowiedzi', '/api/geo/budynek']));
  });

  it('pokazMape=false: ten sam złoty wynik od razu po danych z ewidencji, jednym argumentem', async () => {
    const onGotowe = vi.fn();
    const { container } = render(<KrokAdresu api="/api/geo" pokazMape={false} onGotowe={onGotowe} onPomin={vi.fn()} />);
    expect((container.firstChild as HTMLElement).className).toBe('ka ka-ekran ka-bez-mapy');
    fireEvent.change(screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7'), { target: { value: 'Klonowa 7' } });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    fireEvent.click(screen.getByRole('option'));
    vi.useRealTimers();
    await waitFor(() => expect(onGotowe).toHaveBeenCalledTimes(1));
    expect(onGotowe.mock.calls[0]).toHaveLength(1);
    const { zrodlo_punktu, punkt, ...stare } = onGotowe.mock.calls[0][0];
    expect(stare).toEqual(ZLOTY_V022);                 // wszystkie pola v0.2.2 bez zmian (asercja nie osłabiona)
    expect(zrodlo_punktu).toBe('adres');               // pola dodane w v0.3.0 (kontrakt tylko się rozszerza)
    expect(punkt).toEqual({ lat: 50.27, lon: 19.16 });
  });

  it('własny adapter z v0.2 (tylko stare metody) pasuje do typu AdapterMapy, a krok się renderuje', () => {
    const stary: AdapterMapy = {
      async zamontuj() {}, przelec() {}, pokazObrys() {}, rysuj() {}, edytujObrys() {}, przerwijRysowanie() {}, zniszcz() {},
    };
    render(<KrokAdresu api="/api/geo" onGotowe={vi.fn()} onPomin={vi.fn()} adapterMapy={() => stary} />);
    expect(screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7')).toBeTruthy();
  });
});
