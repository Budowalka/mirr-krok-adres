import type { Polygon } from 'geojson';
import type * as Leaflet from 'leaflet';
import type { AdapterMapy } from './adapter';
import type { ZrodloKafli } from '../typy';

const WMS_ORTO = 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution';

/**
 * Prawdziwa mapa: Leaflet + Geoman (rysowanie po rogach, dotyk) + ortofotomapa
 * Geoportalu przez WMS (warstwa Raster, bez klucza; ~2,7 s na kafel — stąd prop
 * zrodloKafli na kafle XYZ innego dostawcy). Biblioteki ładowane dynamicznie, bo
 * Leaflet dotyka `window` już przy imporcie, a Next renderuje po stronie serwera.
 */
export function utworzAdapterLeaflet(): AdapterMapy {
  let L: typeof Leaflet | null = null;
  let mapa: Leaflet.Map | null = null;
  let warstwaObrysu: Leaflet.GeoJSON | null = null;
  let warstwaDzialki: Leaflet.GeoJSON | null = null;
  let onNarysowano: ((obrys: Polygon) => void) | null = null;

  return {
    async zamontuj(el, { centrum, zrodloKafli }) {
      // Geoman przy imporcie szuka globalnego `L` (window.L), więc Leaflet musi być
      // załadowany i wystawiony PRZED importem Geomana — równoległy import kończył się
      // „ReferenceError: L is not defined" (demo, 13.09).
      const leaflet = await import('leaflet');
      L = (leaflet.default ?? leaflet) as typeof Leaflet;
      (window as unknown as { L: typeof Leaflet }).L = L;
      await import('@geoman-io/leaflet-geoman-free');
      mapa = L.map(el, { zoomControl: true, attributionControl: true, tap: true } as Leaflet.MapOptions).setView([centrum.lat, centrum.lon], 19);
      kafle(L, zrodloKafli).addTo(mapa);
      const pm = (mapa as unknown as { pm?: { setLang?: (kod: string) => void; addControls?: (o: unknown) => void } }).pm;
      pm?.setLang?.('pl');
      mapa.on('pm:create', (e: unknown) => {
        const ev = e as { layer: Leaflet.Polygon };
        const geom = ev.layer.toGeoJSON().geometry;
        mapa?.removeLayer(ev.layer);
        if (geom.type !== 'Polygon') return;
        const cb = onNarysowano;
        onNarysowano = null;
        (mapa as unknown as { pm: { disableDraw(): void } }).pm.disableDraw();
        cb?.(geom);
      });
    },
    pokazObrys(obrys, dzialka) {
      if (!L || !mapa) return;
      warstwaObrysu?.remove();
      warstwaDzialki?.remove();
      warstwaObrysu = null;
      warstwaDzialki = null;
      if (dzialka) {
        warstwaDzialki = L.geoJSON(dzialka, { style: { color: '#ffffff', weight: 1.5, dashArray: '4 4', fillOpacity: 0.04, interactive: false } }).addTo(mapa);
      }
      if (obrys) {
        warstwaObrysu = L.geoJSON(obrys, { style: { color: kolorAkcentu(mapa.getContainer()), weight: 3, fillOpacity: 0.18, interactive: false } }).addTo(mapa);
        mapa.fitBounds(warstwaObrysu.getBounds(), { padding: [40, 40], maxZoom: 20 });
      } else if (warstwaDzialki) {
        mapa.fitBounds(warstwaDzialki.getBounds(), { padding: [30, 30], maxZoom: 20 });
      }
    },
    rysuj(onGotowe) {
      if (!mapa) return;
      onNarysowano = onGotowe;
      (mapa as unknown as { pm: { enableDraw(kind: string, o: unknown): void } }).pm.enableDraw('Polygon', {
        snappable: false,
        allowSelfIntersection: false,
        finishOn: 'dblclick',
        tooltips: false,
        cursorMarker: true,
        pathOptions: { color: kolorAkcentu(mapa.getContainer()), weight: 3, fillOpacity: 0.18 },
        hintlineStyle: { color: kolorAkcentu(mapa.getContainer()), dashArray: '4 4' },
        templineStyle: { color: kolorAkcentu(mapa.getContainer()) },
      });
    },
    przerwijRysowanie() {
      onNarysowano = null;
      (mapa as unknown as { pm?: { disableDraw(): void } } | null)?.pm?.disableDraw();
    },
    zniszcz() {
      mapa?.remove();
      mapa = null;
      warstwaObrysu = null;
      warstwaDzialki = null;
    },
  };
}

function kafle(L: typeof Leaflet, zrodlo: ZrodloKafli): Leaflet.Layer {
  if (zrodlo.typ === 'xyz') {
    return L.tileLayer(zrodlo.url, { maxZoom: 21, maxNativeZoom: 19, attribution: zrodlo.atrybucja ?? '' });
  }
  return L.tileLayer.wms(WMS_ORTO, {
    layers: 'Raster',
    format: 'image/jpeg',
    version: '1.3.0',
    maxZoom: 21,
    attribution: 'Ortofotomapa: Geoportal.gov.pl',
  } as Leaflet.WMSOptions);
}

function kolorAkcentu(el: HTMLElement): string {
  const v = getComputedStyle(el).getPropertyValue('--ka-akcent').trim();
  return v || '#bc4b2b';
}
