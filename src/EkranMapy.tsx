import { useEffect, useMemo, useRef, useState } from 'react';
import type { Polygon } from 'geojson';
import type { Api } from './api';
import { obwodM, rzutM2, zGeoJson } from './geometria';
import type { AdapterMapy } from './mapa/adapter';
import { opisKondygnacji, wstaw } from './teksty';
import type { Adres, LiniaPanelu, OdpowiedzBudynek, Teksty, WynikKrokuAdresu, ZrodloKafli } from './typy';

type Props = {
  api: Api;
  adres: Adres;
  teksty: Teksty;
  numerKroku?: { x: number; y: number };
  wysokoscKondygnacji: number;
  linia?: (czesciowy: Pick<WynikKrokuAdresu, 'obwod_m' | 'rzut_m2' | 'kondygnacje'>) => LiniaPanelu | null;
  adapter: () => AdapterMapy;
  zrodloKafli: ZrodloKafli;
  /** false = bez mapy: dane zbieramy, ale nie prosimy o potwierdzenie obrysu (Grey House). */
  pokazMape: boolean;
  onGotowe: (wynik: WynikKrokuAdresu) => void;
  onPomin: (powod?: string) => void;
  onWstecz: () => void;
};

type Stan = 'laduje' | 'ewidencja' | 'brak' | 'rysowanie' | 'narysowane';

const PUSTA: OdpowiedzBudynek = {
  obrys: null, zrodlo_obrysu: 'brak', obwod_m: null, rzut_m2: null, kondygnacje: null, zrodlo_kondygnacji: null,
  identyfikator_egib: null, identyfikator_uldk: null, budynek: null, dzialka: null, inne_budynki_na_dzialce: [],
  powiat: { teryt: null, w_bazie: false }, teryt: null,
};

