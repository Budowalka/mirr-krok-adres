import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Api, Bias } from './api';
import { useSugestie } from './useSugestie';
import type { Adres, Podpowiedz, Teksty } from './typy';

type Props = {
  api: Api;
  bias: Bias;
  teksty: Teksty;
  /** true = pływa nad mapą (jak w Roofr); false = zwykłe pole (tryb bez mapy) */
  naMapie: boolean;
  onWybrano: (adres: Adres) => void;
  onPomin: (powod?: string) => void;
};

export function adresZPodpowiedzi(p: Podpowiedz, zrodlo: Adres['zrodlo']): Adres {
  return {
    ulica: p.ulica,
    numer: p.numer ?? '',
    kod: p.kod,
    miasto: p.miasto,
    gmina: null,
    powiat: null,
    wojewodztwo: null,
    teryt_gmina: null,
    simc: null,
    ulic: null,
    lat: p.lat,
    lon: p.lon,
    zrodlo,
    tekst: `${[p.ulica, p.numer].filter(Boolean).join(' ')}, ${p.miasto}`,
  };
}

/** Pole adresu z podpowiedziami (nad mapą) i tryb ręczny jako zapas. */
export function PoleAdresu({ api, bias, teksty, naMapie, onWybrano, onPomin }: Props) {
  const [q, setQ] = useState('');
  const [aktywna, setAktywna] = useState(-1);
  const [reczny, setReczny] = useState(false);
  const [ulica, setUlica] = useState('');
  const [kod, setKod] = useState('');
  const [miasto, setMiasto] = useState('');
  const [szukam, setSzukam] = useState(false);
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const { lista, laduje } = useSugestie(api, q, bias);
  const idListy = useId();
  const poleRef = useRef<HTMLInputElement>(null);

  // Ulica bez numeru: wstawiamy ją do pola ze spacją, klient dopisuje numer,
  // podpowiedzi odpytują się ponownie już z pełną nazwą ulicy.
  function wybierz(p: Podpowiedz) {
    if (p.rodzaj === 'ulica') {
      setQ(`${p.ulica} `);
      setAktywna(-1);
      poleRef.current?.focus();
      return;
    }
    onWybrano(adresZPodpowiedzi(p, 'podpowiedz'));
  }

  function klawisz(e: KeyboardEvent<HTMLInputElement>) {
    if (!lista.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAktywna((i) => Math.min(i + 1, lista.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAktywna((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && aktywna >= 0) {
      e.preventDefault();
      wybierz(lista[aktywna]);
    }
  }

  async function szukajRecznie() {
    const pelny = `${ulica.trim()} ${miasto.trim()} ${kod.trim()}`.trim();
    if (ulica.trim().length < 3 || miasto.trim().length < 2) {
      setKomunikat('Wpisz ulicę z numerem i miejscowość.');
      return;
    }
    setSzukam(true);
    setKomunikat(null);
    try {
      const wyniki = await api.podpowiedzi(pelny, bias);
      const trafienie = wyniki.find((w) => w.rodzaj === 'adres');
      if (trafienie) {
        onWybrano({ ...adresZPodpowiedzi(trafienie, 'reczny'), kod: kod.trim() || trafienie.kod });
      } else {
        onPomin(teksty.nieZnaleziono);
      }
    } catch {
      onPomin(teksty.nieZnaleziono);
    } finally {
      setSzukam(false);
    }
  }

  return (
    <div className={naMapie ? 'ka-pole-adres ka-naklad' : 'ka-pole-adres'}>
      {!reczny && (
        <>
          <input
            ref={poleRef}
            className="ka-input"
            type="text"
            inputMode="text"
            autoComplete="street-address"
            placeholder={teksty.poleAdres}
            aria-label={teksty.poleAdres}
            aria-autocomplete="list"
            aria-controls={idListy}
            aria-expanded={lista.length > 0}
            value={q}
            autoFocus
            onChange={(e) => {
              setQ(e.target.value);
              setAktywna(-1);
            }}
            onKeyDown={klawisz}
          />
          {laduje && <div className="ka-laduje" aria-live="polite">Szukam…</div>}
          {lista.length > 0 && (
            <ul className="ka-lista" role="listbox" id={idListy}>
              {lista.map((p, i) => (
                <li
                  key={`${p.lat},${p.lon},${p.tekst}`}
                  role="option"
                  aria-selected={i === aktywna}
                  className={i === aktywna ? 'ka-pozycja ka-pozycja-aktywna' : 'ka-pozycja'}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => wybierz(p)}
                >
                  {p.tekst}
                  {p.rodzaj === 'ulica' && <small className="ka-pozycja-opis">{teksty.dopiszNumer}</small>}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="ka-link ka-link-naklad" onClick={() => setReczny(true)}>
            {teksty.nieMaNaLiscie}
          </button>
        </>
      )}

      {reczny && (
        <div className="ka-reczny">
          <label className="ka-etykieta">
            {teksty.poleUlica}
            <input className="ka-input" value={ulica} onChange={(e) => setUlica(e.target.value)} placeholder="np. Klonowa 7" autoFocus />
          </label>
          <label className="ka-etykieta">
            {teksty.poleMiasto}
            <input className="ka-input" value={miasto} onChange={(e) => setMiasto(e.target.value)} placeholder="np. Sosnowiec" />
          </label>
          <label className="ka-etykieta">
            {teksty.poleKod}
            <input className="ka-input" value={kod} onChange={(e) => setKod(e.target.value)} inputMode="numeric" autoComplete="postal-code" placeholder="np. 41-200" maxLength={6} />
          </label>
          {komunikat && <p className="ka-komunikat" role="alert">{komunikat}</p>}
          <button type="button" className="ka-btn ka-btn-glowny" disabled={szukam} onClick={szukajRecznie}>
            {szukam ? 'Szukam…' : teksty.przyciskSzukaj}
          </button>
          <button type="button" className="ka-link" onClick={() => setReczny(false)}>{teksty.wrocDoPodpowiedzi}</button>
        </div>
      )}
    </div>
  );
}
