// src/PoleDzialki.tsx
import { useEffect, useRef, useState } from 'react';
import type { Api } from './api';
import { parsujNumerDzialki } from './dzialka';
import { wstaw } from './teksty';
import type { DzialkaZListy, Teksty } from './typy';

type Props = {
  api: Api;
  teksty: Teksty;
  onWybrano: (dzialka: DzialkaZListy) => void;
  /** Gdy zakładka pinezki jest dostępna: link „Zaznacz na mapie” przy braku wyniku albo błędzie. */
  onPinezka?: () => void;
};

/**
 * Numer działki + gmina (spec 6.1): „10 64/4” → MIRR GET /geo/dzialka → lista działek w województwach firmy.
 * Jedna działka = od razu wybrana (pułapka 14), kilka = wybór gminy. Bez <form> (landing może mieć własny).
 */
export function PoleDzialki({ api, teksty, onWybrano, onPinezka }: Props) {
  const [tekst, setTekst] = useState('');
  const [lista, setLista] = useState<DzialkaZListy[] | null>(null);
  const [komunikat, setKomunikat] = useState<string | null>(null);
  const [szukam, setSzukam] = useState(false);
  // Numer bieżącego zapytania: nowe szukanie, zmiana tekstu i odmontowanie unieważniają stare odpowiedzi.
  const zapytanie = useRef(0);
  useEffect(() => () => { zapytanie.current++; }, []);

  async function szukaj() {
    const n = parsujNumerDzialki(tekst);
    if (!n) {
      setLista(null);
      setKomunikat(teksty.zlyNumerDzialki);
      return;
    }
    const nr = ++zapytanie.current;
    setSzukam(true);
    setKomunikat(null);
    setLista(null);
    try {
      const wynik = await api.dzialka(n.obreb, n.numer);
      if (nr !== zapytanie.current) return;
      if (wynik.length === 0) setKomunikat(teksty.brakDzialki);
      else if (wynik.length === 1) onWybrano(wynik[0]);
      else setLista([...wynik].sort((a, b) => (a.gmina ?? '').localeCompare(b.gmina ?? '', 'pl')));
    } catch {
      if (nr === zapytanie.current) setKomunikat(teksty.bladDzialki);
    } finally {
      if (nr === zapytanie.current) setSzukam(false);
    }
  }

  const pokazLinkPinezki = onPinezka && (komunikat === teksty.brakDzialki || komunikat === teksty.bladDzialki);

  return (
    <div className="ka-pole-dzialki">
      <label className="ka-etykieta">
        {teksty.poleDzialka}
        <input
          className="ka-input ka-input-dzialka"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={teksty.przykladDzialki}
          value={tekst}
          autoFocus
          onChange={(e) => {
            zapytanie.current++;
            setTekst(e.target.value);
            setLista(null);
            setKomunikat(null);
            setSzukam(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void szukaj();
            }
          }}
        />
      </label>
      <button type="button" className="ka-btn ka-btn-glowny" disabled={szukam} onClick={() => void szukaj()}>
        {szukam ? teksty.szukamDzialki : teksty.przyciskSzukajDzialki}
      </button>
      {komunikat && (
        <p className="ka-komunikat" role="alert">
          {komunikat}
          {pokazLinkPinezki && (
            <>
              {' '}
              <button type="button" className="ka-link" onClick={onPinezka}>{teksty.wejsciePinezka}</button>
            </>
          )}
        </p>
      )}
      {lista && (
        <div className="ka-gminy" role="group" aria-label={teksty.wybierzGmine}>
          <p className="ka-pytanie">{teksty.wybierzGmine}</p>
          {lista.map((d) => (
            <button key={d.identyfikator} type="button" className="ka-opcja ka-gmina" onClick={() => onWybrano(d)}>
              <span className="ka-gmina-nazwa">{d.gmina ?? d.identyfikator}</span>
              {d.obreb && <small className="ka-pozycja-opis">{wstaw(teksty.gminaOpis, { obreb: d.obreb })}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
