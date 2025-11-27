const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Conexión a tu base de datos local
const pool = new Pool({
    database: 'moisesgross', 
    ssl: false 
});

async function resetearClave() {
    console.log("--- Reseteando contraseña de 'admin' ---");
    try {
        // 1. Encriptamos la nueva contraseña "1234"
        const passwordHash = await bcrypt.hash('1234', 10);
        
        // 2. ACTUALIZAMOS el usuario existente
        const res = await pool.query(
            `UPDATE confeccion_users 
             SET password = $1 
             WHERE username = 'admin'`,
            [passwordHash]
        );
        
        if (res.rowCount > 0) {
            console.log("✅ ¡ÉXITO! Contraseña actualizada.");
            console.log("Usuario: admin");
            console.log("Nueva Clave: 1234");
        } else {
            console.log("❌ Error: No se encontró el usuario 'admin' para actualizar.");
        }
        
    } catch (error) {
        console.error("❌ Error grave:", error.message);
    } finally {
        await pool.end();
    }
}

resetearClave();