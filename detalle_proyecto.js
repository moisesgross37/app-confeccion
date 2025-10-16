document.addEventListener('DOMContentLoaded', () => {
    const projectId = new URLSearchParams(window.location.search).get('id');
    if (!projectId) {
        document.body.innerHTML = '<h1>Error: No se ha especificado un ID de proyecto.</h1>';
        return;
    }
    
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
        renderizarPagina(proyecto, user);
    })
    .catch(error => {
        console.error('Error fatal al cargar la página:', error);
        document.body.innerHTML = `<p style="color: red;"><b>Error Crítico:</b> ${error.message}.</p>`;
    });
});

function renderizarPagina(proyecto, user) {
    // 1. Rellena la información principal del proyecto en el HTML.
    document.getElementById('codigo-proyecto').textContent = proyecto.codigo_proyecto || 'N/A';
    document.getElementById('centro-proyecto').textContent = proyecto.cliente || 'N/A';
    document.getElementById('asesor-proyecto').textContent = proyecto.nombre_asesor || 'N/A';
    document.getElementById('disenador-proyecto').textContent = proyecto.nombre_disenador || 'No Asignado';
    document.getElementById('estado-proyecto').textContent = proyecto.status || 'N/A';
    document.getElementById('detalles-proyecto').textContent = proyecto.detalles_solicitud || 'N/A';

    // 2. Muestra todos los archivos del proyecto, organizados por tipo.
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
                case 'referencia':
                    archivosReferencia.appendChild(li);
                    break;
                case 'propuesta_diseno':
                    archivosDiseno.appendChild(li);
                    break;
                case 'proforma':
                    archivosProforma.appendChild(li);
                    break;
                case 'listado_final':
                    archivosListado.appendChild(li);
                    break;
            }
        });
    }

    if (archivosReferencia.childElementCount === 0) archivosReferencia.innerHTML = '<li>No hay archivos de referencia.</li>';
    if (archivosDiseno.childElementCount === 0) archivosDiseno.innerHTML = '<li>No hay propuestas de diseño.</li>';
    if (archivosProforma.childElementCount === 0) archivosProforma.innerHTML = '<li>No hay proformas.</li>';
    if (archivosListado.childElementCount === 0) archivosListado.innerHTML = '<li>No hay listados finales.</li>';

    // 3. Calcula y muestra los contadores de días.
    const diasTotales = Math.ceil((new Date() - new Date(proyecto.fecha_creacion)) / (1000 * 60 * 60 * 24)) || 1;
    document.getElementById('dias-totales').textContent = diasTotales;
    
    if (proyecto.fecha_autorizacion_produccion) {
        const diasEnProduccion = Math.ceil((new Date() - new Date(proyecto.fecha_autorizacion_produccion)) / (1000 * 60 * 60 * 24)) || 1;
        document.getElementById('dias-en-produccion').textContent = diasEnProduccion;
    } else {
        document.getElementById('dias-en-produccion').textContent = '--';
    }
    
    // 4. Construye y muestra el historial de fechas y revisiones del proyecto.
    const historialFechasElement = document.getElementById('historial-fechas');
    historialFechasElement.innerHTML = '';
    if (proyecto.fecha_creacion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_creacion).toLocaleDateString()}: Solicitud Creada.</li>`;
    if (proyecto.fecha_de_asignacion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_de_asignacion).toLocaleDateString()}: Diseño Asignado.</li>`;
    if (proyecto.fecha_propuesta) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_propuesta).toLocaleDateString()}: Propuesta enviada a revisión.</li>`;

    if (proyecto.historial_revisiones && proyecto.historial_revisiones.length > 0) {
        proyecto.historial_revisiones.forEach(revision => {
            historialFechasElement.innerHTML += `<li style="color: #d9534f;"><b>${new Date(revision.fecha).toLocaleDateString()}: Devuelto por ${revision.rol} (${revision.usuario}) con el comentario:</b> "${revision.comentario}"</li>`;
        });
    }

    if (proyecto.fecha_aprobacion_interna) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_aprobacion_interna).toLocaleDateString()}: Aprobado internamente.</li>`;
    if (proyecto.fecha_aprobacion_cliente) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_aprobacion_cliente).toLocaleDateString()}: Aprobado por cliente.</li>`;
    if (proyecto.fecha_proforma_subida) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_proforma_subida).toLocaleDateString()}: Proforma subida a revisión.</li>`;
    if (proyecto.fecha_autorizacion_produccion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_autorizacion_produccion).toLocaleDateString()}: <b>Producción Autorizada.</b></li>`;
    if (proyecto.historial_produccion && proyecto.historial_produccion.length > 0) {
        proyecto.historial_produccion.forEach(etapa => {
            historialFechasElement.innerHTML += `<li>${new Date(etapa.fecha).toLocaleDateString()}: Pasó a <b>${etapa.etapa}</b>.</li>`;
        });
    }

    // 5. Lógica completa para mostrar los paneles de "Flujo de Trabajo" según el rol.
    const contenedorAcciones = document.getElementById('flujo-trabajo');
    const userRol = user.rol;
    const projectId = proyecto.id;
    let actionPanelRendered = false;
    
    if (proyecto.status === 'Diseño Pendiente de Asignación' && ['Administrador', 'Coordinador'].includes(userRol)) {
        mostrarPanelAsignacion(contenedorAcciones, projectId);
        actionPanelRendered = true;
    } 
    else if (proyecto.status === 'Diseño en Proceso' && ['Administrador', 'Diseñador'].includes(userRol)) {
        mostrarPanelSubirPropuesta(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } 
    else if (proyecto.status === 'Pendiente Aprobación Interna' && ['Administrador', 'Coordinador'].includes(userRol)) {
        mostrarPanelRevisarPropuesta(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } 
    else if (proyecto.status === 'Pendiente Aprobación Cliente' && ['Administrador', 'Asesor', 'Coordinador'].includes(userRol)) {
        mostrarPanelAprobarCliente(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } 
    else if (proyecto.status === 'Pendiente de Proforma' && ['Administrador', 'Diseñador'].includes(userRol)) { 
        mostrarPanelSubirProforma(contenedorAcciones, projectId);
        actionPanelRendered = true;
    } 
    else if (proyecto.status === 'Pendiente Aprobación Proforma' && ['Administrador', 'Asesor', 'Coordinador'].includes(userRol)) {
        mostrarPanelRevisionProforma(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } 
    else if (['En Lista de Producción', 'En Diagramación', 'En Impresión', 'En Calandrado', 'En Confección', 'Supervisión de Calidad'].includes(proyecto.status) && ['Administrador', 'Coordinador'].includes(userRol)) {
        mostrarPanelProduccion(contenedorAcciones, proyecto);
        actionPanelRendered = true;
    }

    if (!actionPanelRendered) {
        contenedorAcciones.innerHTML = `<h2>Flujo de Trabajo</h2><p>No hay acciones disponibles para tu rol (<strong>${userRol}</strong>) en el estado actual del proyecto (<strong>${proyecto.status}</strong>).</p>`;
    }
}

// ==================================================================
// ===== INICIO: TODAS LAS FUNCIONES DE AYUDA DEBEN ESTAR AQUÍ =====
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
// REEMPLAZA LA FUNCIÓN COMPLETA EN detalle_proyecto.js
async function mostrarPanelSubirPropuesta(container, projectId, proyecto) {
    let revisionHtml = '';
    if (proyecto?.historial_revisiones?.length > 0) {
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
            <button type="submit">Enviar Propuesta(s)</button>
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
        if (selectedFiles.length === 0) return alert('Debe añadir al menos un archivo.');

        const formData = new FormData();
        for (const file of selectedFiles) formData.append('propuestas_diseno', file);

        // Lógica de envío...
        const submitButton = formPropuesta.querySelector('button[type="submit"]');
        try {
            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;
            const res = await fetch(`/api/proyectos/${projectId}/subir-propuesta`, { method: 'PUT', body: formData });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error desconocido.');
            }
            alert('Propuesta(s) subida(s) con éxito.');
            window.location.reload();
        } catch (error) {
            alert(`Error: ${error.message}`);
            submitButton.textContent = 'Enviar Propuesta(s)';
            submitButton.disabled = false;
        }
    });
}
async function mostrarPanelRevisarPropuesta(container, projectId, proyecto) {
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
    const panelId = `panel-proforma-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `
        <h3>Subir Proforma(s)</h3>
        <form id="form-proforma-${panelId}">
            <div class="form-group">
                <label>Archivos de Proforma:</label>
                <input type="file" name="proformas" multiple required accept="image/*,application/pdf">
            </div>
            <button type="submit">Enviar Proforma(s)</button>
            <p id="upload-error-${panelId}" style="color: red; display: none;"></p>
        </form>
    `;
    container.appendChild(div);

    const formProforma = document.getElementById(`form-proforma-${panelId}`);
    formProforma.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(formProforma);
        const submitButton = formProforma.querySelector('button[type="submit"]');
        
        try {
            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;

            const res = await fetch(`/api/proyectos/${projectId}/subir-proforma`, {
                method: 'PUT',
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error desconocido del servidor.');
            }
            alert('Proforma(s) subida(s) con éxito.');
            window.location.reload();
        } catch (e) {
            const errorElement = document.getElementById(`upload-error-${panelId}`);
            errorElement.textContent = `Error: ${e.message}`;
            errorElement.style.display = 'block';
            submitButton.textContent = 'Enviar Proforma(s)';
            submitButton.disabled = false;
        }
    });
}
async function mostrarPanelRevisionProforma(container, projectId, proyecto) {
    const ultimaProforma = proyecto.archivos.find(a => a.tipo_archivo === 'proforma');
    const proformaFileName = ultimaProforma ? ultimaProforma.nombre_archivo : 'No disponible';
    const proformaFileUrl = ultimaProforma ? `/${ultimaProforma.url_archivo}` : '#';
    
    const panelId = `panel-revision-proforma-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `
        <h2>Revisión de Proforma</h2>
        <div class="card">
            <div class="card-body">
                <p>El diseñador ha subido la proforma. Por favor, revísala y procede con la autorización final.</p>
                <p><strong>Proforma:</strong> <a href="${proformaFileUrl}" target="_blank">${proformaFileName}</a></p>
                <hr>
                <h4>Autorización Final de Producción</h4>
                <div class="mb-3">
                    <label for="listado-final-input-${panelId}" class="form-label"><strong>Paso 1:</strong> Cargar listado final de clientes (Obligatorio)</label>
                    <input class="form-control" type="file" id="listado-final-input-${panelId}" required>
                </div>
                <button id="autorizar-produccion-btn-${panelId}" class="btn btn-success w-100"><strong>Paso 2:</strong> Autorizar e Iniciar Producción</button>
                <hr>
                <button id="solicitar-mejora-proforma-btn-${panelId}" class="btn btn-warning w-100 mt-2">Solicitar Modificación en Proforma</button>
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
        } catch (error) { alert(`Error: ${error.message}`); }
    });
    
    document.getElementById(`solicitar-mejora-proforma-btn-${panelId}`).addEventListener('click', async () => {
        const comentarios = prompt('Escriba los cambios necesarios para la proforma:');
        if (comentarios === null || comentarios.trim() === "") return;
        try {
            const response = await fetch(`/api/proyectos/${projectId}/solicitar-mejora-proforma`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comentarios: `PROFORMA: ${comentarios}` }) });
            if (!response.ok) throw new Error('Error al solicitar la modificación.');
            alert('Solicitud de modificación enviada.');
            window.location.reload();
        } catch(error) { alert(`Error: ${error.message}`); }
    });
}

async function mostrarPanelProduccion(container, proyecto) {
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
