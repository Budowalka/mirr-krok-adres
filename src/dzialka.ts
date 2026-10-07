import type { Polygon } from 'geojson';
import { rzutM2, zGeoJson } from './geometria';
import type { Adres, DzialkaZListy, OdpowiedzBudynek, Punkt } from './typy';

type OpisDzialkiWe = { numer: string | null; obreb: string | null; gmina: string | null };

/**
 * „10 64/4", „0010 64/4", „obręb 10, dz. 64/4", „Pruszków 10 64/4", „10 64/4 Pruszków" → { obreb: '10', numer: '64/4' }.
 * Obręb: 1–4 cyfry, numer: cyfry z opcjonalną literą i częścią po ukośniku. Słowa przed obrębem i po numerze
 * są pomijane (ULDK nie przyjmuje nazwy gminy ani obrębu, spec 6.1). Zapis bez obu numerów → null.
 */
const WZOR = /^\D*?(\d{1,4})[^\d/]+?(\d{1,6}[a-z]?(?:\/\d{1,4}[a-z]?)?)(?:[\s,;.]+\D*)?$/i;

export function parsujNumerDzialki(tekst: string): { obreb: string; numer: string } | null {
  const m = tekst.trim().match(WZOR);
  return m ? { obreb: m[1], numer: m[2] } : null;
}

/** „Działka 64/4, obręb 0010, Pruszków" (puste części pomijane). */
export function opisDzialki(d: OpisDzialkiWe): string {
  return [`Działka ${d.numer ?? ''}`.trim(), d.obreb ? `obręb ${d.obreb}` : null, d.gmina].filter(Boolean).join(', ');
}

/**
 * Adres zastępczy dla pinezki i numeru działki (decyzja P2): kontrakt wymaga niepustego `adres`,
 * a ulicy z pinezki nie znamy. O źródle punktu rozstrzyga `zrodlo_punktu` w wyniku.
 */
export function adresZPunktu(punkt: Punkt, dzialka: OpisDzialkiWe | null, etykietaPunktu = 'Punkt na mapie'): Adres {
  return {
    ulica: '',
    numer: '',
    kod: null,
    miasto: dzialka?.gmina ?? '',
    gmina: dzialka?.gmina ?? null,
    powiat: null,
    wojewodztwo: null,
    teryt_gmina: null,
    simc: null,
    ulic: null,
    lat: punkt.lat,
    lon: punkt.lon,
    zrodlo: 'reczny',
    tekst: dzialka ? opisDzialki(dzialka) : `${etykietaPunktu} ${punkt.lat.toFixed(5)}, ${punkt.lon.toFixed(5)}`,
  };
}

export function powierzchniaDzialki(obrys: Polygon): number {
  return Math.round(rzutM2(zGeoJson(obrys)) * 10) / 10;
}

/** Działka wybrana z listy wygrywa z działką z ULDK po punkcie, chyba że to ta sama (wtedy ewidencja ma więcej pól). */
export function scalDzialke(zBudynku: OdpowiedzBudynek['dzialka'], wybrana: DzialkaZListy | null): OdpowiedzBudynek['dzialka'] {
  if (!wybrana) return zBudynku;
  if (zBudynku && zBudynku.identyfikator === wybrana.identyfikator) return zBudynku;
  return {
    identyfikator: wybrana.identyfikator,
    numer: wybrana.numer,
    obreb: wybrana.obreb,
    gmina: wybrana.gmina,
    powiat: null,
    wojewodztwo: null,
    powierzchnia_m2: powierzchniaDzialki(wybrana.obrys),
    obrys: wybrana.obrys,
  };
}
