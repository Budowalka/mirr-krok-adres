import { utworzAdapterLeaflet } from '../mapa/leaflet';

const opcje = { centrum: { lat: 52, lon: 20 }, zoom: 6, zrodloKafli: { typ: 'wmts' } } as never;

describe('adapter Leaflet: zniszczenie w trakcie montowania (StrictMode)', () => {
  it('nie montuje mapy, gdy zniszcz() padło przed końcem importów, a kolejny adapter montuje bez błędu', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const a = utworzAdapterLeaflet();
    const p = a.zamontuj(div, opcje);
    a.zniszcz();
    await p;

    expect(div.classList.contains('leaflet-container')).toBe(false);
    expect((div as unknown as { _leaflet_id?: number })._leaflet_id).toBeUndefined();

    const b = utworzAdapterLeaflet();
    await expect(b.zamontuj(div, opcje)).resolves.toBeUndefined();
    expect(div.classList.contains('leaflet-container')).toBe(true);
    b.zniszcz();
  });
});
