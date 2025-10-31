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
        
        // La nueva función principal que dibuja las etapas
        renderizarLineaDeTiempo(proyecto, user);
    })
    .catch(error => {
        console.error('Error fatal al cargar la página:', error);
        document.body.innerHTML = `<p style="color: red;"><b>Error Crítico:</b> ${error.message}.</El> Tuvimos un problema al cargar los datos del proyecto.</p>`;
    });
});

// --- 1. RENDERIZAR INFO BÁSICA ---
function renderizarInfoPrincipal(proyecto) {
    document.getElementById('codigo-proyecto').textContent = proyecto.codigo_proyecto || 'N/A';
    document.getElementById('centro-proyecto').textContent = proyecto.cliente || 'N/A';
    document.getElementById('asesor-proyecto').textContent = proyecto.nombre_asesor || 'N/A';
    document.getElementById('disenador-proyecto').textContent = proyecto.nombre_disenador || 'No Asignado';
    document.getElementById('estado-proyecto').textContent = proyecto.status || 'N/A';
    document.getElementById('detalles-proyecto').textContent = proyecto.detalles_solicitud || 'N/A';

    // Renderizar productos
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

// --- 2. RENDERIZAR ARCHIVOS ---
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

// --- 3. RENDERIZAR TIEMPOS E HISTORIAL ---
function renderizarTiemposEHistorial(proyecto) {
    const diasTotales = Math.ceil((new Date() - new Date(proyecto.fecha_creacion)) / (1000 * 60 * 60 * 24)) || 1;
    document.getElementById('dias-totales').textContent = diasTotales;
    
    if (proyecto.fecha_autorizacion_produccion) {
        const diasEnProduccion = Math.ceil((new Date() - new Date(proyecto.fecha_autorizacion_produccion)) / (1000 * 60 * 60 * 24)) || 1;
        document.getElementById('dias-en-produccion').textContent = diasEnProduccion;
    } else {
        document.getElementById('dias-en-produccion').textContent = '--';
    }
    
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

// ==========================================================
// === INICIO DE LA CORRECCIÓN (BUG DE "EN CONFECCIÓN") ===
// ==========================================================

// --- 4. RENDERIZAR LÍNEA DE TIEMPO (AHORA COMPLETA Y CORRECTA) ---
function renderizarLineaDeTiempo(proyecto, user) {
    const container = document.getElementById('flujo-de-etapas-container');
    container.innerHTML = ''; 
    
    // Mapeo de estados (Tarea 3.4)
    const estadoEtapaMap = {
        'Diseño Pendiente de Asignación': 2, 
        'Diseño en Proceso': 3, 
        'Pendiente Aprobación Interna': 4, 
        'Pendiente Aprobación Cliente': 5, 
        'Pendiente de Proforma': 6, 
        'Pendiente Aprobación Proforma': 7,
        'Pendiente Autorización Producción': 8, // ¡Estado NUEVO!
        'En Lista de Producción': 9,
        'En Diagramación': 10,
        'En Impresión': 11,
        'En Calandrado': 12,
        'En Confección': 12, // Ambos flujos (normal y devolución) apuntan a la Etapa 12
        'Supervisión de Calidad': 13,
        'Listo para Entrega': 14 
    };

    const etapaActualNum = estadoEtapaMap[proyecto.status] || 1; 
    
    // Lista de etapas (Corregida, 14 etapas, sin bugs visuales)
    const etapas = [
        { num: 1, titulo: 'Solicitud Creada', fecha: proyecto.fecha_creacion },
        { num: 2, titulo: 'Asignación de Diseñador', fecha: proyecto.fecha_de_asignacion, panelId: 'panel-etapa-2' },
        { num: 3, titulo: 'Propuesta del Diseñador', fecha: proyecto.fecha_propuesta, panelId: 'panel-etapa-3' },
        { num: 4, titulo: 'Autorización Interna', fecha: proyecto.fecha_aprobacion_interna, panelId: 'panel-etapa-4' },
        { num: 5, titulo: 'Aprobación del Cliente', fecha: proyecto.fecha_aprobacion_cliente, panelId: 'panel-etapa-5' },
        { num: 6, titulo: 'Subida de Proforma', fecha: proyecto.fecha_proforma_subida, panelId: 'panel-etapa-6' },
        { num: 7, titulo: 'Aprobación de Proforma', fecha: proyecto.status === 'Pendiente Autorización Producción' || etapaActualNum > 7 ? new Date() : null, panelId: 'panel-etapa-7' },
        { num: 8, titulo: 'Producción Autorizada', fecha: proyecto.fecha_autorizacion_produccion, panelId: 'panel-etapa-8' },
        { num: 9, titulo: 'Diagramación', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Diagramación')?.fecha, panelId: 'panel-etapa-9' },
        { num: 10, titulo: 'Impresión', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Impresión')?.fecha, panelId: 'panel-etapa-10' },
        { num: 11, titulo: 'Calandrado', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Calandrado')?.fecha, panelId: 'panel-etapa-11' },
        { num: 12, titulo: 'Confección', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Confección')?.fecha, panelId: 'panel-etapa-12' },
        { num: 13, titulo: 'Control de Calidad', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'Supervisión de Calidad')?.fecha, panelId: 'panel-etapa-13' },
        { num: 14, titulo: 'Entrega del Combo', fecha: proyecto.fecha_entrega, panelId: 'panel-etapa-14' } 
    ]; // ¡El bug del "3" repetido se ha eliminado!

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

    // --- "CEREBRO" (IF/ELSE) CON ORDEN CORREGIDO ---
    
    const rolesAdmin = ['Administrador', 'Coordinador'];
    const rolesDiseno = ['Administrador', 'Diseñador'];
    const rolesAsesor = ['Administrador', 'Asesor', 'Coordinador'];
    const esAdmin = rolesAdmin.includes(user.rol);
    const esDisenador = rolesDiseno.includes(user.rol);
    const esAsesor = rolesAsesor.includes(user.rol);

    if (proyecto.status === 'Diseño Pendiente de Asignación' && esAdmin) {
        mostrarPanelAsignacion(document.getElementById('panel-etapa-2'), proyecto.id);
    } 
    else if (proyecto.status === 'Pendiente Aprobación Interna' && esAdmin) {
        mostrarPanelRevisarPropuesta(document.getElementById('panel-etapa-4'), proyecto.id, proyecto);
    } 
    else if (proyecto.status === 'Pendiente Aprobación Cliente' && esAsesor) {
        mostrarPanelAprobarCliente(document.getElementById('panel-etapa-5'), proyecto.id, proyecto);
    } 
    else if (proyecto.status === 'Pendiente de Proforma' && esDisenador) { 
        mostrarPanelSubirProforma(document.getElementById('panel-etapa-6'), proyecto.id);
    } 
    else if (proyecto.status === 'Pendiente Aprobación Proforma' && esAsesor) {
        mostrarPanelRevisionProforma(document.getElementById('panel-etapa-7'), proyecto.id, proyecto);
    }
    else if (proyecto.status === 'Pendiente Autorización Producción' && esAsesor) {
        mostrarPanelAutorizarProduccion(document.getElementById('panel-etapa-8'), proyecto.id, proyecto);
    }
    // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
    // Verificamos el flujo de PRODUCCIÓN (Admin) ANTES que el flujo de DISEÑO (Diseñador)
    else if (esAdmin && (etapaActualNum >= 9 && etapaActualNum <= 13)) {
        // El Admin está en el flujo de Producción (Etapas 9-13)
        const panelId = `panel-etapa-${etapaActualNum}`;
        const panelContainer = document.getElementById(panelId);
        if (panelContainer) {
            mostrarPanelProduccion(panelContainer, proyecto);
        }
    }
    else if (esDisenador && (proyecto.status === 'Diseño en Proceso' || (proyecto.status === 'En Confección' && proyecto.historial_incidencias?.length > 0))) {
        // El Diseñador debe subir propuesta (Etapa 3) o arreglar incidencia (Etapa 12)
        const panelId = (proyecto.status === 'En Confección') ? 'panel-etapa-12' : 'panel-etapa-3';
        mostrarPanelSubirPropuesta(document.getElementById(panelId), proyecto.id, proyecto);
    }
    // --- FIN DE LA CORRECCIÓN ---
    else if (proyecto.status === 'Listo para Entrega' && esAdmin) {
        const panelContainer = document.getElementById('panel-etapa-14');
        if (panelContainer) {
            panelContainer.innerHTML = '<p><em>(Próxima tarea: Implementar panel de Entrega)</em></p>';
        }
    }
}
// ==========================================================
// === FIN DE LA CORRECCIÓN ===
// ==========================================================
// ===== BLOQUE 2/4: FUNCIONES DE ACCIÓN (PANELES) =====
// (Aquí están todas las funciones de ayuda que necesita el "Cerebro")
// ==================================================================
// ==================================================================

// --- FUNCIÓN DE AYUDA: Cargar Diseñadores ---
const loadDesigners = async (selectElement) => {
    try {
        const response = await fetch('/api/designers');
        if (!response.ok) throw new Error('Error al cargar diseñadores.');
        const designers = await response.json();

        selectElement.innerHTML = '<option value="" disabled selected>-- Seleccione --</option>';
        if (designers.length === 0) {
            selectElement.innerHTML += '<option value="" disabled>No hay diseñadores disponibles</option>';
            return;
        }

        designers.forEach(designer => {
            const option = document.createElement('option');
            option.value = designer.id;
            option.textContent = designer.name; 
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar diseñadores:', error);
        selectElement.innerHTML = '<option value="" disabled selected>Error al cargar</option>';
    }
};

// --- FUNCIÓN DE AYUDA: Mostrar Lista de Archivos (para formularios) ---
function renderFileList(files, container) {
    container.innerHTML = '';
    files.forEach((file, index) => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.innerHTML = `<span>✅ ${file.name}</span><button type="button" class="btn-remove-file" data-index="${index}">❌</button>`;
        container.appendChild(fileElement);
    });
}

// --- PANEL DE ACCIÓN: ETAPA 2 ---
async function mostrarPanelAsignacion(container, projectId) {
    if (!container) return;
    const panelId = `panel-asignacion-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `<h3>Asignar Tarea</h3><div class="form-group"><label for="designer-select-${panelId}">Diseñador:</label><select id="designer-select-${panelId}" required><option value="">Cargando...</option></select></div><button id="assign-designer-btn-${panelId}" class="button">Asignar</button><p id="assign-error-${panelId}" style="color: red; display: none;"></p>`;
    container.appendChild(div);

    const select = document.getElementById(`designer-select-${panelId}`);
    loadDesigners(select); 
    
    document.getElementById(`assign-designer-btn-${panelId}`).addEventListener('click', async () => {
        const diseñadorId = select.value;
        if (!diseñadorId) { alert('Seleccione un diseñador.'); return; }
        try {
            const res = await fetch(`/api/proyectos/${projectId}/asignar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ diseñadorId })
            });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.message || 'Error del servidor'); }
            alert('Diseñador asignado con éxito.');
            window.location.reload();
        } catch (e) { alert(`Error: ${e.message}`); }
    });
}

