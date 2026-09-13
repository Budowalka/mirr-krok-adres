import type { Polygon } from 'geojson';
import type * as Leaflet from 'leaflet';
import type { AdapterMapy } from './adapter';
import type { ZrodloKafli } from '../typy';

const WMS_ORTO = 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution';
// WMTS Geoportalu w siatce EPSG:3857 = zwykłe kafle XYZ, 0,1 s na kafel (WMS: 2–3 s).
const WMTS_ORTO =
  'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&FORMAT=image/jpeg&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}';

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
  let onZmieniono: ((obrys: Polygon) => void) | null = null;
  // Odpowiedź z MIRR bywa szybsza niż dynamiczny import Leafleta: obrys czeka tu na mapę
  // (bez tego rysowanie i przybliżenie ginęły — zrzut Piotra 13.09: zdjęcie „daleko”, bez obrysu).
  let oczekujacy: { obrys: Polygon | null; dzialka: Polygon | null } | null = null;

  function narysuj(obrys: Polygon | null, dzialka: Polygon | null) {
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
  }

  // Geoman: przeciąganie rogów (i dodawanie nowych na środku krawędzi); każda zmiana → onZmieniono.
  function wlaczEdycje(warstwa: Leaflet.Polygon) {
    const pm = (warstwa as unknown as { pm?: { enable(o: unknown): void } }).pm;
    if (!pm) return;
    pm.enable({ allowSelfIntersection: false, snappable: false, draggable: false });
    // pm:change leci przy każdym ruchu rogu (obwód i rzut liczą się na bieżąco),
    // pm:edit / pm:markerdragend po puszczeniu — jedno z nich zawsze dojdzie.
    warstwa.off('pm:change pm:edit pm:markerdragend');
    warstwa.on('pm:change pm:edit pm:markerdragend', () => {
      const geom = warstwa.toGeoJSON().geometry;
      if (geom.type === 'Polygon') onZmieniono?.(geom);
    });
  }

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
        if (geom.type !== 'Polygon') {
          mapa?.removeLayer(ev.layer);
          return;
        }
        // Narysowany wielokąt zostaje warstwą obrysu z włączonym przeciąganiem rogów.
        warstwaObrysu?.remove();
        warstwaObrysu = ev.layer as unknown as Leaflet.GeoJSON;
        wlaczEdycje(ev.layer);
        const cb = onNarysowano;
        onNarysowano = null;
        (mapa as unknown as { pm: { disableDraw(): void } }).pm.disableDraw();
        cb?.(geom);
      });
      if (oczekujacy) {
        narysuj(oczekujacy.obrys, oczekujacy.dzialka);
        oczekujacy = null;
      }
    },
    pokazObrys(obrys, dzialka) {
      if (!L || !mapa) {
        oczekujacy = { obrys, dzialka: dzialka ?? null };
        return;
      }
      narysuj(obrys, dzialka ?? null);
    },
    edytujObrys(onZmiana) {
      if (!mapa || !warstwaObrysu) return;
      onZmieniono = onZmiana;
      warstwaObrysu.eachLayer((w) => wlaczEdycje(w as Leaflet.Polygon));
    },
    rysuj(onGotowe, onZmiana) {
      if (!mapa) return;
      onNarysowano = onGotowe;
      onZmieniono = onZmiana;
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
      onZmieniono = null;
      (mapa as unknown as { pm?: { disableDraw(): void } } | null)?.pm?.disableDraw();
      warstwaObrysu?.eachLayer((w) => (w as unknown as { pm?: { disable(): void } }).pm?.disable());
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
  if (zrodlo.typ === 'wmts') {
    return L.tileLayer(WMTS_ORTO, { maxZoom: 21, maxNativeZoom: 19, attribution: 'Ortofotomapa: Geoportal.gov.pl' });
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
