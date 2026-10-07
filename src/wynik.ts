import type { Polygon } from 'geojson';
import { opisDzialki } from './dzialka';
import { obwodM, rzutM2, zGeoJson } from './geometria';
import type { Adres, OdpowiedzBudynek, Punkt, WynikKrokuAdresu, ZrodloPunktu } from './typy';

export const PUSTA: OdpowiedzBudynek = {
  obrys: null, zrodlo_obrysu: 'brak', obwod_m: null, rzut_m2: null, kondygnacje: null, zrodlo_kondygnacji: null,
  identyfikator_egib: null, identyfikator_uldk: null, budynek: null, dzialka: null, inne_budynki_na_dzialce: [],
  powiat: { teryt: null, w_bazie: false }, teryt: null,
};

export type WyborObrysu = {
  obrys: Polygon | null;
  zrodlo_obrysu: WynikKrokuAdresu['zrodlo_obrysu'];
  kondygnacje: number | null;
  zrodlo_kondygnacji: WynikKrokuAdresu['zrodlo_kondygnacji'];
};

export type KontekstWyniku = { zrodlo_punktu: ZrodloPunktu; punkt: Punkt };

/** Składa kontrakt WynikKrokuAdresu (spec D3 + v0.3.0). Bez kontekstu zachowuje się jak v0.2.2. */
export function zlozWynik(adres: Adres, dane: OdpowiedzBudynek, wybor: WyborObrysu, kontekst?: KontekstWyniku): WynikKrokuAdresu {
  const zrodloPunktu = kontekst?.zrodlo_punktu ?? 'adres';
  const punkt = kontekst?.punkt ?? { lat: adres.lat, lon: adres.lon };
  const reczne = wybor.zrodlo_obrysu === 'reczne';
  const ring = wybor.obrys ? zGeoJson(wybor.obrys) : [];
  // Pinezka i numer działki nie mają ulicy: opis i miejscowość z działki (decyzja P2).
  const zDzialki = zrodloPunktu !== 'adres' && dane.dzialka ? { tekst: opisDzialki(dane.dzialka), miasto: dane.dzialka.gmina ?? adres.miasto } : {};
  return {
    adres: {
      ...adres,
      ...zDzialki,
      gmina: dane.dzialka?.gmina ?? null,
      powiat: dane.dzialka?.powiat ?? null,
      wojewodztwo: dane.dzialka?.wojewodztwo ?? null,
      teryt_gmina: dane.teryt?.teryt_gmina ?? null,
      simc: dane.teryt?.simc ?? null,
      ulic: dane.teryt?.ulic ?? null,
      kod: adres.kod ?? dane.teryt?.kod ?? null,
    },
    obrys: wybor.obrys,
    zrodlo_obrysu: wybor.zrodlo_obrysu,
    obwod_m: wybor.obrys ? Math.round(obwodM(ring) * 10) / 10 : null,
    rzut_m2: wybor.obrys ? Math.round(rzutM2(ring) * 10) / 10 : null,
    kondygnacje: wybor.kondygnacje,
    zrodlo_kondygnacji: wybor.kondygnacje === null ? null : wybor.zrodlo_kondygnacji,
    identyfikator_egib: reczne ? null : dane.identyfikator_egib,
    budynek: reczne ? null : dane.budynek,
    dzialka: dane.dzialka,
    inne_budynki_na_dzialce: reczne ? [] : dane.inne_budynki_na_dzialce,
    powiat: dane.powiat,
    zrodlo_punktu: zrodloPunktu,
    punkt,
  };
}
