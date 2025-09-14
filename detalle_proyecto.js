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
    document.getElementById('codigo-proyecto').textContent = proyecto.codigo_proyecto || 'N/A';
    document.getElementById('centro-proyecto').textContent = proyecto.cliente || 'N/A';
    document.getElementById('asesor-proyecto').textContent = proyecto.nombre_asesor || 'N/A';
    document.getElementById('estado-proyecto').textContent = proyecto.status || 'N/A';
    document.getElementById('detalles-proyecto').textContent = proyecto.detalles_solicitud || 'N/A';

    if (proyecto.listado_final_url) {
        const detallesSection = document.getElementById('detalles-principales');
        const p = document.createElement('p');
        p.innerHTML = `<strong>Listado Final de Clientes:</strong> <a href="/${proyecto.listado_final_url}" target="_blank" class="button">Descargar Listado</a>`;
        detallesSection.appendChild(p);
    }

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
    if(proyecto.fecha_creacion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_creacion).toLocaleDateString()}: Solicitud Creada.</li>`;
    if(proyecto.fecha_de_asignacion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_de_asignacion).toLocaleDateString()}: Diseño Asignado.</li>`;
    if(proyecto.fecha_propuesta) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_propuesta).toLocaleDateString()}: Propuesta enviada a revisión.</li>`;
    if(proyecto.fecha_aprobacion_interna) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_aprobacion_interna).toLocaleDateString()}: Aprobado internamente.</li>`;
    if(proyecto.fecha_aprobacion_cliente) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_aprobacion_cliente).toLocaleDateString()}: Aprobado por cliente.</li>`;
    if(proyecto.fecha_proforma_subida) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_proforma_subida).toLocaleDateString()}: Proforma subida a revisión.</li>`;
    if(proyecto.fecha_autorizacion_produccion) historialFechasElement.innerHTML += `<li>${new Date(proyecto.fecha_autorizacion_produccion).toLocaleDateString()}: <b>Producción Autorizada.</b></li>`;
    if (proyecto.historial_produccion && proyecto.historial_produccion.length > 0) {
        proyecto.historial_produccion.forEach(etapa => {
            historialFechasElement.innerHTML += `<li>${new Date(etapa.fecha).toLocaleDateString()}: Pasó a <b>${etapa.etapa}</b>.</li>`;
        });
    }

    const contenedorAcciones = document.getElementById('flujo-trabajo');
    const userRol = user.rol;
    const projectId = proyecto.id;
    let actionPanelRendered = false;

    if (proyecto.status === 'Diseño Pendiente de Asignación' && ['Administrador', 'Coordinador'].includes(userRol)) {
        mostrarPanelAsignacion(contenedorAcciones, projectId);
        actionPanelRendered = true;
    } else if (proyecto.status === 'Diseño en Proceso' && userRol === 'Diseñador') {
        mostrarPanelSubirPropuesta(contenedorAcciones, projectId);
        actionPanelRendered = true;
    } else if (proyecto.status === 'Pendiente Aprobación Interna' && ['Administrador', 'Coordinador'].includes(userRol)) {
        mostrarPanelRevisarPropuesta(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } else if (proyecto.status === 'Pendiente Aprobación Cliente' && ['Administrador', 'Asesor'].includes(userRol)) {
        mostrarPanelAprobarCliente(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } else if (proyecto.status === 'Pendiente de Proforma' && userRol === 'Diseñador') {
        mostrarPanelSubirProforma(contenedorAcciones, projectId);
        actionPanelRendered = true;
    } else if (proyecto.status === 'Pendiente Aprobación Proforma' && ['Administrador', 'Asesor'].includes(userRol)) { 
        mostrarPanelRevisionProforma(contenedorAcciones, projectId, proyecto);
        actionPanelRendered = true;
    } else if (['En Lista de Producción', 'En Diagramación', 'En Impresión', 'En Calandrado', 'En Confección', 'Supervisión de Calidad'].includes(proyecto.status) && ['Administrador', 'Coordinador'].includes(userRol)) { 
        mostrarPanelProduccion(contenedorAcciones, proyecto);
        actionPanelRendered = true;
    }

    if (!actionPanelRendered) {
        contenedorAcciones.innerHTML = `<p>No hay acciones disponibles para tu rol (<strong>${userRol}</strong>) en el estado actual del proyecto (<strong>${proyecto.status}</strong>).</p>`;
    }
}

async function mostrarPanelAsignacion(container, projectId) {
    container.innerHTML = `<h3>Asignar Tarea</h3><div class="form-group"><label for="designer-select">Diseñador:</label><select id="designer-select" required><option value="">Cargando...</option></select></div><button id="assign-designer-btn">Asignar</button><p id="assign-error" style="color: red; display: none;"></p>`;
    const select = document.getElementById('designer-select');
    try {
        const res = await fetch('/api/designers');
        if (!res.ok) throw new Error('No se pudieron cargar los diseñadores.');
        const disenadores = await res.json();
        select.innerHTML = '<option value="">-- Seleccione --</option>';
        disenadores.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.nombre; select.appendChild(o); });
    } catch (e) { document.getElementById('assign-error').textContent = 'Error al cargar la lista.'; document.getElementById('assign-error').style.display = 'block'; }
    document.getElementById('assign-designer-btn').addEventListener('click', async () => {
        const diseñadorId = select.value;
        if (!diseñadorId) { alert('Seleccione un diseñador.'); return; }
        try {
            const res = await fetch(`/api/proyectos/${projectId}/asignar`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diseñadorId }) });
            if (!res.ok) throw new Error((await res.json()).message);
            alert('Diseñador asignado.'); window.location.reload();
        } catch (e) { alert(`Error: ${e.message}`); }
    });
}

