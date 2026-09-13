import { describe, expect, it } from 'vitest';
import { doEpsg2180, doGeoJson, obwodM, rzutM2, zGeoJson } from '../geometria';

// Wielokąt budynku 142801_1.0001.198.1_BUD (Zwierzyniecka 5, Sochaczew) w lon/lat,
// policzony w MIRR przez Geo::Geometria.do_geojson z posList paczki BDOT10k 1428.
// Parytet z Ruby: 106,67 m² i 44,16 m (test/services/geo/geometria_test.rb).
const PIERSCIEN_198: [number, number][] = [
  [20.288892546, 52.270475483],
  [20.288916507, 52.270568667],
  [20.288865044, 52.270573546],
  [20.288869397, 52.270592206],
  [20.288822027, 52.27059668],
  [20.288817384, 52.270578114],
  [20.288778491, 52.270581686],
  [20.28875497, 52.270488497],
  [20.288892546, 52.270475483],
];

describe('geometria', () => {
  it('rzutuje lon/lat do EPSG:2180 zgodnie z Ruby (punkt Photon dla Zwierzynieckiej 5)', () => {
    const [e, n] = doEpsg2180(20.2888357, 52.2705286);
    expect(e).toBeCloseTo(587916.68, 1);
    expect(n).toBeCloseTo(490171.96, 1);
  });

  it('liczy rzut i obwód budynku 198.1 jak MIRR (106,6 m², 44,2 m)', () => {
    expect(rzutM2(PIERSCIEN_198)).toBeCloseTo(106.67, 0);
    expect(Math.abs(rzutM2(PIERSCIEN_198) - 106.67)).toBeLessThan(0.2);
    expect(Math.abs(obwodM(PIERSCIEN_198) - 44.16)).toBeLessThan(0.1);
  });

  it('zGeoJson zdejmuje zamknięcie pierścienia, doGeoJson je dokłada', () => {
    const poly = { type: 'Polygon' as const, coordinates: [PIERSCIEN_198] };
    const ring = zGeoJson(poly);
    expect(ring).toHaveLength(8);
    const zPowrotem = doGeoJson(ring);
    expect(zPowrotem.coordinates[0]).toHaveLength(9);
    expect(zPowrotem.coordinates[0][0]).toEqual(zPowrotem.coordinates[0][8]);
  });

  it('zdegenerowany wielokąt daje 0', () => {
    expect(rzutM2([])).toBe(0);
    expect(obwodM([[20, 52]])).toBe(0);
  });
});
