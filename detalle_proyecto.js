document.addEventListener('DOMContentLoaded', () => {
    const projectId = new URLSearchParams(window.location.search).get('id');
    if (!projectId) {
        document.body.innerHTML = '<h1>Error: No se ha especificado un ID de proyecto.</h1>';
        return;
    }
    
    // Almacenamos el proyecto y el usuario globalmente en esta página
    let g_proyecto = null;
    let g_user = null;

    Promise.all([
        fetch(`/api/proyectos/${projectId}`, { cache: 'no-store' }).then(res => {
            if (!res.ok) throw new Error(`Error del servidor al cargar proyecto: ${res.status}`);
            return res.json();
        }),
        fetch('/api/me').then(res => {
            if (!res.ok) throw new Error(`Error del servidor al cargar usuario: ${res.status}`);
            return res.json();
        })
    ])
    .then(([proyecto, user]) => {
        // Guardamos los datos globalmente
        g_proyecto = proyecto;
        g_user = user;
        
        // Iniciamos el renderizado de la página
        renderizarInfoPrincipal(proyecto);
        renderizarArchivos(proyecto);
        renderizarTiemposEHistorial(proyecto);
        
        // La nueva función principal que dibuja las 14 etapas
        renderizarLineaDeTiempo(proyecto, user);
    })
    .catch(error => {
        console.error('Error fatal al cargar la página:', error);
        document.body.innerHTML = `<p style="color: red;"><b>Error Crítico:</b> ${error.message}.</p>`;
    });
});

// --- 1. RENDERIZAR INFO BÁSICA (TAREA 2.2 INCLUIDA) ---
function renderizarInfoPrincipal(proyecto) {
    document.getElementById('codigo-proyecto').textContent = proyecto.codigo_proyecto || 'N/A';
    document.getElementById('centro-proyecto').textContent = proyecto.cliente || 'N/A';
    document.getElementById('asesor-proyecto').textContent = proyecto.nombre_asesor || 'N/A';
    document.getElementById('disenador-proyecto').textContent = proyecto.nombre_disenador || 'No Asignado';
    document.getElementById('estado-proyecto').textContent = proyecto.status || 'N/A';
    document.getElementById('detalles-proyecto').textContent = proyecto.detalles_solicitud || 'N/A';

    // (Tarea 2.2) Renderizar productos
    const productosContainer = document.getElementById('productos-proyecto-container');
    productosContainer.innerHTML = '';
    if (proyecto.productos && proyecto.productos.length > 0) {
        const ul = document.createElement('ul');
        ul.style.margin = '0';
        ul.style.paddingLeft = '20px';
        proyecto.productos.forEach(productoNombre => {
            const li = document.createElement('li');
            li.textContent = productoNombre;
            ul.appendChild(li);
        });
        productosContainer.appendChild(ul);
    } else {
        productosContainer.innerHTML = '<em>No se especificaron productos en esta solicitud.</em>';
    }
}

// --- 2. RENDERIZAR ARCHIVOS (Separado para limpieza) ---
function renderizarArchivos(proyecto) {
    const archivosReferencia = document.getElementById('archivos-referencia');
    const archivosDiseno = document.getElementById('archivos-propuesta_diseno');
    const archivosProforma = document.getElementById('archivos-proforma');
    const archivosListado = document.getElementById('archivos-listado_final');
    
    archivosReferencia.innerHTML = '';
    archivosDiseno.innerHTML = '';
    archivosProforma.innerHTML = '';
    archivosListado.innerHTML = '';

    if (proyecto.archivos && proyecto.archivos.length > 0) {
        proyecto.archivos.forEach(archivo => {
            const li = document.createElement('li');
            const fecha = new Date(archivo.fecha_subida).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
            li.innerHTML = `<a href="${archivo.url_archivo}" target="_blank">${archivo.nombre_archivo}</a> <span style="color: #666; font-size: 0.9em;">(Subido por ${archivo.subido_por} - ${fecha})</span>`;
            
            switch (archivo.tipo_archivo) {
                case 'referencia': archivosReferencia.appendChild(li); break;
                case 'propuesta_diseno': archivosDiseno.appendChild(li); break;
                case 'proforma': archivosProforma.appendChild(li); break;
                case 'listado_final': archivosListado.appendChild(li); break;
            }
        });
    }

    if (archivosReferencia.childElementCount === 0) archivosReferencia.innerHTML = '<li>No hay archivos de referencia.</li>';
    if (archivosDiseno.childElementCount === 0) archivosDiseno.innerHTML = '<li>No hay propuestas de diseño.</li>';
    if (archivosProforma.childElementCount === 0) archivosProforma.innerHTML = '<li>No hay proformas.</li>';
    if (archivosListado.childElementCount === 0) archivosListado.innerHTML = '<li>No hay listados finales.</li>';
}

