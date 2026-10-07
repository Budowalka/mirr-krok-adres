// src/__tests__/EkranDzialki.test.tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Api } from '../api';
import { adresZPunktu } from '../dzialka';
import { EkranDzialki } from '../EkranDzialki';
import { FalszywyAdapterMapy } from '../mapa/falszywy';
import { DOMYSLNE_TEKSTY } from '../teksty';
import { PUSTA } from '../wynik';
import type { DzialkaZListy, OdpowiedzBudynek, Pozwolenie } from '../typy';

const PRUSZKOW = { lat: 52.182628, lon: 20.814037 };
// Obrys przykładowy (~36 × 33 m wokół punktu parytetu), nie z ewidencji.
const DZIALKA_OBRYS = { type: 'Polygon' as const, coordinates: [[[20.813817, 52.182448], [20.814257, 52.182448], [20.814257, 52.182808], [20.813817, 52.182808], [20.813817, 52.182448]]] };
const DOM = { type: 'Polygon' as const, coordinates: [[[20.8139, 52.1826], [20.8141, 52.1826], [20.8141, 52.1827], [20.8139, 52.1827], [20.8139, 52.1826]]] };
const BUDYNEK_PRUSZKOW: OdpowiedzBudynek = {
  ...PUSTA,
  dzialka: { identyfikator: '142102_1.0010.64/4', numer: '64/4', obreb: '0010', gmina: 'Pruszków', powiat: 'pruszkowski', wojewodztwo: 'mazowieckie', powierzchnia_m2: 1204.3, obrys: DZIALKA_OBRYS },
  powiat: { teryt: '1421', w_bazie: true },
};
const P: Pozwolenie = { numer_gunb: 'TEST-0001', data_decyzji: '2026-01-12', rodzaj: 'budowa nowego', nazwa_zamierzenia: 'BUDOWA BUDYNKU MIESZKALNEGO JEDNORODZINNEGO DWULOKALOWEGO', kubatura: 1428.59, units: 2 };
const WYBRANA: DzialkaZListy = { identyfikator: '142102_1.0010.64/4', gmina: 'Pruszków', obreb: '0010', numer: '64/4', punkt: PRUSZKOW, obrys: DZIALKA_OBRYS };

type ApiTestowe = Api & { budynek: ReturnType<typeof vi.fn>; pozwolenie: ReturnType<typeof vi.fn> };
function renderuj(
  budynek: OdpowiedzBudynek | Error,
  props: { sprawdzPozwolenie?: boolean; wybrana?: DzialkaZListy | null; zrodloPunktu?: 'adres' | 'pinezka' | 'numer_dzialki'; pozwolenie?: () => Promise<Pozwolenie | null> } = {}
) {
  const adapter = new FalszywyAdapterMapy();
  const api = {
    podpowiedzi: vi.fn(),
    dzialka: vi.fn(),
    budynek: vi.fn(async () => { if (budynek instanceof Error) throw budynek; return budynek; }),
    pozwolenie: vi.fn(props.pozwolenie ?? (async () => P)),
  } as unknown as ApiTestowe;
  const onGotowe = vi.fn();
  const onWstecz = vi.fn();
  const { unmount } = render(
    <EkranDzialki api={api} adres={adresZPunktu(PRUSZKOW, props.wybrana ?? null)} zrodloPunktu={props.zrodloPunktu ?? 'pinezka'} wybrana={props.wybrana ?? null}
      teksty={DOMYSLNE_TEKSTY} adapterRef={{ current: adapter }} sprawdzPozwolenie={props.sprawdzPozwolenie ?? false} onGotowe={onGotowe} onWstecz={onWstecz} />
  );
  return { adapter, api, onGotowe, onWstecz, unmount };
}

