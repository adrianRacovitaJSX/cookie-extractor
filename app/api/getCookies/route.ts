import { NextRequest, NextResponse } from 'next/server';
import { chromium, errors, Page } from 'playwright';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); 

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  const cachedResult = cache.get<Cookie[]>(url);
  if (cachedResult) {
    return NextResponse.json({ cookies: cachedResult });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  let browser;
  (async () => {
    try {
      browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        acceptDownloads: false,
        isMobile: false,
        hasTouch: false,
        permissions: ['geolocation'],
        bypassCSP: true,
        ignoreHTTPSErrors: true,
      });

      const page = await context.newPage();

      await writer.write(encoder.encode('data: ' + JSON.stringify({ progress: 25 }) + '\n\n'));

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await writer.write(encoder.encode('data: ' + JSON.stringify({ progress: 50 }) + '\n\n'));

      await page.waitForTimeout(2000);
      await writer.write(encoder.encode('data: ' + JSON.stringify({ progress: 75 }) + '\n\n'));

      const cookies = await context.cookies();
      const formattedCookies: Cookie[] = cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite || 'None'
      }));

      cache.set(url, formattedCookies);

      await browser.close();

      await writer.write(encoder.encode('data: ' + JSON.stringify({ progress: 100, cookies: formattedCookies }) + '\n\n'));
    } catch (error) {
      console.error('Error detallado en la API:', error);
      let errorMessage = 'Error desconocido al obtener las cookies';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error instanceof errors.TimeoutError) {
          errorMessage = 'La página tardó demasiado en cargar';
        }
      }
      await writer.write(encoder.encode('data: ' + JSON.stringify({ error: errorMessage }) + '\n\n'));
    } finally {
      if (browser) {
        await browser.close();
      }
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}