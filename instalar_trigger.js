const { Pool } = require('pg');

// Conexión a tu base de datos local
const pool = new Pool({
    database: 'moisesgross', 
    ssl: false 
});

async function instalarTrigger() {
    console.log("--- Instalando Robot Automático (Trigger) ---");
    const client = await pool.connect();
    try {
        // 1. Crear la función del robot
        await client.query(`
            CREATE OR REPLACE FUNCTION actualizar_fecha_cambio_etapa()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Si el estatus nuevo es diferente al viejo
                IF NEW.status IS DISTINCT FROM OLD.status THEN
                    NEW.fecha_ultimo_cambio_etapa = NOW();
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 2. Asignar el robot a la tabla de proyectos
        // (Primero lo borramos si existe para evitar duplicados y luego lo creamos)
        await client.query(`DROP TRIGGER IF EXISTS trigger_update_fecha_etapa ON confeccion_projects;`);
        
        await client.query(`
            CREATE TRIGGER trigger_update_fecha_etapa
            BEFORE UPDATE ON confeccion_projects
            FOR EACH ROW
            EXECUTE FUNCTION actualizar_fecha_cambio_etapa();
        `);
        
        console.log("✅ ¡ÉXITO! El Robot está activo. Detectará cambios de estatus automáticamente.");
        
    } catch (error) {
        console.error("❌ Error al instalar:", error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

instalarTrigger();