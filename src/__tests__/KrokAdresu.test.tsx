import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KrokAdresu } from '../KrokAdresu';
import { FalszywyAdapterMapy } from '../mapa/falszywy';

const OBRYS = { type: 'Polygon' as const, coordinates: [[[20.2890, 52.2706], [20.2891466, 52.2706], [20.2891466, 52.2706899], [20.2890, 52.2706899], [20.2890, 52.2706]]] };

function fetchMock() {
  return vi.fn(async (url: string) => {
    const u = new URL(url, 'http://localhost');
    if (u.pathname.endsWith('/podpowiedzi')) {
      return { ok: true, json: async () => ({ podpowiedzi: [{ rodzaj: 'adres', tekst: 'Klonowa 7, Sosnowiec 41-218', ulica: 'Klonowa', numer: '7', kod: '41-218', miasto: 'Sosnowiec', lat: 50.27, lon: 19.16 }] }) };
    }
    if (u.pathname.endsWith('/budynek')) {
      expect(u.searchParams.get('lat')).toBe('50.27');
      expect(u.searchParams.get('miasto')).toBe('Sosnowiec');
      return { ok: true, json: async () => ({ obrys: OBRYS, zrodlo_obrysu: 'ewidencja', obwod_m: 40, rzut_m2: 100, kondygnacje: 2, zrodlo_kondygnacji: 'ewidencja', identyfikator_egib: '247501_1.0001.1.1_BUD', identyfikator_uldk: null, budynek: { funkcja: 'budynek jednorodzinny' }, dzialka: null, inne_budynki_na_dzialce: [], powiat: { teryt: '2475', w_bazie: true }, teryt: null }) };
    }
    throw new Error(`nieznany adres ${url}`);
  });
}

describe('KrokAdresu', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('fetch', fetchMock()); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('adres → mapa → „Zgadza się” daje kontrakt z adresem i obrysem; „Wstecz” z mapy wraca do adresu', async () => {
    const onGotowe = vi.fn();
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" bias={{ lat: 50.28, lon: 19.13 }} numerKroku={{ adres: 1, mapa: 2, z: 5 }} onGotowe={onGotowe} onPomin={vi.fn()} adapterMapy={() => adapter} teksty={{ naglowekAdres: 'Gdzie stoi budynek?' }} />);
    expect(screen.getByText('Krok 1 z 5')).toBeTruthy();
    expect(screen.getByText('Gdzie stoi budynek?')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7'), { target: { value: 'Klonowa 7' } });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    fireEvent.click(screen.getByRole('option'));
    vi.useRealTimers();
    await screen.findByText('Zgadza się, dalej');
    expect(screen.getByText('Krok 2 z 5')).toBeTruthy();
    expect(adapter.obrys).toEqual(OBRYS);
    fireEvent.click(screen.getByText('Zgadza się, dalej'));
    const w = onGotowe.mock.calls[0][0];
    expect(w.adres).toMatchObject({ ulica: 'Klonowa', numer: '7', miasto: 'Sosnowiec', kod: '41-218', zrodlo: 'podpowiedz', tekst: 'Klonowa 7, Sosnowiec' });
    expect(w.kondygnacje).toBe(2);
    expect(w.zrodlo_obrysu).toBe('ewidencja');
    expect(w.rzut_m2).toBeGreaterThan(90);
  });

  it('„Wstecz” na mapie wraca do ekranu adresu', async () => {
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" onGotowe={vi.fn()} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    fireEvent.change(screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7'), { target: { value: 'Klonowa 7' } });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    fireEvent.click(screen.getByRole('option'));
    vi.useRealTimers();
    await screen.findByText('Zgadza się, dalej');
    fireEvent.click(screen.getByText('← Wstecz'));
    expect(screen.getByText('Gdzie stoi Twój dom?')).toBeTruthy();
    expect(adapter.zniszczony).toBe(true);
  });
});