// --- 3. RENDERIZAR TIEMPOS E HISTORIAL (Separado para limpieza) ---
function renderizarTiemposEHistorial(proyecto) {
    // Contadores de días
    const diasTotales = Math.ceil((new Date() - new Date(proyecto.fecha_creacion)) / (1000 * 60 * 60 * 24)) || 1;
    document.getElementById('dias-totales').textContent = diasTotales;
    
    if (proyecto.fecha_autorizacion_produccion) {
        const diasEnProduccion = Math.ceil((new Date() - new Date(proyecto.fecha_autorizacion_produccion)) / (1000 * 60 * 60 * 24)) || 1;
        document.getElementById('dias-en-produccion').textContent = diasEnProduccion;
    } else {
        document.getElementById('dias-en-produccion').textContent = '--';
    }
    
    // Historial de Fechas (Log)
    const historialFechasElement = document.getElementById('historial-fechas');
    historialFechasElement.innerHTML = '';
    const addHistorial = (fecha, texto, color = 'black') => {
        if (fecha) {
            historialFechasElement.innerHTML += `<li style="color: ${color};"><b>${new Date(fecha).toLocaleDateString()}:</b> ${texto}</li>`;
        }
    };

    addHistorial(proyecto.fecha_creacion, 'Solicitud Creada.');
    addHistorial(proyecto.fecha_de_asignacion, 'Diseño Asignado.');
    addHistorial(proyecto.fecha_propuesta, 'Propuesta enviada a revisión.');

    if (proyecto.historial_revisiones && proyecto.historial_revisiones.length > 0) {
        proyecto.historial_revisiones.forEach(revision => {
            addHistorial(revision.fecha, `Devuelto por ${revision.rol} (${revision.usuario}): "${revision.comentario}"`, '#d9534f');
        });
    }

    addHistorial(proyecto.fecha_aprobacion_interna, 'Aprobado internamente.');
    addHistorial(proyecto.fecha_aprobacion_cliente, 'Aprobado por cliente.');
    addHistorial(proyecto.fecha_proforma_subida, 'Proforma subida a revisión.');
    addHistorial(proyecto.fecha_autorizacion_produccion, '<b>Producción Autorizada.</b>');

    if (proyecto.historial_produccion && proyecto.historial_produccion.length > 0) {
        proyecto.historial_produccion.forEach(etapa => {
            addHistorial(etapa.fecha, `Pasó a <b>${etapa.etapa}</b>.`);
        });
    }
}

