import { useCallback, useEffect, useRef } from 'react';
import type { Api } from './api';
import type { Pozwolenie } from './typy';

/** Najdłuższe czekanie na rejestr po kliknięciu „dalej" (decyzja P6). Potem krok idzie dalej bez karty. */
export const LIMIT_POZWOLENIA_MS = 3000;

const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

/** „2026-01-12" → „12 stycznia 2026". Z napisu, nie przez Date (północ UTC przesuwa dzień w innych strefach). */
export function dataSlownie(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const miesiac = m ? MIESIACE[Number(m[2]) - 1] : undefined;
  return m && miesiac ? `${Number(m[3])} ${miesiac} ${m[1]}` : iso;
}

/** Nazwy z rejestru są wielkimi literami; na karcie pokazujemy zwykłe zdanie. */
export function zdanieZWielkiej(tekst: string): string {
  const male = tekst.toLocaleLowerCase('pl-PL');
  return male ? male[0].toLocaleUpperCase('pl-PL') + male.slice(1) : male;
}

/** Pola `form_data.pozwolenie` ze specu 5.4 (bez rodzaju i nazwy; danych osobowych nie ma w ogóle). */
export function pozwolenieDoFormData(p: Pozwolenie, potwierdzone: boolean) {
  return { numer_gunb: p.numer_gunb, data_decyzji: p.data_decyzji, kubatura: p.kubatura, units: p.units, potwierdzone };
}

/**
 * Pobiera pozwolenie dla działki, gdy tylko znamy identyfikator (zanim klient kliknie „dalej"),
 * i zwraca funkcję, która czeka na wynik najwyżej LIMIT_POZWOLENIA_MS. Błąd, brak, przekroczenie czasu = null.
 */
export function usePozwolenie(api: Api, identyfikator: string | null, wlaczone: boolean): () => Promise<Pozwolenie | null> {
  const pamiec = useRef<{ id: string; obietnica: Promise<Pozwolenie | null> } | null>(null);

  const pobierz = useCallback(
    (id: string) => {
      if (pamiec.current?.id !== id) {
        pamiec.current = { id, obietnica: api.pozwolenie(id).catch(() => null) };
      }
      return pamiec.current.obietnica;
    },
    [api]
  );

  useEffect(() => {
    if (wlaczone && identyfikator) void pobierz(identyfikator);
  }, [wlaczone, identyfikator, pobierz]);

  return useCallback(async () => {
    if (!wlaczone || !identyfikator) return null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limit = new Promise<null>((r) => {
      timer = setTimeout(() => r(null), LIMIT_POZWOLENIA_MS);
    });
    try {
      return await Promise.race([pobierz(identyfikator), limit]);
    } finally {
      clearTimeout(timer);
    }
  }, [wlaczone, identyfikator, pobierz]);
}
