import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { Polygon } from 'geojson';
import type { Api } from './api';
import { obwodM, rzutM2, zGeoJson } from './geometria';
import type { AdapterMapy } from './mapa/adapter';
import { opisKondygnacji, wstaw } from './teksty';
import { scalDzialke } from './dzialka';
import { usePozwolenie } from './pozwolenie';
import { PUSTA, zlozWynik } from './wynik';
import type { Adres, DodatkiKroku, DzialkaZListy, LiniaPanelu, OdpowiedzBudynek, Teksty, WynikKrokuAdresu, ZrodloPunktu } from './typy';

type Props = {
  api: Api;
  adres: Adres;
  teksty: Teksty;
  wysokoscKondygnacji: number;
  linia?: (czesciowy: Pick<WynikKrokuAdresu, 'obwod_m' | 'rzut_m2' | 'kondygnacje'>) => LiniaPanelu | null;
  /** Mapa zamontowana przez rodzica (KrokAdresu); null w trybie bez mapy. */
  adapterRef: RefObject<AdapterMapy | null>;
  /** false = bez mapy: dane zbieramy, ale nie prosimy o potwierdzenie obrysu (Grey House). */
  pokazMape: boolean;
  onGotowe: (wynik: WynikKrokuAdresu, dodatki?: DodatkiKroku) => void;
  /** Od v0.3.0: skąd punkt (adres / pinezka / numer działki). Dla pinezki i numeru budynek pytany bez adresu. */
  zrodloPunktu?: ZrodloPunktu;
  /** Od v0.3.0: działka wybrana z listy po numerze; wygrywa z działką z ULDK po punkcie. */
  wybrana?: DzialkaZListy | null;
  /** Od v0.3.0: po „dalej” czekaj na pozwolenie i oddaj je w drugim argumencie onGotowe. */
  sprawdzPozwolenie?: boolean;
  onPomin: (powod?: string) => void;
  onWstecz: () => void;
};

type Stan = 'laduje' | 'ewidencja' | 'brak' | 'rysowanie' | 'narysowane';

export { zlozWynik } from './wynik';

/**
 * Część „po wyborze adresu”: pobiera dane budynku, kładzie obrys na mapę rodzica,
 * pokazuje panel (obwód, rzut, kondygnacje z „Popraw”), rysowanie po rogach i przyciski.
 */
