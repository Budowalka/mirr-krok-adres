'use client';

import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'mirr-krok-adres/styles.css';
import { useEffect, useState } from 'react';
import {
  KartaBudowy,
  KrokAdresu,
  opisKondygnacji,
  pozwolenieDoFormData,
  type DodatkiKroku,
  type Pozwolenie,
  type Wejscie,
  type WynikKrokuAdresu,
} from 'mirr-krok-adres';

const WYSOKOSC = 3;
const WEJSCIA: Wejscie[] = ['adres', 'pinezka', 'numer_dzialki'];
const OBSZARY = { zaglebie: { lat: 50.28, lon: 19.13 }, pruszkow: { lat: 52.182628, lon: 20.814037 } } as const;
const NAZWY_WEJSC: Record<Wejscie, string> = { adres: 'adres', pinezka: 'pinezka', numer_dzialki: 'numer działki' };

type Ustawienia = { wejscia: Wejscie[]; cel: 'budynek' | 'dzialka'; pozwolenie: boolean; szeroko: boolean; obszar: keyof typeof OBSZARY };
const DOMYSLNE: Ustawienia = { wejscia: ['adres'], cel: 'budynek', pozwolenie: false, szeroko: false, obszar: 'zaglebie' };

/** ?wejscia=adres,pinezka,numer_dzialki&cel=dzialka&pozwolenie=1&szeroko=1&obszar=pruszkow */
function zAdresu(search: string): Ustawienia {
  const q = new URLSearchParams(search);
  const wejscia = (q.get('wejscia') ?? 'adres').split(',').filter((w): w is Wejscie => (WEJSCIA as string[]).includes(w));
  return {
    wejscia: wejscia.length ? wejscia : ['adres'],
    cel: q.get('cel') === 'dzialka' ? 'dzialka' : 'budynek',
    pozwolenie: q.get('pozwolenie') === '1',
    szeroko: q.get('szeroko') === '1',
    obszar: q.get('obszar') === 'pruszkow' ? 'pruszkow' : 'zaglebie',
  };
}

function doAdresu(u: Ustawienia): string {
  return `?${new URLSearchParams({ wejscia: u.wejscia.join(','), cel: u.cel, pozwolenie: u.pozwolenie ? '1' : '0', szeroko: u.szeroko ? '1' : '0', obszar: u.obszar })}`;
}

function Wiersz({ n, v }: { n: string; v: React.ReactNode }) {
  return (
    <>
      <dt>{n}</dt>
      <dd>{v ?? '—'}</dd>
    </>
  );
}

const zrodlo = { ewidencja: 'z ewidencji', reczne: 'zaznaczone ręcznie', brak: 'brak', podpowiedz: 'z podpowiedzi', reczny: 'wpisany ręcznie' } as const;
type Etap = 'krok' | 'karta' | 'dane' | 'pominieto';

