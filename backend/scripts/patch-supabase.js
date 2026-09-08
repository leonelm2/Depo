const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.bqakxczfvizetjhszyze:nahuelpvp12@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect().then(async () => {
  console.log('Connected to Supabase');
  await client.query(`
    ALTER TABLE movimiento_stock ADD COLUMN IF NOT EXISTS estado_egreso VARCHAR(30);
    UPDATE movimiento_stock SET estado_egreso = 'despachado' WHERE tipo = 'egreso' AND estado_egreso IS NULL;
    ALTER TABLE producto ADD COLUMN IF NOT EXISTS stock_reservado INT DEFAULT 0;
    ALTER TABLE stock_deposito ADD COLUMN IF NOT EXISTS reservado INT DEFAULT 0;
  `);
  console.log('Migration applied to Supabase successfully');
  process.exit(0);
}).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
