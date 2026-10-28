const { Client } = require('pg');

async function seed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'adempiere',
    password: 'adempiere',
    database: 'luis',
  });

  await client.connect();

  const prodCount = await client.query('SELECT COUNT(*) FROM m_producto');
  if (parseInt(prodCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO m_producto (nombre, precio_usd, activo) VALUES
      ('Café Molido Gourmet 500g', 5.50, true),
      ('Harina de Maíz Precocida 1kg', 1.20, true),
      ('Arroz Blanco Premium 1kg', 1.40, true),
      ('Aceite Vegetal 1L', 3.20, true),
      ('Azúcar Refinada 1kg', 1.50, true),
      ('Pasta Spaghetti 500g', 1.10, true),
      ('Leche Completa Polvo 900g', 8.50, true),
      ('Refresco Cola 2L', 2.00, true);
    `);
    console.log('Productos demo insertados');
  }

  const rateCount = await client.query('SELECT COUNT(*) FROM m_tasa');
  if (parseInt(rateCount.rows[0].count) === 0) {
    const today = new Date().toISOString().split('T')[0];
    await client.query(`INSERT INTO m_tasa (fecha, tasa) VALUES ($1, 36.5000);`, [today]);
    console.log('Tasa del día insertada');
  }

  await client.end();
  console.log('Seed completado.');
}

seed().catch(console.error);
