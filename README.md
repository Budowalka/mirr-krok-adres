# mirr-krok-adres

Krok adresu wielokrotnego użytku dla landingów kalkulatorowych MIRR (Budowalka). Jeden ekran, wzór Roofr:

1. Mapa satelitarna (ortofotomapa Geoportalu) od pierwszej sekundy, widok na obszar działania firmy;
   pole adresu z podpowiedziami pływa nad mapą („Klonowa 7 Sosn…”), ręczny wpis jako zapas.
2. Po wyborze adresu przelot do domu, obrys z ewidencji i działka, pytanie „To ten dom?”
   („Zgadza się, dalej” / „Zaznaczę samodzielnie” — rysowanie palcem po rogach, rogi do przeciągania),
   obwód i rzut liczone w przeglądarce, kondygnacje z ewidencji z linkiem „Popraw”
   (pytanie tylko, gdy ewidencja nie zna domu).

Wynik to komplet danych publicznych o nieruchomości: adres z TERYT/SIMC/ULIC, obrys (GeoJSON), obwód,
rzut, kondygnacje i ich źródło, identyfikator EGiB, funkcja budynku, kod KST, kategoria istnienia,
działka (numer, obręb, gmina, powiat, województwo, powierzchnia, obrys), inne budynki na tej działce,
czy powiat jest w bazie. Komponent **nie liczy niczego branżowego** — elewację, dach czy podłogi liczy landing.

Pierwszy odbiorca: **On the Wall Design (Mariusz Surmacz)**, ocieplenia w Zagłębiu. Następni: Grey House
(tylko adres, bez mapy), Niezawodne Instalacje. Od v0.3.0 także Po Twojemu (elektryk, Szczecin): pinezka, numer działki i karta pozwolenia na budowę.

Repo jest publiczne wyłącznie po to, żeby Vercel pobrał je jako zależność git bez tokenu. Nie ma tu
danych klientów, tekstów per firma ani kluczy: wszystko wchodzi propsami z landingu, a klucz MIRR zostaje
w trasach proxy landingu. Kod jest własnością Budowalki (`UNLICENSED`).

## Backend

Komponent rozmawia wyłącznie z trasami proxy landingu (`/api/geo/*`), które przekazują zapytania
do MIRR (`GET /api/v1/geo/podpowiedzi|budynek|zasieg`, klucz API firmy ze scope'ami `geo:*`).
MIRR łączy ULDK (obrys budynku i działki), BDOT10k z lokalnej bazy (kondygnacje, funkcja, EGiB;
import powiatu `bin/rake geo:import_powiat[TERYT]`), Photon (podpowiedzi) i geokoder GUGiK (TERYT).
Spec: `smova-3/docs/superpowers/specs/2026-09-13-komponent-krok-adres-design.md`.
Od v0.3.0 dochodzą GET /api/v1/geo/dzialka (scope geo:dzialka) i GET /api/v1/geo/pozwolenie (scope geo:pozwolenie); trasy proxy landingu muszą mieć te akcje na liście (wzór: demo/src/app/api/geo/[akcja]/route.ts). Bez nich numer działki pokazuje komunikat o chwilowym problemie, a karta pozwolenia się nie pojawia; reszta kroku działa.

## Instalacja w landingu (Next 15, React 19)

```bash
npm i github:Budowalka/mirr-krok-adres#v0.4.0 leaflet @geoman-io/leaflet-geoman-free
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

## Nowe w v0.3.0: pinezka, numer działki, pozwolenie na budowę

Wszystko włącza się propsami; bez nich krok działa jak v0.2 (pilnuje tego `src/__tests__/zgodnosc.test.tsx`).

| Prop | Domyślnie | Co robi |
|---|---|---|
| `wejscia` | `['adres']` | Zakładki: `'adres'`, `'pinezka'` (dotknięcie mapy; wymaga mapy), `'numer_dzialki'` („10 64/4” → wybór gminy). Pierwsza pozycja = domyślna zakładka. |
| `cel` | `'budynek'` | `'dzialka'`: po wskazaniu miejsca ekran „To ta działka?” bez rysowania domu i bez pytania o kondygnacje. |
| `sprawdzPozwolenie` | `false` | Po znalezieniu działki krok pyta o pozwolenie na budowę (czeka najwyżej 3 s po kliknięciu) i oddaje je w drugim argumencie `onGotowe(wynik, { pozwolenie })`. |
| `szeroko` | `false` | Od 900 px mapa po lewej, pytania i przyciski po prawej. |

Przykład (elektryk):

```tsx
import { KartaBudowy, KrokAdresu, pozwolenieDoFormData, type Pozwolenie, type WynikKrokuAdresu } from 'mirr-krok-adres';

<KrokAdresu
  api="/api/geo"
  bias={{ lat: 53.43, lon: 14.55 }}
  wejscia={['adres', 'pinezka', 'numer_dzialki']}
  cel="dzialka"
  sprawdzPozwolenie
  szeroko
  onGotowe={(dom, dodatki) => { /* form_data.dom = dom; jeśli dodatki?.pozwolenie → pokaż kartę */ }}
  onPomin={() => { /* lead bez adresu */ }}
/>

<KartaBudowy
  pozwolenie={pozwolenie}            // null = nic się nie renderuje
  dzialka={dom.dzialka}
  onTak={(p) => zapisz({ pozwolenie: pozwolenieDoFormData(p, true) })}
  onNie={(p) => zapisz({ pozwolenie: pozwolenieDoFormData(p, false) })}
/>
```

Kontrakt wyniku dostaje dwa pola: `zrodlo_punktu` (`'adres' | 'pinezka' | 'numer_dzialki'`) i `punkt` (`{ lat, lon }`). Przy pinezce i numerze działki `adres.ulica` i `adres.numer` są puste, `adres.zrodlo` to `'reczny'`, a `adres.tekst` opisuje działkę („Działka 64/4, obręb 0010, Pruszków”). Własny adapter mapy z v0.2 działa dalej; zakładka pinezki chowa się, gdy adapter nie ma `wybierzPunkt` i `pokazPinezke`.

Demo bez backendu: `cd demo && GEO_MOCK=wszystko npm run dev`; ustawienia z adresu strony, np. `/?wejscia=adres,pinezka,numer_dzialki&cel=dzialka&pozwolenie=1&szeroko=1&obszar=pruszkow`. `GEO_MOCK=nowe` podaje z mocka tylko `dzialka` i `pozwolenie` (do czasu wdrożenia ich w MIRR).

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
- Domyślna ikona `L.marker` psuje się w bundlerze (zła ścieżka do obrazków), dlatego pinezka używa `divIcon`.
- W komponencie nie wolno używać `<form>`: landing osadza krok w swoim formularzu, a zagnieżdżone formularze są niepoprawnym HTML.
- Do testu w demo używaj `npm pack`, nie `npm link`: link duplikuje Reacta i hooki przestają działać.
- Datę decyzji o pozwoleniu formatuj z napisu (RRRR-MM-DD), nie przez `new Date`, bo strefa czasowa przesuwa dzień.
- Adapter Leaflet jest jednorazowy po `zniszcz()`: fabryka `adapterMapy` musi przy każdym wywołaniu zwracać NOWY adapter (bez singletona), inaczej ponowne zamontowanie w StrictMode zostawia stronę bez mapy.