// --- 4. RENDERIZAR LÍNEA DE TIEMPO (LA NUEVA LÓGICA) ---
function renderizarLineaDeTiempo(proyecto, user) {
    const container = document.getElementById('flujo-de-etapas-container');
    container.innerHTML = ''; // Limpiar
    
 // ==========================================================
// === INICIO TAREA 3.4: REEMPLAZA TU FUNCIÓN COMPLETA ===
// ==========================================================

// --- 4. RENDERIZAR LÍNEA DE TIEMPO (LA NUEVA LÓGICA) ---
function renderizarLineaDeTiempo(proyecto, user) {
    const container = document.getElementById('flujo-de-etapas-container');
    container.innerHTML = ''; // Limpiar
    
    // Mapeo de estados a las NUEVAS etapas (ahora son 13)
    // ESTE ES EL MAPA CORRECTO DE LA TAREA 3.4
    const estadoEtapaMap = {
        'Diseño Pendiente de Asignación': 2, 
        'Diseño en Proceso': 3, 
        'Pendiente Aprobación Interna': 4, 
        'Pendiente Aprobación Cliente': 5, 
        'Pendiente de Proforma': 6, 
        'Pendiente Aprobación Proforma': 7, // Etapa 7
        'Pendiente Autorización Producción': 8, // ¡NUEVO ESTADO PARA ETAPA 8!
        'En Lista de Producción': 9, // Ahora es 9
        'En Diagramación': 10,
        'En Impresión': 11,
        'En Calandrado': 12,
        'En Confección': 12, 
        'Supervisión de Calidad': 13, // Ahora es 13
        'Listo para Entrega': 14 // Lo dejaremos en 14 por ahora, luego renumeramos
    };

    const etapaActualNum = estadoEtapaMap[proyecto.status] || 1; 
    
    // ESTA ES LA LISTA DE ETAPAS CORRECTA
    const etapas = [
        { num: 1, titulo: 'Solicitud Creada', fecha: proyecto.fecha_creacion },
        { num: 2, titulo: 'Asignación de Diseñador', fecha: proyecto.fecha_de_asignacion, panelId: 'panel-etapa-2' },
        { num: 3, titulo: 'Propuesta del Diseñador', fecha: proyecto.fecha_propuesta, panelId: 'panel-etapa-3' },
        { num: 4, titulo: 'Autorización Interna', fecha: proyecto.fecha_aprobacion_interna, panelId: 'panel-etapa-4' },
        { num: 5, titulo: 'Aprobación del Cliente', fecha: proyecto.fecha_aprobacion_cliente, panelId: 'panel-etapa-5' },
        { num: 6, titulo: 'Subida de Proforma', fecha: proyecto.fecha_proforma_subida, panelId: 'panel-etapa-6' },
        // AHORA LAS ETAPAS 7 Y 8 ESTÁN SEPARADAS
        { num: 7, titulo: 'Aprobación de Proforma', fecha: proyecto.status === 'Pendiente Autorización Producción' ? new Date() : null, panelId: 'panel-etapa-7' }, // Se marca completa si ya pasamos
        { num: 8, titulo: 'Producción Autorizada', fecha: proyecto.fecha_autorizacion_produccion, panelId: 'panel-etapa-8' },
        { num: 9, titulo: 'Diagramación', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Diagramación')?.fecha, panelId: 'panel-etapa-9' },
        { num: 10, titulo: 'Impresión', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Impresión')?.fecha, panelId: 'panel-etapa-10' },
        { num: 11, titulo: 'Calandrado', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Calandrado')?.fecha, panelId: 'panel-etapa-11' },
        { num: 12, titulo: 'Confección', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Confección')?.fecha, panelId: 'panel-etapa-12' },
        { num: 13, titulo: 'Control de Calidad', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'Supervisión de Calidad')?.fecha, panelId: 'panel-etapa-13' },
        { num: 14, titulo: 'Entrega del Combo', fecha: proyecto.fecha_entrega, panelId: 'panel-etapa-14' } 
    ];

    // Recorremos y dibujamos cada etapa (SIN CAMBIOS)
    etapas.forEach(etapa => {
        const li = document.createElement('li');
        li.className = 'timeline-etapa';
        
        let estado = 'pendiente'; 
        if (etapa.fecha) {
            estado = 'completado'; 
        }
        if (etapa.num === 1 && proyecto.fecha_creacion) {
            estado = 'completado';
        }
        if (etapa.num === etapaActualNum) {
            estado = 'actual'; 
        }
        if (estado === 'completado' && etapa.num === etapaActualNum) {
             estado = 'actual';
        }
        // Lógica mejorada para marcar etapas pasadas como completadas
        if (estado === 'pendiente' && etapa.num < etapaActualNum) {
             estado = 'completado'; 
        }

        li.setAttribute('data-estado', estado);
        
        const fechaFormateada = etapa.fecha ? new Date(etapa.fecha).toLocaleDateString() : '';
        
        li.innerHTML = `
            <div class="etapa-header">
                <h3>${etapa.num}. ${etapa.titulo}</h3>
                <span class="etapa-fecha">${fechaFormateada}</span>
            </div>
            ${etapa.panelId && estado === 'actual' ? `<div class="etapa-panel-acciones" id="${etapa.panelId}"></div>` : ''}
        `;
        
        container.appendChild(li);
    });

    // --- AHORA, POBLAMOS EL PANEL DE LA ETAPA ACTUAL ---
    // ESTE ES EL "CEREBRO" (IF/ELSE) CORREGIDO DE LA TAREA 3.4
    
    const rolesAdmin = ['Administrador', 'Coordinador'];
    const rolesDiseno = ['Administrador', 'Diseñador'];
    const rolesAsesor = ['Administrador', 'Asesor', 'Coordinador'];

    if (proyecto.status === 'Diseño Pendiente de Asignación' && rolesAdmin.includes(user.rol)) {
        mostrarPanelAsignacion(document.getElementById('panel-etapa-2'), proyecto.id);
    } 
    else if (['Diseño en Proceso', 'En Confección'].includes(proyecto.status) && rolesDiseno.includes(user.rol)) {
        const panelId = (proyecto.status === 'En Confección') ? 'panel-etapa-12' : 'panel-etapa-3';
        mostrarPanelSubirPropuesta(document.getElementById(panelId), proyecto.id, proyecto);
    } 
    else if (proyecto.status === 'Pendiente Aprobación Interna' && rolesAdmin.includes(user.rol)) {
        mostrarPanelRevisarPropuesta(document.getElementById('panel-etapa-4'), proyecto.id, proyecto);
    } 
    else if (proyecto.status === 'Pendiente Aprobación Cliente' && rolesAsesor.includes(user.rol)) {
        mostrarPanelAprobarCliente(document.getElementById('panel-etapa-5'), proyecto.id, proyecto);
    } 
    else if (proyecto.status === 'Pendiente de Proforma' && rolesDiseno.includes(user.rol)) { 
        mostrarPanelSubirProforma(document.getElementById('panel-etapa-6'), proyecto.id);
    } 
    // --- ¡AQUÍ ESTÁ LA LÓGICA SEPARADA! ---
    else if (proyecto.status === 'Pendiente Aprobación Proforma' && rolesAsesor.includes(user.rol)) {
        // ETAPA 7: Llama a la función simplificada
        mostrarPanelRevisionProforma(document.getElementById('panel-etapa-7'), proyecto.id, proyecto);
    }
    else if (proyecto.status === 'Pendiente Autorización Producción' && rolesAsesor.includes(user.rol)) {
        // ETAPA 8: Llama a la NUEVA función
        mostrarPanelAutorizarProduccion(document.getElementById('panel-etapa-8'), proyecto.id, proyecto);
    }
    // --- FIN DEL CAMBIO ---
    else if (rolesAdmin.includes(user.rol) && etapaActualNum >= 9 && etapaActualNum <= 13) {
        // Lógica de producción (Etapas 9-13)
        // Corregido para manejar el estado 'Listo para Entrega' (etapa 14)
        const panelId = `panel-etapa-${etapaActualNum}`;
        const panelContainer = document.getElementById(panelId);
        if (panelContainer) {
            mostrarPanelProduccion(panelContainer, proyecto);
        }
    }
    else if (proyecto.status === 'Listo para Entrega' && rolesAdmin.includes(user.rol)) {
        // Lógica de Etapa 14 (cuando la implementemos)
        const panelContainer = document.getElementById('panel-etapa-14');
        if (panelContainer) {
            // Aún no hemos creado 'mostrarPanelEntrega', pero aquí iría
            // mostrarPanelEntrega(panelContainer, proyecto.id);
            panelContainer.innerHTML = '<p><em>(Próxima tarea: Implementar panel de Entrega)</em></p>';
        }
    }
}
// ==========================================================
// === FIN TAREA 3.4 ===
// ==========================================================
    
// ===== FUNCIONES DE ACCIÓN (PANELES) - SIN CAMBIOS =====
// (Pega el resto de tus funciones de ayuda aquí,
//  desde 'loadDesigners' hasta el final del archivo)
// ==================================================================
// ==================================================================

// Pega esta nueva función aquí
const loadDesigners = async (selectElement) => {
    try {
        const response = await fetch('/api/designers');
        if (!response.ok) {
            throw new Error('Error al cargar diseñadores.');
        }
        const designers = await response.json();

        selectElement.innerHTML = '<option value="" disabled selected>-- Seleccione --</option>';
        if (designers.length === 0) {
            selectElement.innerHTML += '<option value="" disabled>No hay diseñadores disponibles</option>';
            return;
        }

        designers.forEach(designer => {
            const option = document.createElement('option');
            option.value = designer.id;
            // ---- ESTA ES LA CORRECCIÓN CLAVE ----
            option.textContent = designer.name; // Usamos 'name' en lugar de 'nombre'
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar diseñadores:', error);
        selectElement.innerHTML = '<option value="" disabled selected>Error al cargar</option>';
    }
};

// Reemplaza tu función 'mostrarPanelAsignacion' existente con esta
async function mostrarPanelAsignacion(container, projectId) {
    if (!container) return; // Seguridad
    const panelId = `panel-asignacion-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `<h3>Asignar Tarea</h3><div class="form-group"><label for="designer-select-${panelId}">Diseñador:</label><select id="designer-select-${panelId}" required><option value="">Cargando...</option></select></div><button id="assign-designer-btn-${panelId}" class="button">Asignar</button><p id="assign-error-${panelId}" style="color: red; display: none;"></p>`;
    container.appendChild(div);

    const select = document.getElementById(`designer-select-${panelId}`);
    
    // Aquí llamamos a nuestra nueva función de ayuda para llenar el selector
    loadDesigners(select); 
    
    document.getElementById(`assign-designer-btn-${panelId}`).addEventListener('click', async () => {
        const diseñadorId = select.value;
        if (!diseñadorId) {
            alert('Seleccione un diseñador.');
            return;
        }
        try {
            const res = await fetch(`/api/proyectos/${projectId}/asignar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ diseñadorId })
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error del servidor');
            }
            alert('Diseñador asignado con éxito.');
            window.location.reload();
        } catch (e) {
            alert(`Error: ${e.message}`);
        }
    });
}
// REEMPLAZA ESTA FUNCIÓN COMPLETA EN detalle_proyecto.js
async function mostrarPanelSubirPropuesta(container, projectId, proyecto) {
    if (!container) return; // Seguridad
    let revisionHtml = '';
    
    // --- INICIO DE LA MEJORA ---
    // Verificamos si hay una incidencia reportada desde calidad.
    if (proyecto?.historial_incidencias?.length > 0 && proyecto.status === 'En Confección') {
        const ultimaIncidencia = proyecto.historial_incidencias[proyecto.historial_incidencias.length - 1];
        revisionHtml = `
            <div style="background-color: #f2dede; border: 1px solid #ebccd1; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #a94442;">🚨 Incidencia Reportada de Calidad</h4>
                <p><strong>Comentario:</strong> "${ultimaIncidencia.comentario}"</p>
                <p><em>Por favor, sube los archivos corregidos.</em></p>
            </div>`;
    } 
    // Si no, verificamos si hay una revisión normal.
    else if (proyecto?.historial_revisiones?.length > 0) {
        const ultimaRevision = proyecto.historial_revisiones[proyecto.historial_revisiones.length - 1];
        revisionHtml = `
            <div style="background-color: #fcf8e3; border: 1px solid #faebcc; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #8a6d3b;">Devuelto con Cambios Solicitados</h4>
                <p><strong>Comentario de ${ultimaRevision.rol}:</strong> "${ultimaRevision.comentario}"</p>
            </div>`;
    }
    // --- FIN DE LA MEJORA ---

    const panelId = `panel-propuesta-${projectId}`;
    const div = document.createElement('div');
    div.innerHTML = `
        <h3>Subir Propuesta(s) de Diseño</h3>
        ${revisionHtml}
        <form id="form-propuesta-${panelId}">
            <div class="form-group">
                <label>Archivos de Propuesta:</label>
                <button type="button" class="button btn-add-file">Añadir Archivo(s)</button>
                <input type="file" name="propuestas_diseno" multiple style="display: none;">
                <div class="file-list" style="margin-top: 15px;"></div>
            </div>
            <button type="submit">Enviar Propuesta(s) Corregidas</button>
        </form>`;
    container.appendChild(div);

    // El resto de la función (los listeners y la lógica de envío) no necesita cambios.
    // Solo pegamos la lógica que ya tenías y que funciona bien.
    const formPropuesta = document.getElementById(`form-propuesta-${panelId}`);
    const fileInput = formPropuesta.querySelector('input[type="file"]');
    const fileListContainer = formPropuesta.querySelector('.file-list');
    let selectedFiles = [];

    formPropuesta.querySelector('.btn-add-file').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        for (const file of fileInput.files) selectedFiles.push(file);
        renderFileList(selectedFiles, fileListContainer);
        fileInput.value = '';
    });

    fileListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-file')) {
            selectedFiles.splice(parseInt(e.target.dataset.index, 10), 1);
            renderFileList(selectedFiles, fileListContainer);
        }
    });

    formPropuesta.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (selectedFiles.length === 0) return alert('Debe añadir al menos un archivo corregido.');

        const formData = new FormData();
        for (const file of selectedFiles) formData.append('propuestas_diseno', file);

        const submitButton = formPropuesta.querySelector('button[type="submit"]');
        try {
            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;
            const res = await fetch(`/api/proyectos/${projectId}/subir-propuesta`, { method: 'PUT', body: formData });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error desconocido.');
            }
            alert('Propuesta(s) corregida(s) enviada(s) con éxito.');
            window.location.reload();
        } catch (error) {
            alert(`Error: ${error.message}`);
            submitButton.textContent = 'Enviar Propuesta(s) Corregidas';
            submitButton.disabled = false;
        }
    });
}
async function mostrarPanelRevisarPropuesta(container, projectId, proyecto) {
    if (!container) return; // Seguridad
    const ultimaPropuesta = proyecto.archivos.find(a => a.tipo_archivo === 'propuesta_diseno');
    const fileName = ultimaPropuesta ? ultimaPropuesta.nombre_archivo : 'N/A';
    const fileUrl = ultimaPropuesta ? `/${ultimaPropuesta.url_archivo}` : '#';
    
    const panelId = `panel-revisar-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `<h3>Revisión Interna</h3><div class="card"><p><strong>Archivo:</strong> <a href="${fileUrl}" target="_blank">${fileName}</a></p><div class="button-group"><button id="aprobar-interno-btn-${panelId}">Aprobar</button><button id="solicitar-mejora-btn-${panelId}">Solicitar Cambios</button></div></div>`;
    container.appendChild(div);

    document.getElementById(`aprobar-interno-btn-${panelId}`).addEventListener('click', async () => { if (!confirm('¿Aprobar esta propuesta?')) return; try { const res = await fetch(`/api/proyectos/${projectId}/aprobar-interno`, { method: 'PUT' }); if (!res.ok) throw new Error('Error en servidor.'); alert('Propuesta aprobada.'); window.location.reload(); } catch (e) { alert(`Error: ${e.message}`); } });
    document.getElementById(`solicitar-mejora-btn-${panelId}`).addEventListener('click', async () => {
        const comentarios = prompt('Escribe los cambios para el diseñador:');
        if (!comentarios || comentarios.trim() === '') return;
        try {
            const res = await fetch(`/api/proyectos/${projectId}/solicitar-mejora`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comentarios }) });
            if (!res.ok) throw new Error('Error al enviar.'); alert('Comentarios enviados.'); window.location.reload();
        } catch (e) { alert(`Error: ${e.message}`); }
    });
}

async function mostrarPanelAprobarCliente(container, projectId, proyecto) {
    if (!container) return; // Seguridad
    const ultimaPropuesta = proyecto.archivos.find(a => a.tipo_archivo === 'propuesta_diseno');
    const fileName = ultimaPropuesta ? ultimaPropuesta.nombre_archivo : 'N/A';
    const fileUrl = ultimaPropuesta ? `/${ultimaPropuesta.url_archivo}` : '#';
    
    const panelId = `panel-cliente-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `<h3>Aprobación Cliente</h3><div class="card"><p><strong>Propuesta:</strong> <a href="${fileUrl}" target="_blank">${fileName}</a></p><hr><div class="button-group"><button id="aprobar-cliente-btn-${panelId}">Confirmar Aprobación</button><button id="solicitar-mejora-cliente-btn-${panelId}">Solicitar Cambios</button></div></div>`;
    container.appendChild(div);
    
    document.getElementById(`aprobar-cliente-btn-${panelId}`).addEventListener('click', async () => { if (!confirm('¿Confirmas que el cliente aprobó el diseño?')) return; try { const res = await fetch(`/api/proyectos/${projectId}/aprobar-cliente`, { method: 'PUT' }); if (!res.ok) throw new Error('Error en servidor.'); alert('Aprobación registrada.'); window.location.reload(); } catch (e) { alert(`Error: ${e.message}`); } });
    document.getElementById(`solicitar-mejora-cliente-btn-${panelId}`).addEventListener('click', async () => {
        const comentarios = prompt('Escribe los cambios del cliente:');
        if (!comentarios || comentarios.trim() === '') return;
        try {
            const res = await fetch(`/api/proyectos/${projectId}/solicitar-mejora`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comentarios: `CLIENTE: ${comentarios}` }) });
            if (!res.ok) throw new Error('Error al enviar.'); alert('Cambios enviados.'); window.location.reload();
        } catch (e) { alert(`Error: ${e.message}`); }
    });
}