export default function Strona() {
  const [ust, setUst] = useState<Ustawienia>(DOMYSLNE);
  const [wczytane, setWczytane] = useState(false);
  const [klucz, setKlucz] = useState(0);
  const [etap, setEtap] = useState<Etap>('krok');
  const [wynik, setWynik] = useState<WynikKrokuAdresu | null>(null);
  const [pozwolenie, setPozwolenie] = useState<Pozwolenie | null>(null);
  const [pozwolenieFd, setPozwolenieFd] = useState<ReturnType<typeof pozwolenieDoFormData> | null>(null);
  const [pominieto, setPominieto] = useState<string | null>(null);

  // useSearchParams wymaga <Suspense> przy budowie statycznej (pułapka 12), więc czytamy window.location.
  useEffect(() => {
    setUst(zAdresu(window.location.search));
    setWczytane(true);
  }, []);

  function odNowa() {
    setEtap('krok');
    setWynik(null);
    setPozwolenie(null);
    setPozwolenieFd(null);
    setPominieto(null);
    setKlucz((k) => k + 1);
  }

  function zmien(n: Partial<Ustawienia>) {
    const u = { ...ust, ...n };
    setUst(u);
    window.history.replaceState(null, '', doAdresu(u));
    odNowa();
  }

  function poKroku(w: WynikKrokuAdresu, d?: DodatkiKroku) {
    setWynik(w);
    if (d?.pozwolenie) {
      setPozwolenie(d.pozwolenie);
      setEtap('karta');
    } else {
      setEtap('dane');
    }
  }

  return (
    <>
      <div className="gora">
        <span>Podgląd komponentu kroku adresu</span>
        <small>konto demo MIRR</small>
      </div>
      <main className={ust.szeroko ? 'szeroki' : undefined}>
        <details className="ustawienia">
          <summary>Ustawienia podglądu</summary>
          <fieldset>
            <legend>Wejścia</legend>
            {WEJSCIA.map((w) => (
              <label key={w}>
                <input
                  type="checkbox"
                  checked={ust.wejscia.includes(w)}
                  onChange={(e) => zmien({ wejscia: e.target.checked ? WEJSCIA.filter((x) => x === w || ust.wejscia.includes(x)) : ust.wejscia.filter((x) => x !== w) })}
                />
                {NAZWY_WEJSC[w]}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Cel</legend>
            {(['budynek', 'dzialka'] as const).map((c) => (
              <label key={c}>
                <input type="radio" name="cel" checked={ust.cel === c} onChange={() => zmien({ cel: c })} />
                {c === 'budynek' ? 'dom (jak v0.2)' : 'działka (elektryk)'}
              </label>
            ))}
          </fieldset>
          <label><input type="checkbox" checked={ust.pozwolenie} onChange={(e) => zmien({ pozwolenie: e.target.checked })} /> sprawdzaj pozwolenie</label>
          <label><input type="checkbox" checked={ust.szeroko} onChange={(e) => zmien({ szeroko: e.target.checked })} /> szeroko na komputerze</label>
          <label>
            <input type="checkbox" checked={ust.obszar === 'pruszkow'} onChange={(e) => zmien({ obszar: e.target.checked ? 'pruszkow' : 'zaglebie' })} /> mapa startuje w Pruszkowie
          </label>
        </details>

        {wczytane && etap === 'krok' && (
          <KrokAdresu
            key={klucz}
            api="/api/geo"
            bias={OBSZARY[ust.obszar]}
            numerKroku={{ adres: 1, mapa: 2, z: 5 }}
            wysokoscKondygnacji={WYSOKOSC}
            wejscia={ust.wejscia}
            cel={ust.cel}
            sprawdzPozwolenie={ust.pozwolenie}
            szeroko={ust.szeroko}
            linia={(w) =>
              ust.cel === 'budynek' && w.obwod_m && w.kondygnacje
                ? { etykieta: 'Elewacja do ocieplenia', wartosc: `ok. ${Math.round(w.obwod_m * w.kondygnacje * WYSOKOSC * 0.9)} m²`, opis: `${w.obwod_m} m × ${w.kondygnacje * WYSOKOSC} m minus otwory` }
                : null
            }
            onGotowe={poKroku}
            onPomin={(powod) => {
              setPominieto(powod ?? 'Wybrano ręczne podanie powierzchni.');
              setEtap('pominieto');
            }}
          />
        )}

        {etap === 'karta' && (
          <KartaBudowy
            pozwolenie={pozwolenie}
            dzialka={wynik?.dzialka ?? null}
            onTak={(p) => {
              setPozwolenieFd(pozwolenieDoFormData(p, true));
              setEtap('dane');
            }}
            onNie={(p) => {
              setPozwolenieFd(pozwolenieDoFormData(p, false));
              setEtap('dane');
            }}
          />
        )}

        {etap === 'pominieto' && (
          <div className="dane">
            <h1>Ścieżka ręczna</h1>
            <p className="uwaga">{pominieto} Tu landing pokazałby stare pola powierzchni.</p>
            <button className="btn" onClick={odNowa}>Jeszcze raz</button>
          </div>
        )}

        {etap === 'dane' && wynik && (
          <div className="dane">
            <h1>Dane o nieruchomości</h1>
            <p className="uwaga">Tak wygląda wynik kroku. Landing dostaje go w całości i sam liczy, co potrzebuje.</p>

            <h2>Miejsce</h2>
            <dl>
              <Wiersz n="Skąd punkt" v={NAZWY_WEJSC[wynik.zrodlo_punktu]} />
              <Wiersz n="Punkt" v={`${wynik.punkt.lat.toFixed(6)}, ${wynik.punkt.lon.toFixed(6)}`} />
              <Wiersz n="Adres" v={wynik.adres.tekst} />
              <Wiersz n="Kod pocztowy" v={wynik.adres.kod} />
              <Wiersz n="Gmina" v={wynik.adres.gmina} />
              <Wiersz n="Powiat" v={wynik.adres.powiat} />
              <Wiersz n="Województwo" v={wynik.adres.wojewodztwo} />
              <Wiersz n="TERYT gminy / SIMC / ULIC" v={[wynik.adres.teryt_gmina, wynik.adres.simc, wynik.adres.ulic].map((x) => x ?? '—').join(' / ')} />
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
              <Wiersz n="Powiat w bazie" v={wynik.powiat.teryt ? `${wynik.powiat.teryt}, ${wynik.powiat.w_bazie ? 'tak' : 'nie'}` : 'nieznany'} />
            </dl>

            <h2>Działka</h2>
            <dl>
              <Wiersz n="Numer" v={wynik.dzialka?.numer} />
              <Wiersz n="Identyfikator" v={wynik.dzialka?.identyfikator} />
              <Wiersz n="Obręb" v={wynik.dzialka?.obreb} />
              <Wiersz n="Gmina" v={wynik.dzialka?.gmina} />
              <Wiersz n="Powierzchnia" v={wynik.dzialka ? `${wynik.dzialka.powierzchnia_m2} m²` : null} />
            </dl>

            <h2>Pozwolenie na budowę</h2>
            <dl>
              <Wiersz n="Wpis w rejestrze" v={ust.pozwolenie ? (pozwolenieFd ? 'jest' : 'brak albo rejestr nie odpowiedział') : 'nie sprawdzano'} />
              <Wiersz n="Data decyzji" v={pozwolenieFd?.data_decyzji} />
              <Wiersz n="Lokale" v={pozwolenieFd?.units} />
              <Wiersz n="Kubatura (tylko dla wykonawcy)" v={pozwolenieFd?.kubatura} />
              <Wiersz n="Potwierdzone przez klienta" v={pozwolenieFd ? (pozwolenieFd.potwierdzone ? 'tak' : 'nie') : null} />
            </dl>

            <details>
              <summary>Surowy wynik (JSON)</summary>
              <pre>{JSON.stringify({ dom: wynik, pozwolenie: pozwolenieFd }, null, 2)}</pre>
            </details>
            <button className="btn" onClick={odNowa}>Jeszcze raz</button>
          </div>
        )}
      </main>
    </>
  );
}
