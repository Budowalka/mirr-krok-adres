// src/KrokAdresu.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { utworzApi } from './api';
import { adresZPunktu } from './dzialka';
import { EkranDzialki } from './EkranDzialki';
import { EkranMapy } from './EkranMapy';
import { PoleAdresu } from './PoleAdresu';
import { PoleDzialki } from './PoleDzialki';
import { WyborWejscia } from './WyborWejscia';
import type { AdapterMapy } from './mapa/adapter';
import { utworzAdapterLeaflet } from './mapa/leaflet';
import { DOMYSLNE_TEKSTY, wstaw } from './teksty';
import type { Adres, DzialkaZListy, KrokAdresuProps, Punkt, Wejscie, ZrodloPunktu } from './typy';

const POLSKA = { lat: 52.1, lon: 19.4 };
const ZOOM_OBSZAR = 12;
const ZOOM_POLSKA = 6;
const ZOOM_DOM = 18;
const WSZYSTKIE_WEJSCIA: Wejscie[] = ['adres', 'pinezka', 'numer_dzialki'];

/** Wskazane miejsce: adres (podpowiedź albo ręczny) albo adres zastępczy z pinezki lub numeru działki. */
type Miejsce = { adres: Adres; zrodlo: ZrodloPunktu; wybrana: DzialkaZListy | null };

/**
 * Krok adresu wielokrotnego użytku w jednym ekranie (wzór Roofr): mapa satelitarna od pierwszej sekundy,
 * miejsce wskazane adresem, pinezką albo numerem działki (od v0.3.0, prop `wejscia`), potem potwierdzenie
 * domu (`cel="budynek"`, jak v0.2) albo działki (`cel="dzialka"`). Wynik = kontrakt WynikKrokuAdresu.
 * Nic branżowego: elewację, metraż i kwoty liczy landing.
 */