// REEMPLAZA LA FUNCIÓN COMPLETA EN detalle_proyecto.js
async function mostrarPanelSubirProforma(container, projectId) {
    if (!container) return; // Seguridad
    const panelId = `panel-proforma-${projectId}`;
    const div = document.createElement('div');
    div.innerHTML = `
        <h3>Subir Proforma(s)</h3>
        <form id="form-proforma-${panelId}">
            <div class="form-group">
                <label>Archivos de Proforma:</label>
                <button type="button" class="button btn-add-file">Añadir Archivo(s)</button>
                <input type="file" name="proformas" multiple style="display: none;">
                <div class="file-list" style="margin-top: 15px;"></div>
            </div>
            <button type="submit">Enviar Proforma(s)</button>
        </form>`;
    container.appendChild(div);

    const formProforma = document.getElementById(`form-proforma-${panelId}`);
    const fileInput = formProforma.querySelector('input[type="file"]');
    const fileListContainer = formProforma.querySelector('.file-list');
    let selectedFiles = [];

    formProforma.querySelector('.btn-add-file').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        for (const file of fileInput.files) selectedFiles.push(file);
        renderFileList(selectedFiles, fileListContainer);
        fileInput.value = '';
    });

    fileListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-file')) {
            selectedFiles.splice(parseInt(e.target.dataset.index, 10), 1);
            renderFileList(selectedFiles, fileListContainer);
        }
    });

    formProforma.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (selectedFiles.length === 0) return alert('Debe añadir al menos un archivo.');

        const formData = new FormData();
        for (const file of selectedFiles) formData.append('proformas', file);

        // Lógica de envío...
        const submitButton = formProforma.querySelector('button[type="submit"]');
        try {
            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;
            const res = await fetch(`/api/proyectos/${projectId}/subir-proforma`, { method: 'PUT', body: formData });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error desconocido.');
            }
            alert('Proforma(s) subida(s) con éxito.');
            window.location.reload();
        } catch (error) {
            alert(`Error: ${error.message}`);
            submitButton.textContent = 'Enviar Proforma(s)';
            submitButton.disabled = false;
        }
    });
}

