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

export type Punkt = { lat: number; lon: number };

/** Skąd pochodzi punkt, od którego szukamy działki i budynku (spec elektryka 5.4). Od v0.3.0. */
export type ZrodloPunktu = 'adres' | 'pinezka' | 'numer_dzialki';
/** Sposób wskazania miejsca w kroku (zakładki). Od v0.3.0. */
export type Wejscie = ZrodloPunktu;

/** Jedna działka z listy po numerze (MIRR GET /api/v1/geo/dzialka, plan A). Od v0.3.0. */
export type DzialkaZListy = {
  /** „142102_1.0010.64/4” (TERYT jednostki, obręb, numer) */
  identyfikator: string;
  gmina: string | null;
  obreb: string | null;
  numer: string;
  punkt: Punkt;
  obrys: Polygon;
};

/**
 * Wpis z rejestru pozwoleń GUNB (MIRR GET /api/v1/geo/pozwolenie, plan A). Od v0.3.0.
 * Bez danych osobowych: inwestora, projektanta i adresu nie ma w MIRR ani tutaj.
 */
export type Pozwolenie = {
  numer_gunb: string;
  /** „2026-01-12” */
  data_decyzji: string;
  rodzaj: string | null;
  nazwa_zamierzenia: string | null;
  kubatura: number | null;
  /** 2 = dom dwulokalowy */
  units: number | null;
};

/** Drugi argument onGotowe, tylko przy sprawdzPozwolenie. Od v0.3.0. */
export type DodatkiKroku = { pozwolenie: Pozwolenie | null };

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
  /** Od v0.3.0: adres (podpowiedź albo ręczny) / pinezka / numer działki. */
  zrodlo_punktu: ZrodloPunktu;
  /** Od v0.3.0: punkt, od którego szukaliśmy (adres, pinezka albo punkt działki). Spec 5.3 liczy z niego dojazd. */
  punkt: Punkt;
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
  wrocDoPodpowiedzi: string;
  zmienAdres: string;
  podpowiedzMapa: string;
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
  wejsciaEtykieta: string;
  wejscieAdres: string;
  wejsciePinezka: string;
  wejscieDzialka: string;
  naglowekPinezka: string;
  podpowiedzPinezka: string;
  dotknijMape: string;
  toTutaj: string;
  punktNaMapie: string;
  naglowekDzialka: string;
  podpowiedzDzialka: string;
  poleDzialka: string;
  przykladDzialki: string;
  przyciskSzukajDzialki: string;
  szukamDzialki: string;
  zlyNumerDzialki: string;
  brakDzialki: string;
  bladDzialki: string;
  wybierzGmine: string;
  gminaOpis: string;
  naglowekPotwierdzDzialke: string;
  szukamWEwidencji: string;
  powierzchniaDzialki: string;
  toMojaDzialka: string;
  toNieTaDzialka: string;
  brakDanychDzialki: string;
  sprawdzamy: string;
};

/** Teksty karty „To Twoja budowa?”. Od v0.3.0. */
export type TekstyKartyBudowy = {
  naglowek: string;
  wstep: string;
  /** „{data}” = „12 stycznia 2026” */
  decyzja: string;
  domJednorodzinny: string;
  jedenLokal: string;
  dwaLokale: string;
  tak: string;
  nie: string;
  poCoPytamy: string;
};

export type KartaBudowyProps = {
  /** null / undefined = komponent nic nie renderuje (krok „to Twoja budowa?” znika). */
  pozwolenie: Pozwolenie | null | undefined;
  /** Do linii „Działka 64/4, obręb 0010, Pruszków”; bez niej karta pomija tę linię. */
  dzialka?: { numer: string | null; obreb: string | null; gmina: string | null } | null;
  teksty?: Partial<TekstyKartyBudowy>;
  onTak: (pozwolenie: Pozwolenie) => void;
  onNie: (pozwolenie: Pozwolenie) => void;
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
  /** Od v0.3.0. Sposoby wskazania miejsca, w tej kolejności zakładek; domyślnie ['adres'] (jak v0.2). Pinezka wymaga mapy i adaptera z wybierzPunkt. */
  wejscia?: Wejscie[];
  /** Od v0.3.0. 'budynek' (domyślnie, jak v0.2): potwierdzenie obrysu domu. 'dzialka': potwierdzenie działki, bez rysowania i bez pytania o kondygnacje. */
  cel?: 'budynek' | 'dzialka';
  /** Od v0.3.0. true = po znalezieniu działki krok pyta MIRR o pozwolenie na budowę i oddaje je w drugim argumencie onGotowe. */
  sprawdzPozwolenie?: boolean;
  /** Od v0.3.0. true = na ekranie od 900 px mapa po lewej, pytania i przyciski po prawej. */
  szeroko?: boolean;
  /** Drugi argument tylko przy sprawdzPozwolenie (od v0.3.0). */
  onGotowe: (wynik: WynikKrokuAdresu, dodatki?: DodatkiKroku) => void;
  /** „Wolę podać powierzchnię ręcznie" albo adresu nie da się znaleźć na mapie. */
  onPomin: (powod?: string) => void;
  onWstecz?: () => void;
  /** Do testów i demo bez sieci: własny adapter mapy. */
  adapterMapy?: () => import('./mapa/adapter').AdapterMapy;
};
