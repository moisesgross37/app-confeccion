// ============== SERVIDOR DE DISEÑO Y CONFECCIÓN v8.5 (PostgreSQL Completo y Corregido) ==============
// Base de Datos: PostgreSQL en Render
// Responsabilidad: Gestionar proyectos de diseño, producción y calidad con login propio.
// =====================================================================================

console.log("--- Servidor de Confección v8.5 con PostgreSQL ---");

const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pgSession = require('connect-pg-simple')(session);
const { checkRole } = require('./permissions.js');

const app = express();
const port = process.env.PORT || 3001;

// --- Conexión a la Base de Datos PostgreSQL ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- Inicialización de la Base de Datos ---
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
                imagenes_referencia TEXT[],
                status VARCHAR(100) DEFAULT 'Diseño Pendiente de Asignación',
                diseñador_id INTEGER,
                fecha_de_asignacion TIMESTAMPTZ,
                propuesta_diseno_url VARCHAR(255),
                fecha_propuesta TIMESTAMPTZ,
                fecha_aprobacion_interna TIMESTAMPTZ,
                fecha_aprobacion_cliente TIMESTAMPTZ,
                proforma_url VARCHAR(255),
                fecha_proforma_subida TIMESTAMPTZ,
                listado_final_url VARCHAR(255),
                fecha_autorizacion_produccion TIMESTAMPTZ,
                historial_revisiones JSONB,
                historial_produccion JSONB,
                historial_incidencias JSONB
            );
        `);
        
        // ===== INICIO DE LA MODIFICACIÓN 1: Añadir tabla de sesiones =====
        await client.query(`
            CREATE TABLE IF NOT EXISTS "confeccion_session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            ) WITH (OIDS=FALSE);
            ALTER TABLE "confeccion_session" ADD CONSTRAINT "confeccion_session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        `);
        // ===== FIN DE LA MODIFICACIÓN 1 =====
        
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