async function mostrarPanelSubirPropuesta(container, projectId) {
    container.innerHTML = `<h3>Subir Propuesta</h3><div class="form-group"><label for="propuesta-file">Archivo:</label><input type="file" id="propuesta-file" name="propuesta_diseno" required></div><button id="upload-propuesta-btn">Subir</button><p id="upload-error" style="color: red; display: none;"></p>`;
    document.getElementById('upload-propuesta-btn').addEventListener('click', async () => {
        const fileInput = document.getElementById('propuesta-file');
        if (!fileInput.files[0]) { alert('Seleccione un archivo.'); return; }
        const formData = new FormData();
        formData.append('propuesta_diseno', fileInput.files[0]);
        try {
            const res = await fetch(`/api/proyectos/${projectId}/subir-propuesta`, { method: 'PUT', body: formData });
            if (!res.ok) throw new Error((await res.json()).message);
            alert('Propuesta subida.'); window.location.reload();
        } catch (e) { document.getElementById('upload-error').textContent = `Error: ${e.message}`; document.getElementById('upload-error').style.display = 'block'; }
    });
}

async function mostrarPanelRevisarPropuesta(container, projectId, proyecto) {
    const fileName = proyecto.propuesta_diseno_url ? proyecto.propuesta_diseno_url.split(/[\\/]/).pop() : 'N/A';
    container.innerHTML = `<h3>Revisión Interna</h3><div class="card"><p><strong>Archivo:</strong> <a href="/${proyecto.propuesta_diseno_url}" target="_blank">${fileName}</a></p><div class="button-group"><button id="aprobar-interno-btn">Aprobar</button><button id="solicitar-mejora-btn">Solicitar Cambios</button></div></div>`;
    document.getElementById('aprobar-interno-btn').addEventListener('click', async () => { if (!confirm('¿Aprobar esta propuesta?')) return; try { const res = await fetch(`/api/proyectos/${projectId}/aprobar-interno`, { method: 'PUT' }); if (!res.ok) throw new Error('Error en servidor.'); alert('Propuesta aprobada.'); window.location.reload(); } catch (e) { alert(`Error: ${e.message}`); } });
    document.getElementById('solicitar-mejora-btn').addEventListener('click', async () => {
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
    container.innerHTML = `<h3>Aprobación Cliente</h3><div class="card"><p><strong>Propuesta:</strong> <a href="/${proyecto.propuesta_diseno_url}" target="_blank">${fileName}</a></p><hr><div class="button-group"><button id="aprobar-cliente-btn">Confirmar Aprobación</button><button id="solicitar-mejora-cliente-btn">Solicitar Cambios</button></div></div>`;
    document.getElementById('aprobar-cliente-btn').addEventListener('click', async () => { if (!confirm('¿Confirmas que el cliente aprobó el diseño?')) return; try { const res = await fetch(`/api/proyectos/${projectId}/aprobar-cliente`, { method: 'PUT' }); if (!res.ok) throw new Error('Error en servidor.'); alert('Aprobación registrada.'); window.location.reload(); } catch (e) { alert(`Error: ${e.message}`); } });
    document.getElementById('solicitar-mejora-cliente-btn').addEventListener('click', async () => {
        const comentarios = prompt('Escribe los cambios del cliente:');
        if (!comentarios || comentarios.trim() === '') return;
        try {
            const res = await fetch(`/api/proyectos/${projectId}/solicitar-mejora`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comentarios: `CLIENTE: ${comentarios}` }) });
            if (!res.ok) throw new Error('Error al enviar.'); alert('Cambios enviados.'); window.location.reload();
        } catch (e) { alert(`Error: ${e.message}`); }
    });
}

