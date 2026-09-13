import type { Polygon } from 'geojson';
import type { ZrodloKafli } from '../typy';

/**
 * Mapa za interfejsem: komponent nie zna Leafleta. Prawdziwy adapter w ./leaflet.ts
 * (ładuje Leaflet dynamicznie w przeglądarce), fałszywy w ./falszywy.ts do testów
 * w jsdom i do demo bez sieci.
 */
export interface AdapterMapy {
  zamontuj(el: HTMLElement, opcje: { centrum: { lat: number; lon: number }; zoom?: number; zrodloKafli: ZrodloKafli }): Promise<void>;
  /** Płynny przelot do punktu (po wyborze adresu), zanim przyjdzie obrys. */
  przelec(centrum: { lat: number; lon: number }, zoom: number): void;
  /** Rysuje obrys domu (akcent) i opcjonalnie działkę (cienka linia); null czyści. */
  pokazObrys(obrys: Polygon | null, dzialka?: Polygon | null): void;
  /**
   * Tryb rysowania wielokąta po rogach (dotyk i mysz); po zamknięciu woła onGotowe,
   * a rogi zostają do przeciągania — każda zmiana woła onZmiana z nowym obrysem.
   */
  rysuj(onGotowe: (obrys: Polygon) => void, onZmiana: (obrys: Polygon) => void): void;
  /** Włącza przeciąganie rogów pokazanego obrysu (np. z ewidencji); zmiany idą do onZmiana. */
  edytujObrys(onZmiana: (obrys: Polygon) => void): void;
  przerwijRysowanie(): void;
  zniszcz(): void;
}
