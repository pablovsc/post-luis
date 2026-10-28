const https = require('https');
const cheerio = require('cheerio');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno o de .env
function getDbConfig() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const l of lines) {
        const trimmed = l.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq !== -1) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
    } catch {}
  }

  return {
    host: process.env.DB_HOST || env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || env.DB_USER || 'adempiere',
    password: process.env.DB_PASSWORD || env.DB_PASSWORD || 'adempiere',
    database: process.env.DB_DATABASE || env.DB_DATABASE || 'luis',
  };
}

// Descargar HTML del BCV
function fetchBcvHtml() {
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
      timeout: 25000,
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
      reject(new Error('Timeout al conectar con www.bcv.org.ve'));
    });

    req.end();
  });
}

// Parsea fecha de BCV (content="YYYY-MM-DDTHH:mm:ss" o texto)
function parseBcvDate($) {
  // 1. Intentar por atributo content en .date-display-single
  const contentDate = $('span.date-display-single').attr('content');
  if (contentDate) {
    const match = contentDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  // 2. Intentar buscando dentro de div.pull-right.dinpro
  const dinproContent = $('.pull-right.dinpro span.date-display-single').attr('content');
  if (dinproContent) {
    const match = dinproContent.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  // Fallback a la fecha local de hoy en formato YYYY-MM-DD
  return new Date().toISOString().split('T')[0];
}

async function scrapeAndSaveBcv() {
  console.log(`[${new Date().toISOString()}] 🔄 Consultando www.bcv.org.ve...`);

  let html;
  try {
    html = await fetchBcvHtml();
  } catch (error) {
    console.error('❌ Error al conectar con el BCV:', error.message);
    throw error;
  }

  const $ = cheerio.load(html);

  // 1. Extraer el valor del dólar en #dolar
  let rawValue = $('#dolar strong').text().trim();
  if (!rawValue) {
    rawValue = $('#dolar .centrado.textp').text().trim();
  }

  if (!rawValue) {
    throw new Error('Elemento #dolar no encontrado en www.bcv.org.ve');
  }

  const cleanedValueStr = rawValue.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const numericValue = parseFloat(cleanedValueStr);

  if (isNaN(numericValue) || numericValue <= 0) {
    throw new Error(`El valor extraído "${rawValue}" no es numérico.`);
  }

  const tasaRedondeada = Number(numericValue.toFixed(4));

  // 2. Extraer la Fecha Valor oficial del BCV
  const fechaValor = parseBcvDate($);
  console.log(`📥 BCV Tasa: ${tasaRedondeada} | Fecha Valor oficial: ${fechaValor}`);

  // 3. Conectar a PostgreSQL
  const dbConfig = getDbConfig();
  const client = new Client(dbConfig);

  try {
    await client.connect();

    // 4. Verificar si ya existe un registro para esta fecha
    const checkSql = `SELECT id, tasa FROM m_tasa WHERE fecha = $1 LIMIT 1;`;
    const checkRes = await client.query(checkSql, [fechaValor]);

    if (checkRes.rows.length > 0) {
      const existing = checkRes.rows[0];
      const existingTasa = Number(Number(existing.tasa).toFixed(4));

      if (existingTasa === tasaRedondeada) {
        console.log(`ℹ️ La tasa para la fecha ${fechaValor} ya está registrada con el mismo valor (${existingTasa}). No se realizaron cambios.`);
        return {
          success: true,
          skipped: true,
          message: 'Tasa idéntica ya existente para esta fecha',
          fecha: fechaValor,
          tasa: tasaRedondeada,
        };
      } else {
        // Misma fecha pero cambió el monto en el BCV -> Actualizar
        const updateSql = `
          UPDATE m_tasa 
          SET tasa = $1, creado_en = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, TO_CHAR(fecha, 'YYYY-MM-DD') as fecha, tasa;
        `;
        const updateRes = await client.query(updateSql, [tasaRedondeada, existing.id]);
        console.log(`🔄 Tasa actualizada para la fecha ${fechaValor}: ${tasaRedondeada} Bs. (anterior era ${existingTasa} Bs.)`);
        return {
          success: true,
          updated: true,
          fecha: fechaValor,
          tasa: tasaRedondeada,
          id: existing.id,
        };
      }
    }

    // 5. No existe registro para esta fecha -> Insertar nuevo
    const insertSql = `
      INSERT INTO m_tasa (fecha, tasa)
      VALUES ($1, $2)
      RETURNING id, TO_CHAR(fecha, 'YYYY-MM-DD') as fecha, tasa;
    `;
    const insertRes = await client.query(insertSql, [fechaValor, tasaRedondeada]);
    const row = insertRes.rows[0];

    console.log(`🎉 ¡Nueva tasa registrada para ${fechaValor}: ${tasaRedondeada} Bs. / USD!`);
    return {
      success: true,
      inserted: true,
      id: row.id,
      fecha: row.fecha,
      tasa: tasaRedondeada,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

// Ejecución como servicio en bucle o como script de una sola vez
async function runDaemon() {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  console.log('🚀 Iniciando servicio de sincronización BCV automática (cada 1 hora)...');

  // Ejecución inicial inmediata
  try {
    await scrapeAndSaveBcv();
  } catch (e) {
    console.error('⚠️ Error en ejecución inicial:', e.message);
  }

  // Programar repetición cada hora
  setInterval(async () => {
    try {
      await scrapeAndSaveBcv();
    } catch (e) {
      console.error('⚠️ Error en ejecución programada:', e.message);
    }
  }, ONE_HOUR_MS);
}

if (require.main === module) {
  const isDaemon = process.argv.includes('--daemon');
  if (isDaemon) {
    runDaemon();
  } else {
    scrapeAndSaveBcv()
      .then((res) => {
        console.log('🏁 Proceso finalizado:', res);
        process.exit(0);
      })
      .catch((err) => {
        console.error('🚨 Falló la ejecución:', err.message);
        process.exit(1);
      });
  }
}

module.exports = { scrapeAndSaveBcv, runDaemon };
