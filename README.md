# mirr-krok-adres

Krok adresu wielokrotnego użytku dla landingów kalkulatorowych MIRR (Budowalka). Dwa ekrany:

1. **Adres** — pole z podpowiedziami po fragmencie („Klonowa 7 Sosn…”), ręczny wpis jako zapas.
2. **Mapa** — dom na ortofotomapie Geoportalu z obrysem z ewidencji, pytanie „To ten dom?”
   („Zgadza się, dalej” / „Zaznaczę dom sam” — rysowanie palcem po rogach), obwód i rzut liczone
   w przeglądarce, kondygnacje z ewidencji z linkiem „Popraw” (pytanie tylko, gdy ewidencja nie zna domu).

Wynik to komplet danych publicznych o nieruchomości: adres z TERYT/SIMC/ULIC, obrys (GeoJSON), obwód,
rzut, kondygnacje i ich źródło, identyfikator EGiB, funkcja budynku, kod KST, kategoria istnienia,
działka (numer, obręb, gmina, powiat, województwo, powierzchnia, obrys), inne budynki na tej działce,
czy powiat jest w bazie. Komponent **nie liczy niczego branżowego** — elewację, dach czy podłogi liczy landing.

Pierwszy odbiorca: **On the Wall Design (Mariusz Surmacz)**, ocieplenia w Zagłębiu. Następni: Grey House
(tylko adres, bez mapy), Niezawodne Instalacje.

Repo jest publiczne wyłącznie po to, żeby Vercel pobrał je jako zależność git bez tokenu. Nie ma tu
danych klientów, tekstów per firma ani kluczy: wszystko wchodzi propsami z landingu, a klucz MIRR zostaje
w trasach proxy landingu. Kod jest własnością Budowalki (`UNLICENSED`).

## Backend

Komponent rozmawia wyłącznie z trasami proxy landingu (`/api/geo/*`), które przekazują zapytania
do MIRR (`GET /api/v1/geo/podpowiedzi|budynek|zasieg`, klucz API firmy ze scope'ami `geo:*`).
MIRR łączy ULDK (obrys budynku i działki), BDOT10k z lokalnej bazy (kondygnacje, funkcja, EGiB;
import powiatu `bin/rake geo:import_powiat[TERYT]`), Photon (podpowiedzi) i geokoder GUGiK (TERYT).
Spec: `smova-3/docs/superpowers/specs/2026-09-13-komponent-krok-adres-design.md`.

## Instalacja w landingu (Next 15, React 19)

```bash
npm i github:Budowalka/mirr-krok-adres#v0.1.4 leaflet @geoman-io/leaflet-geoman-free
```

`next.config.ts`:

```ts
const nextConfig = { transpilePackages: ['mirr-krok-adres'] };
```

Trasy proxy (`src/app/api/geo/[akcja]/route.ts`), klucz MIRR tylko po stronie serwera — gotowy wzór
w `demo/src/app/api/geo/[akcja]/route.ts`.

Na stronie kalkulatora:

```tsx
'use client';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'mirr-krok-adres/styles.css';
import { KrokAdresu, type WynikKrokuAdresu } from 'mirr-krok-adres';

<KrokAdresu
  api="/api/geo"
  bias={{ lat: 50.28, lon: 19.13 }}          // środek obszaru działania firmy
  numerKroku={{ adres: 1, mapa: 2, z: 6 }}
  linia={(w) => w.obwod_m && w.kondygnacje
    ? { etykieta: 'Elewacja do ocieplenia', wartosc: `ok. ${Math.round(w.obwod_m * w.kondygnacje * 3 * 0.9)} m²`, opis: `${w.obwod_m} m × ${w.kondygnacje * 3} m minus otwory` }
    : null}
  teksty={{ naglowekAdres: 'Gdzie stoi Twój dom?' }}   // Partial<Teksty>, reszta domyślna
  onGotowe={(wynik: WynikKrokuAdresu) => { /* zapisz do stanu formularza, przejdź dalej */ }}
  onPomin={() => { /* stara ścieżka: pola powierzchni ręcznie */ }}
/>
```

Tokeny stylu w `globals.css` landingu:

```css
.ka { --ka-akcent: var(--acc); --ka-akcent-ciemny: var(--acc-dark); --ka-tekst: var(--ink);
      --ka-tekst-slaby: var(--ink2); --ka-linia: var(--line); --ka-tlo: var(--bg); --ka-tlo-2: var(--bg2);
      --ka-font: var(--font-sans), sans-serif; }
```

`pokazMape={false}` = tylko krok adresu (dane publiczne i tak są zbierane; pytanie o kondygnacje,
gdy ewidencja ich nie zna). Kafle domyślnie z WMTS Geoportalu (0,1 s na kafel); `zrodloKafli={{ typ: 'wms' }}` przełącza na WMS
(2–3 s), `{ typ: 'xyz', url }` na innego dostawcę.

## Kontrakt wyjścia

`WynikKrokuAdresu` w `src/typy.ts` (pola: `adres`, `obrys`, `zrodlo_obrysu` ewidencja/reczne/brak,
`obwod_m`, `rzut_m2`, `kondygnacje`, `zrodlo_kondygnacji`, `identyfikator_egib`, `budynek`, `dzialka`,
`inne_budynki_na_dzialce`, `powiat`).

## Rozwój

```bash
npm install && npm test && npm run typecheck
cd demo && npm install && npm run dev      # strona demo z panelem „Dane o nieruchomości”
```

Testy w jsdom używają `FalszywyAdapterMapy` (bez Leafleta); prawdziwa mapa = `utworzAdapterLeaflet`.

## Pułapki (sprawdzone 13.09.2026)

- ULDK działa z `xy=lon,lat,4326` (SRID w parametrze), osobne `srid=4326` zwraca „brak wyników”.
- Identyfikator budynku z ULDK ≠ identyfikator EGiB z BDOT10k dla tego samego obrysu; MIRR dopasowuje po punkcie.
- `posList` w GML to pary easting northing (EPSG:2180); obwód i rzut liczymy po rzutowaniu, nie z lon/lat.
- Photon to publiczna instancja bez gwarancji; na produkcję własna instancja albo Google Places (MIRR ma zaczep).
