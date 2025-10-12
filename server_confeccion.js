// ============== SERVIDOR DE DISEÑO Y CONFECCIÓN v8.8 (Versión Final y Limpia) ==============

console.log("--- Servidor de Confección v8.7 con PostgreSQL ---");

const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pgSession = require('connect-pg-simple')(session);
const { checkRole } = require('./permissions.js');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// ===== INICIO: LÍNEAS AÑADIDAS PARA LEER DATOS JSON Y FORMULARIOS =====
// Estas líneas deben ir ANTES de que definas cualquier ruta (app.get, app.post, etc.)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ===== FIN: LÍNEAS AÑADIDAS =====

// --- Conexión a la Base de Datos PostgreSQL ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const initializeDatabase = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
CREATE TABLE IF NOT EXISTS confeccion_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL
);
        `);
        await client.query(`
CREATE TABLE IF NOT EXISTS confeccion_designers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);
        `);
        await client.query(`
CREATE TABLE IF NOT EXISTS confeccion_projects (
    id SERIAL PRIMARY KEY,
    codigo_proyecto VARCHAR(255) UNIQUE NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    cliente VARCHAR(255),
    nombre_asesor VARCHAR(255),
    detalles_solicitud TEXT,
    status VARCHAR(100) DEFAULT 'Diseño Pendiente de Asignación',
    diseñador_id INTEGER,
    fecha_de_asignacion TIMESTAMPTZ,
    fecha_propuesta TIMESTAMPTZ,
    fecha_aprobacion_interna TIMESTAMPTZ,
    fecha_aprobacion_cliente TIMESTAMPTZ,
    fecha_proforma_subida TIMESTAMPTZ,
    fecha_autorizacion_produccion TIMESTAMPTZ,
    historial_revisiones JSONB,
    historial_produccion JSONB,
    historial_incidencias JSONB
);
        `);
        await client.query(`
CREATE TABLE IF NOT EXISTS confeccion_archivos (
    id SERIAL PRIMARY KEY,
    proyecto_id INTEGER NOT NULL REFERENCES confeccion_projects(id) ON DELETE CASCADE,
    tipo_archivo VARCHAR(100) NOT NULL,
    url_archivo VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255),
    fecha_subida TIMESTAMPTZ DEFAULT NOW(),
    subido_por VARCHAR(255)
);
        `);
        await client.query(`
CREATE TABLE IF NOT EXISTS "confeccion_session" (
    "sid" varchar NOT NULL PRIMARY KEY,
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL
);
        `);
        const adminUser = await client.query("SELECT * FROM confeccion_users WHERE username = 'admin'");
        if (adminUser.rows.length === 0) {
            console.log("Usuario 'admin' no encontrado. Creando usuario por defecto...");
            const defaultPassword = 'admin123';
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
            await client.query(
                "INSERT INTO confeccion_users (username, password, rol) VALUES ($1, $2, $3)",
                ['admin', hashedPassword, 'Administrador']
            );
            console.log("Usuario 'admin' creado con éxito.");
        }
    } catch (err) {
        console.error('Error al inicializar la base de datos de confección:', err);
    } finally {
        client.release();
    }
};
// --- Middleware y Configs ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads_confeccion', express.static(path.join(__dirname, 'uploads_confeccion')));

app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'confeccion_session'
    }),
    secret: 'nuevo_secreto_independiente_confeccion_mas_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: 'auto',
        httpOnly: true
    }
}));

const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    next();
};

// REEMPLÁZALO CON ESTE BLOQUE
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads_confeccion';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Lógica final y simplificada para garantizar nombres únicos y válidos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});
const upload = multer({ storage: storage });

// --- Rutas de Autenticación ---
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM confeccion_users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
        req.session.user = { username: user.username, rol: user.rol };
        res.json({ redirectTo: '/logistica.html' });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

app.get('/api/logout', (req, res) => req.session.destroy(() => res.redirect('/login.html')));
app.get('/api/me', requireLogin, (req, res) => res.json(req.session.user));
app.get('/', requireLogin, (req, res) => res.redirect('/logistica.html'));

// --- Rutas HTML Protegidas ---
const confeccionRoles = ['Administrador', 'Coordinador', 'Asesor', 'Diseñador', 'Colaborador / Staff'];
app.get('/logistica.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'logistica.html')));
app.get('/admin_usuarios.html', requireLogin, checkRole(['Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'admin_usuarios.html')));
app.get('/confeccion_dashboard.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'confeccion_dashboard.html')));
app.get('/panel_confeccion.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'panel_confeccion.html')));
app.get('/solicitud_confeccion.html', requireLogin, checkRole(['Asesor', 'Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'solicitud_confeccion.html')));
app.get('/detalle_proyecto.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'detalle_proyecto.html')));
app.get('/admin_diseñadores.html', requireLogin, checkRole(['Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'admin_diseñadores.html')));

// --- RUTAS DE API ---

// ===== INICIO: NUEVAS RUTAS PROXY PARA CONECTAR CON GESTIÓN =====
const GESTION_API_KEY = 'MI_LLAVE_SECRETA_12345'; // Asegúrate que esta llave sea la correcta

// Puente para los Centros Formalizados
app.get('/api/proxy/formalized-centers', requireLogin, async (req, res) => {
    try {
        const gestionApiUrl = `https://be-gestion.onrender.com/api/formalized-centers?t=${Date.now()}`;

        const response = await axios.get(gestionApiUrl, {
            headers: { 'X-API-Key': GESTION_API_KEY }
        });

        if (response.status === 204) {
            return res.status(204).send();
        }

        res.json(response.data);

    } catch (error) {
        console.error("Error en el proxy de centros:", error.message);
        res.status(500).send("Error al obtener la lista de centros desde el servidor principal.");
    }
});