export function zlozWynik(
  adres: Adres,
  dane: OdpowiedzBudynek,
  wybor: { obrys: Polygon | null; zrodlo_obrysu: WynikKrokuAdresu['zrodlo_obrysu']; kondygnacje: number | null; zrodlo_kondygnacji: WynikKrokuAdresu['zrodlo_kondygnacji'] }
): WynikKrokuAdresu {
  const reczne = wybor.zrodlo_obrysu === 'reczne';
  const ring = wybor.obrys ? zGeoJson(wybor.obrys) : [];
  const gmina = dane.dzialka?.gmina ?? null;
  return {
    adres: {
      ...adres,
      gmina,
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
  };
}

/** Krok 2: dom na mapie — obrys z ewidencji do potwierdzenia albo rysowanie po rogach; kondygnacje z ewidencji z „Popraw". */
export function EkranMapy({ api, adres, teksty, numerKroku, wysokoscKondygnacji, linia, adapter, zrodloKafli, pokazMape, onGotowe, onPomin, onWstecz }: Props) {
  const [stan, setStan] = useState<Stan>('laduje');
  const [dane, setDane] = useState<OdpowiedzBudynek>(PUSTA);
  const [obrys, setObrys] = useState<Polygon | null>(null);
  const [zrodloObrysu, setZrodloObrysu] = useState<WynikKrokuAdresu['zrodlo_obrysu']>('brak');
  const [kondygnacje, setKondygnacje] = useState<number | null>(null);
  const [zrodloKondygnacji, setZrodloKondygnacji] = useState<WynikKrokuAdresu['zrodlo_kondygnacji']>(null);
  const [poprawiam, setPoprawiam] = useState(false);
  const mapaRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<AdapterMapy | null>(null);
  const zamontowano = useRef(false);

  // Mapa montuje się raz; obrys nakładamy osobno, gdy przyjdzie z API albo z rysowania.
  useEffect(() => {
    if (!pokazMape || !mapaRef.current || zamontowano.current) return;
    zamontowano.current = true;
    const a = adapter();
    adapterRef.current = a;
    void a.zamontuj(mapaRef.current, { centrum: { lat: adres.lat, lon: adres.lon }, zrodloKafli });
    return () => {
      a.zniszcz();
      adapterRef.current = null;
      zamontowano.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokazMape]);

  useEffect(() => {
    let aktywny = true;
    api
      .budynek(adres.lat, adres.lon, { miasto: adres.miasto, ulica: adres.ulica, numer: adres.numer })
      .then((d) => {
        if (!aktywny) return;
        setDane(d);
        setKondygnacje(d.kondygnacje);
        setZrodloKondygnacji(d.kondygnacje === null ? null : 'ewidencja');
        if (d.obrys && d.zrodlo_obrysu === 'ewidencja') {
          setObrys(d.obrys);
          setZrodloObrysu('ewidencja');
          setStan('ewidencja');
          adapterRef.current?.pokazObrys(d.obrys, d.dzialka?.obrys ?? null);
        } else {
          setStan('brak');
          adapterRef.current?.pokazObrys(null, d.dzialka?.obrys ?? null);
        }
      })
      .catch(() => {
        if (aktywny) setStan('brak');
      });
    return () => {
      aktywny = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adres.lat, adres.lon]);

  const ring = useMemo(() => (obrys ? zGeoJson(obrys) : []), [obrys]);
  const obwod = obrys ? Math.round(obwodM(ring) * 10) / 10 : null;
  const rzut = obrys ? Math.round(rzutM2(ring) * 10) / 10 : null;
  const liniaDodatkowa = linia ? linia({ obwod_m: obwod, rzut_m2: rzut, kondygnacje }) : null;
  const pytamOKondygnacje = kondygnacje === null || poprawiam;

  function zacznijRysowac() {
    setPoprawiam(false);
    setObrys(null);
    setStan('rysowanie');
    adapterRef.current?.pokazObrys(null, dane.dzialka?.obrys ?? null);
    adapterRef.current?.rysuj((narysowany) => {
      setObrys(narysowany);
      setZrodloObrysu('reczne');
      adapterRef.current?.pokazObrys(narysowany, dane.dzialka?.obrys ?? null);
      setStan('narysowane');
    });
  }

  function cofnijRysowanie() {
    adapterRef.current?.przerwijRysowanie();
    if (dane.obrys && dane.zrodlo_obrysu === 'ewidencja') {
      setObrys(dane.obrys);
      setZrodloObrysu('ewidencja');
      adapterRef.current?.pokazObrys(dane.obrys, dane.dzialka?.obrys ?? null);
      setStan('ewidencja');
    } else {
      setStan('brak');
    }
  }

  function ustawKondygnacje(n: number) {
    setKondygnacje(n);
    setZrodloKondygnacji('reczne');
    setPoprawiam(false);
  }

  function gotowe() {
    onGotowe(zlozWynik(adres, dane, { obrys, zrodlo_obrysu: obrys ? zrodloObrysu : 'brak', kondygnacje, zrodlo_kondygnacji: zrodloKondygnacji }));
  }

  // Tryb bez mapy (Grey House): dane zebrane, pytamy tylko o kondygnacje, gdy ewidencja ich nie zna.
  const zgloszono = useRef(false);
  useEffect(() => {
    if (pokazMape || stan === 'laduje' || zgloszono.current) return;
    if (kondygnacje !== null) {
      zgloszono.current = true;
      gotowe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokazMape, stan, kondygnacje]);

  const wyborKondygnacji = (
    <div className="ka-kondygnacje-pytanie">
      <p className="ka-pytanie">{teksty.ileKondygnacji}</p>
      <div className="ka-opcje">
        {teksty.kondygnacjeOpcje.map((etykieta, i) => (
          <button key={etykieta} type="button" className={kondygnacje === i + 1 ? 'ka-opcja ka-opcja-wybrana' : 'ka-opcja'} onClick={() => ustawKondygnacje(i + 1)}>
            {etykieta}
          </button>
        ))}
      </div>
    </div>
  );

  if (!pokazMape) {
    return (
      <div className="ka ka-ekran ka-ekran-mapa ka-bez-mapy">
        {stan === 'laduje' ? <p className="ka-laduje" aria-live="polite">{teksty.szukamy}</p> : kondygnacje === null ? (
          <>
            {wyborKondygnacji}
            <div className="ka-nawigacja">
              <button type="button" className="ka-wstecz" onClick={onWstecz}>← {teksty.wstecz}</button>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ka ka-ekran ka-ekran-mapa">
      {numerKroku && <div className="ka-krok">{wstaw(teksty.krok, { x: numerKroku.x, y: numerKroku.y })}</div>}
      <h1 className="ka-naglowek">{teksty.naglowekMapa}</h1>
      {stan === 'ewidencja' && <p className="ka-podpowiedz">{wstaw(teksty.obrysZEwidencji, { adres: adres.tekst })}</p>}
      {stan === 'laduje' && <p className="ka-podpowiedz" aria-live="polite">{teksty.szukamy}</p>}
      {stan === 'brak' && <p className="ka-podpowiedz">{teksty.brakObrysu}</p>}
      {stan === 'rysowanie' && <p className="ka-podpowiedz">{teksty.rysowanie}</p>}

      <div className="ka-mapa" ref={mapaRef} role="application" aria-label="Mapa z domem" />

      {(stan === 'ewidencja' || stan === 'narysowane') && obrys && (
        <div className="ka-panel">
          <div className="ka-panel-wiersz">
            <span className="ka-panel-etykieta">{teksty.obwod}</span>
            <span className="ka-panel-wartosc">{obwod?.toLocaleString('pl-PL')} m</span>
            <span className="ka-panel-opis">{teksty.zObrysu}</span>
          </div>
          <div className="ka-panel-wiersz">
            <span className="ka-panel-etykieta">{teksty.rzut}</span>
            <span className="ka-panel-wartosc">{rzut?.toLocaleString('pl-PL')} m²</span>
          </div>
          {!pytamOKondygnacje && (
            <div className="ka-panel-wiersz">
              <span className="ka-panel-etykieta">{teksty.kondygnacje}</span>
              <span className="ka-panel-wartosc">{kondygnacje}, {opisKondygnacji(kondygnacje)}</span>
              <button type="button" className="ka-link ka-popraw" onClick={() => setPoprawiam(true)}>{teksty.popraw}</button>
            </div>
          )}
          {pytamOKondygnacje && wyborKondygnacji}
          {liniaDodatkowa && kondygnacje !== null && (
            <div className="ka-panel-wiersz ka-panel-linia">
              <span className="ka-panel-etykieta">{liniaDodatkowa.etykieta}</span>
              <span className="ka-panel-wartosc">{liniaDodatkowa.wartosc}</span>
              {liniaDodatkowa.opis && <span className="ka-panel-opis">{liniaDodatkowa.opis}</span>}
            </div>
          )}
        </div>
      )}

      <div className="ka-nawigacja ka-nawigacja-mapa">
        {stan === 'ewidencja' && (
          <>
            <button type="button" className="ka-btn ka-btn-glowny" disabled={kondygnacje === null} onClick={gotowe}>{teksty.zgadzaSie}</button>
            <button type="button" className="ka-btn ka-btn-drugi" onClick={zacznijRysowac}>{teksty.zaznaczeSam}</button>
          </>
        )}
        {stan === 'brak' && (
          <>
            <button type="button" className="ka-btn ka-btn-glowny" onClick={zacznijRysowac}>{teksty.zaznaczNaMapie}</button>
            <button type="button" className="ka-link ka-pomin" onClick={() => onPomin()}>{teksty.pomin}</button>
          </>
        )}
        {stan === 'rysowanie' && (
          <button type="button" className="ka-btn ka-btn-drugi" onClick={cofnijRysowanie}>{teksty.cofnij}</button>
        )}
        {stan === 'narysowane' && (
          <>
            <button type="button" className="ka-btn ka-btn-glowny" disabled={kondygnacje === null} onClick={gotowe}>{teksty.dalej}</button>
            <button type="button" className="ka-btn ka-btn-drugi" onClick={zacznijRysowac}>{teksty.zaznaczeSam}</button>
          </>
        )}
        <button type="button" className="ka-wstecz" onClick={onWstecz}>← {teksty.wstecz}</button>
      </div>
      {stan === 'ewidencja' && <p className="ka-stopka">{teksty.notaMapa}</p>}
    </div>
  );
}