export function EkranMapy({ api, adres, teksty, linia, adapterRef, pokazMape, onGotowe, onPomin, onWstecz, zrodloPunktu = 'adres', wybrana = null, sprawdzPozwolenie = false }: Props) {
  const [stan, setStan] = useState<Stan>('laduje');
  const [dane, setDane] = useState<OdpowiedzBudynek>(PUSTA);
  const [obrys, setObrys] = useState<Polygon | null>(null);
  const [zrodloObrysu, setZrodloObrysu] = useState<WynikKrokuAdresu['zrodlo_obrysu']>('brak');
  const [kondygnacje, setKondygnacje] = useState<number | null>(null);
  const [zrodloKondygnacji, setZrodloKondygnacji] = useState<WynikKrokuAdresu['zrodlo_kondygnacji']>(null);
  const [poprawiam, setPoprawiam] = useState(false);
  const [czekam, setCzekam] = useState(false);
  // Znacznik trwającego czekania na pozwolenie; każde wycofanie go unieważnia, więc spóźniony wynik nie jest oddawany.
  const oczekiwanie = useRef(0);

  function anulujOczekiwanie() {
    oczekiwanie.current += 1;
    setCzekam(false);
  }

  useEffect(() => {
    let aktywny = true;
    setStan('laduje');
    setCzekam(false);
    // Pinezka i numer działki nie mają adresu: budynek pytany samym punktem (bez trzeciego argumentu, pułapka 4).
    const zapytanie =
      zrodloPunktu === 'adres'
        ? api.budynek(adres.lat, adres.lon, { miasto: adres.miasto, ulica: adres.ulica, numer: adres.numer })
        : api.budynek(adres.lat, adres.lon);
    zapytanie
      .then((odp) => {
        if (!aktywny) return;
        const d: OdpowiedzBudynek = { ...odp, dzialka: scalDzialke(odp.dzialka, wybrana) };
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
        if (!aktywny) return;
        // Wybrana z listy działka zostaje, nawet gdy ewidencja budynków nie odpowiada.
        if (wybrana) {
          const d = { ...PUSTA, dzialka: scalDzialke(null, wybrana) };
          setDane(d);
          adapterRef.current?.pokazObrys(null, d.dzialka?.obrys ?? null);
        }
        setStan('brak');
      });
    return () => {
      aktywny = false;
      oczekiwanie.current += 1;
      adapterRef.current?.przerwijRysowanie();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adres.lat, adres.lon]);

  const czekajNaPozwolenie = usePozwolenie(api, dane.dzialka?.identyfikator ?? null, sprawdzPozwolenie && stan !== 'laduje');

  const ring = useMemo(() => (obrys ? zGeoJson(obrys) : []), [obrys]);
  const obwod = obrys ? Math.round(obwodM(ring) * 10) / 10 : null;
  const rzut = obrys ? Math.round(rzutM2(ring) * 10) / 10 : null;
  const liniaDodatkowa = linia ? linia({ obwod_m: obwod, rzut_m2: rzut, kondygnacje }) : null;
  const pytamOKondygnacje = kondygnacje === null || poprawiam;

  function zacznijRysowac() {
    anulujOczekiwanie();
    setPoprawiam(false);
    setObrys(null);
    setStan('rysowanie');
    adapterRef.current?.pokazObrys(null, dane.dzialka?.obrys ?? null);
    adapterRef.current?.rysuj(
      (narysowany) => {
        // Warstwę trzyma adapter (rogi zostają do przeciągania) — bez pokazObrys, które by ją podmieniło.
        setObrys(narysowany);
        setZrodloObrysu('reczne');
        setStan('narysowane');
      },
      (zmieniony) => setObrys(zmieniony)
    );
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

  // Zmiana kondygnacji w trakcie czekania na pozwolenie unieważnia wynik złożony ze starą liczbą.
  function ustawKondygnacje(n: number) {
    anulujOczekiwanie();
    setKondygnacje(n);
    setZrodloKondygnacji('reczne');
    setPoprawiam(false);
  }

  function gotowe() {
    const wynik = zlozWynik(
      adres,
      dane,
      { obrys, zrodlo_obrysu: obrys ? zrodloObrysu : 'brak', kondygnacje, zrodlo_kondygnacji: zrodloKondygnacji },
      { zrodlo_punktu: zrodloPunktu, punkt: { lat: adres.lat, lon: adres.lon } }
    );
    // Bez sprawdzania pozwolenia: synchronicznie i jednym argumentem, jak v0.2 (pułapka 2).
    if (!sprawdzPozwolenie) {
      onGotowe(wynik);
      return;
    }
    const moje = ++oczekiwanie.current;
    setCzekam(true);
    void czekajNaPozwolenie().then((pozwolenie) => {
      if (oczekiwanie.current === moje) onGotowe(wynik, { pozwolenie });
    });
  }

  function poprawKondygnacje() {
    anulujOczekiwanie();
    setPoprawiam(true);
  }

  function wstecz() {
    anulujOczekiwanie();
    onWstecz();
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
      <div className="ka-ekran-mapa ka-bez-mapy">
        {stan === 'laduje' ? <p className="ka-laduje" aria-live="polite">{teksty.szukamy}</p> : kondygnacje === null ? (
          <>
            {wyborKondygnacji}
            <div className="ka-nawigacja">
              <button type="button" className="ka-wstecz" onClick={wstecz}>← {teksty.wstecz}</button>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ka-ekran-mapa">
      {stan === 'ewidencja' && <p className="ka-podpowiedz">{wstaw(teksty.obrysZEwidencji, { adres: adres.tekst })}</p>}
      {stan === 'laduje' && <p className="ka-podpowiedz" aria-live="polite">{teksty.szukamy}</p>}
      {stan === 'brak' && <p className="ka-podpowiedz">{teksty.brakObrysu}</p>}
      {stan === 'rysowanie' && <p className="ka-podpowiedz">{teksty.rysowanie}</p>}
      {stan === 'narysowane' && <p className="ka-podpowiedz">{teksty.przeciagnijRogi}</p>}

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
              <button type="button" className="ka-link ka-popraw" onClick={poprawKondygnacje}>{teksty.popraw}</button>
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
            <button type="button" className="ka-btn ka-btn-glowny" disabled={kondygnacje === null || czekam} onClick={gotowe}>{czekam ? teksty.sprawdzamy : teksty.zgadzaSie}</button>
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
            <button type="button" className="ka-btn ka-btn-glowny" disabled={kondygnacje === null || czekam} onClick={gotowe}>{czekam ? teksty.sprawdzamy : teksty.dalej}</button>
            <button type="button" className="ka-btn ka-btn-drugi" onClick={zacznijRysowac}>{teksty.zaznaczeSam}</button>
          </>
        )}
        <button type="button" className="ka-wstecz" onClick={wstecz}>← {teksty.wstecz}</button>
      </div>
      {stan === 'ewidencja' && <p className="ka-stopka">{teksty.notaMapa}</p>}
    </div>
  );
}
