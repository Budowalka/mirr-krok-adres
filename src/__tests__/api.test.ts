import { afterEach, describe, expect, it, vi } from 'vitest';
import { utworzApi } from '../api';

const DZ = { identyfikator: '142102_1.0010.64/4', gmina: 'Pruszków', obreb: '0010', numer: '64/4', punkt: { lat: 52.182628, lon: 20.814037 }, obrys: { type: 'Polygon', coordinates: [] } };
const P = { numer_gunb: 'TEST-0001', data_decyzji: '2026-01-12', rodzaj: 'budowa nowego', nazwa_zamierzenia: 'BUDOWA BUDYNKU MIESZKALNEGO JEDNORODZINNEGO DWULOKALOWEGO', kubatura: 1428.59, units: 2 };

function odpowiedz(body: unknown, status = 200) {
  return vi.fn(async (_url: string, _opcje?: RequestInit) => ({ ok: status >= 200 && status < 300, status, json: async () => body }));
}

afterEach(() => vi.unstubAllGlobals());

describe('utworzApi: trasy dodane w v0.3.0', () => {
  it('dzialka: GET {baza}/dzialka?obreb=&numer= (ukośnik w numerze dochodzi cały) i zwraca listę', async () => {
    const f = odpowiedz({ dzialki: [DZ] });
    vi.stubGlobal('fetch', f);
    const lista = await utworzApi('/api/geo/').dzialka('10', '64/4');
    const u = new URL(f.mock.calls[0][0], 'http://localhost');
    expect(u.pathname).toBe('/api/geo/dzialka');
    expect(u.searchParams.get('obreb')).toBe('10');
    expect(u.searchParams.get('numer')).toBe('64/4');
    expect(lista).toEqual([DZ]);
  });

  it('dzialka: brak pola dzialki = pusta lista', async () => {
    vi.stubGlobal('fetch', odpowiedz({}));
    await expect(utworzApi('/api/geo').dzialka('10', '1')).resolves.toEqual([]);
  });

  it('dzialka: pozycje bez punktu albo obrysu (plan A oddaje wtedy null) są pomijane', async () => {
    vi.stubGlobal('fetch', odpowiedz({ dzialki: [DZ, { ...DZ, identyfikator: 'X1', punkt: null }, { ...DZ, identyfikator: 'X2', obrys: null }] }));
    await expect(utworzApi('/api/geo').dzialka('10', '64/4')).resolves.toEqual([DZ]);
  });

  it('dzialka: HTTP 404 (stare proxy bez tej akcji) = wyjątek', async () => {
    vi.stubGlobal('fetch', odpowiedz({ error: 'Nieznana akcja.' }, 404));
    await expect(utworzApi('/api/geo').dzialka('10', '64/4')).rejects.toThrow('dzialka: HTTP 404');
  });

  it('pozwolenie: GET {baza}/pozwolenie?dzialka=<identyfikator>, zwraca wpis albo null', async () => {
    const f = odpowiedz({ pozwolenie: P });
    vi.stubGlobal('fetch', f);
    await expect(utworzApi('/api/geo').pozwolenie('142102_1.0010.64/4')).resolves.toEqual(P);
    const u = new URL(f.mock.calls[0][0], 'http://localhost');
    expect(u.pathname).toBe('/api/geo/pozwolenie');
    expect(u.searchParams.get('dzialka')).toBe('142102_1.0010.64/4');

    vi.stubGlobal('fetch', odpowiedz({ pozwolenie: null }));
    await expect(utworzApi('/api/geo').pozwolenie('X')).resolves.toBeNull();
    vi.stubGlobal('fetch', odpowiedz({}));
    await expect(utworzApi('/api/geo').pozwolenie('X')).resolves.toBeNull();
  });

  it('pozwolenie: HTTP 403 (klucz bez scope geo:pozwolenie) = wyjątek, wołający zamienia go na null', async () => {
    vi.stubGlobal('fetch', odpowiedz({ error: 'forbidden' }, 403));
    await expect(utworzApi('/api/geo').pozwolenie('X')).rejects.toThrow('pozwolenie: HTTP 403');
  });
});
