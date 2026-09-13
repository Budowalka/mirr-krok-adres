'use client';

import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'mirr-krok-adres/styles.css';
import { useState } from 'react';
import { KrokAdresu, opisKondygnacji, type WynikKrokuAdresu } from 'mirr-krok-adres';

const WYSOKOSC = 3;

function Wiersz({ n, v }: { n: string; v: React.ReactNode }) {
  return (
    <>
      <dt>{n}</dt>
      <dd>{v ?? '—'}</dd>
    </>
  );
}

const zrodlo = { ewidencja: 'z ewidencji', reczne: 'zaznaczone ręcznie', brak: 'brak', podpowiedz: 'z podpowiedzi', reczny: 'wpisany ręcznie' } as const;

export default function Strona() {
  const [wynik, setWynik] = useState<WynikKrokuAdresu | null>(null);
  const [pominieto, setPominieto] = useState<string | null>(null);
  const [klucz, setKlucz] = useState(0);

  function odNowa() {
    setWynik(null);
    setPominieto(null);
    setKlucz((k) => k + 1);
  }

  return (
    <>
      <div className="gora">
        <span>Podgląd komponentu kroku adresu</span>
        <small>konto demo MIRR</small>
      </div>
      <main>
        {!wynik && !pominieto && (
          <KrokAdresu
            key={klucz}
            api="/api/geo"
            bias={{ lat: 50.28, lon: 19.13 }}
            numerKroku={{ adres: 1, mapa: 2, z: 5 }}
            wysokoscKondygnacji={WYSOKOSC}
            linia={(w) =>
              w.obwod_m && w.kondygnacje
                ? {
                    etykieta: 'Elewacja do ocieplenia',
                    wartosc: `ok. ${Math.round(w.obwod_m * w.kondygnacje * WYSOKOSC * 0.9)} m²`,
                    opis: `${w.obwod_m} m × ${w.kondygnacje * WYSOKOSC} m minus otwory`,
                  }
                : null
            }
            onGotowe={setWynik}
            onPomin={(powod) => setPominieto(powod ?? 'Wybrano ręczne podanie powierzchni.')}
          />
        )}

        {pominieto && (
          <div className="dane">
            <h1>Ścieżka ręczna</h1>
            <p className="uwaga">{pominieto} Tu landing pokazałby stare pola powierzchni.</p>
            <button className="btn" onClick={odNowa}>Jeszcze raz</button>
          </div>
        )}

        {wynik && (
          <div className="dane">
            <h1>Dane o nieruchomości</h1>
            <p className="uwaga">Tak wygląda wynik kroku. Landing dostaje go w całości i sam liczy, co potrzebuje (u On the Wall: elewację z obwodu i kondygnacji).</p>

            <h2>Adres</h2>
            <dl>
              <Wiersz n="Adres" v={wynik.adres.tekst} />
              <Wiersz n="Kod pocztowy" v={wynik.adres.kod} />
              <Wiersz n="Gmina" v={wynik.adres.gmina} />
              <Wiersz n="Powiat" v={wynik.adres.powiat} />
              <Wiersz n="Województwo" v={wynik.adres.wojewodztwo} />
              <Wiersz n="TERYT gminy / SIMC / ULIC" v={[wynik.adres.teryt_gmina, wynik.adres.simc, wynik.adres.ulic].map((x) => x ?? '—').join(' / ')} />
              <Wiersz n="Współrzędne" v={`${wynik.adres.lat.toFixed(6)}, ${wynik.adres.lon.toFixed(6)}`} />
              <Wiersz n="Skąd adres" v={zrodlo[wynik.adres.zrodlo]} />
            </dl>

            <h2>Budynek</h2>
            <dl>
              <Wiersz n="Obrys" v={zrodlo[wynik.zrodlo_obrysu]} />
              <Wiersz n="Obwód" v={wynik.obwod_m !== null ? `${wynik.obwod_m} m` : null} />
              <Wiersz n="Powierzchnia zabudowy" v={wynik.rzut_m2 !== null ? `${wynik.rzut_m2} m²` : null} />
              <Wiersz n="Kondygnacje" v={wynik.kondygnacje !== null ? `${wynik.kondygnacje} (${opisKondygnacji(wynik.kondygnacje)}), ${wynik.zrodlo_kondygnacji === 'ewidencja' ? 'z ewidencji' : 'podane ręcznie'}` : null} />
              <Wiersz n="Identyfikator EGiB" v={wynik.identyfikator_egib} />
              <Wiersz n="Funkcja" v={wynik.budynek?.funkcja} />
              <Wiersz n="Funkcja ogólna" v={wynik.budynek?.funkcja_ogolna} />
              <Wiersz n="Kod KST" v={wynik.budynek?.kod_kst} />
              <Wiersz n="Stan" v={wynik.budynek?.kategoria_istnienia} />
              <Wiersz n="Źródło geometrii / dane z" v={wynik.budynek ? `${wynik.budynek.zrodlo_geometrii ?? '—'} / ${wynik.budynek.wersja_danych ?? '—'}` : null} />
              <Wiersz n="Powiat w bazie" v={wynik.powiat.teryt ? `${wynik.powiat.teryt}, ${wynik.powiat.w_bazie ? 'tak' : 'nie'}` : 'nieznany'} />
            </dl>

            <h2>Działka</h2>
            <dl>
              <Wiersz n="Numer" v={wynik.dzialka?.numer} />
              <Wiersz n="Identyfikator" v={wynik.dzialka?.identyfikator} />
              <Wiersz n="Obręb" v={wynik.dzialka?.obreb} />
              <Wiersz n="Gmina" v={wynik.dzialka?.gmina} />
              <Wiersz n="Powierzchnia" v={wynik.dzialka ? `${wynik.dzialka.powierzchnia_m2} m²` : null} />
              <Wiersz
                n="Inne budynki na działce"
                v={wynik.inne_budynki_na_dzialce.length ? wynik.inne_budynki_na_dzialce.map((b) => `${b.funkcja ?? 'budynek'} ${b.rzut_m2} m²${b.kondygnacje ? `, ${b.kondygnacje} kond.` : ''}`).join('; ') : 'brak'}
              />
            </dl>

            <details>
              <summary>Surowy wynik (JSON)</summary>
              <pre>{JSON.stringify(wynik, null, 2)}</pre>
            </details>
            <button className="btn" onClick={odNowa}>Jeszcze raz</button>
          </div>
        )}
      </main>
    </>
  );
}
