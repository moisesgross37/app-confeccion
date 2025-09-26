document.addEventListener('DOMContentLoaded', () => {
    const projectId = new URLSearchParams(window.location.search).get('id');
    if (!projectId) {
        document.body.innerHTML = '<h1>Error: No se ha especificado un ID de proyecto.</h1>';
        return;
    }
    
    Promise.all([
        fetch(`/api/proyectos/${projectId}`).then(res => {
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

    // 2. Muestra las imágenes de referencia y los enlaces a otros archivos.
    const contenedorImagenes = document.getElementById('contenedor-imagenes');
    if (contenedorImagenes) {
        contenedorImagenes.innerHTML = '';
        if (proyecto.imagenes_referencia && proyecto.imagenes_referencia.length > 0) {
            proyecto.imagenes_referencia.forEach(rutaImagen => {
                const isImage = /\.(jpg|jpeg|png|gif)$/i.test(rutaImagen);
                if (isImage) {
                    const img = document.createElement('img');
                    img.src = `/${rutaImagen}`;
                    img.alt = 'Imagen de Referencia';
                    img.style = 'width: 120px; height: 120px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid #ccc;';
                    img.onclick = () => window.open(img.src, '_blank');
                    contenedorImagenes.appendChild(img);
                } else {
                    const fileName = rutaImagen.split(/[\\/]/).pop();
                    const link = document.createElement('a');
                    link.href = `/${rutaImagen}`;
                    link.textContent = `Descargar: ${fileName}`;
                    link.target = '_blank';
                    link.style = 'display: block; margin-bottom: 5px;';
                    contenedorImagenes.appendChild(link);
                }
            });
        } else {
            contenedorImagenes.innerHTML = '<p>No se adjuntaron imágenes de referencia para este proyecto.</p>';
        }
    }

    // 3. Muestra el enlace para descargar el listado final, si existe.
    if (proyecto.listado_final_url) {
        const detallesSection = document.getElementById('detalles-principales');
        if (!document.getElementById('listado-final-link')) {
            const p = document.createElement('p');
            p.id = 'listado-final-link';
            p.innerHTML = `<strong>Listado Final de Clientes:</strong> <a href="/${proyecto.listado_final_url}" target="_blank" class="button">Descargar Listado</a>`;
            detallesSection.appendChild(p);
        }
    }

    // 4. Calcula y muestra los contadores de días.
    const diasTotales = Math.ceil((new Date() - new Date(proyecto.fecha_creacion)) / (1000 * 60 * 60 * 24)) || 1;
    document.getElementById('dias-totales').textContent = diasTotales;
    
    if (proyecto.fecha_autorizacion_produccion) {
        const diasEnProduccion = Math.ceil((new Date() - new Date(proyecto.fecha_autorizacion_produccion)) / (1000 * 60 * 60 * 24)) || 1;
        document.getElementById('dias-en-produccion').textContent = diasEnProduccion;
    } else {
        document.getElementById('dias-en-produccion').textContent = '--';
    }
    
    // 5. Construye y muestra el historial de fechas y revisiones del proyecto.
const historialFechasElement = document.getElementById('historial-fechas');
historialFechasElement.innerHTML = '';
if (proyecto.fecha_creacion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_creacion).toLocaleDateString()}: Solicitud Creada.</li>`;
if (proyecto.fecha_de_asignacion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_de_asignacion).toLocaleDateString()}: Diseño Asignado.</li>`;
if (proyecto.fecha_propuesta) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_propuesta).toLocaleDateString()}: Propuesta enviada a revisión.</li>`;

// ===== LÓGICA AÑADIDA PARA MOSTRAR REVISIONES =====
if (proyecto.historial_revisiones && proyecto.historial_revisiones.length > 0) {
    proyecto.historial_revisiones.forEach(revision => {
        historialFechasElement.innerHTML += `<li style="color: #d9534f;"><b>${new Date(revision.fecha).toLocaleDateString()}: Develto por ${revision.rol} (${revision.usuario}) con el comentario:</b> "${revision.comentario}"</li>`;
    });
}
// ===== FIN DE LA LÓGICA AÑADIDA =====

if (proyecto.fecha_aprobacion_interna) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_aprobacion_interna).toLocaleDateString()}: Aprobado internamente.</li>`;
if (proyecto.fecha_aprobacion_cliente) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_aprobacion_cliente).toLocaleDateString()}: Aprobado por cliente.</li>`;
if (proyecto.fecha_proforma_subida) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_proforma_subida).toLocaleDateString()}: Proforma subida a revisión.</li>`;
if (proyecto.fecha_autorizacion_produccion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_autorizacion_produccion).toLocaleDateString()}: <b>Producción Autorizada.</b></li>`;
if (proyecto.historial_produccion && proyecto.historial_produccion.length > 0) {
    proyecto.historial_produccion.forEach(etapa => {
        historialFechasElement.innerHTML += `<li>${new Date(etapa.fecha).toLocaleDateString()}: Pasó a <b>${etapa.etapa}</b>.</li>`;
    });
}

   // 6. Lógica completa para mostrar los paneles de "Flujo de Trabajo" según el rol.
    const contenedorAcciones = document.getElementById('flujo-trabajo');
    const userRol = user.rol;
    const projectId = proyecto.id;
    let actionPanelRendered = false;

    // La lógica ahora es la misma para todos los roles, incluyendo al Administrador.
    // El Administrador simplemente tiene acceso a más `if` que los otros roles.
    
    // Panel de Asignación
    if (proyecto.status === 'Diseño Pendiente de Asignación' && ['Administrador', 'Coordinador'].includes(userRol)) {
        mostrarPanelAsignacion(contenedorAcciones, projectId);
        actionPanelRendered = true;
    } 
    // Panel para Subir Propuesta
    else if (proyecto.status === 'Diseño en Proceso' && ['Administrador', 'Diseñador'].includes(userRol)) {
        // Le pasamos el objeto 'proyecto' para que pueda mostrar los comentarios de revisión
        mostrarPanelSubirPropuesta(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } 
    // Panel para Revisión Interna
    else if (proyecto.status === 'Pendiente Aprobación Interna' && ['Administrador', 'Coordinador'].includes(userRol)) {
        mostrarPanelRevisarPropuesta(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } 
    // Panel para Aprobación del Cliente
    else if (proyecto.status === 'Pendiente Aprobación Cliente' && ['Administrador', 'Asesor'].includes(userRol)) {
        mostrarPanelAprobarCliente(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } 
    // Panel para Cargar Proforma
    else if (proyecto.status === 'Pendiente de Proforma' && ['Administrador', 'Diseñador'].includes(userRol)) {
        mostrarPanelSubirProforma(contenedorAcciones, projectId);
        actionPanelRendered = true;
    } 
    // Panel para Revisar Proforma y Autorizar Producción
    else if (proyecto.status === 'Pendiente Aprobación Proforma' && ['Administrador', 'Asesor'].includes(userRol)) {
        mostrarPanelRevisionProforma(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } 
    // Panel de Flujo de Producción
    else if (['En Lista de Producción', 'En Diagramación', 'En Impresión', 'En Calandrado', 'En Confección', 'Supervisión de Calidad'].includes(proyecto.status) && ['Administrador', 'Coordinador'].includes(userRol)) {
        mostrarPanelProduccion(contenedorAcciones, proyecto);
        actionPanelRendered = true;
    }

    // Mensaje por defecto si no hay acciones para el rol en el estado actual
    if (!actionPanelRendered) {
        contenedorAcciones.innerHTML = `<h2>Flujo de Trabajo</h2><p>No hay acciones disponibles para tu rol (<strong>${userRol}</strong>) en el estado actual del proyecto (<strong>${proyecto.status}</strong>).</p>`;
    }
}
async function mostrarPanelAsignacion(container, projectId) {
    const panelId = `panel-asignacion-${Math.random()}`; // ID único para evitar conflictos
    const div = document.createElement('div');
    div.innerHTML = `<h3>Asignar Tarea</h3><div class="form-group"><label for="designer-select-${panelId}">Diseñador:</label><select id="designer-select-${panelId}" required><option value="">Cargando...</option></select></div><button id="assign-designer-btn-${panelId}">Asignar</button><p id="assign-error-${panelId}" style="color: red; display: none;"></p>`;
    container.appendChild(div);

    const select = document.getElementById(`designer-select-${panelId}`);
    try {
        const res = await fetch('/api/designers');
        if (!res.ok) throw new Error('No se pudieron cargar los diseñadores.');
        const disenadores = await res.json();
        select.innerHTML = '<option value="">-- Seleccione --</option>';
        disenadores.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.nombre; select.appendChild(o); });
    } catch (e) { document.getElementById(`assign-error-${panelId}`).textContent = 'Error al cargar la lista.'; document.getElementById(`assign-error-${panelId}`).style.display = 'block'; }
    
    document.getElementById(`assign-designer-btn-${panelId}`).addEventListener('click', async () => {
        const diseñadorId = select.value;
        if (!diseñadorId) { alert('Seleccione un diseñador.'); return; }
        try {
            const res = await fetch(`/api/proyectos/${projectId}/asignar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diseñadorId }) });
            if (!res.ok) throw new Error((await res.json()).message);
            alert('Diseñador asignado.'); window.location.reload();
        } catch (e) { alert(`Error: ${e.message}`); }
    });
}
async function mostrarPanelSubirPropuesta(container, projectId, proyecto) {
    let revisionHtml = '';
    
    // ===== INICIO: CÓDIGO AÑADIDO PARA MOSTRAR COMENTARIOS DE REVISIÓN =====
    if (proyecto && proyecto.historial_revisiones && proyecto.historial_revisiones.length > 0) {
        // Obtenemos la última revisión del historial
        const ultimaRevision = proyecto.historial_revisiones[proyecto.historial_revisiones.length - 1];
        
        // Creamos un bloque de HTML para mostrar el comentario de forma destacada
        revisionHtml = `
            <div style="background-color: #fcf8e3; border: 1px solid #faebcc; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #8a6d3b;">Devuelto con Cambios Solicitados</h4>
                <p style="margin-bottom: 5px;"><strong>Fecha:</strong> ${new Date(ultimaRevision.fecha).toLocaleString()}</p>
                <p style="margin-bottom: 0;"><strong>Comentario de ${ultimaRevision.rol}:</strong> "${ultimaRevision.comentario}"</p>
            </div>
        `;
    }
    // ===== FIN: CÓDIGO AÑADIDO =====

    const panelId = `panel-propuesta-${Math.random()}`;
    const div = document.createElement('div');

    // Se añade la variable 'revisionHtml' al principio del panel para que se muestre arriba
    div.innerHTML = `
        <h3>Subir Propuesta</h3>
        ${revisionHtml}
        <div class="form-group">
            <label for="propuesta-file-${panelId}">Archivo:</label>
            <input type="file" id="propuesta-file-${panelId}" name="propuesta_diseno" required>
        </div>
        <button id="upload-propuesta-btn-${panelId}">Subir</button>
        <p id="upload-error-${panelId}" style="color: red; display: none;"></p>
    `;
    
    container.appendChild(div);

    document.getElementById(`upload-propuesta-btn-${panelId}`).addEventListener('click', async () => {
        const fileInput = document.getElementById(`propuesta-file-${panelId}`);
        if (!fileInput.files[0]) {
            alert('Seleccione un archivo.');
            return;
        }
        
        const formData = new FormData();
        formData.append('propuesta_diseno', fileInput.files[0]);
        
        try {
            const res = await fetch(`/api/proyectos/${projectId}/subir-propuesta`, { method: 'PUT', body: formData });
            if (!res.ok) {
                // Intentamos leer el mensaje de error del servidor
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error desconocido del servidor.');
            }
            alert('Propuesta subida con éxito.');
            window.location.reload();
        } catch (e) {
            const errorElement = document.getElementById(`upload-error-${panelId}`);
            errorElement.textContent = `Error: ${e.message}`;
            errorElement.style.display = 'block';
        }
    });
}
async function mostrarPanelRevisarPropuesta(container, projectId, proyecto) {
    const fileName = proyecto.propuesta_diseno_url ? proyecto.propuesta_diseno_url.split(/[\\/]/).pop() : 'N/A';
    const panelId = `panel-revisar-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `<h3>Revisión Interna</h3><div class="card"><p><strong>Archivo:</strong> <a href="/${proyecto.propuesta_diseno_url}" target="_blank">${fileName}</a></p><div class="button-group"><button id="aprobar-interno-btn-${panelId}">Aprobar</button><button id="solicitar-mejora-btn-${panelId}">Solicitar Cambios</button></div></div>`;
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
    const fileName = proyecto.propuesta_diseno_url ? proyecto.propuesta_diseno_url.split(/[\\/]/).pop() : 'N/A';
    const panelId = `panel-cliente-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `<h3>Aprobación Cliente</h3><div class="card"><p><strong>Propuesta:</strong> <a href="/${proyecto.propuesta_diseno_url}" target="_blank">${fileName}</a></p><hr><div class="button-group"><button id="aprobar-cliente-btn-${panelId}">Confirmar Aprobación</button><button id="solicitar-mejora-cliente-btn-${panelId}">Solicitar Cambios</button></div></div>`;
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

async function mostrarPanelSubirProforma(container, projectId) {
    const panelId = `panel-subir-proforma-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `<h3>Cargar Proforma</h3><div class="card"><p>El diseño fue aprobado. Sube la proforma.</p><div class="form-group"><label for="proforma-file-${panelId}">Archivo:</label><input type="file" id="proforma-file-${panelId}" name="proforma" required></div><button id="upload-proforma-btn-${panelId}">Subir Proforma</button></div>`;
    container.appendChild(div);

    document.getElementById(`upload-proforma-btn-${panelId}`).addEventListener('click', async () => {
        const fileInput = document.getElementById(`proforma-file-${panelId}`);
        if (!fileInput.files[0]) { alert('Seleccione un archivo.'); return; }
        const formData = new FormData();
        formData.append('proforma', fileInput.files[0]);
        try {
            const res = await fetch(`/api/proyectos/${projectId}/subir-proforma`, { method: 'PUT', body: formData });
            if (!res.ok) throw new Error('Error al subir.'); alert('Proforma subida.'); window.location.reload();
        } catch (e) { alert(`Error: ${e.message}`); }
    });
}

async function mostrarPanelRevisionProforma(container, projectId, proyecto) {
    const proformaFileName = proyecto.proforma_url ? proyecto.proforma_url.split(/[\\/]/).pop() : 'No disponible';
    const panelId = `panel-revision-proforma-${Math.random()}`;
    const div = document.createElement('div');
    div.innerHTML = `
        <h2>Revisión de Proforma</h2>
        <div class="card">
            <div class="card-body">
                <p>El diseñador ha subido la proforma. Por favor, revísala y procede con la autorización final.</p>
                <p><strong>Proforma:</strong> <a href="/${proyecto.proforma_url}" target="_blank">${proformaFileName}</a></p>
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

    div.innerHTML = `<div class="card">${panelHTML}</div>`;
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