// Función de ayuda reutilizable para mostrar la lista de archivos
function renderFileList(files, container) {
    container.innerHTML = '';
    files.forEach((file, index) => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.innerHTML = `<span>✅ ${file.name}</span><button type="button" class="btn-remove-file" data-index="${index}">❌</button>`;
        container.appendChild(fileElement);
    });
}// ==========================================================
// === INICIO TAREA 3.2: REEMPLAZA ESTA FUNCIÓN COMPLETA ===
// ==========================================================
async function mostrarPanelRevisionProforma(container, projectId, proyecto) {
    if (!container) return; // Seguridad
    
    const ultimaProforma = proyecto.archivos.find(a => a.tipo_archivo === 'proforma');
    const proformaFileName = ultimaProforma ? ultimaProforma.nombre_archivo : 'No disponible';
    const proformaFileUrl = ultimaProforma ? `/${ultimaProforma.url_archivo}` : '#';
    
    const panelId = `panel-revision-proforma-${Math.random()}`;
    const div = document.createElement('div');
    
    // HTML simplificado: solo aprobación o rechazo de proforma.
    div.innerHTML = `
        <h3>Revisión de Proforma</h3>
        <div class="card">
            <div class="card-body">
                <p>El diseñador ha subido la proforma. Por favor, revísala.</p>
                <p><strong>Proforma:</strong> <a href="${proformaFileUrl}" target="_blank">${proformaFileName}</a></p>
                <hr>
                <div class="button-group">
                    <button id="aprobar-proforma-btn-${panelId}" class="btn btn-success">Aprobar Proforma</button>
                    <button id="solicitar-mejora-proforma-btn-${panelId}" class="btn btn-warning mt-2">Solicitar Modificación</button>
                </div>
            </div>
        </div>
    `;
    container.appendChild(div);

    // --- LÓGICA ACTUALIZADA ---
    // 1. Botón de Aprobar (¡NUEVO!)
    document.getElementById(`aprobar-proforma-btn-${panelId}`).addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de APROBAR esta proforma y pasar a la autorización de producción?')) return;
        try {
            // Llama a la NUEVA ruta del backend que creamos
            const response = await fetch(`/api/proyectos/${projectId}/aprobar-proforma`, { method: 'PUT' });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Error del servidor'); }
            
            alert('¡Proforma aprobada! El proyecto pasará a "Pendiente Autorización Producción".');
            window.location.reload();
        } catch (error) { 
            alert(`Error: ${error.message}`); 
        }
    });
    
    // 2. Botón de Solicitar Mejora (Sin cambios, solo se copió)
    document.getElementById(`solicitar-mejora-proforma-btn-${panelId}`).addEventListener('click', async () => {
        const comentarios = prompt('Escriba los cambios necesarios para la proforma:');
        if (comentarios === null || comentarios.trim() === "") return;
        try {
            const response = await fetch(`/api/proyectos/${projectId}/solicitar-mejora`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ comentarios: `PROFORMA: ${comentarios}` }) 
            });
            if (!response.ok) throw new Error('Error al solicitar la modificación.');
            
            alert('Solicitud de modificación enviada.');
            window.location.reload();
        } catch(error) { 
            alert(`Error: ${error.message}`); 
        }
    });
}
// ==========================================================
// === FIN TAREA 3.2 ===
// ==========================================================