async function mostrarPanelSubirProforma(container, projectId) {
    container.innerHTML = `<h3>Cargar Proforma</h3><div class="card"><p>El diseño fue aprobado. Sube la proforma.</p><div class="form-group"><label for="proforma-file">Archivo:</label><input type="file" id="proforma-file" name="proforma" required></div><button id="upload-proforma-btn">Subir Proforma</button></div>`;
    document.getElementById('upload-proforma-btn').addEventListener('click', async () => {
        const fileInput = document.getElementById('proforma-file');
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
    container.innerHTML = `
        <h2>Revisión de Proforma</h2>
        <div class="card">
            <div class="card-body">
                <p>El diseñador ha subido la proforma. Por favor, revísala y procede con la autorización final.</p>
                <p><strong>Proforma:</strong> <a href="/${proyecto.proforma_url}" target="_blank">${proformaFileName}</a></p>
                <hr>
                <h4>Autorización Final de Producción</h4>
                <div class="mb-3">
                    <label for="listado-final-input" class="form-label"><strong>Paso 1:</strong> Cargar listado final de clientes (Obligatorio)</label>
                    <input class="form-control" type="file" id="listado-final-input" required>
                </div>
                <button id="autorizar-produccion-btn" class="btn btn-success w-100"><strong>Paso 2:</strong> Autorizar e Iniciar Producción</button>
                <hr>
                <button id="solicitar-mejora-proforma-btn" class="btn btn-warning w-100 mt-2">Solicitar Modificación en Proforma</button>
            </div>
        </div>
    `;
    document.getElementById('autorizar-produccion-btn').addEventListener('click', async () => {
        const listadoInput = document.getElementById('listado-final-input');
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
    document.getElementById('solicitar-mejora-proforma-btn').addEventListener('click', async () => {
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

    const flujo = {
        'En Lista de Producción': { texto: 'Pasar a Diagramación', siguienteEstado: 'En Diagramación' },
        'En Diagramación': { texto: 'Pasar a Impresión', siguienteEstado: 'En Impresión' },
        'En Impresión': { texto: 'Pasar a Calandra', siguienteEstado: 'En Calandrado' },
        'En Calandrado': { texto: 'Enviar a Confección', siguienteEstado: 'En Confección' },
        'En Confección': { texto: 'Pasar a Supervisión de Calidad', siguienteEstado: 'Supervisión de Calidad' }
    };

    if (flujo[estadoActual]) {
        const accion = flujo[estadoActual];
        panelHTML = `<button id="avanzar-btn" class="btn btn-primary">${accion.texto}</button>`;
    } else if (estadoActual === 'Supervisión de Calidad') {
        panelHTML = `
            <h4>Decisión Final de Calidad</h4>
            <div class="button-group">
                <button id="aprobar-calidad-btn" class="btn btn-success">Aprobar Calidad / Listo para Entrega</button>
                <button id="reportar-incidencia-btn" class="btn btn-warning">Reportar Incidencia</button>
            </div>
        `;
    }

    container.innerHTML = `<div class="card">${panelHTML}</div>`;

    const avanzarBtn = document.getElementById('avanzar-btn');
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

    const aprobarCalidadBtn = document.getElementById('aprobar-calidad-btn');
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

    const reportarIncidenciaBtn = document.getElementById('reportar-incidencia-btn');
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