describe('EkranDzialki (cel „dzialka”)', () => {
  it('pinezka: budynek pytany samym punktem, działka na mapie i w panelu, bez rysowania i bez pytania o kondygnacje', async () => {
    const { adapter, api, onGotowe } = renderuj(BUDYNEK_PRUSZKOW);
    expect(screen.getByText(DOMYSLNE_TEKSTY.szukamWEwidencji)).toBeTruthy();
    await screen.findByText('Działka 64/4, obręb 0010, Pruszków');
    expect(api.budynek.mock.calls[0]).toEqual([52.182628, 20.814037]);
    expect(adapter.dzialka).toEqual(DZIALKA_OBRYS);
    expect(adapter.obrys).toBeNull();
    expect(screen.getByText('ok. 1204 m²')).toBeTruthy();
    expect(screen.queryByText('Ile kondygnacji ma dom?')).toBeNull();
    expect(screen.queryByText('Zaznacz dom na mapie')).toBeNull();

    fireEvent.click(screen.getByText('Tak, to moja działka'));
    expect(onGotowe.mock.calls[0]).toHaveLength(1);
    expect(onGotowe.mock.calls[0][0]).toMatchObject({
      zrodlo_punktu: 'pinezka', punkt: PRUSZKOW, obrys: null, zrodlo_obrysu: 'brak', kondygnacje: null, zrodlo_kondygnacji: null,
      adres: { tekst: 'Działka 64/4, obręb 0010, Pruszków', miasto: 'Pruszków', ulica: '', numer: '' },
    });
    expect(onGotowe.mock.calls[0][0].dzialka.identyfikator).toBe('142102_1.0010.64/4');
    expect(api.pozwolenie).not.toHaveBeenCalled();
  });

  it('sprawdzPozwolenie: przycisk „Chwileczkę…” i wyłączony do odpowiedzi rejestru, potem { pozwolenie }', async () => {
    let rozwiaz: (p: Pozwolenie | null) => void = () => {};
    const { api, onGotowe } = renderuj(BUDYNEK_PRUSZKOW, { sprawdzPozwolenie: true, pozwolenie: () => new Promise((r) => { rozwiaz = r; }) });
    await screen.findByText('Tak, to moja działka');
    await waitFor(() => expect(api.pozwolenie).toHaveBeenCalledWith('142102_1.0010.64/4'));
    fireEvent.click(screen.getByText('Tak, to moja działka'));
    expect((screen.getByText('Chwileczkę…') as HTMLButtonElement).disabled).toBe(true);
    expect(onGotowe).not.toHaveBeenCalled();
    rozwiaz(P);
    await waitFor(() => expect(onGotowe).toHaveBeenCalledTimes(1));
    expect(onGotowe.mock.calls[0][1]).toEqual({ pozwolenie: P });
  });

  it('rejestr odpowiada błędem: krok idzie dalej z { pozwolenie: null }', async () => {
    const { onGotowe } = renderuj(BUDYNEK_PRUSZKOW, { sprawdzPozwolenie: true, pozwolenie: async () => { throw new Error('pozwolenie: HTTP 404'); } });
    fireEvent.click(await screen.findByText('Tak, to moja działka'));
    await waitFor(() => expect(onGotowe).toHaveBeenCalled());
    expect(onGotowe.mock.calls[0][1]).toEqual({ pozwolenie: null });
  });

  it.each([
    ['ewidencja nie zna działki', PUSTA],
    ['ewidencja nie odpowiada', new Error('502')],
  ])('%s: komunikat i „Dalej”, wynik bez działki; klient nie utyka', async (_opis, odp) => {
    const { onGotowe } = renderuj(odp);
    await screen.findByText(DOMYSLNE_TEKSTY.brakDanychDzialki);
    const dalej = screen.getByText('Dalej') as HTMLButtonElement;
    expect(dalej.disabled).toBe(false);
    fireEvent.click(dalej);
    expect(onGotowe.mock.calls[0][0]).toMatchObject({ dzialka: null, zrodlo_obrysu: 'brak', zrodlo_punktu: 'pinezka' });
  });

  it('numer działki przy awarii ewidencji: działka z listy zostaje (powierzchnia z obrysu)', async () => {
    const { adapter, onGotowe } = renderuj(new Error('502'), { wybrana: WYBRANA, zrodloPunktu: 'numer_dzialki' });
    await screen.findByText('Działka 64/4, obręb 0010, Pruszków');
    expect(adapter.dzialka).toEqual(DZIALKA_OBRYS);
    fireEvent.click(screen.getByText('Tak, to moja działka'));
    expect(onGotowe.mock.calls[0][0]).toMatchObject({ zrodlo_punktu: 'numer_dzialki', dzialka: { identyfikator: '142102_1.0010.64/4', powiat: null } });
  });

  it('dom znany z ewidencji: obrys domu i działki na mapie, obrys i kondygnacje w wyniku', async () => {
    const zDomem: OdpowiedzBudynek = { ...BUDYNEK_PRUSZKOW, obrys: DOM, zrodlo_obrysu: 'ewidencja', kondygnacje: 2, zrodlo_kondygnacji: 'ewidencja', identyfikator_egib: '142102_1.0010.64_4.1_BUD' };
    const { adapter, onGotowe } = renderuj(zDomem);
    fireEvent.click(await screen.findByText('Tak, to moja działka'));
    expect(adapter.obrys).toEqual(DOM);
    expect(adapter.dzialka).toEqual(DZIALKA_OBRYS);
    expect(onGotowe.mock.calls[0][0]).toMatchObject({ obrys: DOM, zrodlo_obrysu: 'ewidencja', kondygnacje: 2, zrodlo_kondygnacji: 'ewidencja', identyfikator_egib: '142102_1.0010.64_4.1_BUD' });
  });

  it('„To nie ta działka” wraca do wskazywania miejsca', async () => {
    const { onWstecz } = renderuj(BUDYNEK_PRUSZKOW);
    fireEvent.click(await screen.findByText('To nie ta działka'));
    expect(onWstecz).toHaveBeenCalled();
  });

  it('wycofanie w trakcie czekania na pozwolenie: onGotowe nie jest wołane', async () => {
    let rozwiaz: (p: Pozwolenie | null) => void = () => {};
    const { onGotowe, onWstecz } = renderuj(BUDYNEK_PRUSZKOW, { sprawdzPozwolenie: true, pozwolenie: () => new Promise((r) => { rozwiaz = r; }) });
    fireEvent.click(await screen.findByText('Tak, to moja działka'));
    fireEvent.click(screen.getByText('To nie ta działka'));
    expect(onWstecz).toHaveBeenCalled();
    await act(async () => { rozwiaz(P); });
    expect(onGotowe).not.toHaveBeenCalled();
  });

  it('odmontowanie w trakcie czekania na pozwolenie: onGotowe nie jest wołane', async () => {
    let rozwiaz: (p: Pozwolenie | null) => void = () => {};
    const { onGotowe, unmount } = renderuj(BUDYNEK_PRUSZKOW, { sprawdzPozwolenie: true, pozwolenie: () => new Promise((r) => { rozwiaz = r; }) });
    fireEvent.click(await screen.findByText('Tak, to moja działka'));
    unmount();
    await act(async () => { rozwiaz(P); });
    expect(onGotowe).not.toHaveBeenCalled();
  });
});