// ==========================================================
// === INICIO TAREA 3.3: PEGA ESTA FUNCIÓN NUEVA ===
// ==========================================================
async function mostrarPanelAutorizarProduccion(container, projectId, proyecto) {
    if (!container) return; // Seguridad

    const panelId = `panel-autorizar-produccion-${Math.random()}`;
    const div = document.createElement('div');
    
    // Este es el HTML que "cortamos" de la función anterior
    div.innerHTML = `
        <h3>Autorización Final de Producción</h3>
        <div class="card">
            <div class="card-body">
                <p>La proforma ha sido aprobada. Por favor, cargue el listado final para iniciar la producción.</p>
                <div class="mb-3">
                    <label for="listado-final-input-${panelId}" class="form-label"><strong>Paso 1:</strong> Cargar listado final de clientes (Obligatorio)</label>
                    <input class="form-control" type="file" id="listado-final-input-${panelId}" required>
                </div>
                <button id="autorizar-produccion-btn-${panelId}" class="btn btn-success w-100"><strong>Paso 2:</strong> Autorizar e Iniciar Producción</button>
            </div>
        </div>
    `;
    container.appendChild(div);

    // Lógica del botón (esta es la lógica original, sin cambios)
    document.getElementById(`autorizar-produccion-btn-${panelId}`).addEventListener('click', async () => {
        const listadoInput = document.getElementById(`listado-final-input-${panelId}`);
        const listadoFile = listadoInput.files[0];
        if (!listadoFile) { alert('Debes cargar el archivo con el listado final para poder autorizar.'); return; }
        if (!confirm('¿Estás seguro de que quieres autorizar el inicio de la producción?')) return;
        
        const formData = new FormData();
        formData.append('listado_final', listadoFile);
        
        try {
            // Llama a la ruta de backend ORIGINAL que ya existía
            const response = await fetch(`/api/proyectos/${projectId}/autorizar-produccion`, { method: 'PUT', body: formData });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Error del servidor'); }
            
            alert('¡Producción autorizada con éxito!');
            window.location.reload();
        } catch (error) { 
            alert(`Error: ${error.message}`); 
        }
    });
}
// ==========================================================
// === FIN TAREA 3.3 ===
// ==========================================================