// --- PANEL DE ACCIÓN: ETAPA 3 (Y 12 CON INCIDENCIA) ---
async function mostrarPanelSubirPropuesta(container, projectId, proyecto) {
    if (!container) return;
    let revisionHtml = '';
    
    if (proyecto?.historial_incidencias?.length > 0 && proyecto.status === 'En Confección') {
        const ultimaIncidencia = proyecto.historial_incidencias[proyecto.historial_incidencias.length - 1];
        revisionHtml = `
            <div style="background-color: #f2dede; border: 1px solid #ebccd1; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #a94442;">🚨 Incidencia Reportada de Calidad</h4>
                <p><strong>Comentario:</strong> "${ultimaIncidencia.comentario}"</p>
                <p><em>Por favor, sube los archivos corregidos.</em></p>
            </div>`;
    } 
    else if (proyecto?.historial_revisiones?.length > 0) {
        const ultimaRevision = proyecto.historial_revisiones[proyecto.historial_revisiones.length - 1];
        revisionHtml = `
            <div style="background-color: #fcf8e3; border: 1px solid #faebcc; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #8a6d3b;">Devuelto con Cambios Solicitados</h4>
                <p><strong>Comentario de ${ultimaRevision.rol}:</strong> "${ultimaRevision.comentario}"</p>
            </div>`;
    }

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
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.message || 'Error desconocido.'); }
            alert('Propuesta(s) corregida(s) enviada(s) con éxito.');
            window.location.reload();
        } catch (error) {
            alert(`Error: ${error.message}`);
            submitButton.textContent = 'Enviar Propuesta(s) Corregidas';
            submitButton.disabled = false;
        }
    });
}

