const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.bqakxczfvizetjhszyze:nahuelpvp12@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function cleanEgresosIngresos() {
    console.log("Conectando a Supabase para limpiar egresos e ingresos...");
    try {
        await client.connect();
        const sql = `
            TRUNCATE TABLE 
                movimiento_stock, 
                pedido, 
                detalle_pedido, 
                comentario_pedido, 
                aprobacion_seguimiento, 
                pedido_entrega, 
                solicitud_retiro, 
                solicitud_retiro_detalle, 
                recepcion_licitacion, 
                remito_licitacion, 
                recepcion_danio_imagen, 
                baja_movimientos, 
                baja_status_history, 
                entrega_anual, 
                distribucion_lote, 
                distribucion_lote_item, 
                distribucion_lote_item_imagen, 
                planilla_pedido_anual, 
                planilla_pedido_anual_detalle, 
                consumo_institucion
            CASCADE;
        `;
        console.log("Ejecutando TRUNCATE...");
        await client.query(sql);
        console.log("¡Limpieza de egresos e ingresos en Supabase completada con éxito!");
        console.log("Nota: El stock actual de los productos no fue modificado.");
    } catch (e) {
        console.error("Error al limpiar las tablas:", e);
    } finally {
        await client.end();
    }
}

cleanEgresosIngresos();
