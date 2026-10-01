const { all, get, run, pool } = require("../db.pg");
const { DEFAULT_ROLE_PERMISSIONS } = require("../permissions");

function normalizeRoleName(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

function getDefaultRoleNames() {
  return Object.keys(DEFAULT_ROLE_PERMISSIONS).map(normalizeRoleName);
}

let roleSeededReady = false;

async function ensureRoleConstraintUpdated(clientOrPool) {
  const runner = clientOrPool || pool;
  try {
    const checkRes = await runner.query(
      "SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'usuario_role_check'"
    );
    const constraintDef = checkRes.rows[0]?.def || "";
    const defaults = getDefaultRoleNames();
    const allRoles = Array.from(new Set([
      ...defaults,
      'admin', 'master', 'directivo', 'director_area', 'supervisor',
      'operador', 'operador_civico', 'jefe_deposito', 'operador_escolar',
      'control_ministerio', 'area_compras', 'secretario_administrativo',
      'ministro_financiero', 'consulta'
    ]));

    const missingRole = allRoles.some(r => !constraintDef.includes(`'${r}'`));
    if (!constraintDef || missingRole) {
      const rolesListSql = allRoles.map(r => `'${r}'`).join(", ");
      await runner.query(`
        ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_role_check;
        ALTER TABLE usuario ADD CONSTRAINT usuario_role_check CHECK (role IN (${rolesListSql}));
      `);
      console.log("[roles] Restricción usuario_role_check actualizada exitosamente con roles:", allRoles.join(", "));
    }
  } catch (err) {
    console.warn("[ensureRoleConstraintUpdated] Warning updating usuario_role_check:", err.message);
  }
}

async function ensureRoleTableSeeded() {
  if (roleSeededReady) return;
  const defaults = getDefaultRoleNames();
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const role of defaults) {
        if (!role) continue;
        await client.query(
          "INSERT INTO rol (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING",
          [role]
        );
      }
      await client.query("COMMIT");

      // Asegurar que la restricción CHECK de la tabla usuario incluya los nuevos roles
      await ensureRoleConstraintUpdated(client);

      roleSeededReady = true;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.warn("[ensureRoleTableSeeded] Warning seeding roles table:", err.message);
    } finally {
      client.release();
    }
  } catch (poolErr) {
    console.warn("[ensureRoleTableSeeded] Pool connection skipped:", poolErr.message);
  }
}

async function getAllRoles() {
  let dbRoles = [];
  try {
    await ensureRoleTableSeeded();
    const rows = await all("SELECT id_rol AS id, nombre FROM rol ORDER BY nombre ASC");
    if (Array.isArray(rows) && rows.length > 0) {
      dbRoles = rows;
    }
  } catch (err) {
    console.error("[getAllRoles error]", err.message || err);
  }

  const defaultNames = getDefaultRoleNames();
  const dbNamesSet = new Set(dbRoles.map((r) => normalizeRoleName(r.nombre)));

  // Asegurar que todos los roles por defecto del sistema estén presentes en el listado
  const missingRoles = defaultNames
    .filter((name) => !dbNamesSet.has(name))
    .map((name, idx) => ({ id: dbRoles.length + idx + 100, nombre: name }));

  const combined = [...dbRoles, ...missingRoles];
  if (combined.length > 0) {
    return combined;
  }

  return defaultNames.map((r, idx) => ({ id: idx + 1, nombre: r }));
}

async function roleExists(role) {
  const normalized = normalizeRoleName(role);
  if (!normalized) return false;

  // Primero intentar la BD
  try {
    await ensureRoleTableSeeded();
    const found = await get("SELECT id_rol FROM rol WHERE LOWER(nombre) = $1", [normalized]);
    if (found !== undefined) return Boolean(found);
  } catch (err) {
    console.error("[roleExists DB error]", err.message || err);
  }

  // Fallback: verificar contra permisos conocidos
  return getDefaultRoleNames().includes(normalized);
}

async function createRole(role) {
  const normalized = normalizeRoleName(role);
  if (!normalized) {
    throw new Error("El nombre del rol es obligatorio");
  }

  const created = await run(
    "INSERT INTO rol (nombre) VALUES (?) ON CONFLICT (nombre) DO NOTHING RETURNING id_rol AS id, nombre",
    [normalized]
  );

  if (!created.rows || created.rows.length === 0) {
    const existing = await get(
      "SELECT id_rol AS id, nombre FROM rol WHERE LOWER(nombre) = ?",
      [normalized]
    );
    return { created: false, role: existing };
  }

  return { created: true, role: created.rows[0] };
}

module.exports = {
  getAllRoles,
  roleExists,
  createRole,
  ensureRoleTableSeeded,
  ensureRoleConstraintUpdated,
  normalizeRoleName,
};
