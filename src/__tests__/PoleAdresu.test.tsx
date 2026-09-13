import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../api';
import { PoleAdresu } from '../PoleAdresu';
import { DOMYSLNE_TEKSTY } from '../teksty';
import type { Podpowiedz } from '../typy';

const KLONOWA: Podpowiedz[] = [
  { rodzaj: 'adres', tekst: 'Klonowa 7, Czeladź 41-250', ulica: 'Klonowa', numer: '7', kod: '41-250', miasto: 'Czeladź', lat: 50.32, lon: 19.08 },
  { rodzaj: 'adres', tekst: 'Klonowa 7, Będzin 42-500', ulica: 'Klonowa', numer: '7', kod: '42-500', miasto: 'Będzin', lat: 50.33, lon: 19.13 },
  { rodzaj: 'adres', tekst: 'Klonowa 7, Sosnowiec 41-218', ulica: 'Klonowa', numer: '7', kod: '41-218', miasto: 'Sosnowiec', lat: 50.27, lon: 19.16 },
  { rodzaj: 'adres', tekst: 'Klonowa 7, Katowice 40-168', ulica: 'Klonowa', numer: '7', kod: '40-168', miasto: 'Katowice', lat: 50.27, lon: 19.03 },
];

type ApiTestowe = Api & { podpowiedzi: ReturnType<typeof vi.fn> };
function api(podpowiedzi: (q: string) => Promise<Podpowiedz[]> = async () => KLONOWA): ApiTestowe {
  return { podpowiedzi: vi.fn(podpowiedzi), budynek: vi.fn() } as unknown as ApiTestowe;
}

describe('PoleAdresu', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('nie pyta przy 2 znakach, pyta po 250 ms od 3 znaków z biasem i anuluje poprzednie zapytanie', async () => {
    const a = api();
    render(<PoleAdresu naMapie api={a} bias={{ lat: 50.28, lon: 19.13 }} teksty={DOMYSLNE_TEKSTY} onWybrano={vi.fn()} onPomin={vi.fn()} />);
    const pole = screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7');
    fireEvent.change(pole, { target: { value: 'Kl' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(a.podpowiedzi).not.toHaveBeenCalled();

    fireEvent.change(pole, { target: { value: 'Klon' } });
    await act(async () => { vi.advanceTimersByTime(100); });
    fireEvent.change(pole, { target: { value: 'Klono' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(a.podpowiedzi).toHaveBeenCalledTimes(1);
    expect(a.podpowiedzi.mock.calls[0][0]).toBe('Klono');
    expect(a.podpowiedzi.mock.calls[0][1]).toEqual({ lat: 50.28, lon: 19.13 });
  });

  it('pokazuje listę i po kliknięciu zwraca adres z kontraktem', async () => {
    const onWybrano = vi.fn();
    render(<PoleAdresu naMapie api={api()} bias={undefined} teksty={DOMYSLNE_TEKSTY} onWybrano={onWybrano} onPomin={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7'), { target: { value: 'Klonowa 7' } });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    const pozycje = screen.getAllByRole('option');
    expect(pozycje).toHaveLength(4);
    fireEvent.click(pozycje[0]);
    expect(onWybrano).toHaveBeenCalledWith(
      expect.objectContaining({ ulica: 'Klonowa', numer: '7', miasto: 'Czeladź', kod: '41-250', lat: 50.32, lon: 19.08, zrodlo: 'podpowiedz', tekst: 'Klonowa 7, Czeladź' })
    );
  });

  it('strzałki i Enter wybierają pozycję z klawiatury', async () => {
    const onWybrano = vi.fn();
    render(<PoleAdresu naMapie api={api()} bias={undefined} teksty={DOMYSLNE_TEKSTY} onWybrano={onWybrano} onPomin={vi.fn()} />);
    const pole = screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7');
    fireEvent.change(pole, { target: { value: 'Klonowa 7' } });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    screen.getAllByRole('option');
    fireEvent.keyDown(pole, { key: 'ArrowDown' });
    fireEvent.keyDown(pole, { key: 'ArrowDown' });
    fireEvent.keyDown(pole, { key: 'Enter' });
    expect(onWybrano).toHaveBeenCalledWith(expect.objectContaining({ miasto: 'Będzin' }));
  });

  it('tryb ręczny: szuka po pełnym adresie; trafienie daje zrodlo reczny, brak daje onPomin z komunikatem', async () => {
    vi.useRealTimers();
    const onWybrano = vi.fn();
    const onPomin = vi.fn();
    const a = api(async (q: string) => (q.includes('Zwierzyniecka') ? [{ ...KLONOWA[0], ulica: 'Zwierzyniecka', numer: '5', miasto: 'Sochaczew', kod: '96-500' }] : []));
    render(<PoleAdresu naMapie api={a} bias={undefined} teksty={DOMYSLNE_TEKSTY} onWybrano={onWybrano} onPomin={onPomin} />);
    fireEvent.click(screen.getByText('Nie ma mojego adresu na liście'));
    fireEvent.change(screen.getByPlaceholderText('np. Klonowa 7'), { target: { value: 'Zwierzyniecka 5' } });
    fireEvent.change(screen.getByPlaceholderText('np. Sosnowiec'), { target: { value: 'Sochaczew' } });
    fireEvent.click(screen.getByText('Znajdź na mapie'));
    await waitFor(() => expect(onWybrano).toHaveBeenCalledWith(expect.objectContaining({ zrodlo: 'reczny', miasto: 'Sochaczew', numer: '5' })));

    fireEvent.change(screen.getByPlaceholderText('np. Klonowa 7'), { target: { value: 'Nieistniejąca 99' } });
    fireEvent.click(screen.getByText('Znajdź na mapie'));
    await waitFor(() => expect(onPomin).toHaveBeenCalledWith(DOMYSLNE_TEKSTY.nieZnaleziono));
  });

  it('wybór ulicy (bez numeru) wstawia ją do pola i pyta ponownie, zamiast kończyć krok', async () => {
    const onWybrano = vi.fn();
    const a = api(async (q: string) =>
      q.startsWith('Franciszka Brzezińskiego')
        ? [{ rodzaj: 'adres', tekst: 'Franciszka Brzezińskiego 26A, Pruszków 05-800', ulica: 'Franciszka Brzezińskiego', numer: '26A', kod: '05-800', miasto: 'Pruszków', lat: 52.17, lon: 20.8 }]
        : [{ rodzaj: 'ulica', tekst: 'Franciszka Brzezińskiego, Pruszków 05-800', ulica: 'Franciszka Brzezińskiego', numer: null, kod: '05-800', miasto: 'Pruszków', lat: 52.17, lon: 20.8 }]
    );
    render(<PoleAdresu naMapie api={a} bias={undefined} teksty={DOMYSLNE_TEKSTY} onWybrano={onWybrano} onPomin={vi.fn()} />);
    const pole = screen.getByPlaceholderText('Ulica i numer, np. Klonowa 7') as HTMLInputElement;
    fireEvent.change(pole, { target: { value: 'franciszka brze' } });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    expect(screen.getByText('dopisz numer domu')).toBeTruthy();
    fireEvent.click(screen.getByRole('option'));
    expect(onWybrano).not.toHaveBeenCalled();
    expect(pole.value).toBe('Franciszka Brzezińskiego ');
    fireEvent.change(pole, { target: { value: 'Franciszka Brzezińskiego 26' } });
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    fireEvent.click(screen.getByRole('option'));
    expect(onWybrano).toHaveBeenCalledWith(expect.objectContaining({ numer: '26A', miasto: 'Pruszków' }));
  });

});