const storage = multer.diskStorage({
    destination: (req, file, cb) => { const dir = './uploads_confeccion'; if (!fs.existsSync(dir)){ fs.mkdirSync(dir); } cb(null, dir); },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
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
        // ===== INICIO DE LA MODIFICACIÓN 2: Corregir redirección post-login =====
        res.json({ redirectTo: '/logistica.html' }); // <-- CORREGIDO: Redirige al menú principal
        // ===== FIN DE LA MODIFICACIÓN 2 =====
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

app.get('/api/logout', (req, res) => req.session.destroy(() => res.redirect('/login.html')));
app.get('/api/me', requireLogin, (req, res) => res.json(req.session.user));

// --- Ruta Principal ---
app.get('/', requireLogin, (req, res) => {
    res.redirect('/logistica.html'); // <-- CORREGIDO: También apunta al menú principal
});

// --- Rutas HTML Protegidas ---
const confeccionRoles = ['Administrador', 'Coordinador', 'Asesor', 'Diseñador', 'Colaborador / Staff'];
app.get('/logistica.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'logistica.html')));
app.get('/admin_usuarios.html', requireLogin, checkRole(['Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'admin_usuarios.html')));
app.get('/confeccion_dashboard.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'confeccion_dashboard.html')));
app.get('/panel_confeccion.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'panel_confeccion.html')));
app.get('/solicitud_confeccion.html', requireLogin, checkRole(['Asesor', 'Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'solicitud_confeccion.html')));
app.get('/detalle_proyecto.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'detalle_proyecto.html')));
app.get('/admin_diseñadores.html', requireLogin, checkRole(['Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'admin_diseñadores.html')));
// (Aquí continúan tus otras rutas HTML protegidas...)


// --- RUTAS DE API ---
app.get('/api/asesores', requireLogin, (req, res) => {
    const asesores = [ { name: 'Moises Gross' }, { name: 'Leudis Santos' }, { name: 'Asesor de Prueba' } ];
    res.json(asesores);
});

app.get('/api/proyectos', requireLogin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM confeccion_projects ORDER BY fecha_creacion DESC');
        res.json(result.rows);
    } catch (err) { 
        console.error("Error en /api/proyectos:", err);
        res.status(500).json({ message: 'Error al obtener proyectos' }); 
    }
});

app.get('/api/proyectos/:id', requireLogin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM confeccion_projects WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ message: 'Proyecto no encontrado' });
    } catch (err) { res.status(500).json({ message: 'Error al obtener proyecto' }); }
});

app.post('/api/solicitudes', requireLogin, checkRole(['Asesor', 'Administrador']), upload.array('imagenes_referencia'), async (req, res) => {
    const { nombre_centro, nombre_asesor, detalles_solicitud } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO confeccion_projects (codigo_proyecto, cliente, nombre_asesor, detalles_solicitud, imagenes_referencia) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [`PROY-CONF-${Date.now()}`, nombre_centro, nombre_asesor, detalles_solicitud, req.files ? req.files.map(f => f.path) : []]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Error interno del servidor' }); }
});

// --- Rutas de Diseñadores ---
app.get('/api/designers', requireLogin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM confeccion_designers ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error al obtener diseñadores' }); }
});

app.post('/api/designers', requireLogin, checkRole(['Administrador']), async (req, res) => {
    try {
        const result = await pool.query('INSERT INTO confeccion_designers (name) VALUES ($1) RETURNING *', [req.body.nombre]);
        res.status(201).json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error al crear diseñador' }); }
});

app.delete('/api/designers/:id', requireLogin, checkRole(['Administrador']), async (req, res) => {
    try {
        await pool.query('DELETE FROM confeccion_designers WHERE id = $1', [req.params.id]);
        res.status(200).json({ message: 'Diseñador eliminado' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error al eliminar diseñador' }); }
});

// --- Rutas de Actualización de Proyectos ---
const updateProjectStatus = async (status, id) => {
    return pool.query(`UPDATE confeccion_projects SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
};

app.put('/api/proyectos/:id/asignar', requireLogin, checkRole(['Administrador', 'Coordinador']), async (req, res) => {
    try {
        const result = await pool.query('UPDATE confeccion_projects SET diseñador_id = $1, fecha_de_asignacion = NOW(), status = $2 WHERE id = $3 RETURNING *', [req.body.diseñadorId, 'Diseño en Proceso', req.params.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: 'Error al asignar proyecto' }); }
});

app.put('/api/proyectos/:id/subir-propuesta', requireLogin, checkRole(['Diseñador']), upload.single('propuesta_diseno'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    try {
        const result = await pool.query('UPDATE confeccion_projects SET propuesta_diseno_url = $1, fecha_propuesta = NOW(), status = $2 WHERE id = $3 RETURNING *', [req.file.path, 'Pendiente Aprobación Interna', req.params.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: 'Error al subir propuesta' }); }
});

app.put('/api/proyectos/:id/aprobar-interno', requireLogin, checkRole(['Administrador', 'Coordinador']), (req, res) => updateProjectStatus('Pendiente Aprobación Cliente', req.params.id).then(r => res.json(r.rows[0])).catch(err => res.status(500).json(err)));
app.put('/api/proyectos/:id/aprobar-cliente', requireLogin, checkRole(['Asesor', 'Administrador']), (req, res) => updateProjectStatus('Pendiente de Proforma', req.params.id).then(r => res.json(r.rows[0])).catch(err => res.status(500).json(err)));
app.put('/api/proyectos/:id/aprobar-calidad', requireLogin, checkRole(['Administrador', 'Coordinador']), (req, res) => updateProjectStatus('Listo para Entrega', req.params.id).then(r => res.json(r.rows[0])).catch(err => res.status(500).json(err)));

app.put('/api/proyectos/:id/autorizar-produccion', requireLogin, checkRole(['Asesor', 'Administrador']), upload.single('listado_final'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'El listado final es un archivo obligatorio.' });
    try {
        const result = await pool.query('UPDATE confeccion_projects SET listado_final_url = $1, fecha_autorizacion_produccion = NOW(), status = $2 WHERE id = $3 RETURNING *', [req.file.path, 'En Lista de Producción', req.params.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: 'Error al autorizar producción' }); }
});

app.put('/api/proyectos/:id/avanzar-etapa', requireLogin, checkRole(['Administrador', 'Coordinador']), async (req, res) => {
    const { nuevaEtapa } = req.body;
    try {
        const result = await pool.query('UPDATE confeccion_projects SET status = $1, historial_produccion = historial_produccion || $2::jsonb WHERE id = $3 RETURNING *', [nuevaEtapa, JSON.stringify({ etapa: nuevaEtapa, fecha: new Date() }), req.params.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: 'Error al avanzar etapa' }); }
});

// Servidor de archivos estáticos (Debe ir al final)
app.use(express.static(path.join(__dirname)));

// Función para iniciar el servidor
const startServer = async () => {
    await initializeDatabase();
    app.listen(port, () => console.log(`👕 Servidor de Confección v8.5 escuchando en el puerto ${port}`));
};

startServer();