export function KrokAdresu({
  api,
  bias,
  pokazMape = true,
  wysokoscKondygnacji = 3,
  linia,
  teksty,
  zrodloKafli = { typ: 'wmts' },
  numerKroku,
  wejscia,
  cel = 'budynek',
  sprawdzPozwolenie = false,
  szeroko = false,
  onGotowe,
  onPomin,
  onWstecz,
  adapterMapy,
}: KrokAdresuProps) {
  const [miejsce, setMiejsce] = useState<Miejsce | null>(null);
  const [tryb, setTryb] = useState<Wejscie | null>(null);
  const [pinezka, setPinezka] = useState<Punkt | null>(null);
  const [pinezkaMozliwa, setPinezkaMozliwa] = useState(false);
  const klient = useMemo(() => utworzApi(api), [api]);
  const t = useMemo(() => ({ ...DOMYSLNE_TEKSTY, ...(teksty ?? {}) }), [teksty]);
  const mapaRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<AdapterMapy | null>(null);
  const start = bias ?? POLSKA;
  const zoomStart = bias ? ZOOM_OBSZAR : ZOOM_POLSKA;

  // Mapa montuje się raz, od razu — widok na obszar działania firmy (bias) albo Polskę.
  useEffect(() => {
    if (!pokazMape || !mapaRef.current || adapterRef.current) return;
    const a = (adapterMapy ?? utworzAdapterLeaflet)();
    adapterRef.current = a;
    // Pinezka tylko z adapterem, który ją umie (własne adaptery z v0.2 nie mają tych metod, pułapka 3).
    setPinezkaMozliwa(typeof a.wybierzPunkt === 'function' && typeof a.pokazPinezke === 'function');
    void a.zamontuj(mapaRef.current, { centrum: start, zoom: zoomStart, zrodloKafli });
    return () => {
      a.zniszcz();
      adapterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokazMape]);

  // Zakładki: kolejność i pierwsza domyślna z `wejscia`; pinezka tylko z mapą i adapterem, który ją umie.
  const dostepne = useMemo<Wejscie[]>(() => {
    const chciane = (wejscia?.length ? wejscia : (['adres'] as Wejscie[])).filter((w, i, a) => WSZYSTKIE_WEJSCIA.includes(w) && a.indexOf(w) === i);
    const mozliwe = chciane.filter((w) => w !== 'pinezka' || (pokazMape && pinezkaMozliwa));
    return mozliwe.length ? mozliwe : ['adres'];
  }, [wejscia, pokazMape, pinezkaMozliwa]);
  const aktywne: Wejscie = tryb && dostepne.includes(tryb) ? tryb : dostepne[0];

  // Tryb pinezki: każde dotknięcie mapy przestawia pinezkę; wyłączany przy zmianie zakładki i po potwierdzeniu.
  useEffect(() => {
    const a = adapterRef.current;
    if (!pokazMape || miejsce || aktywne !== 'pinezka' || !a?.wybierzPunkt) return;
    a.wybierzPunkt((p) => {
      setPinezka(p);
      a.pokazPinezke?.(p);
    });
    return () => a.przerwijWybieranie?.();
  }, [aktywne, miejsce, pokazMape, pinezkaMozliwa]);

  function zmienTryb(w: Wejscie) {
    // Ponowne kliknięcie aktywnej zakładki nie zdejmuje postawionej pinezki.
    if (w === aktywne) return;
    adapterRef.current?.pokazPinezke?.(null);
    adapterRef.current?.pokazObrys(null, null);
    setPinezka(null);
    setTryb(w);
  }

  function wybierzAdres(a: Adres) {
    adapterRef.current?.przelec({ lat: a.lat, lon: a.lon }, ZOOM_DOM);
    setMiejsce({ adres: a, zrodlo: 'adres', wybrana: null });
  }

  function potwierdzPinezke() {
    if (!pinezka) return;
    adapterRef.current?.przerwijWybieranie?.();
    adapterRef.current?.przelec(pinezka, ZOOM_DOM);
    setMiejsce({ adres: adresZPunktu(pinezka, null, t.punktNaMapie), zrodlo: 'pinezka', wybrana: null });
  }

  function wybierzDzialke(d: DzialkaZListy) {
    adapterRef.current?.przelec(d.punkt, ZOOM_DOM);
    adapterRef.current?.pokazObrys(null, d.obrys);
    setMiejsce({ adres: adresZPunktu(d.punkt, d, t.punktNaMapie), zrodlo: 'numer_dzialki', wybrana: d });
  }

  function zmienMiejsce() {
    const a = adapterRef.current;
    a?.przerwijRysowanie();
    a?.pokazObrys(null, null);
    a?.pokazPinezke?.(null);
    // Po pinezce zostajemy przy tym widoku, żeby klient od razu postawił ją jeszcze raz.
    if (miejsce?.zrodlo !== 'pinezka') a?.przelec(start, zoomStart);
    setPinezka(null);
    setMiejsce(null);
  }

  const krok = numerKroku ? wstaw(t.krok, { x: miejsce ? numerKroku.mapa : numerKroku.adres, y: numerKroku.z }) : null;
  const naglowekWejscia = aktywne === 'pinezka' ? t.naglowekPinezka : aktywne === 'numer_dzialki' ? t.naglowekDzialka : t.naglowekAdres;
  const podpowiedzWejscia = aktywne === 'pinezka' ? t.podpowiedzPinezka : aktywne === 'numer_dzialki' ? t.podpowiedzDzialka : t.podpowiedzAdres;
  const wybor = !miejsce && dostepne.length > 1 ? <WyborWejscia wejscia={dostepne} aktywne={aktywne} teksty={t} onZmiana={zmienTryb} /> : null;
  const poleDzialki = (
    <PoleDzialki api={klient} teksty={t} onWybrano={wybierzDzialke} onPinezka={dostepne.includes('pinezka') ? () => zmienTryb('pinezka') : undefined} />
  );

  const ekranPo =
    miejsce &&
    (cel === 'dzialka' ? (
      <EkranDzialki api={klient} adres={miejsce.adres} zrodloPunktu={miejsce.zrodlo} wybrana={miejsce.wybrana} teksty={t} adapterRef={adapterRef} sprawdzPozwolenie={sprawdzPozwolenie} onGotowe={onGotowe} onWstecz={zmienMiejsce} />
    ) : (
      <EkranMapy api={klient} adres={miejsce.adres} zrodloPunktu={miejsce.zrodlo} wybrana={miejsce.wybrana} sprawdzPozwolenie={sprawdzPozwolenie} teksty={t} wysokoscKondygnacji={wysokoscKondygnacji} linia={linia} adapterRef={adapterRef} pokazMape={pokazMape} onGotowe={onGotowe} onPomin={onPomin} onWstecz={zmienMiejsce} />
    ));

  if (!pokazMape) {
    return (
      <div className="ka ka-ekran ka-bez-mapy">
        {krok && <div className="ka-krok">{krok}</div>}
        <h1 className="ka-naglowek">{miejsce ? (cel === 'dzialka' ? t.naglowekPotwierdzDzialke : t.naglowekAdres) : naglowekWejscia}</h1>
        {!miejsce && (
          <>
            <p className="ka-podpowiedz">{podpowiedzWejscia}</p>
            {wybor}
            {aktywne === 'numer_dzialki' ? poleDzialki : <PoleAdresu api={klient} bias={bias} teksty={t} naMapie={false} onWybrano={wybierzAdres} onPomin={onPomin} />}
            <div className="ka-nawigacja">
              {onWstecz && <button type="button" className="ka-wstecz" onClick={onWstecz}>← {t.wstecz}</button>}
              <button type="button" className="ka-link ka-pomin" onClick={() => onPomin()}>{t.pomin}</button>
            </div>
            <p className="ka-stopka">{t.stopkaAdres}</p>
          </>
        )}
        {ekranPo}
      </div>
    );
  }

  const gora = (
    <>
      {krok && <div className="ka-krok">{krok}</div>}
      <h1 className="ka-naglowek">{miejsce ? (cel === 'dzialka' ? t.naglowekPotwierdzDzialke : t.naglowekMapa) : naglowekWejscia}</h1>
      {!miejsce && <p className="ka-podpowiedz">{podpowiedzWejscia}</p>}
      {wybor}
      {!miejsce && aktywne === 'numer_dzialki' && poleDzialki}
    </>
  );

  const mapa = (
    <div className="ka-mapa-obszar">
      <div className="ka-mapa" ref={mapaRef} role="application" aria-label="Mapa z domem" />
      {!miejsce && aktywne === 'adres' && <PoleAdresu api={klient} bias={bias} teksty={t} naMapie onWybrano={wybierzAdres} onPomin={onPomin} />}
      {miejsce && (
        <div className="ka-pigulka">
          <span className="ka-pigulka-tekst">{miejsce.adres.tekst}</span>
          <button type="button" className="ka-link ka-pigulka-zmien" onClick={zmienMiejsce}>{t.zmienAdres}</button>
        </div>
      )}
    </div>
  );

  const dol = (
    <>
      {!miejsce && (
        <>
          <div className="ka-nawigacja">
            {aktywne === 'pinezka' && (
              <button type="button" className="ka-btn ka-btn-glowny" disabled={!pinezka} onClick={potwierdzPinezke}>
                {pinezka ? t.toTutaj : t.dotknijMape}
              </button>
            )}
            {onWstecz && <button type="button" className="ka-wstecz" onClick={onWstecz}>← {t.wstecz}</button>}
            <button type="button" className="ka-link ka-pomin" onClick={() => onPomin()}>{t.pomin}</button>
          </div>
          <p className="ka-stopka">{t.stopkaAdres}</p>
        </>
      )}
      {ekranPo}
    </>
  );

  // Owijki tylko przy `szeroko`: .ka-nawigacja jest sticky względem rodzica (pułapka 10).
  return (
    <div className={szeroko ? 'ka ka-ekran ka-scena ka-szeroki' : 'ka ka-ekran ka-scena'}>
      {szeroko ? <div className="ka-bok">{gora}</div> : gora}
      {mapa}
      {szeroko ? <div className="ka-bok-dol">{dol}</div> : dol}
    </div>
  );
}
