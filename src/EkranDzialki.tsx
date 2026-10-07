// src/EkranDzialki.tsx
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Api } from './api';
import { opisDzialki, scalDzialke } from './dzialka';
import type { AdapterMapy } from './mapa/adapter';
import { usePozwolenie } from './pozwolenie';
import { PUSTA, zlozWynik } from './wynik';
import type { Adres, DodatkiKroku, DzialkaZListy, OdpowiedzBudynek, Teksty, WynikKrokuAdresu, ZrodloPunktu } from './typy';

type Props = {
  api: Api;
  adres: Adres;
  zrodloPunktu: ZrodloPunktu;
  wybrana: DzialkaZListy | null;
  teksty: Teksty;
  /** Mapa rodzica (KrokAdresu); null w trybie bez mapy. */
  adapterRef: RefObject<AdapterMapy | null>;
  sprawdzPozwolenie: boolean;
  onGotowe: (wynik: WynikKrokuAdresu, dodatki?: DodatkiKroku) => void;
  onWstecz: () => void;
};

/**
 * Cel „działka” (elektryk, spec 3 krok 2): potwierdzenie działki. Bez rysowania domu i bez pytania
 * o kondygnacje (pyta o nie landing). Dom z ewidencji, jeśli jest, trafia do wyniku i na mapę.
 * Ewidencja nie odpowiada albo nie zna działki = komunikat i „Dalej”, krok nie blokuje klienta.
 */
export function EkranDzialki({ api, adres, zrodloPunktu, wybrana, teksty, adapterRef, sprawdzPozwolenie, onGotowe, onWstecz }: Props) {
  const [laduje, setLaduje] = useState(true);
  const [dane, setDane] = useState<OdpowiedzBudynek>(PUSTA);
  const [czekam, setCzekam] = useState(false);
  // Znacznik trwającego czekania na pozwolenie; wycofanie, odmontowanie i nowy punkt go unieważniają.
  const oczekiwanie = useRef(0);

  useEffect(() => {
    let aktywny = true;
    setLaduje(true);
    setCzekam(false);
    const zapytanie =
      zrodloPunktu === 'adres'
        ? api.budynek(adres.lat, adres.lon, { miasto: adres.miasto, ulica: adres.ulica, numer: adres.numer })
        : api.budynek(adres.lat, adres.lon);
    zapytanie
      .catch(() => PUSTA)
      .then((odp) => {
        if (!aktywny) return;
        const d: OdpowiedzBudynek = { ...odp, dzialka: scalDzialke(odp.dzialka, wybrana) };
        setDane(d);
        setLaduje(false);
        adapterRef.current?.pokazObrys(d.zrodlo_obrysu === 'ewidencja' ? d.obrys : null, d.dzialka?.obrys ?? null);
      });
    return () => {
      aktywny = false;
      oczekiwanie.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adres.lat, adres.lon]);

  const czekajNaPozwolenie = usePozwolenie(api, dane.dzialka?.identyfikator ?? null, sprawdzPozwolenie && !laduje);

  function gotowe() {
    const domZEwidencji = dane.zrodlo_obrysu === 'ewidencja' && dane.obrys !== null;
    const wynik = zlozWynik(
      adres,
      dane,
      {
        obrys: domZEwidencji ? dane.obrys : null,
        zrodlo_obrysu: domZEwidencji ? 'ewidencja' : 'brak',
        kondygnacje: dane.kondygnacje,
        zrodlo_kondygnacji: dane.kondygnacje === null ? null : 'ewidencja',
      },
      { zrodlo_punktu: zrodloPunktu, punkt: { lat: adres.lat, lon: adres.lon } }
    );
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

  function wstecz() {
    oczekiwanie.current += 1;
    setCzekam(false);
    onWstecz();
  }

  const d = dane.dzialka;
  return (
    <div className="ka-ekran-mapa ka-ekran-dzialki">
      {laduje && <p className="ka-podpowiedz" aria-live="polite">{teksty.szukamWEwidencji}</p>}
      {!laduje && d && (
        <div className="ka-panel">
          <div className="ka-panel-wiersz">
            <span className="ka-panel-wartosc ka-dzialka-opis">{opisDzialki(d)}</span>
          </div>
          <div className="ka-panel-wiersz">
            <span className="ka-panel-etykieta">{teksty.powierzchniaDzialki}</span>
            <span className="ka-panel-wartosc">{`ok. ${Math.round(d.powierzchnia_m2).toLocaleString('pl-PL')} m²`}</span>
          </div>
        </div>
      )}
      {!laduje && !d && <p className="ka-podpowiedz" role="status">{teksty.brakDanychDzialki}</p>}
      <div className="ka-nawigacja ka-nawigacja-mapa">
        <button type="button" className="ka-btn ka-btn-glowny" disabled={laduje || czekam} onClick={() => void gotowe()}>
          {czekam ? teksty.sprawdzamy : d ? teksty.toMojaDzialka : teksty.dalej}
        </button>
        <button type="button" className="ka-btn ka-btn-drugi" onClick={wstecz}>{teksty.toNieTaDzialka}</button>
      </div>
    </div>
  );
}