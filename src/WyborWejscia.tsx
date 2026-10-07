// src/WyborWejscia.tsx
import type { Teksty, Wejscie } from './typy';

type Props = {
  wejscia: Wejscie[];
  aktywne: Wejscie;
  teksty: Teksty;
  onZmiana: (wejscie: Wejscie) => void;
};

/** Zakładki „Adres / Zaznacz na mapie / Numer działki” (cele dotyku ≥ 44 px, zaznaczenie obramowaniem i paskiem). */
export function WyborWejscia({ wejscia, aktywne, teksty, onZmiana }: Props) {
  const etykiety: Record<Wejscie, string> = { adres: teksty.wejscieAdres, pinezka: teksty.wejsciePinezka, numer_dzialki: teksty.wejscieDzialka };
  return (
    <div className="ka-wejscia" role="tablist" aria-label={teksty.wejsciaEtykieta}>
      {wejscia.map((w) => (
        <button
          key={w}
          type="button"
          role="tab"
          aria-selected={w === aktywne}
          className={w === aktywne ? 'ka-wejscie ka-wejscie-aktywne' : 'ka-wejscie'}
          onClick={() => onZmiana(w)}
        >
          <Ikona rodzaj={w} />
          <span>{etykiety[w]}</span>
        </button>
      ))}
    </div>
  );
}

function Ikona({ rodzaj }: { rodzaj: Wejscie }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {rodzaj === 'adres' && (
        <>
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-5h4v5" />
        </>
      )}
      {rodzaj === 'pinezka' && (
        <>
          <path d="M12 22s7-7.2 7-12.5a7 7 0 0 0-14 0C5 14.8 12 22 12 22z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </>
      )}
      {rodzaj === 'numer_dzialki' && (
        <>
          <path d="M4 7l7-3 9 4-2 12-12-2z" />
          <path d="M9 11h6M9 15h4" />
        </>
      )}
    </svg>
  );
}
