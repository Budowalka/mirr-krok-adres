# Historia zmian

Format: [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/). Wersja = tag git, instalacja `github:Budowalka/mirr-krok-adres#vX.Y.Z`. Wcześniejsze wersje: `git tag -n1`.

## [0.4.0] - 2026-10-08

### Zmienione
- Wszystkie teksty domyślne (`DOMYSLNE_TEKSTY`, `DOMYSLNE_TEKSTY_KARTY`) i komunikat walidacji adresu w formie grzecznościowej: bezosobowo albo „Państwo”, przyciski w głosie klienta. Decyzja Piotra 08.10.2026. Przykłady: „Podaj adres” → „Adres budowy”, „Zaznacz dom na mapie” → „Zaznaczę dom na mapie”, „Popraw” → „Poprawię”, „Cofnij” → „Cofam ostatni róg”, „Zmień” → „Inny adres”, zakładka „Zaznacz na mapie” → „Wskażę na mapie”, „To Twoja budowa?” → „To Państwa budowa?”, „To Twoja działka?” → „To ta działka?”.
- Landing, który nadpisuje teksty przez `teksty`, zachowuje swoje brzmienie; zmienia się tylko to, czego nie nadpisuje.

### Dodane
- Test strażnik: żaden tekst domyślny nie zawiera formy Ty.

## [0.3.0] - 2026-10-07

### Dodane
- Wskazanie miejsca pinezką na mapie (`wejscia` z `'pinezka'`), opcjonalne metody adaptera `wybierzPunkt`, `pokazPinezke`, `przerwijWybieranie`.
- Numer działki z wyborem gminy (`wejscia` z `'numer_dzialki'`, trasa `GET {api}/dzialka?obreb=&numer=`), parser „10 64/4” odporny na „obręb 10, dz. 64/4” i nazwę gminy.
- Parser czyta obręb po słowie „obręb/obr.” i nigdy nie traktuje numeru z „/” jako obrębu; przyjmuje też kolejność z dokumentów („dz. nr 64/4, obręb 0010”) oraz znaki interpunkcyjne na końcu.
- Klient API odrzuca działki z backendu, które nie mają ani punktu, ani obrysu.
- `cel="dzialka"`: ekran „To Twoja działka?” bez rysowania domu i bez pytania o kondygnacje.
- `sprawdzPozwolenie`: pozwolenie na budowę z rejestru (`GET {api}/pozwolenie?dzialka=`), drugi argument `onGotowe`, limit czekania 3 s.
- Komponent `KartaBudowy` („To Twoja budowa?”) i `pozwolenieDoFormData`; brak pozwolenia = nic się nie renderuje.
- `szeroko`: układ dwukolumnowy od 900 px.
- Kontrakt: `zrodlo_punktu` i `punkt` w `WynikKrokuAdresu`.
- Eksporty: `utworzApi`, `parsujNumerDzialki`, `opisDzialki`, `dataSlownie`, `DOMYSLNE_TEKSTY_KARTY` i typy.

### Zmienione
- Cele dotyku co najmniej 44 × 44 px dla wszystkich przycisków i linków komponentu, także „Zmień” w pigułce, „Wstecz”, „Popraw” i kontrolek przybliżenia mapy (pigułka ma mniejszy wewnętrzny odstęp, żeby nie urosła).
- Parser numeru działki i klient API: zakres opisany w „Dodane” (obręb po słowie kluczowym, odrzucanie działek bez punktu i obrysu).

### Naprawione
- Adapter Leaflet nie inicjalizuje już mapy po jej zniszczeniu (podwójny efekt w React StrictMode). Wcześniej w trybie deweloperskim pinezka, `flyTo` i obrys nie działały, a konsola pokazywała „Map container is already initialized”.
- Krok nie oddaje nieaktualnego wyniku, gdy użytkownik w trakcie czekania na pozwolenie wróci, zacznie rysować, zmieni kondygnacje albo odmontuje komponent.

### Zgodność
- Konsument v0.2.x bez nowych propsów: ten sam przebieg i wynik, plus dwa nowe pola (`zrodlo_punktu: 'adres'`, `punkt`). `onGotowe` dalej wołane synchronicznie i jednym argumentem.