// Puente para la Lista de Asesores
app.get('/api/proxy/advisors-list', requireLogin, async (req, res) => {
    try {
        const gestionApiUrl = `https://be-gestion.onrender.com/api/advisors-list?t=${Date.now()}`;

        const response = await axios.get(gestionApiUrl, {
            headers: { 'X-API-Key': GESTION_API_KEY }
        });

        if (response.status === 204) {
            return res.status(204).send();
        }

        res.json(response.data);

    } catch (error) {
        console.error("Error en el proxy de asesores:", error.message);
        res.status(500).send("Error al obtener la lista de asesores desde el servidor principal.");
    }
});
// ===== FIN: NUEVAS RUTAS PROXY =====

app.put('/api/proyectos/:id/solicitar-mejora', requireLogin, checkRole(['Administrador', 'Coordinador', 'Asesor']), async (req, res) => {
    const { id } = req.params;
    const { comentarios } = req.body;

    if (!comentarios) {
        return res.status(400).json({ message: 'Los comentarios son obligatorios para solicitar una mejora.' });
    }

    try {
        const nuevaRevision = {
            fecha: new Date(),
            usuario: req.session.user.username,
            rol: req.session.user.rol,
            comentario: comentarios
        };

        const result = await pool.query(
            `UPDATE confeccion_projects 
             SET status = 'Diseño en Proceso', 
                 historial_revisiones = COALESCE(historial_revisiones, '[]'::jsonb) || $1::jsonb 
             WHERE id = $2 RETURNING *`,
            [JSON.stringify(nuevaRevision), id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error('Error al solicitar mejora:', err);
        res.status(500).json({ message: 'Error en el servidor al solicitar la mejora.' });
    }
});
// ===== INICIO: Nueva Ruta Genérica para Subida de Archivos =====
app.post('/api/archivos/temporal', requireLogin, upload.single('archivo'), (req, res) => {
    // El middleware 'upload.single' ya se encargó de guardar el archivo.
    // 'req.file' contiene la información del archivo que se acaba de subir.

    if (!req.file) {
        return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }

    // Si el archivo se subió con éxito, devolvemos la ruta donde se guardó.
    // El frontend usará esta ruta para saber qué archivo se acaba de añadir.
    res.json({
        message: 'Archivo subido con éxito.',
        filePath: req.file.path,
        fileName: req.file.originalname
    });
});
// ===== FIN: Nueva Ruta Genérica para Subida de Archivos =====

// --- Rutas de Administración de Usuarios (AÑADIDAS Y ADAPTADAS A POSTGRESQL) ---
app.get('/api/users', requireLogin, checkRole(['Administrador']), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, rol FROM confeccion_users ORDER BY username ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener usuarios:", err);
        res.status(500).json({ message: 'Error al cargar la lista de usuarios.' });
    }
});

