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

// ==========================================================
// === TAREA 8.3: REEMPLAZA ESTE BLOQUE COMPLETO ===
// (Desde "RENDERIZAR ARCHIVOS" hasta "RENDERIZAR LÍNEA DE TIEMPO")
// ==========================================================

// --- 2. RENDERIZAR ARCHIVOS (Ahora con lógica para añadir más) ---
function renderizarArchivos(proyecto) {
    const archivosReferencia = document.getElementById('archivos-referencia');
    const archivosDiseno = document.getElementById('archivos-propuesta_diseno');
    const archivosProforma = document.getElementById('archivos-proforma');
    const archivosListado = document.getElementById('archivos-listado_final');
    
    archivosReferencia.innerHTML = '';
    archivosDiseno.innerHTML = '';
    archivosProforma.innerHTML = '';
    archivosListado.innerHTML = '';

    // --- ¡NUEVA LÓGICA DE RENDERIZADO DE LISTA! ---
    // Creamos una función de ayuda interna para poder llamarla más tarde
    const dibujarListaReferencias = (lista) => {
        archivosReferencia.innerHTML = ''; // Limpiar la lista
        if (!lista || lista.length === 0) {
            archivosReferencia.innerHTML = '<li>No hay archivos de referencia.</li>';
            return;
        }
        
        // Ordenamos por fecha más reciente primero
        lista.sort((a, b) => new Date(b.fecha_subida) - new Date(a.fecha_subida));
        
        lista.forEach(archivo => {
            const li = document.createElement('li');
            const fecha = new Date(archivo.fecha_subida).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
            li.innerHTML = `<a href="${archivo.url_archivo}" target="_blank">${archivo.nombre_archivo}</a> <span style="color: #666; font-size: 0.9em;">(Subido por ${archivo.subido_por} - ${fecha})</span>`;
            archivosReferencia.appendChild(li);
        });
    };

    // Filtramos y dibujamos todas las demás listas (con lógica mejorada)
    if (proyecto.archivos && proyecto.archivos.length > 0) {
        
        dibujarListaReferencias(proyecto.archivos.filter(a => a.tipo_archivo === 'referencia'));
        
        const propuestas = proyecto.archivos.filter(a => a.tipo_archivo === 'propuesta_diseno');
        if (propuestas.length === 0) {
             archivosDiseno.innerHTML = '<li>No hay propuestas de diseño.</li>';
        } else {
            propuestas.sort((a, b) => new Date(b.fecha_subida) - new Date(a.fecha_subida)); // Ordenar
            propuestas.forEach(archivo => {
                const li = document.createElement('li');
                const fecha = new Date(archivo.fecha_subida).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
                li.innerHTML = `<a href="${archivo.url_archivo}" target="_blank">${archivo.nombre_archivo}</a> <span style="color: #666; font-size: 0.9em;">(Subido por ${archivo.subido_por} - ${fecha})</span>`;
                archivosDiseno.appendChild(li);
            });
        }
        
        const proformas = proyecto.archivos.filter(a => a.tipo_archivo === 'proforma');
        if (proformas.length === 0) {
            archivosProforma.innerHTML = '<li>No hay proformas.</li>';
        } else {
            proformas.sort((a, b) => new Date(b.fecha_subida) - new Date(a.fecha_subida)); // Ordenar
            proformas.forEach(archivo => {
                const li = document.createElement('li');
                const fecha = new Date(archivo.fecha_subida).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
                li.innerHTML = `<a href="${archivo.url_archivo}" target="_blank">${archivo.nombre_archivo}</a> <span style="color: #666; font-size: 0.9em;">(Subido por ${archivo.subido_por} - ${fecha})</span>`;
                archivosProforma.appendChild(li);
            });
        }
        
        const listados = proyecto.archivos.filter(a => a.tipo_archivo === 'listado_final');
        if (listados.length === 0) {
            archivosListado.innerHTML = '<li>No hay listados finales.</li>';
        } else {
            listados.sort((a, b) => new Date(b.fecha_subida) - new Date(a.fecha_subida)); // Ordenar
            listados.forEach(archivo => {
                const li = document.createElement('li');
                const fecha = new Date(archivo.fecha_subida).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
                li.innerHTML = `<a href="${archivo.url_archivo}" target="_blank">${archivo.nombre_archivo}</a> <span style="color: #666; font-size: 0.9em;">(Subido por ${archivo.subido_por} - ${fecha})</span>`;
                archivosListado.appendChild(li);
            });
        }

    } else {
        // Si no hay archivos de ningún tipo
        archivosReferencia.innerHTML = '<li>No hay archivos de referencia.</li>';
        archivosDiseno.innerHTML = '<li>No hay propuestas de diseño.</li>';
        archivosProforma.innerHTML = '<li>No hay proformas.</li>';
        archivosListado.innerHTML = '<li>No hay listados finales.</li>';
    }
    
    // --- ¡AQUÍ CONECTAMOS LOS NUEVOS BOTONES! ---
    const btnAddReferencia = document.getElementById('btn-add-referencia');
    const inputAddReferencia = document.getElementById('input-add-referencia');
    const uploadStatus = document.getElementById('upload-status');
    const projectId = proyecto.id;

    btnAddReferencia.addEventListener('click', () => {
        inputAddReferencia.click(); // Abre el selector de archivos
    });

    inputAddReferencia.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;
        
        uploadStatus.textContent = `Subiendo ${files.length} archivo(s)...`;
        btnAddReferencia.disabled = true;

        try {
            // Llamamos a la nueva función de ayuda que añadiremos en el siguiente bloque
            const nuevosArchivos = await subirNuevasReferencias(projectId, files);
            
            // Si tiene éxito, actualiza la lista SIN RECARGAR la página
            dibujarListaReferencias(nuevosArchivos);
            uploadStatus.textContent = '¡Archivos subidos con éxito!';
        
        } catch (error) {
            console.error('Error al subir referencias:', error);
            uploadStatus.textContent = `Error: ${error.message}`;
            alert(`Error al subir archivos: ${error.message}`);
        } finally {
            btnAddReferencia.disabled = false;
            inputAddReferencia.value = ''; // Limpia el input
            // Borra el mensaje de estado después de 3 segundos
            setTimeout(() => { uploadStatus.textContent = ''; }, 3000);
        }
    });
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
// === REEMPLAZA ESTA FUNCIÓN COMPLETA ("EL CEREBRO") ===
// ==========================================================
function renderizarLineaDeTiempo(proyecto, user) {
    const container = document.getElementById('flujo-de-etapas-container');
    container.innerHTML = ''; 
    
    // Mapeo de estados (¡AQUÍ ESTÁ LA CORRECCIÓN!)
    const estadoEtapaMap = {
        'Diseño Pendiente de Asignación': 2, 
        'Diseño en Proceso': 3, 
        'Pendiente Aprobación Interna': 4, 
        'Pendiente Aprobación Cliente': 5, 
        'Pendiente de Proforma': 6, 
        'Pendiente Aprob. Proforma Interna': 7, // <-- CORREGIDO
        'Pendiente Aprob. Proforma Cliente': 8, // <-- CORREGIDO
        'En Lista de Producción': 9,
        'En Diagramación': 10,
        'En Impresión': 11,
        'En Calandrado': 12,
        'En Confección': 12, // Ambos estados 12 y 11 usan el mismo número
        'Supervisión de Calidad': 13,
        'Listo para Entrega': 14,
        'Completado': 15 // ¡Estado FINAL!
    };

    const etapaActualNum = estadoEtapaMap[proyecto.status] || 1; 
    
    // Lista de etapas (Corregida, 14 etapas)
    // (Esta lógica de fechas ya estaba correcta y adaptada al flujo 6,7,8)
    const etapas = [
        { num: 1, titulo: 'Solicitud Creada', fecha: proyecto.fecha_creacion },
        { num: 2, titulo: 'Asignación de Diseñador', fecha: proyecto.fecha_de_asignacion, panelId: 'panel-etapa-2' },
        { num: 3, titulo: 'Propuesta del Diseñador', fecha: proyecto.fecha_propuesta, panelId: 'panel-etapa-3' },
        { num: 4, titulo: 'Autorización Interna (Diseño)', fecha: proyecto.fecha_aprobacion_interna, panelId: 'panel-etapa-4' },
        { num: 5, titulo: 'Aprobación del Cliente (Diseño)', fecha: proyecto.fecha_aprobacion_cliente, panelId: 'panel-etapa-5' },
        { num: 6, titulo: 'Subida de Proforma', fecha: proyecto.fecha_proforma_subida, panelId: 'panel-etapa-6' },
        { num: 7, titulo: 'Aprob. Proforma Interna', fecha: proyecto.status === 'Pendiente Aprob. Proforma Cliente' || etapaActualNum > 7 ? new Date() : null, panelId: 'panel-etapa-7' },
        { num: 8, titulo: 'Aprob. Proforma Cliente (y Listado)', fecha: proyecto.fecha_autorizacion_produccion, panelId: 'panel-etapa-8' },
        { num: 9, titulo: 'En Lista de Producción', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Lista de Producción' || e.etapa === 'En Diagramación')?.fecha, panelId: 'panel-etapa-9' },
        { num: 10, titulo: 'Diagramación', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Diagramación')?.fecha, panelId: 'panel-etapa-10' },
        { num: 11, titulo: 'Impresión', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Impresión')?.fecha, panelId: 'panel-etapa-11' },
        { num: 12, titulo: 'Confección', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'En Confección')?.fecha, panelId: 'panel-etapa-12' },
        { num: 13, titulo: 'Control de Calidad', fecha: proyecto.historial_produccion?.find(e => e.etapa === 'Supervisión de Calidad')?.fecha, panelId: 'panel-etapa-13' },
        { num: 14, titulo: 'Entrega del Combo', fecha: proyecto.fecha_entrega, panelId: 'panel-etapa-14' } 
    ];
    
    // Pequeña corrección en la lógica de pintado para simplificar
    etapas.forEach(etapa => {
        const li = document.createElement('li');
        li.className = 'timeline-etapa';
        
        let estado = 'pendiente'; // Gris 🔵
        
        if (etapa.num < etapaActualNum) {
            estado = 'completado'; // Verde ✅
        } else if (etapa.num === etapaActualNum) {
            estado = 'actual'; // Azul ➡️
        }
        
        // Si el proyecto está completado, pinta todo de verde
        if (proyecto.status === 'Completado') {
            estado = 'completado';
        }
        
        // Lógica para obtener la fecha (la tuya era casi perfecta, solo ajusté la Etapa 9)
        let fechaEtapa = etapa.fecha;
        if (etapa.num === 9 && !fechaEtapa) {
            fechaEtapa = proyecto.fecha_autorizacion_produccion;
        }
li.setAttribute('data-estado', estado);
        const fechaFormateada = fechaEtapa ? new Date(fechaEtapa).toLocaleDateString() : '';
        
        // --- ¡ESTA ES LA CORRECCIÓN LÓGICA! ---
        // Creamos una variable para el HTML del panel
        let panelHtml = '';
        const esEtapaActual = (estado === 'actual');
        const esPanelDeCompletado = (etapa.num === 14 && proyecto.status === 'Completado');

        // Inyectamos el div si la etapa es la "actual" O si es la etapa 14 en un proyecto "completado"
        if (etapa.panelId && (esEtapaActual || esPanelDeCompletado)) {
            panelHtml = `<div class="etapa-panel-acciones" id="${etapa.panelId}"></div>`;
        }
        // --- FIN DE LA CORRECCIÓN LÓGICA ---

        li.innerHTML = `
            <div class="etapa-header">
                <h3>${etapa.num}. ${etapa.titulo}</h3>
                <span class="etapa-fecha">${fechaFormateada}</span>
            </div>
    	    ${panelHtml}         `;
        
        container.appendChild(li);
        });


    // --- "CEREBRO" (IF/ELSE) ---
    // Esta parte de tu código ya estaba PERFECTA y usaba los strings correctos.
    // No necesita cambios, pero la incluyo como parte de la función completa.
    
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
    // ¡Esta es la lógica que ahora SÍ funcionará!
    else if (proyecto.status === 'Pendiente Aprob. Proforma Interna' && esAdmin) {
        mostrarPanelAprobProformaInterna(document.getElementById('panel-etapa-7'), proyecto.id, proyecto);
    }
    // ¡Esta también!
    else if (proyecto.status === 'Pendiente Aprob. Proforma Cliente' && esAsesor) {
        mostrarPanelAprobProformaCliente(document.getElementById('panel-etapa-8'), proyecto.id, proyecto);
    }
    else if (esAdmin && (etapaActualNum >= 9 && etapaActualNum <= 13) && proyecto.status !== 'Listo para Entrega' ) {
        const panelId = `panel-etapa-${etapaActualNum}`;
        const panelContainer = document.getElementById(panelId);
        if (panelContainer) {
            mostrarPanelProduccion(panelContainer, proyecto);
        }
    }
    else if (esDisenador && (proyecto.status === 'Diseño en Proceso' || (proyecto.status === 'En Confección' && proyecto.historial_incidencias?.length > 0))) {
        // Corrección: La etapa de "En Confección" es la 12, no la 3
        const panelId = (proyecto.status === 'Diseño en Proceso') ? 'panel-etapa-3' : 'panel-etapa-12';
        const panelContainer = document.getElementById(panelId);
        if (panelContainer) {
        	mostrarPanelSubirPropuesta(panelContainer, proyecto.id, proyecto);
        }
    }
    else if (proyecto.status === 'Listo para Entrega' && esAdmin) {
        const panelContainer = document.getElementById('panel-etapa-14');
        if (panelContainer) {
            mostrarPanelEntrega(panelContainer, proyecto.id, proyecto);
        }
    }
else if (proyecto.status === 'Completado') { // esAsesor cubre Admin, Asesor y Coord.
        const panelContainer = document.getElementById('panel-etapa-14'); // Reusamos el espacio de la etapa 14
        if (panelContainer) {
            // Llamamos a una función nueva que vamos a crear
            mostrarPanelCompletado(panelContainer, proyecto);
        }
    }
}
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
    const fileUrl = ultimaPropuesta ? ultimaPropuesta.url_archivo : '#'; // Corregido: quitada la / extra
    
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
    const fileUrl = ultimaPropuesta ? ultimaPropuesta.url_archivo : '#'; // Corregido: quitada la / extra
    
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
// === TAREA A.4 (Frontend): PEGA ESTA FUNCIÓN NUEVA ===
// (Este es el panel para la NUEVA Etapa 7: Aprob. Interna)
// ==========================================================
async function mostrarPanelAprobProformaInterna(container, projectId, proyecto) {
    if (!container) return; // Seguridad
    
    // Busca la última proforma subida
    const ultimaProforma = proyecto.archivos
        .filter(a => a.tipo_archivo === 'proforma')
        .sort((a, b) => new Date(b.fecha_subida) - new Date(a.fecha_subida))[0];
        
    const proformaFileName = ultimaProforma ? ultimaProforma.nombre_archivo : 'No disponible';
    const proformaFileUrl = ultimaProforma ? ultimaProforma.url_archivo : '#';
    
    const panelId = `panel-aprob-proforma-interna-${Math.random()}`;
    const div = document.createElement('div');
    
    div.innerHTML = `
        <h3>Revisión Interna de Proforma</h3>
        <div class="card">
            <div class="card-body">
                <p>El diseñador ha subido la proforma. Por favor, revísala.</p>
                <p><strong>Proforma:</strong> <a href="${proformaFileUrl}" target="_blank">${proformaFileName}</a></p>
                <hr>
                <div class="button-group">
                    <button id="aprobar-interno-btn-${panelId}" class="btn btn-success">Aprobar (Enviar a Cliente)</button>
                    <button id="solicitar-mejora-btn-${panelId}" class="btn btn-warning mt-2">Solicitar Modificación</button>
                </div>
            </div>
        </div>
    `;
    container.appendChild(div);

    // 1. Botón de Aprobar (Llama a la ruta que creamos en el backend)
    document.getElementById(`aprobar-interno-btn-${panelId}`).addEventListener('click', async () => {
        if (!confirm('¿Aprobar esta proforma y enviarla a revisión del cliente?')) return;
        try {
            const response = await fetch(`/api/proyectos/${projectId}/aprobar-proforma-interna`, { method: 'PUT' });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Error del servidor'); }
            
            alert('¡Proforma aprobada internamente! El proyecto pasará al Asesor.');
            window.location.reload();
        } catch (error) { 
            alert(`Error: ${error.message}`); 
        }
    });
    
    // 2. Botón de Solicitar Mejora (Usa la misma lógica de rechazo que ya teníamos)
    document.getElementById(`solicitar-mejora-btn-${panelId}`).addEventListener('click', async () => {
        const comentarios = prompt('Escriba los cambios necesarios para la proforma (para el diseñador):');
        if (comentarios === null || comentarios.trim() === "") return;
        try {
            const response = await fetch(`/api/proyectos/${projectId}/solicitar-mejora`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ comentarios: `PROFORMA: ${comentarios}` }) // El prefijo es clave
            });
            if (!response.ok) throw new Error('Error al solicitar la modificación.');
            
            alert('Solicitud de modificación enviada al diseñador.');
            window.location.reload();
        } catch(error) { 
            alert(`Error: ${error.message}`); 
        }
    });
}
// ==========================================================
// === FIN TAREA A.4 ===
// ==========================================================