async function mostrarPanelProduccion(container, proyecto) {
    if (!container) return; // Seguridad
    const projectId = proyecto.id;
    const estadoActual = proyecto.status;
    let panelHTML = '';
    const panelId = `panel-produccion-${Math.random()}`;
    const div = document.createElement('div');
    let incidenciaHtml = '';
    if (estadoActual === 'En Confección' && proyecto.historial_incidencias && proyecto.historial_incidencias.length > 0) {
        const ultimaIncidencia = proyecto.historial_incidencias[proyecto.historial_incidencias.length - 1];
        incidenciaHtml = `
            <div style="background-color: #f2dede; border: 1px solid #ebccd1; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #a94442;">🚨 Incidencia Reportada</h4>
                <p style="margin-bottom: 5px;"><strong>Fecha:</strong> ${new Date(ultimaIncidencia.fecha).toLocaleString()}</p>
                <p style="margin-bottom: 0;"><strong>Reportado por (${ultimaIncidencia.usuario}):</strong> "${ultimaIncidencia.comentario}"</p>
            </div>
        `;
    }
    
    // --- CORRECCIÓN EN EL FLUJO DE PRODUCCIÓN ---
    const flujo = {
        'En Lista de Producción': { texto: 'Pasar a Diagramación', siguienteEstado: 'En Diagramación', panelId: 'panel-etapa-8' },
        'En Diagramación': { texto: 'Pasar a Impresión', siguienteEstado: 'En Impresión', panelId: 'panel-etapa-9' },
        'En Impresión': { texto: 'Pasar a Calandra', siguienteEstado: 'En Calandrado', panelId: 'panel-etapa-10' },
        'En Calandrado': { texto: 'Enviar a Confección', siguienteEstado: 'En Confección', panelId: 'panel-etapa-11' },
        'En Confección': { texto: 'Pasar a Supervisión de Calidad', siguienteEstado: 'Supervisión de Calidad', panelId: 'panel-etapa-12' }
    };
    // --- FIN DE LA CORRECCIÓN ---

    if (flujo[estadoActual]) {
        const accion = flujo[estadoActual];
        panelHTML = `<button id="avanzar-btn-${panelId}" class="btn btn-primary">${accion.texto}</button>`;
    } else if (estadoActual === 'Supervisión de Calidad') {
        panelHTML = `
            <h4>Decisión Final de Calidad</h4>
            <div class="button-group">
                <button id="aprobar-calidad-btn-${panelId}" class="btn btn-success">Aprobar Calidad / Listo para Entrega</button>
                <button id="reportar-incidencia-btn-${panelId}" class="btn btn-warning">Reportar Incidencia</button>
            </div>
        `;
    }

    div.innerHTML = `<div class="card">${incidenciaHtml}${panelHTML}</div>`;
    container.appendChild(div);
    const avanzarBtn = document.getElementById(`avanzar-btn-${panelId}`);
    if (avanzarBtn) {
        avanzarBtn.addEventListener('click', async () => {
            const accion = flujo[estadoActual];
            if (!confirm(`¿Confirmas que deseas avanzar el proyecto a "${accion.siguienteEstado}"?`)) return;
            try {
                const response = await fetch(`/api/proyectos/${projectId}/avanzar-etapa`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevaEtapa: accion.siguienteEstado }) });
                if (!response.ok) throw new Error('Error en el servidor');
                alert('Etapa actualizada con éxito.');
                window.location.reload();
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }

    const aprobarCalidadBtn = document.getElementById(`aprobar-calidad-btn-${panelId}`);
    if (aprobarCalidadBtn) {
        aprobarCalidadBtn.addEventListener('click', async () => {
            if (!confirm('¿Estás seguro de aprobar la calidad y marcar el proyecto como listo para entrega?')) return;
            try {
                const response = await fetch(`/api/proyectos/${projectId}/aprobar-calidad`, { method: 'PUT' });
                if (!response.ok) throw new Error('Error al aprobar la calidad.');
                alert('Proyecto aprobado. Listo para entrega.');
                window.location.reload();
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }

    const reportarIncidenciaBtn = document.getElementById(`reportar-incidencia-btn-${panelId}`);
    if (reportarIncidenciaBtn) {
        reportarIncidenciaBtn.addEventListener('click', async () => {
            const comentarios = prompt('Por favor, describe la incidencia o las mejoras requeridas:');
            if (!comentarios || comentarios.trim() === '') { alert('Debes incluir un comentario para reportar una incidencia.'); return; }
            try {
                const response = await fetch(`/api/proyectos/${projectId}/reportar-incidencia`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comentarios }) });
                if (!response.ok) throw new Error('Error al reportar la incidencia.');
                alert('Incidencia reportada. El proyecto volverá a la etapa de Confección.');
                window.location.reload();
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }
}