app.post('/api/users', requireLogin, checkRole(['Administrador']), async (req, res) => {
    const { username, password, rol } = req.body;
    if (!username || !password || !rol) {
        return res.status(400).json({ message: 'Nombre de usuario, contraseña y rol son obligatorios.' });
    }
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const result = await pool.query(
            'INSERT INTO confeccion_users (username, password, rol) VALUES ($1, $2, $3) RETURNING id, username, rol',
            [username, hashedPassword, rol]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Error de duplicado
            return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
        }
        console.error("Error al crear usuario:", err);
        res.status(500).json({ message: 'Error al crear el usuario.' });
    }
});

app.delete('/api/users/:username', requireLogin, checkRole(['Administrador']), async (req, res) => {
    const { username } = req.params;
    if (username === 'admin') {
        return res.status(403).json({ message: 'No se puede eliminar al usuario administrador principal.' });
    }
    try {
        const result = await pool.query('DELETE FROM confeccion_users WHERE username = $1', [username]);
        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Usuario eliminado con éxito.' });
        } else {
            res.status(404).json({ message: 'Usuario no encontrado.' });
        }
    } catch (err) {
        console.error("Error al eliminar usuario:", err);
        res.status(500).json({ message: 'Error al eliminar el usuario.' });
    }
});

app.get('/api/asesores', requireLogin, (req, res) => {
    const asesores = [ { name: 'Moises Gross' }, { name: 'Leudis Santos' }, { name: 'Asesor de Prueba' } ];
    res.json(asesores);
});

app.get('/api/proyectos', requireLogin, async (req, res) => {
    try {
        const query = `
            SELECT p.*, d.name AS nombre_disenador
            FROM confeccion_projects p
            LEFT JOIN confeccion_designers d ON p.diseñador_id = d.id
            ORDER BY p.fecha_creacion DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error en /api/proyectos:", err);
        res.status(500).json({ message: 'Error al obtener proyectos' });
    }
});


app.delete('/api/solicitudes/:id', requireLogin, checkRole(['Administrador']), async (req, res) => {
    const { id } = req.params;
    console.log(`Petición para eliminar proyecto con ID: ${id}`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar transacción

        // 1. Obtener las rutas de los archivos antes de borrar el proyecto
        const fileResult = await client.query(
            'SELECT imagenes_referencia, propuesta_diseno_url, proforma_url, listado_final_url FROM confeccion_projects WHERE id = $1',
            [id]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado.' });
        }

        const projectFiles = fileResult.rows[0];

        // 2. Eliminar el proyecto de la base de datos
        await client.query('DELETE FROM confeccion_projects WHERE id = $1', [id]);

        await client.query('COMMIT'); // Confirmar transacción

        // 3. Eliminar los archivos físicos del servidor
        const filesToDelete = [
            ...(projectFiles.imagenes_referencia || []),
            projectFiles.propuesta_diseno_url,
            projectFiles.proforma_url,
            projectFiles.listado_final_url
        ].filter(Boolean); // Filtrar para quitar valores nulos o vacíos

        filesToDelete.forEach(filePath => {
            const fullPath = path.join(__dirname, filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlink(fullPath, err => {
                    if (err) console.error(`Error al eliminar el archivo ${fullPath}:`, err);
                    else console.log(`Archivo eliminado: ${fullPath}`);
                });
            }
        });

        res.status(200).json({ message: 'Solicitud de confección eliminada con éxito.' });

    } catch (err) {
        await client.query('ROLLBACK'); // Revertir en caso de error
        console.error('Error al eliminar la solicitud de confección:', err);
        res.status(500).json({ message: 'Error en el servidor al intentar eliminar la solicitud.' });
    } finally {
        client.release();
    }
});

app.get('/api/proyectos/:id', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Obtenemos los detalles principales del proyecto y el nombre del diseñador
        const projectQuery = `
            SELECT p.*, d.name AS nombre_disenador
            FROM confeccion_projects p
            LEFT JOIN confeccion_designers d ON p.diseñador_id = d.id
            WHERE p.id = $1
        `;
        const projectResult = await pool.query(projectQuery, [id]);

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }
        const proyecto = projectResult.rows[0];

        // 2. Obtenemos TODOS los archivos asociados a ese proyecto desde la nueva tabla
        const filesResult = await pool.query(
            'SELECT * FROM confeccion_archivos WHERE proyecto_id = $1 ORDER BY fecha_subida DESC',
            [id]
        );

        // 3. Añadimos la lista de archivos al objeto del proyecto
        proyecto.archivos = filesResult.rows;

        // 4. Enviamos todo junto
        res.json(proyecto);

    } catch (err) {
        console.error('Error al obtener los detalles del proyecto:', err);
        res.status(500).json({ message: 'Error en el servidor al obtener el proyecto' });
    }
});
app.post('/api/solicitudes', requireLogin, checkRole(['Asesor', 'Administrador', 'Coordinador']), async (req, res) => {
    // Con el nuevo sistema, ya no se usa "multer" aquí.
    // Los datos, incluyendo la lista de archivos, vienen en el cuerpo de la petición (req.body).
    const { nombre_centro, nombre_asesor, detalles_solicitud, archivos } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Iniciar transacción para seguridad

        // 1. Creamos el proyecto en la base de datos con los datos de texto.
        const projectResult = await client.query(
            'INSERT INTO confeccion_projects (codigo_proyecto, cliente, nombre_asesor, detalles_solicitud) VALUES ($1, $2, $3, $4) RETURNING *',
            [`PROY-CONF-${Date.now()}`, nombre_centro, nombre_asesor, detalles_solicitud]
        );
        const nuevoProyecto = projectResult.rows[0];

        // 2. Si el frontend nos envió una lista de archivos previamente subidos, los asociamos al proyecto.
        if (archivos && archivos.length > 0) {
            for (const file of archivos) {
                // Insertamos cada archivo en nuestra nueva tabla 'confeccion_archivos'.
                await client.query(
                    `INSERT INTO confeccion_archivos (proyecto_id, tipo_archivo, url_archivo, nombre_archivo, subido_por) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [nuevoProyecto.id, 'referencia', file.filePath, file.fileName, req.session.user.username]
                );
            }
        }

        await client.query('COMMIT'); // Confirmamos todos los cambios en la base de datos.
        res.status(201).json(nuevoProyecto);

    } catch (err) {
        await client.query('ROLLBACK'); // Si algo falla, revertimos todo.
        console.error('Error al crear la solicitud:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release(); // Liberamos la conexión.
    }
});
app.get('/api/designers', requireLogin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name AS nombre FROM confeccion_designers ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener diseñadores' }); }
});

