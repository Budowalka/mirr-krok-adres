/**
 * Dane przykładowe dla demo bez backendu (GEO_MOCK). Prawdziwe są tylko: Pruszków 142102_1.0010.64/4
 * z wpisem w rejestrze pozwoleń (parytet ze specu elektryka 6.1 i 6.2, dane publiczne, bez danych osobowych)
 * oraz obrys budynku 198.1 w Sochaczewie (parytet ze specu 09-13). Obrysy działek, pozostałe gminy
 * i numer GUNB są FIKCYJNE, tylko do pokazu.
 */
type Punkt = { lat: number; lon: number };

const PRUSZKOW: Punkt = { lat: 52.182628, lon: 20.814037 };
const SOCHACZEW: Punkt = { lat: 52.2705286, lon: 20.2888357 };
const OBRYS_198 = {
  type: 'Polygon' as const,
  coordinates: [[
    [20.288892546, 52.270475483], [20.288916507, 52.270568667], [20.288865044, 52.270573546], [20.288869397, 52.270592206],
    [20.288822027, 52.27059668], [20.288817384, 52.270578114], [20.288778491, 52.270581686], [20.28875497, 52.270488497],
    [20.288892546, 52.270475483],
  ]],
};

/** Kwadrat ~36 × 36 m wokół punktu (działka przykładowa). */
function kwadrat(p: Punkt, polBokuM = 18) {
  const dLat = polBokuM / 111320;
  const dLon = polBokuM / (111320 * Math.cos((p.lat * Math.PI) / 180));
  const r = (x: number) => Math.round(x * 1e6) / 1e6;
  const a = [r(p.lon - dLon), r(p.lat - dLat)];
  const b = [r(p.lon + dLon), r(p.lat - dLat)];
  const c = [r(p.lon + dLon), r(p.lat + dLat)];
  const d = [r(p.lon - dLon), r(p.lat + dLat)];
  return { type: 'Polygon' as const, coordinates: [[a, b, c, d, a]] };
}

function blisko(a: Punkt, b: Punkt) {
  return Math.abs(a.lat - b.lat) < 0.0015 && Math.abs(a.lon - b.lon) < 0.0025;
}

const POZWOLENIE_PRUSZKOW = {
  numer_gunb: 'DEMO-0001',
  data_decyzji: '2026-01-12',
  rodzaj: 'budowa nowego',
  nazwa_zamierzenia: 'BUDOWA BUDYNKU MIESZKALNEGO JEDNORODZINNEGO DWULOKALOWEGO',
  kubatura: 1428.59,
  units: 2,
};

const LISTA_10_64_4 = [
  { identyfikator: '142102_1.0010.64/4', gmina: 'Pruszków', obreb: '0010', numer: '64/4', punkt: PRUSZKOW },
  { identyfikator: 'DEMO_1.0010.64/4', gmina: 'Gmina przykładowa A', obreb: '0010', numer: '64/4', punkt: { lat: 52.10, lon: 20.60 } },
  { identyfikator: 'DEMO_2.0010.64/4', gmina: 'Gmina przykładowa B', obreb: '0010', numer: '64/4', punkt: { lat: 52.30, lon: 20.90 } },
  { identyfikator: 'DEMO_3.0010.64/4', gmina: 'Gmina przykładowa C', obreb: '0010', numer: '64/4', punkt: { lat: 51.90, lon: 21.10 } },
  { identyfikator: 'DEMO_4.0010.64/4', gmina: 'Gmina przykładowa D', obreb: '0010', numer: '64/4', punkt: { lat: 52.40, lon: 20.30 } },
].map((d) => ({ ...d, obrys: kwadrat(d.punkt) }));

const BEZ_BUDYNKU = {
  obrys: null, zrodlo_obrysu: 'brak', obwod_m: null, rzut_m2: null, kondygnacje: null, zrodlo_kondygnacji: null,
  identyfikator_egib: null, identyfikator_uldk: null, budynek: null, inne_budynki_na_dzialce: [], teryt: null,
};

function budynek(p: Punkt) {
  if (blisko(p, PRUSZKOW)) {
    return { ...BEZ_BUDYNKU, dzialka: { identyfikator: '142102_1.0010.64/4', numer: '64/4', obreb: '0010', gmina: 'Pruszków', powiat: 'pruszkowski', wojewodztwo: 'mazowieckie', powierzchnia_m2: 1296, obrys: kwadrat(PRUSZKOW) }, powiat: { teryt: '1421', w_bazie: true } };
  }
  if (blisko(p, SOCHACZEW)) {
    return {
      ...BEZ_BUDYNKU, obrys: OBRYS_198, zrodlo_obrysu: 'ewidencja', obwod_m: 44.2, rzut_m2: 106.6, kondygnacje: 1, zrodlo_kondygnacji: 'ewidencja',
      identyfikator_egib: '142801_1.0001.198.1_BUD', budynek: { funkcja: 'budynek jednorodzinny', funkcja_ogolna: 'budynki mieszkalne', kod_kst: '110', kategoria_istnienia: 'eksploatowany', zrodlo_geometrii: 'EGiB', wersja_danych: null },
      dzialka: { identyfikator: '142801_1.0001.198/2', numer: '198/2', obreb: 'Chodaków', gmina: 'Sochaczew (miasto)', powiat: 'sochaczewski', wojewodztwo: 'mazowieckie', powierzchnia_m2: 1296, obrys: kwadrat(SOCHACZEW) },
      powiat: { teryt: '1428', w_bazie: true },
    };
  }
  return { ...BEZ_BUDYNKU, dzialka: { identyfikator: 'DEMO_9.0001.1', numer: '1', obreb: '0001', gmina: 'Gmina przykładowa', powiat: null, wojewodztwo: null, powierzchnia_m2: 1296, obrys: kwadrat(p) }, powiat: { teryt: null, w_bazie: false } };
}

export function odpowiedzMock(akcja: string, q: URLSearchParams): unknown {
  const punkt = { lat: Number(q.get('lat')), lon: Number(q.get('lon')) };
  switch (akcja) {
    case 'podpowiedzi':
      return {
        podpowiedzi: [
          { rodzaj: 'adres', tekst: 'Zwierzyniecka 5, Sochaczew 96-500', ulica: 'Zwierzyniecka', numer: '5', kod: '96-500', miasto: 'Sochaczew', ...SOCHACZEW },
          { rodzaj: 'adres', tekst: 'Przykładowa 1, Pruszków 05-800', ulica: 'Przykładowa', numer: '1', kod: '05-800', miasto: 'Pruszków', ...PRUSZKOW },
        ],
      };
    case 'budynek':
      return budynek(punkt);
    case 'zasieg':
      return { teryt: null, w_bazie: false };
    case 'dzialka':
      return { dzialki: (q.get('obreb') ?? '').replace(/^0+/, '') === '10' && q.get('numer') === '64/4' ? LISTA_10_64_4 : [] };
    case 'pozwolenie':
      return { pozwolenie: q.get('dzialka') === '142102_1.0010.64/4' ? POZWOLENIE_PRUSZKOW : null };
    default:
      return null;
  }
}
