import { useId, useMemo } from 'react';
import { opisDzialki } from './dzialka';
import { dataSlownie, zdanieZWielkiej } from './pozwolenie';
import { DOMYSLNE_TEKSTY_KARTY, wstaw } from './teksty';
import type { KartaBudowyProps } from './typy';

/**
 * Krok „To Twoja budowa?” (spec elektryka, przepływ krok 3): wpis z rejestru pozwoleń dla wskazanej działki.
 * Bez danych osobowych i bez kubatury (podpowiedź metrażu jest wyłączona, spec 6.3). Brak wpisu = nic.
 * Landing decyduje, co zapisać: pozwolenieDoFormData(p, true) po „tak”, (p, false) albo nic po „nie”.
 */
export function KartaBudowy({ pozwolenie, dzialka, teksty, onTak, onNie }: KartaBudowyProps) {
  const t = useMemo(() => ({ ...DOMYSLNE_TEKSTY_KARTY, ...(teksty ?? {}) }), [teksty]);
  const idNaglowka = useId();
  if (!pozwolenie) return null;
  const lokale = pozwolenie.units === 1 ? t.jedenLokal : pozwolenie.units === 2 ? t.dwaLokale : null;

  return (
    <section className="ka ka-karta-budowy" aria-labelledby={idNaglowka}>
      <div className="ka-karta-glowna">
        <IkonaBudowy />
        <h2 id={idNaglowka} className="ka-naglowek">{t.naglowek}</h2>
        <p className="ka-podpowiedz">{t.wstep}</p>
        <ul className="ka-karta-fakty">
          <li>{wstaw(t.decyzja, { data: dataSlownie(pozwolenie.data_decyzji) })}</li>
          <li>{lokale ? `${t.domJednorodzinny}, ${lokale}` : t.domJednorodzinny}</li>
          {dzialka && <li>{opisDzialki(dzialka)}</li>}
          {pozwolenie.nazwa_zamierzenia && (
            <li className="ka-karta-cytat">„{zdanieZWielkiej(pozwolenie.nazwa_zamierzenia)}”</li>
          )}
        </ul>
        <div className="ka-karta-przyciski">
          <button type="button" className="ka-btn ka-btn-glowny" onClick={() => onTak(pozwolenie)}>{t.tak}</button>
          <button type="button" className="ka-btn ka-btn-drugi" onClick={() => onNie(pozwolenie)}>{t.nie}</button>
        </div>
      </div>
      <aside className="ka-po-co">{t.poCoPytamy}</aside>
    </section>
  );
}

/** Dom w budowie, linia w kolorze akcentu (currentColor). 72 px na telefonie, 96 px na komputerze (CSS). */
function IkonaBudowy() {
  return (
    <svg className="ka-karta-ikona" viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M14 46 48 18l34 28" />
      <path d="M22 40v40h52V40" />
      <path d="M40 80V60h16v20" />
      <path d="M8 86h80" />
      <path d="M64 30V16h8v20" />
    </svg>
  );
}
