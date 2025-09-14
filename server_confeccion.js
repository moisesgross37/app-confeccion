// ============== SERVIDOR DE DISEÑO Y CONFECCIÓN v7.0 (Login Independiente) ==============
// Puerto: 3001
// Base de Datos: db_confeccion.json
// Responsabilidad: Gestionar proyectos de diseño, producción y calidad con login propio.
// =====================================================================================

console.log("--- Servidor de Confección v7.0 con Login Independiente ---");

const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { checkRole } = require('./permissions.js');

const app = express();
const port = 3001;

const dbConfeccionPath = path.join(__dirname, 'db_confeccion.json');

// --- Middleware y Configs ---
// La línea de archivos estáticos se movió al final para corregir la seguridad.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads_confeccion', express.static(path.join(__dirname, 'uploads_confeccion')));

// Middleware para evitar caché en las páginas HTML
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Configuración de Sesión
app.use(session({
    secret: 'nuevo_secreto_independiente_confeccion',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Sesión de 24 horas
}));

// Middleware para verificar autenticación
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

// --- Funciones DB ---
function readDB(filePath) {
    if (!fs.existsSync(filePath)) {
        let defaultData = { proyectos_confeccion: [], disenadores: [], users: [] };
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function writeDB(filePath, data) { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); }

function findProjectAndUpdate(req, res, updateLogic) {
    const db = readDB(dbConfeccionPath);
    const pIndex = db.proyectos_confeccion.findIndex(p => p.id == req.params.id);
    if (pIndex !== -1) {
        const proyecto = db.proyectos_confeccion[pIndex];
        updateLogic(proyecto, req, res);
        writeDB(dbConfeccionPath, db);
        res.json(proyecto);
    } else { res.status(404).json({ message: 'Proyecto no encontrado' }); }
}

// --- Rutas de Autenticación ---
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const db = readDB(dbConfeccionPath);
    const user = db.users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
        req.session.user = { username: user.username, rol: user.rol };
        res.json({ redirectTo: '/logistica.html' });
    } else {
        res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'No se pudo cerrar la sesión' });
        }
        res.redirect('/login.html');
    });
});

app.get('/api/me', requireLogin, (req, res) => {
    res.json(req.session.user);
});

// --- Rutas de Administración de Usuarios ---
app.get('/api/users', requireLogin, checkRole(['Administrador']), (req, res) => {
    const db = readDB(dbConfeccionPath);
    // No enviar las contraseñas cifradas al cliente
    const users = db.users.map(u => ({ id: u.id, username: u.username, rol: u.rol }));
    res.json(users);
});

