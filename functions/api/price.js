// Cloudflare Pages Function: /api/price
// SOXL 실시간 시세를 Yahoo Finance에서 가져오는 프록시 Worker
// CORS 우회 + 캐싱 처리

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const symbol = url.searchParams.get('symbol') || 'SOXL';

  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Yahoo Finance v8 API
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`;

    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SOXL-Tracker/1.0)',
        'Accept': 'application/json',
      },
      cf: {
        cacheTtl: 300, // 5분 캐시
        cacheEverything: true,
      }
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance API error: ${res.status}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      throw new Error('No data from Yahoo Finance');
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? meta.previousClose;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const dayHigh = meta.regularMarketDayHigh;
    const dayLow = meta.regularMarketDayLow;
    const volume = meta.regularMarketVolume;
    const marketState = meta.marketState; // REGULAR, PRE, POST, CLOSED

    const response = {
      symbol: meta.symbol,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      dayHigh: dayHigh ? Math.round(dayHigh * 100) / 100 : null,
      dayLow: dayLow ? Math.round(dayLow * 100) / 100 : null,
      prevClose: Math.round(prevClose * 100) / 100,
      volume,
      marketState,
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=300',
      }
    });

  } catch (err) {
    // 실패 시 fallback
    return new Response(JSON.stringify({
      error: err.message,
      symbol,
      price: null,
      updatedAt: new Date().toISOString(),
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
