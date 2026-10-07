// src/__tests__/KrokAdresuWejscia.test.tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KrokAdresu } from '../KrokAdresu';
import type { AdapterMapy } from '../mapa/adapter';
import { FalszywyAdapterMapy } from '../mapa/falszywy';

const PRUSZKOW = { lat: 52.182628, lon: 20.814037 };
// Obrys działki przykładowy (~36 × 33 m wokół punktu parytetu ze specu 6.1), nie z ewidencji.
const DZIALKA_OBRYS = { type: 'Polygon' as const, coordinates: [[[20.813817, 52.182448], [20.814257, 52.182448], [20.814257, 52.182808], [20.813817, 52.182808], [20.813817, 52.182448]]] };
const DZ_PRUSZKOW = { identyfikator: '142102_1.0010.64/4', gmina: 'Pruszków', obreb: '0010', numer: '64/4', punkt: PRUSZKOW, obrys: DZIALKA_OBRYS };
const BUDYNEK_PRUSZKOW = {
  obrys: null, zrodlo_obrysu: 'brak', obwod_m: null, rzut_m2: null, kondygnacje: null, zrodlo_kondygnacji: null,
  identyfikator_egib: null, identyfikator_uldk: null, budynek: null, inne_budynki_na_dzialce: [], teryt: null,
  dzialka: { identyfikator: '142102_1.0010.64/4', numer: '64/4', obreb: '0010', gmina: 'Pruszków', powiat: 'pruszkowski', wojewodztwo: 'mazowieckie', powierzchnia_m2: 1204.3, obrys: DZIALKA_OBRYS },
  powiat: { teryt: '1421', w_bazie: true },
};
// Parytet ze specu 6.2 (numer GUNB zmyślony).
const P = { numer_gunb: 'TEST-0001', data_decyzji: '2026-01-12', rodzaj: 'budowa nowego', nazwa_zamierzenia: 'BUDOWA BUDYNKU MIESZKALNEGO JEDNORODZINNEGO DWULOKALOWEGO', kubatura: 1428.59, units: 2 };

function fetchMock(opcje: { pozwolenieStatus?: number } = {}) {
  return vi.fn(async (url: string) => {
    const u = new URL(url, 'http://localhost');
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    switch (u.pathname) {
      case '/api/geo/budynek':
        return ok(BUDYNEK_PRUSZKOW);
      case '/api/geo/dzialka':
        return ok({ dzialki: u.searchParams.get('numer') === '64/4' ? [DZ_PRUSZKOW, { ...DZ_PRUSZKOW, identyfikator: 'T1.0010.64/4', gmina: 'Sochaczew', punkt: { lat: 52.23, lon: 20.24 } }] : [] });
      case '/api/geo/pozwolenie':
        if (opcje.pozwolenieStatus) return { ok: false, status: opcje.pozwolenieStatus, json: async () => ({ error: 'Nieznana akcja.' }) };
        return ok({ pozwolenie: u.searchParams.get('dzialka') === '142102_1.0010.64/4' ? P : null });
      default:
        return { ok: false, status: 404, json: async () => ({}) };
    }
  });
}

let f: ReturnType<typeof fetchMock>;
beforeEach(() => { f = fetchMock(); vi.stubGlobal('fetch', f); });
afterEach(() => vi.unstubAllGlobals());

const zakladki = () => screen.getAllByRole('tab');
const wybrana = () => zakladki().find((z) => z.getAttribute('aria-selected') === 'true')?.textContent;
const zapytanieBudynku = () => f.mock.calls.map(([u]) => new URL(u, 'http://localhost')).find((u) => u.pathname === '/api/geo/budynek')!;

