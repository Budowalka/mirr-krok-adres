import type { Teksty, TekstyKartyBudowy } from './typy';

/** Teksty domyślne (forma grzecznościowa: bezosobowo albo „Państwo”, przyciski w głosie klienta; po polsku, bez żargonu). Landing nadpisuje wybrane przez props.teksty. */
export const DOMYSLNE_TEKSTY: Teksty = {
  krok: 'Krok {x} z {y}',
  naglowekAdres: 'Adres budowy',
  podpowiedzAdres: 'Wystarczy wpisać ulicę i numer, a mapa przybliży się do domu.',
  poleAdres: 'Ulica i numer, np. Klonowa 7',
  przyciskPokaz: 'Pokaż mój dom na mapie',
  nieMaNaLiscie: 'Nie ma mojego adresu na liście',
  dopiszNumer: 'trzeba dopisać numer domu',
  wrocDoPodpowiedzi: 'Wracam do podpowiedzi',
  zmienAdres: 'Inny adres',
  podpowiedzMapa: 'Wystarczy wpisać adres, a mapa sama przybliży się do domu.',
  poleUlica: 'Ulica i numer',
  poleKod: 'Kod pocztowy',
  poleMiasto: 'Miejscowość',
  przyciskSzukaj: 'Szukam na mapie',
  pomin: 'Wolę podać powierzchnię ręcznie',
  stopkaAdres: 'Adres służy tylko do znalezienia domu i policzenia wyceny. Nie trafia do żadnej bazy poza naszą.',
  szukamy: 'Szukamy domu w ewidencji budynków…',
  naglowekMapa: 'To ten dom?',
  obrysZEwidencji: '{adres}. Obrys wzięliśmy z ewidencji budynków.',
  obwod: 'Obwód budynku',
  zObrysu: 'z obrysu',
  rzut: 'Powierzchnia zabudowy',
  kondygnacje: 'Kondygnacje',
  popraw: 'Poprawię',
  zgadzaSie: 'Zgadza się, dalej',
  zaznaczeSam: 'Zaznaczę samodzielnie',
  przeciagnijRogi: 'Obrys można poprawić, przeciągając rogi. Obwód i powierzchnia liczą się na bieżąco.',
  notaMapa:
    'Obrys i liczba kondygnacji pochodzą z ewidencji budynków. Jeśli dom jest nowszy niż zdjęcie albo coś się nie zgadza, wystarczy dotknąć „Zaznaczę samodzielnie” i obrysować go palcem po rogach albo „Poprawię” przy kondygnacjach.',
  brakObrysu: 'Nie znaleźliśmy tego domu w ewidencji. Można zaznaczyć go samodzielnie, dotykając kolejno rogów domu na zdjęciu.',
  zaznaczNaMapie: 'Zaznaczę dom na mapie',
  rysowanie: 'Proszę dotykać kolejno rogów domu. Ostatni róg trzeba dotknąć dwa razy, żeby zamknąć obrys.',
  cofnij: 'Cofam ostatni róg',
  ileKondygnacji: 'Ile kondygnacji ma dom?',
  kondygnacjeOpcje: ['Parter', 'Parter i piętro', 'Dwa piętra lub więcej'],
  dalej: 'Dalej',
  wstecz: 'Wstecz',
  nieZnaleziono: 'Nie udało się znaleźć tego adresu na mapie. Powierzchnię można podać ręcznie.',
  wejsciaEtykieta: 'Jak wskazać miejsce budowy?',
  wejscieAdres: 'Adres',
  wejsciePinezka: 'Wskażę na mapie',
  wejscieDzialka: 'Numer działki',
  naglowekPinezka: 'Gdzie jest działka?',
  podpowiedzPinezka: 'Wystarczy przybliżyć mapę i dotknąć miejsca, gdzie stoi albo stanie dom.',
  dotknijMape: 'Pinezka pojawi się po dotknięciu mapy.',
  toTutaj: 'To tutaj, dalej',
  punktNaMapie: 'Punkt na mapie',
  naglowekDzialka: 'Jaki numer ma działka?',
  podpowiedzDzialka: 'Wystarczy wpisać obręb i numer działki, np. Dobra 1006 albo 10 64/4. Oba są w pozwoleniu na budowę albo w wypisie z rejestru gruntów.',
  poleDzialka: 'Obręb i numer działki',
  przykladDzialki: 'np. Dobra 1006',
  przyciskSzukajDzialki: 'Szukam działki',
  szukamDzialki: 'Szukamy działki…',
  zlyNumerDzialki: 'Proszę wpisać obręb (nazwę albo numer) i numer działki oddzielone spacją, np. Dobra 1006 albo 10 64/4.',
  brakDzialki: 'Nie znaleźliśmy takiej działki. Warto sprawdzić oba numery albo zaznaczyć działkę na mapie.',
  bladDzialki: 'Nie udało się teraz sprawdzić działki. Można spróbować jeszcze raz albo zaznaczyć ją na mapie.',
  wybierzGmine: 'W której gminie jest ta działka?',
  gminaOpis: 'obręb {obreb}',
  naglowekPotwierdzDzialke: 'To ta działka?',
  szukamWEwidencji: 'Sprawdzamy działkę w ewidencji…',
  powierzchniaDzialki: 'Powierzchnia działki',
  toMojaDzialka: 'Tak, to moja działka',
  toNieTaDzialka: 'To nie ta działka',
  brakDanychDzialki: 'Nie udało się sprawdzić tej działki w ewidencji. Można przejść dalej, sprawdzimy ją sami.',
  sprawdzamy: 'Chwileczkę…',
};

/** Opis słowny, bez powtarzania liczby (panel pokazuje „{n}, {opis}”). */
export function opisKondygnacji(n: number | null): string {
  if (n === null) return 'nie wiemy';
  if (n === 1) return 'dom parterowy';
  if (n === 2) return 'parter i piętro';
  if (n === 3) return 'parter i dwa piętra';
  if (n === 4) return 'parter i trzy piętra';
  return `parter i ${n - 1} pięter`;
}

export function wstaw(szablon: string, wartosci: Record<string, string | number>): string {
  return szablon.replace(/\{(\w+)\}/g, (_, k) => String(wartosci[k] ?? ''));
}

/** Teksty karty „To Państwa budowa?” (forma grzecznościowa). Landing nadpisuje przez props.teksty karty. */
export const DOMYSLNE_TEKSTY_KARTY: TekstyKartyBudowy = {
  naglowek: 'To Państwa budowa?',
  wstep: 'W rejestrze pozwoleń na budowę jest wpis dla tej działki.',
  decyzja: 'Pozwolenie na budowę wydane {data}',
  domJednorodzinny: 'Dom jednorodzinny',
  jedenLokal: 'jeden lokal',
  dwaLokale: 'dwa lokale',
  tak: 'Tak, to moja budowa',
  nie: 'To inny budynek',
  poCoPytamy: 'Sprawdzamy rejestr pozwoleń na budowę, żeby nie pytać o to, co już w nim jest. Z rejestru nie bierzemy żadnych danych osobowych.',
};
