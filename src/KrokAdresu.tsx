import { useMemo, useState } from 'react';
import { utworzApi } from './api';
import { EkranAdresu } from './EkranAdresu';
import { EkranMapy } from './EkranMapy';
import { utworzAdapterLeaflet } from './mapa/leaflet';
import { DOMYSLNE_TEKSTY } from './teksty';
import type { Adres, KrokAdresuProps } from './typy';

/**
 * Krok adresu wielokrotnego użytku: 1) adres z podpowiedziami, 2) dom na ortofotomapie
 * z obrysem i kondygnacjami z ewidencji (albo rysowanie po rogach). Wynik = kontrakt
 * WynikKrokuAdresu (spec D3). Nic branżowego: elewację, dach czy podłogi liczy landing.
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
  const adapter = adapterMapy ?? utworzAdapterLeaflet;

  if (!adres) {
    return (
      <EkranAdresu
        api={klient}
        bias={bias}
        teksty={t}
        numerKroku={numerKroku ? { x: numerKroku.adres, y: numerKroku.z } : undefined}
        onWybrano={setAdres}
        onPomin={onPomin}
        onWstecz={onWstecz}
      />
    );
  }

  return (
    <EkranMapy
      api={klient}
      adres={adres}
      teksty={t}
      numerKroku={numerKroku ? { x: numerKroku.mapa, y: numerKroku.z } : undefined}
      wysokoscKondygnacji={wysokoscKondygnacji}
      linia={linia}
      adapter={adapter}
      zrodloKafli={zrodloKafli}
      pokazMape={pokazMape}
      onGotowe={onGotowe}
      onPomin={onPomin}
      onWstecz={() => setAdres(null)}
    />
  );
}