// --- PANEL DE ACCIÓN: ETAPA 4 ---
async function mostrarPanelRevisarPropuesta(container, projectId, proyecto) {
    if (!container) return;
    const ultimaPropuesta = proyecto.archivos.find(a => a.tipo_archivo === 'propuesta_diseno');
    const fileName = ultimaPropuesta ? ultimaPropuesta.nombre_archivo : 'N/A';
    const fileUrl = ultimaPropuesta ? ultimaPropuesta.url_archivo : '#';
    
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

// --- PANEL DE ACCIÓN: ETAPA 5 ---
async function mostrarPanelAprobarCliente(container, projectId, proyecto) {
    if (!container) return;
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
// --- PANEL DE ACCIÓN: ETAPA 6 ---
async function mostrarPanelSubirProforma(container, projectId) {
    if (!container) return;
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
        const submitButton = formProforma.querySelector('button[type="submit"]');
        try {
            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;
            const res = await fetch(`/api/proyectos/${projectId}/subir-proforma`, { method: 'PUT', body: formData });
            if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.message || 'Error desconocido.'); }
            alert('Proforma(s) subida(s) con éxito.');
            window.location.reload();
        } catch (error) {
            alert(`Error: ${error.message}`);
            submitButton.textContent = 'Enviar Proforma(s)';
            submitButton.disabled = false;
        }
    });
}

