import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KartaBudowy } from '../KartaBudowy';
import type { Pozwolenie } from '../typy';

// Parytet ze specu elektryka 6.2; numer GUNB zmyślony.
const P: Pozwolenie = { numer_gunb: 'TEST-0001', data_decyzji: '2026-01-12', rodzaj: 'budowa nowego', nazwa_zamierzenia: 'BUDOWA BUDYNKU MIESZKALNEGO JEDNORODZINNEGO DWULOKALOWEGO', kubatura: 1428.59, units: 2 };
const DZ = { numer: '64/4', obreb: '0010', gmina: 'Pruszków' };

describe('KartaBudowy', () => {
  it('bez pozwolenia nic nie renderuje (krok „to Twoja budowa?” znika)', () => {
    for (const p of [null, undefined]) {
      const { container, unmount } = render(<KartaBudowy pozwolenie={p} onTak={vi.fn()} onNie={vi.fn()} />);
      expect(container.innerHTML).toBe('');
      unmount();
    }
  });

  it('pokazuje datę decyzji słownie, dom i lokale, działkę i nazwę zamierzenia; bez numeru GUNB i kubatury', () => {
    const { container } = render(<KartaBudowy pozwolenie={P} dzialka={DZ} onTak={vi.fn()} onNie={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'To Twoja budowa?' })).toBeTruthy();
    for (const tekst of [
      'Pozwolenie na budowę wydane 12 stycznia 2026',
      'Dom jednorodzinny, dwa lokale',
      'Działka 64/4, obręb 0010, Pruszków',
      '„Budowa budynku mieszkalnego jednorodzinnego dwulokalowego”',
    ]) {
      expect(screen.getByText(tekst)).toBeTruthy();
    }
    expect(container.textContent).not.toContain('TEST-0001');
    expect(container.textContent).not.toContain('1428');
    expect(screen.getByText(/nie bierzemy żadnych danych osobowych/)).toBeTruthy();
  });

  it('jeden lokal; bez liczby lokali, działki i nazwy zostaje sam „Dom jednorodzinny”', () => {
    const { rerender, container } = render(<KartaBudowy pozwolenie={{ ...P, units: 1 }} onTak={vi.fn()} onNie={vi.fn()} />);
    expect(screen.getByText('Dom jednorodzinny, jeden lokal')).toBeTruthy();
    rerender(<KartaBudowy pozwolenie={{ ...P, units: null, nazwa_zamierzenia: null }} onTak={vi.fn()} onNie={vi.fn()} />);
    expect(screen.getByText('Dom jednorodzinny')).toBeTruthy();
    expect(container.textContent).not.toContain('Działka');
    expect(container.textContent).not.toContain('„');
  });

  it('„Tak, to moja budowa” i „To inny budynek” oddają pozwolenie landingowi', () => {
    const onTak = vi.fn();
    const onNie = vi.fn();
    render(<KartaBudowy pozwolenie={P} onTak={onTak} onNie={onNie} />);
    fireEvent.click(screen.getByText('Tak, to moja budowa'));
    expect(onTak).toHaveBeenCalledWith(P);
    fireEvent.click(screen.getByText('To inny budynek'));
    expect(onNie).toHaveBeenCalledWith(P);
  });

  it('teksty nadpisywalne (np. forma Pan/Pani z landingu)', () => {
    render(<KartaBudowy pozwolenie={P} teksty={{ naglowek: 'Czy to Pana budowa?', tak: 'Tak, moja' }} onTak={vi.fn()} onNie={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Czy to Pana budowa?' })).toBeTruthy();
    expect(screen.getByText('Tak, moja')).toBeTruthy();
  });

  it('bez <form>, przyciski type="button" (karta może stać w formularzu landingu)', () => {
    const { container } = render(<KartaBudowy pozwolenie={P} onTak={vi.fn()} onNie={vi.fn()} />);
    expect(container.querySelector('form')).toBeNull();
    for (const b of Array.from(container.querySelectorAll('button'))) expect(b.getAttribute('type')).toBe('button');
  });
});
