// src/__tests__/PoleDzialki.test.tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Api } from '../api';
import { PoleDzialki } from '../PoleDzialki';
import { DOMYSLNE_TEKSTY } from '../teksty';
import type { DzialkaZListy } from '../typy';

const KWADRAT = { type: 'Polygon' as const, coordinates: [[[20.8138, 52.1824], [20.8142, 52.1824], [20.8142, 52.1828], [20.8138, 52.1828], [20.8138, 52.1824]]] };
function dz(gmina: string, identyfikator: string, punkt = { lat: 52.18, lon: 20.81 }): DzialkaZListy {
  return { identyfikator, gmina, obreb: '0010', numer: '64/4', punkt, obrys: KWADRAT };
}
// Prawdziwy jest tylko Pruszków (parytet ze specu 6.1); reszta przykładowa, kolejność celowo pomieszana.
const PIEC = [dz('Warszawa', 'T1.0010.64/4'), dz('Pruszków', '142102_1.0010.64/4', { lat: 52.182628, lon: 20.814037 }), dz('Łomianki', 'T2.0010.64/4'), dz('Grodzisk Mazowiecki', 'T3.0010.64/4'), dz('Sochaczew', 'T4.0010.64/4')];

type ApiTestowe = Api & { dzialka: ReturnType<typeof vi.fn> };
function api(dzialka: (obreb: string, numer: string) => Promise<DzialkaZListy[]>): ApiTestowe {
  return { podpowiedzi: vi.fn(), budynek: vi.fn(), pozwolenie: vi.fn(), dzialka: vi.fn(dzialka) } as unknown as ApiTestowe;
}
function renderuj(a: ApiTestowe, onPinezka?: () => void) {
  const onWybrano = vi.fn();
  const r = render(<PoleDzialki api={a} teksty={DOMYSLNE_TEKSTY} onWybrano={onWybrano} onPinezka={onPinezka} />);
  return { ...r, onWybrano, pole: screen.getByPlaceholderText('np. Dobra 1006') as HTMLInputElement };
}
const wpisz = (pole: HTMLInputElement, tekst: string) => fireEvent.change(pole, { target: { value: tekst } });
const enter = (pole: HTMLInputElement) => fireEvent.keyDown(pole, { key: 'Enter' });

describe('PoleDzialki', () => {
  it('zły zapis: komunikat od razu, bez zapytania do MIRR i bez linku do pinezki', () => {
    const a = api(async () => PIEC);
    const { pole } = renderuj(a, vi.fn());
    wpisz(pole, '64/4');
    enter(pole);
    expect(screen.getByRole('alert').textContent).toContain(DOMYSLNE_TEKSTY.zlyNumerDzialki);
    expect(a.dzialka).not.toHaveBeenCalled();
    expect(screen.queryByText('Zaznacz na mapie')).toBeNull();
  });

  it('pięć gmin: pyta z obrębem i numerem, lista alfabetycznie po polsku, wybór gminy oddaje działkę', async () => {
    const a = api(async () => PIEC);
    const { pole, onWybrano, container } = renderuj(a);
    wpisz(pole, 'obręb 10, dz. 64/4');
    fireEvent.click(screen.getByText('Znajdź działkę'));
    await screen.findByText('W której gminie jest ta działka?');
    expect(a.dzialka).toHaveBeenCalledWith('10', '64/4');
    expect(Array.from(container.querySelectorAll('.ka-gmina-nazwa')).map((e) => e.textContent)).toEqual(['Grodzisk Mazowiecki', 'Łomianki', 'Pruszków', 'Sochaczew', 'Warszawa']);
    expect(screen.getAllByText('obręb 0010')).toHaveLength(5);
    fireEvent.click(screen.getByText('Pruszków'));
    expect(onWybrano).toHaveBeenCalledWith(PIEC[1]);
  });

  it('jedna działka: od razu wybrana, bez listy gmin', async () => {
    const { pole, onWybrano } = renderuj(api(async () => [PIEC[1]]));
    wpisz(pole, '10 64/4');
    enter(pole);
    await waitFor(() => expect(onWybrano).toHaveBeenCalledWith(PIEC[1]));
    expect(screen.queryByText('W której gminie jest ta działka?')).toBeNull();
  });

  it('brak działki: komunikat i link „Zaznacz na mapie” (tylko gdy pinezka jest dostępna)', async () => {
    const onPinezka = vi.fn();
    const { pole, unmount } = renderuj(api(async () => []), onPinezka);
    wpisz(pole, '10 9999');
    enter(pole);
    expect((await screen.findByRole('alert')).textContent).toContain(DOMYSLNE_TEKSTY.brakDzialki);
    fireEvent.click(screen.getByText('Zaznacz na mapie'));
    expect(onPinezka).toHaveBeenCalled();
    unmount();

    const b = renderuj(api(async () => []));
    wpisz(b.pole, '10 9999');
    enter(b.pole);
    await screen.findByRole('alert');
    expect(screen.queryByText('Zaznacz na mapie')).toBeNull();
  });

  it('błąd sieci albo stare proxy (404): komunikat o chwilowym problemie', async () => {
    const { pole } = renderuj(api(async () => { throw new Error('dzialka: HTTP 404'); }));
    wpisz(pole, '10 64/4');
    enter(pole);
    expect((await screen.findByRole('alert')).textContent).toContain(DOMYSLNE_TEKSTY.bladDzialki);
  });

  it('stara odpowiedź po zmianie tekstu jest ignorowana, a przycisk nie zostaje zablokowany', async () => {
    let rozwiaz: (l: DzialkaZListy[]) => void = () => {};
    const { pole, onWybrano } = renderuj(api(() => new Promise((r) => { rozwiaz = r; })));
    wpisz(pole, '10 64/4');
    fireEvent.click(screen.getByText('Znajdź działkę'));
    expect((screen.getByText('Szukam działki…') as HTMLButtonElement).disabled).toBe(true);
    wpisz(pole, '10 65');
    expect((screen.getByText('Znajdź działkę') as HTMLButtonElement).disabled).toBe(false);
    await act(async () => { rozwiaz([PIEC[1]]); });
    expect(onWybrano).not.toHaveBeenCalled();
    expect(screen.queryByText('W której gminie jest ta działka?')).toBeNull();
  });

  it('odmontowanie w trakcie zapytania (klient przełączył zakładkę): odpowiedź nie wybiera działki', async () => {
    let rozwiaz: (l: DzialkaZListy[]) => void = () => {};
    const { pole, onWybrano, unmount } = renderuj(api(() => new Promise((r) => { rozwiaz = r; })));
    wpisz(pole, '10 64/4');
    enter(pole);
    unmount();
    await act(async () => { rozwiaz([PIEC[1]]); });
    expect(onWybrano).not.toHaveBeenCalled();
  });

  it('bez <form>: wszystkie przyciski type="button", Enter obsłużony w polu', () => {
    const { container } = renderuj(api(async () => PIEC));
    expect(container.querySelector('form')).toBeNull();
    for (const b of Array.from(container.querySelectorAll('button'))) expect(b.getAttribute('type')).toBe('button');
  });
});
