import { describe, expect, it, vi } from 'vitest';
import { FalszywyAdapterMapy } from '../mapa/falszywy';

describe('FalszywyAdapterMapy: tryb pinezki', () => {
  it('wybierzPunkt zapamiętuje callback, dotknij go woła, przerwijWybieranie wyłącza', () => {
    const a = new FalszywyAdapterMapy();
    const onPunkt = vi.fn();
    a.wybierzPunkt(onPunkt);
    a.dotknij({ lat: 52.182628, lon: 20.814037 });
    expect(onPunkt).toHaveBeenCalledWith({ lat: 52.182628, lon: 20.814037 });
    a.przerwijWybieranie();
    expect(a.wybieranie).toBeNull();
    a.dotknij({ lat: 1, lon: 2 });
    expect(onPunkt).toHaveBeenCalledTimes(1);
  });

  it('pokazPinezke stawia i zdejmuje pinezkę', () => {
    const a = new FalszywyAdapterMapy();
    a.pokazPinezke({ lat: 1, lon: 2 });
    expect(a.pinezka).toEqual({ lat: 1, lon: 2 });
    a.pokazPinezke(null);
    expect(a.pinezka).toBeNull();
  });
});