// ==========================================================
// === TAREA 3.2: FUNCIÓN DE ETAPA 7 (SIMPLIFICADA) ===
// ==========================================================
async function mostrarPanelRevisionProforma(container, projectId, proyecto) {
    if (!container) return; 
    
    const ultimaProforma = proyecto.archivos.find(a => a.tipo_archivo === 'proforma');
    const proformaFileName = ultimaProforma ? ultimaProforma.nombre_archivo : 'No disponible';
    const proformaFileUrl = ultimaProforma ? `/${ultimaProforma.url_archivo}` : '#';
    
    const panelId = `panel-revision-proforma-${Math.random()}`;
    const div = document.createElement('div');
    
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

    // Botón de Aprobar (Llama a la NUEVA ruta)
    document.getElementById(`aprobar-proforma-btn-${panelId}`).addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de APROBAR esta proforma y pasar a la autorización de producción?')) return;
        try {
            const response = await fetch(`/api/proyectos/${projectId}/aprobar-proforma`, { method: 'PUT' });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Error del servidor'); }
            alert('¡Proforma aprobada! El proyecto pasará a "Pendiente Autorización Producción".');
            window.location.reload();
        } catch (error) { 
            alert(`Error: ${error.message}`); 
        }
    });
    
    // Botón de Solicitar Mejora (Llama a la ruta de "mejora" genérica)
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
// === TAREA 3.3: NUEVA FUNCIÓN PARA ETAPA 8 ===
// ==========================================================
async function mostrarPanelAutorizarProduccion(container, projectId, proyecto) {
    if (!container) return; 

    const panelId = `panel-autorizar-produccion-${Math.random()}`;
    const div = document.createElement('div');
    
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

    document.getElementById(`autorizar-produccion-btn-${panelId}`).addEventListener('click', async () => {
        const listadoInput = document.getElementById(`listado-final-input-${panelId}`);
        const listadoFile = listadoInput.files[0];
        if (!listadoFile) { alert('Debes cargar el archivo con el listado final para poder autorizar.'); return; }
        if (!confirm('¿Estás seguro de que quieres autorizar el inicio de la producción?')) return;
        
        const formData = new FormData();
        formData.append('listado_final', listadoFile);
        
        try {
            const response = await fetch(`/api/proyectos/${projectId}/autorizar-produccion`, { method: 'PUT', body: formData });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Error del servidor'); }
            
            alert('¡Producción autorizada con éxito!');
            window.location.reload();
        } catch (error) { 
            alert(`Error: ${error.message}`); 
        }
    });
}
// --- PANELES DE ACCIÓN: ETAPAS 9-13 ---
async function mostrarPanelProduccion(container, proyecto) {
    if (!container) return;
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
    
    const flujo = {
        'En Lista de Producción': { texto: 'Pasar a Diagramación', siguienteEstado: 'En Diagramación' },
        'En Diagramación': { texto: 'Pasar a Impresión', siguienteEstado: 'En Impresión' },
        'En Impresión': { texto: 'Pasar a Calandra', siguienteEstado: 'En Calandrado' },
        'En Calandrado': { texto: 'Enviar a Confección', siguienteEstado: 'En Confección' },
        'En Confección': { texto: 'Pasar a Supervisión de Calidad', siguienteEstado: 'Supervisión de Calidad' }
    };

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
