import { NextRequest, NextResponse } from 'next/server';
import { odpowiedzMock } from '../../../../mock/geo';

/**
 * Proxy do MIRR GET /api/v1/geo/<akcja>. Klucz API zostaje po stronie serwera —
 * przeglądarka nigdy nie widzi ani klucza, ani GUGiK/Photona. Ten sam wzór wchodzi
 * do każdego landingu (obok /api/quote).
 */
const AKCJE = new Set(['podpowiedzi', 'budynek', 'zasieg', 'dzialka', 'pozwolenie']);
/** Trasy z planu A (MIRR); do czasu wdrożenia planu A demo podaje je z mocka przy GEO_MOCK=nowe. */
const NOWE = new Set(['dzialka', 'pozwolenie']);

export async function GET(req: NextRequest, ctx: { params: Promise<{ akcja: string }> }) {
  const { akcja } = await ctx.params;
  if (!AKCJE.has(akcja)) return NextResponse.json({ error: 'Nieznana akcja.' }, { status: 404 });

  // GEO_MOCK=wszystko: całe demo bez MIRR (lokalnie, bez klucza). GEO_MOCK=nowe: mock tylko dla tras planu A.
  const mock = process.env.GEO_MOCK;
  if (mock === 'wszystko' || (mock === 'nowe' && NOWE.has(akcja))) {
    return NextResponse.json(odpowiedzMock(akcja, req.nextUrl.searchParams));
  }
  const baza = process.env.MIRR_API_URL;
  const klucz = process.env.MIRR_API_KEY;
  if (!baza || !klucz) return NextResponse.json({ error: 'Brak konfiguracji MIRR.' }, { status: 502 });
  try {
    const res = await fetch(`${baza}/api/v1/geo/${akcja}?${req.nextUrl.searchParams}`, {
      headers: { Authorization: `Bearer ${klucz}` },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    const body = await res.text();
    return new NextResponse(body, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return NextResponse.json({ error: 'MIRR nie odpowiada.' }, { status: 502 });
  }
}
