import { describe, expect, it } from 'vitest';
import * as paczka from '../index';

describe('publiczne API paczki', () => {
  it('eksportuje klocki v0.2 bez zmian', () => {
    for (const nazwa of ['KrokAdresu', 'opisKondygnacji', 'doEpsg2180', 'doGeoJson', 'obwodM', 'rzutM2', 'zGeoJson', 'utworzAdapterLeaflet'] as const) {
      expect(typeof paczka[nazwa]).toBe('function');
    }
    expect(paczka.DOMYSLNE_TEKSTY.naglowekAdres).toBe('Podaj adres');
  });

  it('eksportuje klocki v0.3.0', () => {
    for (const nazwa of ['KartaBudowy', 'utworzApi', 'parsujNumerDzialki', 'opisDzialki', 'pozwolenieDoFormData', 'dataSlownie'] as const) {
      expect(typeof paczka[nazwa]).toBe('function');
    }
    expect(paczka.DOMYSLNE_TEKSTY_KARTY.naglowek).toBe('To Twoja budowa?');
  });
});
