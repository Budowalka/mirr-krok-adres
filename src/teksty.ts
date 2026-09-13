import type { Teksty } from './typy';

/** Teksty domyślne (forma Ty, po polsku, bez żargonu). Landing nadpisuje wybrane przez props.teksty. */
export const DOMYSLNE_TEKSTY: Teksty = {
  krok: 'Krok {x} z {y}',
  naglowekAdres: 'Gdzie stoi Twój dom?',
  podpowiedzAdres: 'Wpisz ulicę i numer, a mapa przybliży się do Twojego domu.',
  poleAdres: 'Ulica i numer, np. Klonowa 7',
  przyciskPokaz: 'Pokaż mój dom na mapie',
  nieMaNaLiscie: 'Nie ma mojego adresu na liście',
  dopiszNumer: 'dopisz numer domu',
  wrocDoPodpowiedzi: 'Wróć do podpowiedzi',
  zmienAdres: 'Zmień',
  podpowiedzMapa: 'Wpisz adres, a mapa sama przybliży się do Twojego domu.',
  poleUlica: 'Ulica i numer',
  poleKod: 'Kod pocztowy',
  poleMiasto: 'Miejscowość',
  przyciskSzukaj: 'Znajdź na mapie',
  pomin: 'Wolę podać powierzchnię ręcznie',
  stopkaAdres: 'Adres służy tylko do znalezienia domu i policzenia wyceny. Nie trafia do żadnej bazy poza naszą.',
  szukamy: 'Szukamy Twojego domu w ewidencji budynków…',
  naglowekMapa: 'To ten dom?',
  obrysZEwidencji: '{adres}. Obrys wzięliśmy z ewidencji budynków.',
  obwod: 'Obwód budynku',
  zObrysu: 'z obrysu',
  rzut: 'Powierzchnia zabudowy',
  kondygnacje: 'Kondygnacje',
  popraw: 'Popraw',
  zgadzaSie: 'Zgadza się, dalej',
  zaznaczeSam: 'Zaznaczę samodzielnie',
  przeciagnijRogi: 'Przeciągnij rogi, żeby poprawić obrys. Obwód i powierzchnia liczą się na bieżąco.',
  notaMapa:
    'Obrys i liczba kondygnacji pochodzą z ewidencji budynków. Jeśli dom jest nowszy niż zdjęcie albo coś się nie zgadza, dotknij „Zaznaczę samodzielnie” i obrysuj go palcem po rogach albo „Popraw” przy kondygnacjach.',
  brakObrysu: 'Nie znaleźliśmy tego domu w ewidencji. Zaznacz go sam: dotknij kolejno rogi domu na zdjęciu.',
  zaznaczNaMapie: 'Zaznacz dom na mapie',
  rysowanie: 'Dotykaj kolejno rogi domu. Ostatni róg dotknij dwa razy, żeby zamknąć obrys.',
  cofnij: 'Cofnij',
  ileKondygnacji: 'Ile kondygnacji ma dom?',
  kondygnacjeOpcje: ['Parter', 'Parter i piętro', 'Dwa piętra lub więcej'],
  dalej: 'Dalej',
  wstecz: 'Wstecz',
  nieZnaleziono: 'Nie udało się znaleźć tego adresu na mapie. Podasz powierzchnię ręcznie.',
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
