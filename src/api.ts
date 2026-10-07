import type { DzialkaZListy, OdpowiedzBudynek, Podpowiedz, Pozwolenie } from './typy';

export type Bias = { lat: number; lon: number } | undefined;

export type Api = {
  podpowiedzi(q: string, bias: Bias, signal?: AbortSignal): Promise<Podpowiedz[]>;
  budynek(lat: number, lon: number, adres?: { miasto: string; ulica: string; numer: string }): Promise<OdpowiedzBudynek>;
  /** Od v0.3.0. Działki o tym obrębie i numerze w województwach firmy (MIRR filtruje). */
  dzialka(obreb: string, numer: string, signal?: AbortSignal): Promise<DzialkaZListy[]>;
  /** Od v0.3.0. Najnowsze pozwolenie na budowę domu dla działki albo null. */
  pozwolenie(identyfikator: string, signal?: AbortSignal): Promise<Pozwolenie | null>;
};

/** Plan A oddaje null w punkt/obrys, gdy działka nie ma geometrii; taka nie nadaje się na mapę. */
function maGeometrie(d: Partial<DzialkaZListy> | null | undefined): d is DzialkaZListy {
  return !!d && !!d.punkt && !!d.obrys;
}

/**
 * Klient tras proxy landingu (np. "/api/geo"). Landing trzyma klucz MIRR po stronie
 * serwera i przekazuje zapytania do GET /api/v1/geo/*; przeglądarka nigdy nie pyta
 * GUGiK ani Photona wprost.
 */
export function utworzApi(baza: string): Api {
  const b = baza.replace(/\/$/, '');
  return {
    async podpowiedzi(q, bias, signal) {
      const params = new URLSearchParams({ q });
      if (bias) {
        params.set('lat', String(bias.lat));
        params.set('lon', String(bias.lon));
      }
      const res = await fetch(`${b}/podpowiedzi?${params}`, { signal });
      if (!res.ok) throw new Error(`podpowiedzi: HTTP ${res.status}`);
      const data = (await res.json()) as { podpowiedzi?: Podpowiedz[] };
      return data.podpowiedzi ?? [];
    },
    async budynek(lat, lon, adres) {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
      if (adres) {
        params.set('miasto', adres.miasto);
        params.set('ulica', adres.ulica);
        params.set('numer', adres.numer);
      }
      const res = await fetch(`${b}/budynek?${params}`);
      if (!res.ok) throw new Error(`budynek: HTTP ${res.status}`);
      return (await res.json()) as OdpowiedzBudynek;
    },
    async dzialka(obreb, numer, signal) {
      const params = new URLSearchParams({ obreb, numer });
      const res = await fetch(`${b}/dzialka?${params}`, { signal });
      if (!res.ok) throw new Error(`dzialka: HTTP ${res.status}`);
      const data = (await res.json()) as { dzialki?: Partial<DzialkaZListy>[] };
      return (data.dzialki ?? []).filter(maGeometrie);
    },
    async pozwolenie(identyfikator, signal) {
      const params = new URLSearchParams({ dzialka: identyfikator });
      const res = await fetch(`${b}/pozwolenie?${params}`, { signal });
      if (!res.ok) throw new Error(`pozwolenie: HTTP ${res.status}`);
      const data = (await res.json()) as { pozwolenie?: Pozwolenie | null };
      return data.pozwolenie ?? null;
    },
  };
}
