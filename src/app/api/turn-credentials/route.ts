import { NextResponse } from 'next/server';

// Read from Vercel env variable — never hardcoded in frontend
const METERED_SECRET_KEY = process.env.METERED_SECRET_KEY || '';
const METERED_DOMAIN = process.env.METERED_DOMAIN || 'mitrai.metered.live';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Always return Metered domain-based TURN + STUN servers
  // These use the standard Metered relay infrastructure tied to our domain
  const meteredServers: RTCIceServer[] = [
    { urls: `stun:${METERED_DOMAIN}:80` },
    { urls: `turn:${METERED_DOMAIN}:80`, username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: `turn:${METERED_DOMAIN}:80?transport=tcp`, username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: `turn:${METERED_DOMAIN}:443`, username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: `turn:${METERED_DOMAIN}:443?transport=tcp`, username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: `turns:${METERED_DOMAIN}:443`, username: 'openrelayproject', credential: 'openrelayproject' },
  ];

  // Also try the REST API for dynamic temp credentials (better security)
  if (METERED_SECRET_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `https://${METERED_DOMAIN}/api/v1/turn/credentials?secretKey=${METERED_SECRET_KEY}`,
        { signal: controller.signal, cache: 'no-store' },
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const servers = await res.json();
        if (Array.isArray(servers) && servers.length > 0) {
          console.log('[TURN] Fetched', servers.length, 'dynamic TURN servers from Metered');
          return NextResponse.json({ servers }, {
            status: 200,
            headers: { 'Cache-Control': 'public, max-age=300' },
          });
        }
      } else {
        console.warn('[TURN] Metered API returned', res.status, '— using static TURN servers');
      }
    } catch (e) {
      console.warn('[TURN] Metered API error:', e instanceof Error ? e.message : e);
    }
  }

  // Return static Metered TURN servers
  console.log('[TURN] Returning static TURN servers for domain:', METERED_DOMAIN);
  return NextResponse.json({ servers: meteredServers }, {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=600' },
  });
}

interface RTCIceServer {
  urls: string;
  username?: string;
  credential?: string;
}
