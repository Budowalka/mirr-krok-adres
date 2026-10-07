import type { Polygon } from 'geojson';
import { rzutM2, zGeoJson } from './geometria';
import type { Adres, DzialkaZListy, OdpowiedzBudynek, Punkt } from './typy';

type OpisDzialkiWe = { numer: string | null; obreb: string | null; gmina: string | null };

/**
 * „10 64/4", „0010 64/4", „obręb 10, dz. 64/4", „dz. nr 64/4, obręb 0010", „64/4 10" → { obreb, numer }.
 * Przy dwóch liczbach słowa (w tym nazwa gminy) są pomijane. Przy jednej liczbie reszta tekstu to nazwa obrębu (zNazwaObrebu).
 * Który to obręb: (1) liczba tuż po słowie zaczynającym się od „obr” (obręb, obr., obrębie), jak w pozwoleniu i wypisie;
 * (2) bez tego słowa: liczba bez ukośnika, gdy druga ma ukośnik (numer z ukośnikiem nigdy nie jest obrębem);
 * (3) w pozostałych przypadkach pierwsza liczba. Obręb: 1–4 cyfry; numer: cyfry z opcjonalną literą i częścią po ukośniku.
 */
const LICZBA = /\d+[a-z]?(?:\/\d+[a-z]?)?/gi;
const SLOWO_OBREB = /(?<!\p{L})obr/iu;
const OBREB = /^\d{1,4}$/;
const NUMER = /^\d{1,6}[a-z]?(?:\/\d{1,4}[a-z]?)?$/i;

// Słowa pomocnicze z wypisu i pozwolenia, które nie są nazwą obrębu.
const SLOWA_POMOCNICZE = /(?<!\p{L})(?:obr\p{L}*|dz\p{L}*|nr|numer|ewid\p{L}*)\.?(?!\p{L})/giu;
const NAZWA_OBREBU = /^\p{L}[\p{L} -]{0,39}$/u;

/**
 * Obręb wiejski ma w ewidencji nazwę („Dobra”, „Stare Czarnowo”), a nie numer. Przy jednej liczbie (numer działki)
 * reszta tekstu bez słów pomocniczych to nazwa obrębu: „Dobra 1006”, „dz. 12/3, obręb Dołuje”. ULDK szuka po „nazwa numer”.
 */
function zNazwaObrebu(tekst: string, numer: { wartosc: string; pozycja: number }): { obreb: string; numer: string } | null {
  const bezNumeru = tekst.slice(0, numer.pozycja) + ' ' + tekst.slice(numer.pozycja + numer.wartosc.length);
  const nazwa = bezNumeru.replace(SLOWA_POMOCNICZE, ' ').replace(/[,.;:]/g, ' ').replace(/\s+/g, ' ').trim();
  return NAZWA_OBREBU.test(nazwa) && NUMER.test(numer.wartosc) ? { obreb: nazwa, numer: numer.wartosc } : null;
}

export function parsujNumerDzialki(tekst: string): { obreb: string; numer: string } | null {
  const liczby = [...tekst.matchAll(LICZBA)].map((m) => ({ wartosc: m[0], pozycja: m.index ?? 0 }));
  if (liczby.length === 1) return zNazwaObrebu(tekst, liczby[0]);
  if (liczby.length !== 2) return null;
  const [a, b] = liczby;

  let obreb = a;
  const slowo = tekst.match(SLOWO_OBREB);
  if (slowo) {
    const poSlowie = liczby.find((l) => l.pozycja > (slowo.index ?? 0));
    if (!poSlowie) return null;
    obreb = poSlowie;
  } else if (a.wartosc.includes('/') && !b.wartosc.includes('/')) {
    obreb = b;
  }
  const numer = obreb === a ? b : a;

  return OBREB.test(obreb.wartosc) && NUMER.test(numer.wartosc) ? { obreb: obreb.wartosc, numer: numer.wartosc } : null;
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