// REEMPLAZA TU RUTA '/api/solicitudes' ACTUAL CON ESTA
app.post('/api/solicitudes', requireLogin, checkRole(['Asesor', 'Administrador']), upload.array('imagenes_referencia'), async (req, res) => {
    const { nombre_centro, nombre_asesor, detalles_solicitud } = req.body;
    const client = await pool.connect(); // Usaremos una transacción

    try {
        await client.query('BEGIN'); // Iniciar transacción

        // 1. Insertamos el nuevo proyecto en la tabla principal
        const projectResult = await client.query(
            'INSERT INTO confeccion_projects (codigo_proyecto, cliente, nombre_asesor, detalles_solicitud) VALUES ($1, $2, $3, $4) RETURNING *',
            [`PROY-CONF-${Date.now()}`, nombre_centro, nombre_asesor, detalles_solicitud]
        );
        const nuevoProyecto = projectResult.rows[0];

        // 2. Si hay imágenes de referencia, las guardamos en la nueva tabla de archivos
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await client.query(
                    `INSERT INTO confeccion_archivos (proyecto_id, tipo_archivo, url_archivo, nombre_archivo, subido_por) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [nuevoProyecto.id, 'referencia', file.path, file.originalname, req.session.user.username]
                );
            }
        }

        await client.query('COMMIT'); // Confirmar transacción
        res.status(201).json(nuevoProyecto);

    } catch (err) {
        await client.query('ROLLBACK'); // Revertir en caso de error
        console.error('Error al crear la solicitud:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

app.delete('/api/designers/:id', requireLogin, checkRole(['Administrador']), async (req, res) => {
    try {
        await pool.query('DELETE FROM confeccion_designers WHERE id = $1', [req.params.id]);
        res.status(200).json({ message: 'Diseñador eliminado' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error al eliminar diseñador' }); }
});

const updateProjectStatus = async (status, id) => {
    return pool.query(`UPDATE confeccion_projects SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
};

app.put('/api/proyectos/:id/asignar', requireLogin, checkRole(['Administrador', 'Coordinador']), async (req, res) => {
    try {
        const result = await pool.query('UPDATE confeccion_projects SET diseñador_id = $1, fecha_de_asignacion = NOW(), status = $2 WHERE id = $3 RETURNING *', [req.body.diseñadorId, 'Diseño en Proceso', req.params.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: 'Error al asignar proyecto' }); }
});

app.put('/api/proyectos/:id/subir-propuesta', requireLogin, checkRole(['Diseñador', 'Administrador']), async (req, res) => {
    // Ahora leemos la lista de archivos desde 'req.body', no desde 'req.file'.
    const { id } = req.params;
    const { archivos } = req.body;

    // La verificación ahora se hace sobre 'archivos'.
    if (!archivos || archivos.length === 0) {
        return res.status(400).json({ message: 'No se ha enviado ningún archivo de propuesta.' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Recorremos la lista de archivos que llegó en 'req.body.archivos'.
        for (const file of archivos) {
            await client.query(
                `INSERT INTO confeccion_archivos (proyecto_id, tipo_archivo, url_archivo, nombre_archivo, subido_por) 
                 VALUES ($1, $2, $3, $4, $5)`,
                // Usamos file.filePath y file.fileName, que es lo que envía el frontend.
                [id, 'propuesta_diseno', file.filePath, file.fileName, req.session.user.username]
            );
        }

        // Actualizamos el estado del proyecto.
        const projectResult = await client.query(
            'UPDATE confeccion_projects SET status = $1, fecha_propuesta = NOW() WHERE id = $2 RETURNING *', 
            ['Pendiente Aprobación Interna', id]
        );

        await client.query('COMMIT');
        res.json(projectResult.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al subir propuesta(s):', err);
        res.status(500).json({ message: 'Error en el servidor al subir la(s) propuesta(s).' });
    } finally {
        client.release();
    }
});
app.put('/api/proyectos/:id/subir-proforma', requireLogin, checkRole(['Administrador', 'Diseñador']), async (req, res) => {
    // 1. Ya no usamos 'multer', por lo que leemos los datos desde 'req.body'.
    const { id } = req.params;
    const { archivos } = req.body;

    // 2. Verificamos que el frontend nos haya enviado la lista de archivos.
    if (!archivos || archivos.length === 0) {
        return res.status(400).json({ message: 'No se ha subido ningún archivo de proforma.' });
    }
    
    const client = await pool.connect();
    try {
        // 3. Iniciamos una transacción para asegurar que todo se guarde correctamente.
        await client.query('BEGIN');

        // 4. Recorremos la lista de archivos que nos envió el frontend.
        for (const file of archivos) {
            // Por cada archivo en la lista, creamos un registro en nuestra tabla 'confeccion_archivos'.
            await client.query(
                `INSERT INTO confeccion_archivos (proyecto_id, tipo_archivo, url_archivo, nombre_archivo, subido_por) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [id, 'proforma', file.filePath, file.fileName, req.session.user.username]
            );
        }

        // 5. Actualizamos el estado del proyecto a "Pendiente Aprobación Proforma".
        const projectResult = await client.query(
            'UPDATE confeccion_projects SET status = $1, fecha_proforma_subida = NOW() WHERE id = $2 RETURNING *',
            ['Pendiente Aprobación Proforma', id]
        );

        // 6. Si todo salió bien, confirmamos los cambios.
        await client.query('COMMIT');
        res.json(projectResult.rows[0]);

    } catch (err) {
        // 7. Si algo falla, revertimos todos los cambios.
        await client.query('ROLLBACK');
        console.error('Error al subir la proforma:', err);
        res.status(500).json({ message: 'Error en el servidor al subir la proforma.' });
    } finally {
        // 8. Liberamos la conexión a la base de datos.
        client.release();
    }
});
app.put('/api/proyectos/:id/aprobar-interno', requireLogin, checkRole(['Administrador', 'Coordinador']), async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE confeccion_projects 
             SET status = 'Pendiente Aprobación Cliente', 
                 fecha_aprobacion_interna = NOW() 
             WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al aprobar internamente:', err);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});
app.put('/api/proyectos/:id/aprobar-cliente', requireLogin, checkRole(['Asesor', 'Administrador']), async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE confeccion_projects 
             SET status = 'Pendiente de Proforma', 
                 fecha_aprobacion_cliente = NOW() 
             WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al registrar la aprobación del cliente:', err);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

app.put('/api/proyectos/:id/aprobar-calidad', requireLogin, checkRole(['Administrador', 'Coordinador']), async (req, res) => {
    try {
        // Nota: No existe un campo 'fecha_aprobacion_calidad', por lo que solo actualizamos el estado.
        const result = await pool.query(
            `UPDATE confeccion_projects 
             SET status = 'Listo para Entrega' 
             WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al aprobar calidad:', err);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// REEMPLAZA TU RUTA '/autorizar-produccion' CON ESTA
app.put('/api/proyectos/:id/autorizar-produccion', requireLogin, checkRole(['Asesor', 'Administrador']), upload.single('listado_final'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'El listado final es un archivo obligatorio.' });
    
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Guardamos el listado final en la tabla de archivos
        await client.query(
            `INSERT INTO confeccion_archivos (proyecto_id, tipo_archivo, url_archivo, nombre_archivo, subido_por) 
             VALUES ($1, $2, $3, $4, $5)`,
            [id, 'listado_final', req.file.path, req.file.originalname, req.session.user.username]
        );

        // 2. Actualizamos el estado del proyecto
        const result = await client.query(
            'UPDATE confeccion_projects SET fecha_autorizacion_produccion = NOW(), status = $1 WHERE id = $2 RETURNING *',
            ['En Lista de Producción', id]
        );

        await client.query('COMMIT');
        res.json(result.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error al autorizar producción:', err);
        res.status(500).json({ message: 'Error al autorizar producción' });
    } finally {
        client.release();
    }
});// Pega este bloque en tu server_confeccion.js

app.put('/api/proyectos/:id/reportar-incidencia', requireLogin, checkRole(['Administrador', 'Coordinador']), async (req, res) => {
    const { id } = req.params;
    const { comentarios } = req.body;

    if (!comentarios) {
        return res.status(400).json({ message: 'El comentario es obligatorio para reportar una incidencia.' });
    }

    try {
        const nuevaIncidencia = {
            fecha: new Date(),
            usuario: req.session.user.username,
            comentario: comentarios
        };

        const nuevoRegistroHistorial = {
            etapa: 'En Confección (Devuelto por Calidad)',
            fecha: new Date()
        };

        const result = await pool.query(
            `UPDATE confeccion_projects 
             SET 
                status = 'En Confección', 
                historial_incidencias = COALESCE(historial_incidencias, '[]'::jsonb) || $1::jsonb,
                historial_produccion = COALESCE(historial_produccion, '[]'::jsonb) || $2::jsonb
             WHERE id = $3 RETURNING *`,
            [JSON.stringify(nuevaIncidencia), JSON.stringify(nuevoRegistroHistorial), id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error('Error al reportar incidencia:', err);
        res.status(500).json({ message: 'Error en el servidor al reportar la incidencia.' });
    }
});
app.put('/api/proyectos/:id/avanzar-etapa', requireLogin, checkRole(['Administrador', 'Coordinador']), async (req, res) => {
    const { nuevaEtapa } = req.body;
    try {
        // ---- LA CORRECCIÓN ESTÁ EN LA SIGUIENTE CONSULTA ----
        const result = await pool.query(
            `UPDATE confeccion_projects 
             SET status = $1, 
                 historial_produccion = COALESCE(historial_produccion, '[]'::jsonb) || $2::jsonb 
             WHERE id = $3 RETURNING *`,
            [nuevaEtapa, JSON.stringify({ etapa: nuevaEtapa, fecha: new Date() }), req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al avanzar la etapa de producción:', err);
        res.status(500).json({ message: 'Error al avanzar etapa' });
    }
});// Servidor de archivos estáticos (Debe ir al final de todas las rutas)
app.use(express.static(path.join(__dirname)));

// Función para iniciar el servidor
const startServer = async () => {
    await initializeDatabase();
    app.listen(port, () => console.log(`👕 Servidor de Confección v8.7 escuchando en el puerto ${port}`));
};

startServer();
