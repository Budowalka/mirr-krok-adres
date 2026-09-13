import type { Polygon } from 'geojson';
import type { AdapterMapy } from './adapter';

/** Adapter bez mapy: zapamiętuje wywołania, a test/demo zamyka rysowanie przez `zakonczRysowanie`. */
export class FalszywyAdapterMapy implements AdapterMapy {
  zamontowany = false;
  obrys: Polygon | null = null;
  dzialka: Polygon | null = null;
  rysowanie: ((obrys: Polygon) => void) | null = null;
  zmiana: ((obrys: Polygon) => void) | null = null;
  edycjaWlaczona = false;
  zniszczony = false;

  async zamontuj(el: HTMLElement) {
    this.zamontowany = true;
    el.setAttribute('data-mapa', 'falszywa');
  }
  pokazObrys(obrys: Polygon | null, dzialka?: Polygon | null) {
    this.obrys = obrys;
    this.dzialka = dzialka ?? null;
  }
  rysuj(onGotowe: (obrys: Polygon) => void, onZmiana: (obrys: Polygon) => void) {
    this.rysowanie = onGotowe;
    this.zmiana = onZmiana;
  }
  edytujObrys(onZmiana: (obrys: Polygon) => void) {
    this.edycjaWlaczona = true;
    this.zmiana = onZmiana;
  }
  przerwijRysowanie() {
    this.rysowanie = null;
    this.zmiana = null;
    this.edycjaWlaczona = false;
  }
  zniszcz() {
    this.zniszczony = true;
  }
  /** Pomocnik testowy: „użytkownik obrysował dom”. */
  zakonczRysowanie(obrys: Polygon) {
    const cb = this.rysowanie;
    this.rysowanie = null;
    this.obrys = obrys;
    this.edycjaWlaczona = true;
    cb?.(obrys);
  }
  /** Pomocnik testowy: „użytkownik przeciągnął róg”. */
  przesunRog(obrys: Polygon) {
    this.obrys = obrys;
    this.zmiana?.(obrys);
  }
}
