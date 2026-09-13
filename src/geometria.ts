import type { Polygon } from 'geojson';

/**
 * Geometria płaska w EPSG:2180 (PL-1992, metry) — port formuł z MIRR
 * (app/services/geo/epsg2180.rb, geometria.rb). Obwód i rzut liczymy w przeglądarce,
 * bo przy rysowaniu ręcznym serwer nie widzi wielokąta. Parytet z Ruby pilnuje test
 * na budynku 142801_1.0001.198.1_BUD.
 */
export type Punkt2180 = [number, number];
export type LonLat = [number, number];

const A = 6378137.0;
const F = 1 / 298.257222101;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);
const LON0 = 19.0;
const K0 = 0.9993;
const FE = 500000.0;
const FN = -5300000.0;
const RAD = Math.PI / 180;

/** lon/lat (stopnie) → [easting, northing] w metrach. */
export function doEpsg2180(lon: number, lat: number): Punkt2180 {
  const phi = lat * RAD;
  const lam = (lon - LON0) * RAD;
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const nn = A / Math.sqrt(1 - E2 * sin * sin);
  const t = Math.tan(phi) ** 2;
  const c = EP2 * cos * cos;
  const a = lam * cos;
  const e4 = E2 * E2;
  const e6 = e4 * E2;
  const m =
    A *
    ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi));
  const e = FE + K0 * nn * (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5) / 120);
  const n =
    FN +
    K0 *
      (m +
        nn *
          Math.tan(phi) *
          ((a * a) / 2 +
            ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 +
            ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6) / 720));
  return [e, n];
}

/** Pierścień GeoJSON (lon/lat) → wierzchołki w metrach, bez powtórzonego końca. */
export function zGeoJson(poly: Polygon | null | undefined): LonLat[] {
  const ring = (poly?.coordinates?.[0] ?? []).map(([lon, lat]) => [lon, lat] as LonLat);
  if (ring.length > 1) {
    const [p, o] = [ring[0], ring[ring.length - 1]];
    if (p[0] === o[0] && p[1] === o[1]) ring.pop();
  }
  return ring;
}

/** Wierzchołki lon/lat (bez zamknięcia) → GeoJSON Polygon z zamkniętym pierścieniem. */
export function doGeoJson(ring: LonLat[]): Polygon {
  const zamkniety = ring.length ? [...ring, ring[0]] : [];
  return { type: 'Polygon', coordinates: [zamkniety.map(([lon, lat]) => [lon, lat])] };
}

function wMetrach(ring: LonLat[]): Punkt2180[] {
  return ring.map(([lon, lat]) => doEpsg2180(lon, lat));
}

/** Pole rzutu w m² (wzór Gaussa) z wierzchołków lon/lat. */
export function rzutM2(ring: LonLat[]): number {
  const pts = wMetrach(ring);
  if (pts.length < 3) return 0;
  let suma = 0;
  for (let i = 0; i < pts.length; i++) {
    const [e1, n1] = pts[i];
    const [e2, n2] = pts[(i + 1) % pts.length];
    suma += e1 * n2 - e2 * n1;
  }
  return Math.abs(suma) / 2;
}

/** Obwód w metrach (z domknięciem) z wierzchołków lon/lat. */
export function obwodM(ring: LonLat[]): number {
  const pts = wMetrach(ring);
  if (pts.length < 2) return 0;
  let suma = 0;
  for (let i = 0; i < pts.length; i++) {
    const [e1, n1] = pts[i];
    const [e2, n2] = pts[(i + 1) % pts.length];
    suma += Math.hypot(e2 - e1, n2 - n1);
  }
  return suma;
}

/** Środek pierścienia (średnia wierzchołków) do centrowania mapy. */
export function srodek(ring: LonLat[]): LonLat | null {
  if (!ring.length) return null;
  const s = ring.reduce((acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat], [0, 0]);
  return [s[0] / ring.length, s[1] / ring.length];
}
