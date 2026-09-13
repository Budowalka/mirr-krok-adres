import type { Polygon } from 'geojson';

/** Jedna pozycja z listy podpowiedzi (MIRR GET /api/v1/geo/podpowiedzi). */
export type Podpowiedz = {
  /** adres = punkt z numerem domu; ulica = sama ulica, klient dopisuje numer */
  rodzaj: 'adres' | 'ulica';
  tekst: string;
  ulica: string;
  numer: string | null;
  kod: string | null;
  miasto: string;
  lat: number;
  lon: number;
};

/** Serwerowa część kontraktu (MIRR GET /api/v1/geo/budynek, Geo::Budynek). */
export type OdpowiedzBudynek = {
  obrys: Polygon | null;
  zrodlo_obrysu: 'ewidencja' | 'brak';
  obwod_m: number | null;
  rzut_m2: number | null;
  kondygnacje: number | null;
  zrodlo_kondygnacji: 'ewidencja' | null;
  identyfikator_egib: string | null;
  identyfikator_uldk: string | null;
  budynek: {
    funkcja: string | null;
    funkcja_ogolna: string | null;
    kod_kst: string | null;
    kategoria_istnienia: string | null;
    zrodlo_geometrii: string | null;
    wersja_danych: string | null;
  } | null;
  dzialka: {
    identyfikator: string;
    numer: string | null;
    obreb: string | null;
    gmina: string | null;
    powiat: string | null;
    wojewodztwo: string | null;
    powierzchnia_m2: number;
    obrys: Polygon;
  } | null;
  inne_budynki_na_dzialce: Array<{ funkcja: string | null; rzut_m2: number; kondygnacje: number | null }>;
  powiat: { teryt: string | null; w_bazie: boolean };
  teryt: { teryt_gmina: string | null; simc: string | null; ulic: string | null; kod: string | null } | null;
};

export type Adres = {
  ulica: string;
  numer: string;
  kod: string | null;
  miasto: string;
  gmina: string | null;
  powiat: string | null;
  wojewodztwo: string | null;
  teryt_gmina: string | null;
  simc: string | null;
  ulic: string | null;
  lat: number;
  lon: number;
  /** z listy podpowiedzi / wpisany ręcznie i znaleziony na mapie */
  zrodlo: 'podpowiedz' | 'reczny';
  /** „Klonowa 7, Sosnowiec" do maila i karty leada */
  tekst: string;
};

/** Kontrakt wyjścia komponentu (spec D3). Komponent nie liczy niczego branżowego. */
export type WynikKrokuAdresu = {
  adres: Adres;
  obrys: Polygon | null;
  zrodlo_obrysu: 'ewidencja' | 'reczne' | 'brak';
  obwod_m: number | null;
  rzut_m2: number | null;
  kondygnacje: number | null;
  zrodlo_kondygnacji: 'ewidencja' | 'reczne' | null;
  identyfikator_egib: string | null;
  budynek: OdpowiedzBudynek['budynek'];
  dzialka: OdpowiedzBudynek['dzialka'];
  inne_budynki_na_dzialce: OdpowiedzBudynek['inne_budynki_na_dzialce'];
  powiat: OdpowiedzBudynek['powiat'];
};

/** wmts (domyślne, Geoportal, szybkie) · wms (Geoportal, 2–3 s na kafel) · xyz (inny dostawca) */
export type ZrodloKafli = { typ: 'wmts' } | { typ: 'wms' } | { typ: 'xyz'; url: string; atrybucja?: string };

export type LiniaPanelu = { etykieta: string; wartosc: string; opis?: string };

export type Teksty = {
  krok: string;
  naglowekAdres: string;
  podpowiedzAdres: string;
  poleAdres: string;
  przyciskPokaz: string;
  nieMaNaLiscie: string;
  dopiszNumer: string;
  poleUlica: string;
  poleKod: string;
  poleMiasto: string;
  przyciskSzukaj: string;
  pomin: string;
  stopkaAdres: string;
  szukamy: string;
  naglowekMapa: string;
  obrysZEwidencji: string;
  obwod: string;
  zObrysu: string;
  rzut: string;
  kondygnacje: string;
  popraw: string;
  zgadzaSie: string;
  zaznaczeSam: string;
  przeciagnijRogi: string;
  notaMapa: string;
  brakObrysu: string;
  zaznaczNaMapie: string;
  rysowanie: string;
  cofnij: string;
  ileKondygnacji: string;
  kondygnacjeOpcje: [string, string, string];
  dalej: string;
  wstecz: string;
  nieZnaleziono: string;
};

export type KrokAdresuProps = {
  /** Baza tras proxy landingu, np. "/api/geo" (nigdy MIRR wprost). */
  api: string;
  /** Środek obszaru działania firmy — bias podpowiedzi. */
  bias?: { lat: number; lon: number };
  /** false = tylko krok adresu (dane publiczne i tak są zbierane, kondygnacje pytane, gdy brak). */
  pokazMape?: boolean;
  /** Do linii pomocniczej w panelu (np. wysokość ścian), nie do kontraktu. */
  wysokoscKondygnacji?: number;
  /** Dodatkowa linia panelu liczona przez landing (np. „Elewacja do ocieplenia"). */
  linia?: (czesciowy: Pick<WynikKrokuAdresu, 'obwod_m' | 'rzut_m2' | 'kondygnacje'>) => LiniaPanelu | null;
  teksty?: Partial<Teksty>;
  zrodloKafli?: ZrodloKafli;
  /** Numer i liczba kroków do etykiety „Krok x z y". */
  numerKroku?: { adres: number; mapa: number; z: number };
  onGotowe: (wynik: WynikKrokuAdresu) => void;
  /** „Wolę podać powierzchnię ręcznie" albo adresu nie da się znaleźć na mapie. */
  onPomin: (powod?: string) => void;
  onWstecz?: () => void;
  /** Do testów i demo bez sieci: własny adapter mapy. */
  adapterMapy?: () => import('./mapa/adapter').AdapterMapy;
};
