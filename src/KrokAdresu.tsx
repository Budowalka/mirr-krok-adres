import { useEffect, useMemo, useRef, useState } from 'react';
import { utworzApi } from './api';
import { EkranMapy } from './EkranMapy';
import { PoleAdresu } from './PoleAdresu';
import type { AdapterMapy } from './mapa/adapter';
import { utworzAdapterLeaflet } from './mapa/leaflet';
import { DOMYSLNE_TEKSTY, wstaw } from './teksty';
import type { Adres, KrokAdresuProps } from './typy';

const POLSKA = { lat: 52.1, lon: 19.4 };
const ZOOM_OBSZAR = 12;
const ZOOM_POLSKA = 6;
const ZOOM_DOM = 18;

/**
 * Krok adresu wielokrotnego użytku w jednym ekranie (wzór Roofr): mapa satelitarna
 * od pierwszej sekundy, pole adresu pływa nad mapą, po wyborze przelot do domu,
 * obrys z ewidencji (albo rysowanie po rogach) i panel z obwodem, rzutem i kondygnacjami.
 * Wynik = kontrakt WynikKrokuAdresu (spec D3). Nic branżowego: elewację liczy landing.
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
  onGotowe,
  onPomin,
  onWstecz,
  adapterMapy,
}: KrokAdresuProps) {
  const [adres, setAdres] = useState<Adres | null>(null);
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
    void a.zamontuj(mapaRef.current, { centrum: start, zoom: zoomStart, zrodloKafli });
    return () => {
      a.zniszcz();
      adapterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pokazMape]);

  function wybierz(a: Adres) {
    adapterRef.current?.przelec({ lat: a.lat, lon: a.lon }, ZOOM_DOM);
    setAdres(a);
  }

  function zmienAdres() {
    adapterRef.current?.przerwijRysowanie();
    adapterRef.current?.pokazObrys(null, null);
    adapterRef.current?.przelec(start, zoomStart);
    setAdres(null);
  }

  const krok = numerKroku ? wstaw(t.krok, { x: adres ? numerKroku.mapa : numerKroku.adres, y: numerKroku.z }) : null;

  if (!pokazMape) {
    return (
      <div className="ka ka-ekran ka-bez-mapy">
        {krok && <div className="ka-krok">{krok}</div>}
        <h1 className="ka-naglowek">{t.naglowekAdres}</h1>
        {!adres && (
          <>
            <p className="ka-podpowiedz">{t.podpowiedzAdres}</p>
            <PoleAdresu api={klient} bias={bias} teksty={t} naMapie={false} onWybrano={setAdres} onPomin={onPomin} />
            <div className="ka-nawigacja">
              {onWstecz && <button type="button" className="ka-wstecz" onClick={onWstecz}>← {t.wstecz}</button>}
              <button type="button" className="ka-link ka-pomin" onClick={() => onPomin()}>{t.pomin}</button>
            </div>
            <p className="ka-stopka">{t.stopkaAdres}</p>
          </>
        )}
        {adres && (
          <EkranMapy api={klient} adres={adres} teksty={t} wysokoscKondygnacji={wysokoscKondygnacji} linia={linia} adapterRef={adapterRef} pokazMape={false} onGotowe={onGotowe} onPomin={onPomin} onWstecz={() => setAdres(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="ka ka-ekran ka-scena">
      {krok && <div className="ka-krok">{krok}</div>}
      <h1 className="ka-naglowek">{adres ? t.naglowekMapa : t.naglowekAdres}</h1>
      {!adres && <p className="ka-podpowiedz">{t.podpowiedzAdres}</p>}

      <div className="ka-mapa-obszar">
        <div className="ka-mapa" ref={mapaRef} role="application" aria-label="Mapa z domem" />
        {!adres && <PoleAdresu api={klient} bias={bias} teksty={t} naMapie onWybrano={wybierz} onPomin={onPomin} />}
        {adres && (
          <div className="ka-pigulka">
            <span className="ka-pigulka-tekst">{adres.tekst}</span>
            <button type="button" className="ka-link ka-pigulka-zmien" onClick={zmienAdres}>{t.zmienAdres}</button>
          </div>
        )}
      </div>

      {!adres && (
        <>
          <div className="ka-nawigacja">
            {onWstecz && <button type="button" className="ka-wstecz" onClick={onWstecz}>← {t.wstecz}</button>}
            <button type="button" className="ka-link ka-pomin" onClick={() => onPomin()}>{t.pomin}</button>
          </div>
          <p className="ka-stopka">{t.stopkaAdres}</p>
        </>
      )}
      {adres && (
        <EkranMapy api={klient} adres={adres} teksty={t} wysokoscKondygnacji={wysokoscKondygnacji} linia={linia} adapterRef={adapterRef} pokazMape onGotowe={onGotowe} onPomin={onPomin} onWstecz={zmienAdres} />
      )}
    </div>
  );
}
