import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../api';
import { LIMIT_POZWOLENIA_MS, dataSlownie, pozwolenieDoFormData, usePozwolenie, zdanieZWielkiej } from '../pozwolenie';
import type { Pozwolenie } from '../typy';

// Parytet ze specu elektryka 6.2 (Pruszków 142102_1 / 0010 / 64/4); numer GUNB zmyślony.
const P: Pozwolenie = { numer_gunb: 'TEST-0001', data_decyzji: '2026-01-12', rodzaj: 'budowa nowego', nazwa_zamierzenia: 'BUDOWA BUDYNKU MIESZKALNEGO JEDNORODZINNEGO DWULOKALOWEGO', kubatura: 1428.59, units: 2 };
const ID = '142102_1.0010.64/4';

function api(pozwolenie: (id: string) => Promise<Pozwolenie | null>) {
  return { podpowiedzi: vi.fn(), budynek: vi.fn(), dzialka: vi.fn(), pozwolenie: vi.fn(pozwolenie) } as unknown as Api & { pozwolenie: ReturnType<typeof vi.fn> };
}

afterEach(() => vi.useRealTimers());

describe('dataSlownie', () => {
  it('formatuje z napisu, bez strefy czasowej', () => {
    expect(dataSlownie('2026-01-12')).toBe('12 stycznia 2026');
    expect(dataSlownie('2025-10-28')).toBe('28 października 2025');
    expect(dataSlownie('2026-01-12T00:00:00Z')).toBe('12 stycznia 2026');
  });
  it('zły zapis zostaje bez zmian', () => {
    expect(dataSlownie('zła')).toBe('zła');
    expect(dataSlownie('2026-13-01')).toBe('2026-13-01');
  });
});

describe('zdanieZWielkiej', () => {
  it('zamienia wielkie litery z rejestru na zdanie, z polskimi znakami', () => {
    expect(zdanieZWielkiej('BUDOWA BUDYNKU MIESZKALNEGO JEDNORODZINNEGO DWULOKALOWEGO')).toBe('Budowa budynku mieszkalnego jednorodzinnego dwulokalowego');
    expect(zdanieZWielkiej('ŁĄKA')).toBe('Łąka');
    expect(zdanieZWielkiej('')).toBe('');
  });
});

describe('pozwolenieDoFormData', () => {
  it('daje dokładnie pola z kontraktu form_data.pozwolenie (spec 5.4)', () => {
    const fd = pozwolenieDoFormData(P, true);
    expect(fd).toEqual({ numer_gunb: 'TEST-0001', data_decyzji: '2026-01-12', kubatura: 1428.59, units: 2, potwierdzone: true });
    expect(Object.keys(fd).sort()).toEqual(['data_decyzji', 'kubatura', 'numer_gunb', 'potwierdzone', 'units']);
    expect(pozwolenieDoFormData(P, false).potwierdzone).toBe(false);
  });
});

describe('usePozwolenie', () => {
  it('wyłączony: nie pyta MIRR i oddaje null', async () => {
    const a = api(async () => P);
    const { result } = renderHook(() => usePozwolenie(a, ID, false));
    await expect(result.current()).resolves.toBeNull();
    expect(a.pozwolenie).not.toHaveBeenCalled();
  });

  it('bez identyfikatora: nie pyta i oddaje null', async () => {
    const a = api(async () => P);
    const { result } = renderHook(() => usePozwolenie(a, null, true));
    await expect(result.current()).resolves.toBeNull();
    expect(a.pozwolenie).not.toHaveBeenCalled();
  });

  it('pyta od razu, raz na identyfikator (ponowne renderowanie i kliknięcie nie dublują zapytania)', async () => {
    const a = api(async () => P);
    const { result, rerender } = renderHook(({ id }) => usePozwolenie(a, id, true), { initialProps: { id: ID } });
    expect(a.pozwolenie).toHaveBeenCalledTimes(1);
    rerender({ id: ID });
    await expect(result.current()).resolves.toEqual(P);
    expect(a.pozwolenie).toHaveBeenCalledTimes(1);
    expect(a.pozwolenie).toHaveBeenCalledWith(ID);
  });

  it('nowy identyfikator = nowe zapytanie', async () => {
    const a = api(async (id) => (id === ID ? P : null));
    const { result, rerender } = renderHook(({ id }) => usePozwolenie(a, id, true), { initialProps: { id: ID } });
    rerender({ id: '142102_1.0010.65' });
    await expect(result.current()).resolves.toBeNull();
    expect(a.pozwolenie).toHaveBeenCalledTimes(2);
  });

  it('błąd HTTP (np. 404 starego proxy) = null', async () => {
    const a = api(async () => { throw new Error('pozwolenie: HTTP 404'); });
    const { result } = renderHook(() => usePozwolenie(a, ID, true));
    await expect(result.current()).resolves.toBeNull();
  });

  it(`brak odpowiedzi: czeka dokładnie ${LIMIT_POZWOLENIA_MS} ms, potem null`, async () => {
    vi.useFakeTimers();
    const a = api(() => new Promise(() => {}));
    const { result } = renderHook(() => usePozwolenie(a, ID, true));
    const wynik = vi.fn();
    void result.current().then(wynik);
    await vi.advanceTimersByTimeAsync(LIMIT_POZWOLENIA_MS - 1);
    expect(wynik).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(wynik).toHaveBeenCalledWith(null);
  });
});
