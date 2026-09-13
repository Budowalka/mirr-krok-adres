import { useEffect, useRef, useState } from 'react';
import type { Api, Bias } from './api';
import type { Podpowiedz } from './typy';

export const MIN_ZNAKOW = 3;
export const DEBOUNCE_MS = 250;

/**
 * Podpowiedzi po fragmencie: czeka 250 ms po ostatnim znaku, pyta od 3 znaków,
 * anuluje poprzednie zapytanie. Awaria sieci = pusta lista + `blad` (ekran pokazuje
 * tryb ręczny, nie komunikat błędu).
 */
export function useSugestie(api: Api, q: string, bias: Bias) {
  const [lista, setLista] = useState<Podpowiedz[]>([]);
  const [laduje, setLaduje] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);
  const kontroler = useRef<AbortController | null>(null);

  useEffect(() => {
    kontroler.current?.abort();
    const tekst = q.trim();
    if (tekst.length < MIN_ZNAKOW) {
      setLista([]);
      setLaduje(false);
      return;
    }
    const ac = new AbortController();
    kontroler.current = ac;
    const timer = setTimeout(async () => {
      setLaduje(true);
      try {
        const wynik = await api.podpowiedzi(tekst, bias, ac.signal);
        if (!ac.signal.aborted) {
          setLista(wynik);
          setBlad(null);
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          setLista([]);
          setBlad(e instanceof Error ? e.message : 'błąd');
        }
      } finally {
        if (!ac.signal.aborted) setLaduje(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
    // bias zmienia się tylko z konfiguracją landingu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, q, bias?.lat, bias?.lon]);

  return { lista, laduje, blad };
}