// ==========================================================
// === TAREA 3.2: FUNCIÓN DE ETAPA 7 (SIMPLIFICADA) ===
// ==========================================================
async function mostrarPanelRevisionProforma(container, projectId, proyecto) {
    if (!container) return; 
    
    const ultimaProforma = proyecto.archivos.find(a => a.tipo_archivo === 'proforma');
    const proformaFileName = ultimaProforma ? ultimaProforma.nombre_archivo : 'No disponible';
    const proformaFileUrl = ultimaProforma ? ultimaProforma.url_archivo : '#'; // Corregido: quitada la / extra
    
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
// === TAREA A.5 (Frontend): REEMPLAZA ESTA FUNCIÓN COMPLETA ===
// (Solo le cambiamos el nombre de 'AutorizarProduccion' a 'AprobProformaCliente')
// ==========================================================
async function mostrarPanelAprobProformaCliente(container, projectId, proyecto) {
    if (!container) return; 

    const panelId = `panel-autorizar-produccion-${Math.random()}`;
    const div = document.createElement('div');
    
    // El HTML interno es el mismo
    div.innerHTML = `
        <h3>Aprobación de Cliente y Autorización</h3>
        <div class="card">
            <div class="card-body">
                <p>La proforma ha sido aprobada internamente. Por favor, cargue el listado final del cliente para autorizar el inicio de la producción.</p>
                <div class="mb-3">
                    <label for="listado-final-input-${panelId}" class="form-label"><strong>Paso 1:</strong> Cargar listado final de clientes (Obligatorio)</label>
                    <input class="form-control" type="file" id="listado-final-input-${panelId}" required>
                </div>
                <button id="autorizar-produccion-btn-${panelId}" class="btn btn-success w-100"><strong>Paso 2:</strong> Aprobar y Autorizar Producción</button>
                <hr>
                <button id="solicitar-mejora-proforma-btn-${panelId}" class="btn btn-warning mt-2">Rechazar / Solicitar Modificación</button>
            </div>
        </div>
    `;
    container.appendChild(div);

    // --- Lógica del botón de Autorizar (CON EL NUEVO AVISO) ---
    document.getElementById(`autorizar-produccion-btn-${panelId}`).addEventListener('click', async () => {
        const listadoInput = document.getElementById(`listado-final-input-${panelId}`);
        const listadoFile = listadoInput.files[0];

        // 1. Validar que haya archivo
        if (!listadoFile) { 
            alert('Debes cargar el archivo con el listado final para poder autorizar.'); 
            return; 
        }

        // 2. NUEVO MENSAJE DE ADVERTENCIA (Texto Mejorado)
        const mensaje = 
            "⚠️ AVISO IMPORTANTE SOBRE PROFESORES\n\n" +
            "Si este listado NO incluye a los profesores, su entrega NO saldrá en la misma fecha que la promoción.\n\n" +
            "¿Confirmas que has informado esto y deseas continuar?";

        // Si el usuario le da a "Cancelar", detenemos todo aquí.
        if (!confirm(mensaje)) return;
        
        // 3. Si dice que SÍ, procedemos con la carga
        const formData = new FormData();
        formData.append('listado_final', listadoFile);
        
        // (Opcional) Cambiamos el texto del botón para evitar doble clic
        const btn = document.getElementById(`autorizar-produccion-btn-${panelId}`);
        btn.textContent = "Procesando...";
        btn.disabled = true;

        try {
            const response = await fetch(`/api/proyectos/${projectId}/autorizar-produccion`, { method: 'PUT', body: formData });
            if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Error del servidor'); }
            
            alert('¡Producción autorizada con éxito!');
            window.location.reload();
        } catch (error) { 
            alert(`Error: ${error.message}`); 
            // Si falló, reactivamos el botón
            btn.textContent = "Reintentar Autorización";
            btn.disabled = false;
        }
    });

    // --- Lógica del botón de Rechazar (sin cambios) ---
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
            
            alert('Solicitud de modificación enviada al diseñador.');
            window.location.reload();
        } catch(error) { 
            alert(`Error: ${error.message}`); 
        }
    });
}
// ==========================================================
// === FIN TAREA A.5 ===
// ==========================================================
// --- PANELES DE ACCIÓN: ETAPAS 9-13 (Con Validación de Pago para Diagramación) ---
async function mostrarPanelProduccion(container, proyecto) {
    if (!container) return;
    const projectId = proyecto.id;
    const estadoActual = proyecto.status;
    let panelHTML = '';
    const panelId = `panel-produccion-${Math.random()}`;
    const div = document.createElement('div');
    let incidenciaHtml = '';

    // Manejo de Incidencias visuales
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
    
    // Flujo de producción
    const flujo = {
        'En Lista de Producción': { texto: 'Pasar a Diagramación', siguienteEstado: 'En Diagramación' },
        'En Diagramación': { texto: 'Pasar a Impresión', siguienteEstado: 'En Impresión' },
        'En Impresión': { texto: 'Pasar a Calandra', siguienteEstado: 'En Calandrado' },
        'En Calandrado': { texto: 'Enviar a Confección', siguienteEstado: 'En Confección' },
        'En Confección': { texto: 'Pasar a Supervisión de Calidad', siguienteEstado: 'Supervisión de Calidad' }
    };

    // Generación del HTML del botón principal
    if (flujo[estadoActual]) {
        const accion = flujo[estadoActual];
        panelHTML = `<button id="avanzar-btn-${panelId}" class="btn btn-primary">${accion.texto}</button>`;
    
    // Panel de Control de Calidad
    } else if (estadoActual === 'Supervisión de Calidad') {
        panelHTML = `
            <h4>Decisión Final de Calidad</h4>
            <div class="button-group">
                <button id="aprobar-calidad-btn-${panelId}" class="btn btn-success">Aprobar Calidad / Listo para Entrega</button>
            </div>
            <hr>
            <h4>Reportar Incidencia</h4>
            <div class="button-group">
                <button id="reportar-incidencia-btn-${panelId}" class="btn btn-danger">Devolver a Diseño (Etapa 3)</button>
            </div>
        `;
    }

    div.innerHTML = `<div class="card">${incidenciaHtml}${panelHTML}</div>`;
    container.appendChild(div);

    // --- LÓGICA DEL BOTÓN DE AVANZAR (Aquí está el cambio) ---
    const avanzarBtn = document.getElementById(`avanzar-btn-${panelId}`);
    if (avanzarBtn) {
        avanzarBtn.addEventListener('click', async () => {
            const accion = flujo[estadoActual];
            
            // 1. VALIDACIÓN DE PAGO (Solo si vamos hacia Diagramación)
            if (accion.siguienteEstado === 'En Diagramación') {
                const mensajePago = 
                    "💰 VERIFICACIÓN ADMINISTRATIVA DE PAGO\n\n" +
                    "Antes de pasar a Diagramación, es OBLIGATORIO confirmar que este cliente ya realizó su PRIMER ABONO.\n\n" +
                    "¿Confirmas que ya validaste con Administración el pago del abono?";
                
                // Si el usuario cancela, detenemos la ejecución aquí.
                if (!confirm(mensajePago)) return;
            }

            // 2. Confirmación estándar (Para todos los estados)
            if (!confirm(`¿Confirmas que deseas avanzar el proyecto a "${accion.siguienteEstado}"?`)) return;
            
            // 3. Ejecución del cambio de etapa
            try {
                const response = await fetch(`/api/proyectos/${projectId}/avanzar-etapa`, { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ nuevaEtapa: accion.siguienteEstado }) 
                });
                if (!response.ok) throw new Error('Error en el servidor');
                alert('Etapa actualizada con éxito.');
                window.location.reload();
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }

    // Lógica de Calidad (Aprobar) - Sin cambios
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

    // Lógica de Calidad (Reportar Incidencia) - Sin cambios
    const reportarIncidenciaBtn = document.getElementById(`reportar-incidencia-btn-${panelId}`);
    if (reportarIncidenciaBtn) {
        reportarIncidenciaBtn.addEventListener('click', async () => {
            const comentarios = prompt('Describa la falla (se devolverá a Diseño):');
            if (!comentarios || comentarios.trim() === '') { alert('Debes incluir un comentario.'); return; }
            try {
                const response = await fetch(`/api/proyectos/${projectId}/reportar-incidencia`, { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                        comentarios: comentarios
                    }) 
                });
                if (!response.ok) throw new Error('Error al reportar la incidencia.');
                alert('Incidencia reportada. El proyecto volverá a Diseño (Etapa 3).');
                window.location.reload();
            } catch (error) { alert(`Error: ${error.message}`); }
        });
    }
}// ==========================================================
// === TAREA B.3 (Frontend): REEMPLAZA ESTA FUNCIÓN COMPLETA ===
// (Implementa el formulario de Cierre de la Etapa 14)
// ==========================================================
async function mostrarPanelEntrega(container, projectId, proyecto) {
    if (!container) return;
    const panelId = `panel-entrega-${Math.random()}`;
    const div = document.createElement('div');

    // 1. Leemos los productos del proyecto
    const productos = proyecto.productos || [];
    if (productos.length === 0) {
        // Si no hay productos, mostramos un error simple (caso borde)
        div.innerHTML = `<h3>Error: No se pueden registrar cantidades.</h3><p>Este proyecto no tiene productos registrados. Por favor, contacte a un administrador.</p>`;
        container.appendChild(div);
        return;
    }

    // 2. Construimos la tabla de cantidades
    let tablaHtml = `
        <table class="table" id="tabla-conduce-${panelId}" style="table-layout: auto; width: 100%;">
            <thead>
                <tr>
                    <th style="width: 40%;">Producto</th>
                    <th style="width: 20%;">Cant. Cotizada</th>
                    <th style="width: 20%;">Cant. Listado</th>
                    <th style="width: 20%;">Cant. Entregada</th>
                </tr>
            </thead>
            <tbody>
    `;
    productos.forEach((productoNombre, index) => {
        tablaHtml += `
            <tr data-producto-nombre="${productoNombre}">
                <td>${productoNombre}</td>
                <td><input type="number" class="form-control" name="cant_cotizada_${index}" placeholder="0" required></td>
                <td><input type="number" class="form-control" name="cant_listado_${index}" placeholder="0" required></td>
                <td><input type="number" class="form-control" name="cant_entregada_${index}" placeholder="0" required></td>
            </tr>
        `;
    });
    tablaHtml += `</tbody></table>`;

    // 3. Creamos el HTML completo del panel
    div.innerHTML = `
        <h3>Entrega Final del Proyecto</h3>
        <div class="card">
            <div class="card-body">
                <p>El proyecto está listo para ser entregado. Por favor, complete todas las cantidades y comentarios para archivar el proyecto.</p>
                
                <h4>Tabla de Cantidades (Obligatorio)</h4>
                ${tablaHtml}
                
                <hr>
                <h4>Comentarios de Cierre (Obligatorio)</h4>
                <div class="form-group">
                    <textarea id="comentarios-cierre-${panelId}" class="form-control" rows="3" placeholder="Escriba aquí cualquier observación sobre la entrega (ej. 'Se entregaron 2 polos extra', 'Faltó 1 gorra', etc.)" required></textarea>
                </div>

                <div class="button-group">
                    <button id="completar-entrega-btn-${panelId}" class="btn btn-primary">Confirmar Cierre y Generar Conduce</button>
                    <button id="reportar-incidencia-btn-${panelId}" class="btn btn-danger">Reportar Incidencia (Devolver a Diseño)</button>
                </div>
            </div>
        </div>
    `;
    container.appendChild(div);

    // 4. Lógica de los botones
    const btnCompletar = document.getElementById(`completar-entrega-btn-${panelId}`);
    const btnReportar = document.getElementById(`reportar-incidencia-btn-${panelId}`);
    const tablaEl = document.getElementById(`tabla-conduce-${panelId}`);
    const comentariosEl = document.getElementById(`comentarios-cierre-${panelId}`);

    // Botón de Confirmar Cierre
    btnCompletar.addEventListener('click', async () => {
        let tablaValida = true;
        const conduceTabla = [];

        // Validamos la tabla y recolectamos los datos
        tablaEl.querySelectorAll('tbody tr').forEach(tr => {
            const producto = tr.dataset.productoNombre;
            const cotizada = tr.querySelector('input[name^="cant_cotizada_"]').value;
            const listado = tr.querySelector('input[name^="cant_listado_"]').value;
            const entregada = tr.querySelector('input[name^="cant_entregada_"]').value;

            if (cotizada === '' || listado === '' || entregada === '') {
                tablaValida = false; // Marcamos como inválido si algún campo está vacío
            }
            
            conduceTabla.push({
                producto: producto,
                cotizada: parseInt(cotizada) || 0,
                listado: parseInt(listado) || 0,
                entregada: parseInt(entregada) || 0
            });
        });

        const comentarios = comentariosEl.value;

        // Validación final
        if (!tablaValida) {
            return alert('Error: Por favor, llene todas las cantidades de la tabla (puede usar 0).');
        }
        if (comentarios.trim() === '') {
            return alert('Error: Los comentarios de cierre son obligatorios.');
        }
        
        if (!confirm('¿Estás seguro de que deseas marcar este proyecto como "Completado" y archivarlo? Esta acción es final.')) return;

        try {
            btnCompletar.disabled = true;
            btnCompletar.textContent = 'Guardando...';

            const response = await fetch(`/api/proyectos/${projectId}/completar-entrega`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conduceTabla: conduceTabla,
                    conduceComentarios: comentarios
                })
            });
            
            if (!response.ok) { 
                const err = await response.json(); 
                throw new Error(err.message || 'Error del servidor'); 
            }
 alert('¡Proyecto completado y archivado con éxito!');
            
            // ESTANDARIZADO: Usamos proyecto.id porque tenemos el objeto 'proyecto'
            window.open(`hoja_de_conduce.html?id=${proyecto.id}`, '_blank');
            
            // CORRECCIÓN: Añadimos el retraso para que el pop-up funcione
            setTimeout(() => {
                window.location.href = '/panel_confeccion.html';
            }, 500); // 500 milisegundos

        } catch (error) { 
            alert(`Error: ${error.message}`); 
            btnCompletar.disabled = false;
            btnCompletar.textContent = 'Confirmar Cierre y Generar Conduce';
        }
    });
    
    // Botón de Reportar Incidencia
    btnReportar.addEventListener('click', async () => {
        const comentarios = prompt('Describa la falla (se devolverá a Diseño):');
        if (!comentarios || comentarios.trim() === '') { alert('Debes incluir un comentario.'); return; }
        try {
            const response = await fetch(`/api/proyectos/${proyecto.id}/reportar-incidencia`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                    comentarios: comentarios
                }) 
            });
            if (!response.ok) throw new Error('Error al reportar la incidencia.');
            alert('Incidencia reportada. El proyecto volverá a Diseño (Etapa 3).');
            window.location.reload();
        } catch (error) { alert(`Error: ${error.message}`); }
    });
}
// ==========================================================
// === FIN TAREA B.3 ===
// ==========================================================
// ==========================================================
// === TAREA 8.4: AÑADE ESTA NUEVA FUNCIÓN AL FINAL DEL ARCHIVO ===
// ==========================================================
async function subirNuevasReferencias(projectId, files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append('imagenes_referencia', file);
    }

    // Llamamos a la nueva ruta del backend (Tarea 8.1)
    const response = await fetch(`/api/proyectos/${projectId}/agregar-referencia`, {
        method: 'POST',
        body: formData
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || 'Error del servidor al subir archivos.');
    }
    
    // Devolvemos la lista actualizada de archivos de referencia
    return result;
}
// ==========================================================
// === AÑADE ESTA FUNCIÓN NUEVA AL FINAL DEL ARCHIVO ===
// ==========================================================
// ==========================================================
// === REEMPLAZA LA FUNCIÓN ANTERIOR POR ESTA ===
// ==========================================================
async function mostrarPanelCompletado(container, proyecto) { // ¡Recibimos 'proyecto'!
    if (!container) return;
    const panelId = `panel-completado-${Math.random()}`;
    const div = document.createElement('div');

    // Usamos 'proyecto.fecha_entrega' (la variable local, no la global)
    const fechaEntrega = proyecto.fecha_entrega 
        ? new Date(proyecto.fecha_entrega).toLocaleDateString('es-DO') 
        : 'Fecha no registrada';

    div.innerHTML = `
        <h3 style="color: #28a745;">Proyecto Archivado</h3>
        <div class="card">
            <div class="card-body">
                <p>Este proyecto se marcó como 'Completado' el 
                    <strong>${fechaEntrega}</strong> 
                    y está archivado.
                </p>
                <button id="ver-conduce-btn-${panelId}" class="button" style="background-color: #007bff;">
                    📄 Ver Hoja de Conduce
                </button>
            </div>
        </div>
    `;
    container.appendChild(div);

    // Lógica del botón
    document.getElementById(`ver-conduce-btn-${panelId}`).addEventListener('click', () => {
        // Usamos 'proyecto.id'
        window.open(`hoja_de_conduce.html?id=${proyecto.id}`, '_blank');
    });
}
