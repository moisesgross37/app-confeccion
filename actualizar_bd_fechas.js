const { Pool } = require('pg');

// Conexión a tu base de datos local
const pool = new Pool({
    database: 'moisesgross', 
    ssl: false 
});

async function agregarColumnaFecha() {
    console.log("--- Actualizando Base de Datos (Paso 1) ---");
    try {
        // 1. Agregamos la columna 'fecha_ultimo_cambio_etapa'
        // Usamos DEFAULT NOW() para que todos los proyectos viejos empiecen contando desde hoy
        await pool.query(`
            ALTER TABLE confeccion_projects 
            ADD COLUMN IF NOT EXISTS fecha_ultimo_cambio_etapa TIMESTAMPTZ DEFAULT NOW();
        `);
        
        console.log("✅ ¡ÉXITO! Columna 'fecha_ultimo_cambio_etapa' creada correctamente.");
        
    } catch (error) {
        console.error("❌ Error al actualizar:", error.message);
    } finally {
        await pool.end();
    }
}

agregarColumnaFecha();