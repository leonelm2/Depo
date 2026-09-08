const { all } = require('../backend/src/db.pg');

async function inspect() {
  try {
    const instCols = await all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'institucion'");
    console.log('institucion columns:', instCols.map(c => `${c.column_name} (${c.data_type})`));

    const tables = await all("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('public tables:', tables.map(t => t.table_name));

    const zonas = await all("SELECT * FROM zona LIMIT 5");
    console.log('sample zonas:', zonas);

    const userSamples = await all("SELECT id_usuario, email, role, nivel_educativo, director_area_id FROM usuario WHERE role IN ('director_area', 'supervisor') LIMIT 10");
    console.log('sample director_area and supervisor users:', userSamples);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

inspect();