app.post('/api/users', requireLogin, checkRole(['Administrador']), async (req, res) => {
    const { username, password, rol } = req.body;
    if (!username || !password || !rol) {
        return res.status(400).json({ message: 'Nombre de usuario, contraseña y rol son obligatorios.' });
    }

    const db = readDB(dbConfeccionPath);

    if (db.users.find(u => u.username === username)) {
        return res.status(409).json({ message: 'El nombre de usuario ya existe.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
        id: Date.now(),
        username,
        password: hashedPassword,
        rol
    };

    db.users.push(newUser);
    writeDB(dbConfeccionPath, db);
    
    res.status(201).json({ id: newUser.id, username: newUser.username, rol: newUser.rol });
});

app.delete('/api/users/:username', requireLogin, checkRole(['Administrador']), (req, res) => {
    const { username } = req.params;

    if (username === 'admin') {
        return res.status(403).json({ message: 'No se puede eliminar al usuario administrador principal.' });
    }

    const db = readDB(dbConfeccionPath);
    const initialLength = db.users.length;
    db.users = db.users.filter(u => u.username !== username);

    if (db.users.length < initialLength) {
        writeDB(dbConfeccionPath, db);
        res.status(200).json({ message: 'Usuario eliminado con éxito.' });
    } else {
        res.status(404).json({ message: 'Usuario no encontrado.' });
    }
});


// --- Rutas HTML Protegidas ---
app.get('/', requireLogin, (req, res) => {
    res.redirect('/logistica.html');
});

app.get('/logistica.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'logistica.html')));
app.get('/admin_usuarios.html', requireLogin, checkRole(['Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'admin_usuarios.html')));

const confeccionRoles = ['Administrador', 'Coordinador', 'Asesor', 'Diseñador', 'Colaborador / Staff'];
app.get('/confeccion_dashboard.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'confeccion_dashboard.html')));
app.get('/panel_confeccion.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'panel_confeccion.html')));
app.get('/solicitud_confeccion.html', requireLogin, checkRole(['Asesor', 'Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'solicitud_confeccion.html')));
app.get('/detalle_proyecto.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'detalle_proyecto.html')));
app.get('/admin_diseñadores.html', requireLogin, checkRole(['Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'admin_diseñadores.html')));
app.get('/vista_disenador.html', requireLogin, checkRole(['Administrador', 'Diseñador']), (req, res) => res.sendFile(path.join(__dirname, 'vista_disenador.html')));
app.get('/panel_produccion.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'panel_produccion.html')));
app.get('/panel_calidad.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'panel_calidad.html')));
app.get('/proyecto_diseno.html', requireLogin, checkRole(confeccionRoles), (req, res) => res.sendFile(path.join(__dirname, 'proyecto_diseno.html')));
app.get('/panel_asignacion.html', requireLogin, checkRole(['Administrador']), (req, res) => res.sendFile(path.join(__dirname, 'panel_asignacion.html')));
app.get('/panel_aprobacion_interna.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'panel_aprobacion_interna.html')));
app.get('/crear_solicitud_diseno.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'crear_solicitud_diseno.html')));


// --- RUTAS DE API Protegidas ---
app.get('/api/proyectos', requireLogin, (req, res) => res.json(readDB(dbConfeccionPath).proyectos_confeccion || []));
app.get('/api/proyectos/:id', requireLogin, (req, res) => { const db = readDB(dbConfeccionPath); const p = db.proyectos_confeccion.find(p => p.id == req.params.id); if (p) res.json(p); else res.status(404).json({ message: 'Proyecto no encontrado' }); });
app.post('/api/solicitudes', requireLogin, checkRole(['Asesor', 'Administrador']), upload.array('imagenes_referencia'), (req, res) => { const db = readDB(dbConfeccionPath); const nS = { id: Date.now(), codigo_proyecto: `PROY-CONF-${Date.now()}`, fecha_creacion: new Date().toISOString(), cliente: req.body.nombre_centro, nombre_asesor: req.body.nombre_asesor, detalles_solicitud: req.body.detalles_solicitud, imagenes_referencia: req.files ? req.files.map(f => f.path) : [], status: 'Diseño Pendiente de Asignación' }; db.proyectos_confeccion.push(nS); writeDB(dbConfeccionPath, db); res.status(201).json(nS); });
app.get('/api/designers', requireLogin, checkRole(['Administrador']), (req, res) => res.json(readDB(dbConfeccionPath).diseñadores || []));

app.post('/api/designers', requireLogin, checkRole(['Administrador']), (req, res) => {
    const db = readDB(dbConfeccionPath);
    const newDesigner = {
        id: Date.now(),
        nombre: req.body.nombre
    };
    if (!db.diseñadores) {
        db.diseñadores = [];
    }
    db.diseñadores.push(newDesigner);
    writeDB(dbConfeccionPath, db);
    res.status(201).json(newDesigner);
});

app.delete('/api/designers/:id', requireLogin, checkRole(['Administrador']), (req, res) => {
    const db = readDB(dbConfeccionPath);
    const designerId = parseInt(req.params.id, 10);
    const initialLength = db.diseñadores.length;
    db.diseñadores = db.diseñadores.filter(d => d.id !== designerId);

    if (db.diseñadores.length < initialLength) {
        writeDB(dbConfeccionPath, db);
        res.status(200).json({ message: 'Diseñador eliminado' });
    } else {
        res.status(404).json({ message: 'Diseñador no encontrado' });
    }
});
app.put('/api/proyectos/:id/asignar', requireLogin, checkRole(['Administrador', 'Coordinador']), (req, res) => findProjectAndUpdate(req, res, (p) => { p.diseñador_id = req.body.diseñadorId; p.fecha_de_asignacion = new Date().toISOString(); p.status = 'Diseño en Proceso'; }));
app.put('/api/proyectos/:id/subir-propuesta', requireLogin, checkRole(['Diseñador']), upload.single('propuesta_diseno'), (req, res) => { if (!req.file) return res.status(400).json({ message: 'No se ha subido ningún archivo.' }); findProjectAndUpdate(req, res, (p) => { p.propuesta_diseno_url = req.file.path; p.fecha_propuesta = new Date().toISOString(); p.status = 'Pendiente Aprobación Interna'; }); });
app.put('/api/proyectos/:id/aprobar-interno', requireLogin, checkRole(['Administrador', 'Coordinador']), (req, res) => findProjectAndUpdate(req, res, (p) => { p.fecha_aprobacion_interna = new Date().toISOString(); p.status = 'Pendiente Aprobación Cliente'; }));
app.put('/api/proyectos/:id/solicitar-mejora', requireLogin, checkRole(['Administrador', 'Coordinador']), (req, res) => findProjectAndUpdate(req, res, (p) => { p.status = 'Diseño en Proceso'; if (!p.historial_revisiones) p.historial_revisiones = []; p.historial_revisiones.push({ fecha: new Date().toISOString(), comentario: req.body.comentarios }); }));
app.put('/api/proyectos/:id/aprobar-cliente', requireLogin, checkRole(['Asesor', 'Administrador']), (req, res) => findProjectAndUpdate(req, res, (p) => { p.fecha_aprobacion_cliente = new Date().toISOString(); p.status = 'Pendiente de Proforma'; }));
app.put('/api/proyectos/:id/subir-proforma', requireLogin, checkRole(['Diseñador']), upload.single('proforma'), (req, res) => { if (!req.file) return res.status(400).json({ message: 'No se ha subido ningún archivo.' }); findProjectAndUpdate(req, res, (p) => { p.proforma_url = req.file.path; p.fecha_proforma_subida = new Date().toISOString(); p.status = 'Pendiente Aprobación Proforma'; }); });
app.put('/api/proyectos/:id/solicitar-mejora-proforma', requireLogin, (req, res) => { findProjectAndUpdate(req, res, (p) => { p.status = 'Pendiente de Proforma'; if (!p.historial_revisiones) p.historial_revisiones = []; p.historial_revisiones.push({ fecha: new Date().toISOString(), comentario: req.body.comentarios }); }); });
app.put('/api/proyectos/:id/autorizar-produccion', requireLogin, checkRole(['Asesor', 'Administrador']), upload.single('listado_final'), (req, res) => { if (!req.file) { return res.status(400).json({ message: 'El listado final es un archivo obligatorio.' }); } findProjectAndUpdate(req, res, (p) => { p.listado_final_url = req.file.path; p.fecha_autorizacion_produccion = new Date().toISOString(); p.status = 'En Lista de Producción'; }); });
app.put('/api/proyectos/:id/avanzar-etapa', requireLogin, checkRole(['Administrador', 'Coordinador']), (req, res) => {
    findProjectAndUpdate(req, res, (proyecto) => {
        const { nuevaEtapa } = req.body;
        proyecto.status = nuevaEtapa;
        if (!proyecto.historial_produccion) { proyecto.historial_produccion = []; }
        proyecto.historial_produccion.push({ etapa: nuevaEtapa, fecha: new Date().toISOString() });
    });
});

// --- ✅ NUEVAS RUTAS AÑADIDAS PARA CONTROL DE CALIDAD ---
app.put('/api/proyectos/:id/aprobar-calidad', requireLogin, checkRole(['Administrador', 'Coordinador']), (req, res) => {
    findProjectAndUpdate(req, res, (proyecto) => {
        proyecto.status = 'Listo para Entrega';
        if (!proyecto.historial_produccion) proyecto.historial_produccion = [];
        proyecto.historial_produccion.push({
            etapa: 'Aprobado Calidad',
            fecha: new Date().toISOString()
        });
    });
});

app.put('/api/proyectos/:id/reportar-incidencia', requireLogin, checkRole(['Administrador', 'Coordinador']), (req, res) => {
    findProjectAndUpdate(req, res, (proyecto) => {
        const { comentarios } = req.body;
        proyecto.status = 'En Confección'; // Se devuelve a la etapa anterior
        if (!proyecto.historial_incidencias) proyecto.historial_incidencias = [];
        proyecto.historial_incidencias.push({
            comentario: comentarios,
            fecha: new Date().toISOString()
        });
    });
});

// Servidor de archivos estáticos (Debe ir al final)
app.use(express.static(path.join(__dirname)));

app.listen(port, () => console.log(`👕 Servidor de Confección v7.1 escuchando en http://localhost:${port}`));