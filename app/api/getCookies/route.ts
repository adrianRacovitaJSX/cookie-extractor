import { NextRequest, NextResponse } from 'next/server';
import { chromium, errors } from 'playwright';

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

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Espera un poco más para asegurarse de que se establezcan todas las cookies
    await page.waitForTimeout(2000);

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

    if (formattedCookies.length > 0) {
      return NextResponse.json({ cookies: formattedCookies });
    } else {
      return NextResponse.json({ 
        cookies: [], 
        message: 'No se encontraron cookies para esta URL después de cargar completamente la página.' 
      });
    }
  } catch (error) {
    console.error('Error detallado en la API:', error);
    let errorMessage = 'Error desconocido al obtener las cookies';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error instanceof errors.TimeoutError) {
        errorMessage = 'La página tardó demasiado en cargar';
      }
    }
    return NextResponse.json({ 
      error: 'Error al obtener las cookies', 
      details: errorMessage
    }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}