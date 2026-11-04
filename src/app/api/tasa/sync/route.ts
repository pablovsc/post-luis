import { NextResponse } from 'next/server';
import https from 'https';
import * as cheerio from 'cheerio';
import { query } from '@/lib/db';

function fetchBcvHtml(): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.bcv.org.ve',
      port: 443,
      path: '/',
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      timeout: 20000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Tiempo de espera agotado al conectar con bcv.org.ve'));
    });
    req.end();
  });
}

function parseBcvDate($: cheerio.CheerioAPI): string {
  try {
    const dateText = $('.diname-round .date-display-single').text().trim();
    if (dateText) {
      const match = dateText.match(/(\d{1,2})\s+([a-zA-Záéíóúñ]+)\s+(\d{4})/i);
      if (match) {
        const day = match[1].padStart(2, '0');
        const monthName = match[2].toLowerCase();
        const year = match[3];

        const monthsMap: Record<string, string> = {
          enero: '01',
          febrero: '02',
          marzo: '03',
          abril: '04',
          mayo: '05',
          junio: '06',
          julio: '07',
          agosto: '08',
          septiembre: '09',
          setiembre: '09',
          octubre: '10',
          noviembre: '11',
          diciembre: '12',
        };

        const month = monthsMap[monthName];
        if (month) {
          return `${year}-${month}-${day}`;
        }
      }
    }
  } catch {
    // fallback to current date
  }

  const now = new Date();
  return now.toISOString().split('T')[0];
}

export async function POST() {
  try {
    const html = await fetchBcvHtml();
    const $ = cheerio.load(html);

    const usdContainer = $('#dolar');
    if (!usdContainer.length) {
      return NextResponse.json(
        { success: false, message: 'No se encontró el contenedor #dolar en la página del BCV.' },
        { status: 502 }
      );
    }

    const rawValue = usdContainer.find('strong').text().trim();
    if (!rawValue) {
      return NextResponse.json(
        { success: false, message: 'No se pudo leer el valor numérico de la tasa en el BCV.' },
        { status: 502 }
      );
    }

    const cleanValue = rawValue.replace(/\./g, '').replace(',', '.');
    const numericValue = parseFloat(cleanValue);

    if (isNaN(numericValue) || numericValue <= 0) {
      return NextResponse.json(
        { success: false, message: `El valor extraído ("${rawValue}") no es válido.` },
        { status: 502 }
      );
    }

    const tasaRedondeada = Number(numericValue.toFixed(4));
    const fechaValor = parseBcvDate($);

    // Upsert en la base de datos
    const upsertSql = `
      INSERT INTO m_tasa (fecha, tasa)
      VALUES ($1, $2)
      ON CONFLICT (fecha)
      DO UPDATE SET tasa = EXCLUDED.tasa, creado_en = CURRENT_TIMESTAMP
      RETURNING id, TO_CHAR(fecha, 'YYYY-MM-DD') as fecha, tasa;
    `;

    const rows = await query(upsertSql, [fechaValor, tasaRedondeada]);

    return NextResponse.json({
      success: true,
      rate: rows[0],
      fecha: fechaValor,
      tasa: tasaRedondeada,
      message: `Tasa oficial del BCV obtenida exitosamente: ${tasaRedondeada} Bs./USD (Fecha: ${fechaValor})`,
    });
  } catch (error: any) {
    console.error('Error sincronizando tasa BCV:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Error al conectar con la página del BCV' },
      { status: 500 }
    );
  }
}

