import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../api';
import { EkranAdresu } from '../EkranAdresu';
import { DOMYSLNE_TEKSTY } from '../teksty';
import type { Podpowiedz } from '../typy';

const KLONOWA: Podpowiedz[] = [
  { tekst: 'Klonowa 7, Czeladź 41-250', ulica: 'Klonowa', numer: '7', kod: '41-250', miasto: 'Czeladź', lat: 50.32, lon: 19.08 },
  { tekst: 'Klonowa 7, Będzin 42-500', ulica: 'Klonowa', numer: '7', kod: '42-500', miasto: 'Będzin', lat: 50.33, lon: 19.13 },
  { tekst: 'Klonowa 7, Sosnowiec 41-218', ulica: 'Klonowa', numer: '7', kod: '41-218', miasto: 'Sosnowiec', lat: 50.27, lon: 19.16 },
  { tekst: 'Klonowa 7, Katowice 40-168', ulica: 'Klonowa', numer: '7', kod: '40-168', miasto: 'Katowice', lat: 50.27, lon: 19.03 },
];

type ApiTestowe = Api & { podpowiedzi: ReturnType<typeof vi.fn> };
function api(podpowiedzi: (q: string) => Promise<Podpowiedz[]> = async () => KLONOWA): ApiTestowe {
  return { podpowiedzi: vi.fn(podpowiedzi), budynek: vi.fn() } as unknown as ApiTestowe;
}

describe('EkranAdresu', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('nie pyta przy 2 znakach, pyta po 250 ms od 3 znaków z biasem i anuluje poprzednie zapytanie', async () => {
    const a = api();
    render(<EkranAdresu api={a} bias={{ lat: 50.28, lon: 19.13 }} teksty={DOMYSLNE_TEKSTY} onWybrano={vi.fn()} onPomin={vi.fn()} />);
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
    render(<EkranAdresu api={api()} bias={undefined} teksty={DOMYSLNE_TEKSTY} onWybrano={onWybrano} onPomin={vi.fn()} />);
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
    render(<EkranAdresu api={api()} bias={undefined} teksty={DOMYSLNE_TEKSTY} onWybrano={onWybrano} onPomin={vi.fn()} />);
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
    render(<EkranAdresu api={a} bias={undefined} teksty={DOMYSLNE_TEKSTY} onWybrano={onWybrano} onPomin={onPomin} />);
    fireEvent.click(screen.getByText('Nie ma mojego adresu na liście'));
    fireEvent.change(screen.getByPlaceholderText('np. Klonowa 7'), { target: { value: 'Zwierzyniecka 5' } });
    fireEvent.change(screen.getByPlaceholderText('np. Sosnowiec'), { target: { value: 'Sochaczew' } });
    fireEvent.click(screen.getByText('Znajdź na mapie'));
    await waitFor(() => expect(onWybrano).toHaveBeenCalledWith(expect.objectContaining({ zrodlo: 'reczny', miasto: 'Sochaczew', numer: '5' })));

    fireEvent.change(screen.getByPlaceholderText('np. Klonowa 7'), { target: { value: 'Nieistniejąca 99' } });
    fireEvent.click(screen.getByText('Znajdź na mapie'));
    await waitFor(() => expect(onPomin).toHaveBeenCalledWith(DOMYSLNE_TEKSTY.nieZnaleziono));
  });

  it('„Wolę podać powierzchnię ręcznie” woła onPomin', () => {
    const onPomin = vi.fn();
    render(<EkranAdresu api={api()} bias={undefined} teksty={DOMYSLNE_TEKSTY} onWybrano={vi.fn()} onPomin={onPomin} />);
    fireEvent.click(screen.getByText('Wolę podać powierzchnię ręcznie'));
    expect(onPomin).toHaveBeenCalled();
  });
});