describe('KrokAdresu v0.3.0: wejścia, cel i pozwolenie', () => {
  it('trzy wejścia, pinezka, cel „dzialka”, pozwolenie: od zakładki do onGotowe(wynik, { pozwolenie })', async () => {
    const onGotowe = vi.fn();
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" wejscia={['adres', 'pinezka', 'numer_dzialki']} cel="dzialka" sprawdzPozwolenie onGotowe={onGotowe} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    expect(zakladki().map((z) => z.textContent)).toEqual(['Adres', 'Zaznacz na mapie', 'Numer działki']);
    expect(wybrana()).toBe('Adres');

    fireEvent.click(screen.getByRole('tab', { name: 'Zaznacz na mapie' }));
    expect(screen.getByRole('heading', { name: 'Zaznacz swoją działkę' })).toBeTruthy();
    expect(adapter.wybieranie).toBeTypeOf('function');
    expect((screen.getByText('Dotknij mapy, żeby postawić pinezkę.') as HTMLButtonElement).disabled).toBe(true);

    act(() => adapter.dotknij(PRUSZKOW));
    expect(adapter.pinezka).toEqual(PRUSZKOW);
    fireEvent.click(screen.getByText('To tutaj, dalej'));
    expect(adapter.wybieranie).toBeNull();
    expect(screen.getByRole('heading', { name: 'To Twoja działka?' })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();

    await screen.findByText('Działka 64/4, obręb 0010, Pruszków');
    expect(adapter.dzialka).toEqual(DZIALKA_OBRYS);
    expect(zapytanieBudynku().searchParams.has('miasto')).toBe(false);

    fireEvent.click(screen.getByText('Tak, to moja działka'));
    await waitFor(() => expect(onGotowe).toHaveBeenCalledTimes(1));
    const [wynik, dodatki] = onGotowe.mock.calls[0];
    expect(wynik).toMatchObject({ zrodlo_punktu: 'pinezka', punkt: PRUSZKOW, zrodlo_obrysu: 'brak', obrys: null, kondygnacje: null });
    expect(wynik.dzialka.identyfikator).toBe('142102_1.0010.64/4');
    expect(wynik.adres).toMatchObject({ ulica: '', numer: '', miasto: 'Pruszków', zrodlo: 'reczny', tekst: 'Działka 64/4, obręb 0010, Pruszków', lat: 52.182628, lon: 20.814037 });
    expect(dodatki).toEqual({ pozwolenie: P });
  });

  it('numer działki: „10 64/4” → wybór gminy → działka na mapie → potwierdzenie (bez pozwolenia jeden argument)', async () => {
    const onGotowe = vi.fn();
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" wejscia={['adres', 'numer_dzialki']} cel="dzialka" onGotowe={onGotowe} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Numer działki' }));
    expect(screen.getByRole('heading', { name: 'Podaj numer działki' })).toBeTruthy();
    const pole = screen.getByPlaceholderText('np. Dobra 1006');
    fireEvent.change(pole, { target: { value: '10 64/4' } });
    fireEvent.keyDown(pole, { key: 'Enter' });
    await screen.findByText('W której gminie jest ta działka?');
    const zapytanie = f.mock.calls.map(([u]) => new URL(u, 'http://localhost')).find((u) => u.pathname === '/api/geo/dzialka')!;
    expect([zapytanie.searchParams.get('obreb'), zapytanie.searchParams.get('numer')]).toEqual(['10', '64/4']);

    fireEvent.click(screen.getByText('Pruszków'));
    expect(adapter.centrum).toEqual(PRUSZKOW);
    expect(adapter.zoom).toBe(18);
    expect(adapter.dzialka).toEqual(DZIALKA_OBRYS);
    fireEvent.click(await screen.findByText('Tak, to moja działka'));
    expect(onGotowe.mock.calls[0]).toHaveLength(1);
    expect(onGotowe.mock.calls[0][0]).toMatchObject({ zrodlo_punktu: 'numer_dzialki', punkt: PRUSZKOW, dzialka: { identyfikator: '142102_1.0010.64/4' } });
  });

  it('stare proxy bez akcji „pozwolenie” (404): krok kończy się z { pozwolenie: null }, bez komunikatu błędu', async () => {
    vi.stubGlobal('fetch', fetchMock({ pozwolenieStatus: 404 }));
    const onGotowe = vi.fn();
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" wejscia={['pinezka']} cel="dzialka" sprawdzPozwolenie onGotowe={onGotowe} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    act(() => adapter.dotknij(PRUSZKOW));
    fireEvent.click(screen.getByText('To tutaj, dalej'));
    fireEvent.click(await screen.findByText('Tak, to moja działka'));
    await waitFor(() => expect(onGotowe).toHaveBeenCalled());
    expect(onGotowe.mock.calls[0][1]).toEqual({ pozwolenie: null });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('„Zmień” po pinezce: ta sama zakładka, pinezka zdjęta, tryb pinezki znów włączony, widok zostaje przy działce', async () => {
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" wejscia={['adres', 'pinezka']} cel="dzialka" onGotowe={vi.fn()} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Zaznacz na mapie' }));
    act(() => adapter.dotknij(PRUSZKOW));
    fireEvent.click(screen.getByText('To tutaj, dalej'));
    await screen.findByText('Tak, to moja działka');
    fireEvent.click(screen.getByText('Zmień'));
    expect(screen.getByRole('heading', { name: 'Zaznacz swoją działkę' })).toBeTruthy();
    expect(wybrana()).toBe('Zaznacz na mapie');
    expect(adapter.pinezka).toBeNull();
    expect(adapter.dzialka).toBeNull();
    expect(adapter.wybieranie).toBeTypeOf('function');
    expect(adapter.zoom).toBe(18);
  });

  it('drugie dotknięcie mapy przestawia pinezkę; potwierdzony jest ostatni punkt', async () => {
    const onGotowe = vi.fn();
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" wejscia={['pinezka']} cel="dzialka" onGotowe={onGotowe} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    act(() => adapter.dotknij({ lat: 52.1, lon: 20.7 }));
    act(() => adapter.dotknij(PRUSZKOW));
    expect(adapter.pinezka).toEqual(PRUSZKOW);
    fireEvent.click(screen.getByText('To tutaj, dalej'));
    fireEvent.click(await screen.findByText('Tak, to moja działka'));
    expect(onGotowe.mock.calls[0][0].punkt).toEqual(PRUSZKOW);
  });

  it('pierwsza pozycja z „wejscia” jest domyślną zakładką', () => {
    render(<KrokAdresu api="/api/geo" wejscia={['pinezka', 'adres']} onGotowe={vi.fn()} onPomin={vi.fn()} adapterMapy={() => new FalszywyAdapterMapy()} />);
    expect(wybrana()).toBe('Zaznacz na mapie');
    expect(screen.getByRole('heading', { name: 'Zaznacz swoją działkę' })).toBeTruthy();
  });

  it('bez mapy pinezka znika z zakładek; jedno pozostałe wejście = brak zakładek', () => {
    const { unmount } = render(<KrokAdresu api="/api/geo" pokazMape={false} wejscia={['adres', 'pinezka', 'numer_dzialki']} onGotowe={vi.fn()} onPomin={vi.fn()} />);
    expect(zakladki().map((z) => z.textContent)).toEqual(['Adres', 'Numer działki']);
    unmount();
    render(<KrokAdresu api="/api/geo" pokazMape={false} wejscia={['adres', 'pinezka']} onGotowe={vi.fn()} onPomin={vi.fn()} />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7')).toBeTruthy();
  });

  it('adapter z v0.2 (bez wybierzPunkt): zakładka pinezki ukryta, reszta działa', () => {
    const stary: AdapterMapy = { async zamontuj() {}, przelec() {}, pokazObrys() {}, rysuj() {}, edytujObrys() {}, przerwijRysowanie() {}, zniszcz() {} };
    render(<KrokAdresu api="/api/geo" wejscia={['adres', 'pinezka', 'numer_dzialki']} onGotowe={vi.fn()} onPomin={vi.fn()} adapterMapy={() => stary} />);
    expect(zakladki().map((z) => z.textContent)).toEqual(['Adres', 'Numer działki']);
  });

  it('cel „budynek” z pinezką: po potwierdzeniu dotychczasowy ekran domu, budynek pytany bez adresu', async () => {
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" wejscia={['pinezka']} onGotowe={vi.fn()} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    act(() => adapter.dotknij(PRUSZKOW));
    fireEvent.click(screen.getByText('To tutaj, dalej'));
    await screen.findByText('Zaznacz dom na mapie');
    expect(screen.getByRole('heading', { name: 'To ten dom?' })).toBeTruthy();
    expect(zapytanieBudynku().searchParams.has('miasto')).toBe(false);
  });

  it('szeroko: klasa ka-szeroki, owijki .ka-bok i .ka-bok-dol, mapa pomiędzy', () => {
    const { container } = render(<KrokAdresu api="/api/geo" szeroko wejscia={['adres', 'numer_dzialki']} onGotowe={vi.fn()} onPomin={vi.fn()} adapterMapy={() => new FalszywyAdapterMapy()} />);
    const korzen = container.firstChild as HTMLElement;
    expect(korzen.className).toBe('ka ka-ekran ka-scena ka-szeroki');
    expect(Array.from(korzen.children).map((e) => e.className)).toEqual(['ka-bok', 'ka-mapa-obszar', 'ka-bok-dol']);
    expect(korzen.querySelector('.ka-bok [role="tablist"]')).toBeTruthy();
  });

  it('kliknięcie aktywnej zakładki „Zaznacz na mapie” nie zdejmuje postawionej pinezki', () => {
    const adapter = new FalszywyAdapterMapy();
    render(<KrokAdresu api="/api/geo" wejscia={['adres', 'pinezka']} cel="dzialka" onGotowe={vi.fn()} onPomin={vi.fn()} adapterMapy={() => adapter} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Zaznacz na mapie' }));
    act(() => adapter.dotknij(PRUSZKOW));
    fireEvent.click(screen.getByRole('tab', { name: 'Zaznacz na mapie' }));
    expect(wybrana()).toBe('Zaznacz na mapie');
    expect(adapter.pinezka).toEqual(PRUSZKOW);
    expect((screen.getByText('To tutaj, dalej') as HTMLButtonElement).disabled).toBe(false);
  });
});
