import type { OdpowiedzBudynek, Podpowiedz } from './typy';

export type Bias = { lat: number; lon: number } | undefined;

export type Api = {
  podpowiedzi(q: string, bias: Bias, signal?: AbortSignal): Promise<Podpowiedz[]>;
  budynek(lat: number, lon: number, adres?: { miasto: string; ulica: string; numer: string }): Promise<OdpowiedzBudynek>;
};

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
  };
}
