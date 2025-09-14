document.addEventListener('DOMContentLoaded', () => {
    const projectDetailsContainer = document.getElementById('project-details-container');
    const designerSection = document.getElementById('designer-section');
    const internalApprovalSection = document.getElementById('internal-approval-section');
    const clientApprovalSection = document.getElementById('client-approval-section');
    const proFormaSection = document.getElementById('pro-forma-section');
    const productionListSection = document.getElementById('production-list-section');
    const startProductionSection = document.getElementById('start-production-section');
    const diagramacionSection = document.getElementById('diagramacion-section');
    const impresionSection = document.getElementById('impresion-section');
    const calandradoSection = document.getElementById('calandrado-section');
    const envioConfeccionSection = document.getElementById('envio-confeccion-section');
    const recepcionConfeccionSection = document.getElementById('recepcion-confeccion-section');
    const controlCalidadSection = document.getElementById('control-calidad-section');

    const projectId = new URLSearchParams(window.location.search).get('id');

    if (!projectId) {
        projectDetailsContainer.innerHTML = '<h1>Error: No se especificó un ID de proyecto.</h1>';
        return;
    }

    const fetchProjectDetails = async () => {
        try {
            const response = await fetch(`/api/proyectos_confeccion/${projectId}`);
            if (!response.ok) throw new Error('Proyecto no encontrado.');
            const project = await response.json();
            renderPage(project);
        } catch (error) {
            console.error('Error al cargar los detalles del proyecto:', error);
            projectDetailsContainer.innerHTML = `<h1>Error: ${error.message}</h1>`;
        }
    };

    const renderPage = (project) => {
        renderProjectDetails(project);
        document.querySelectorAll('.action-section').forEach(s => s.style.display = 'none');

        if (project.status === 'Diseño en Proceso') {
            designerSection.style.display = 'block';
        } else if (project.status === 'Pendiente Aprobación Interna') {
            internalApprovalSection.style.display = 'block';
        } else if (project.status === 'Pendiente Aprobación Cliente') {
            clientApprovalSection.style.display = 'block';
            if (project.contador_revisiones_cliente >= 3) {
                document.getElementById('client-reject-btn').disabled = true;
            }
        } else if (project.status === 'Pendiente de Pro Forma') {
            proFormaSection.style.display = 'block';
        } else if (project.status === 'Pendiente de Listado') {
            productionListSection.style.display = 'block';
        } else if (project.status === 'En Lista de Producción') {
            diagramacionSection.style.display = 'block';
        } else if (project.status === 'Pendiente de Impresión') {
            impresionSection.style.display = 'block';
        } else if (project.status === 'Pendiente de Calandrado') {
            calandradoSection.style.display = 'block';
        } else if (project.status === 'Pendiente de Confección') {
            envioConfeccionSection.style.display = 'block';
        } else if (project.status === 'En Confección') {
            recepcionConfeccionSection.style.display = 'block';
        } else if (project.status === 'En Control de Calidad') {
            controlCalidadSection.style.display = 'block';
        }
        
        // Mostrar el botón de iniciar producción si el listado ya fue cargado
        if(project.archivo_listado_produccion && project.status === 'Pendiente de Listado') {
            productionListSection.style.display = 'none';
            startProductionSection.style.display = 'block';
        }
    };

    const renderProjectDetails = (project) => {
        projectDetailsContainer.innerHTML = `
            <h2>${project.nombre_proyecto}</h2>
            <p><strong>Cliente:</strong> ${project.cliente}</p>
            <p><strong>Status:</strong> ${project.status}</p>
            <p><strong>Revisiones del Cliente:</strong> ${project.contador_revisiones_cliente}</p>
            <p><strong>Fecha de Creación:</strong> ${new Date(project.fecha_creacion).toLocaleString()}</p>
            <hr>
            <h3>Descripción de la Idea del Cliente</h3>
            <p>${project.descripcion_idea_cliente}</p>
            <hr>
            <h3>Archivos de Propuesta de Diseño</h3>
            <p>${project.archivos_propuesta_diseño && project.archivos_propuesta_diseño.length > 0 ? project.archivos_propuesta_diseño.join(', ') : 'Aún no hay propuestas.'}</p>
        `;
    };

    // --- Internal Approval Actions ---
    const internalApproveBtn = document.getElementById('internal-approve-btn');
    const internalRejectBtn = document.getElementById('internal-reject-btn');
    const internalCorrectionNotes = document.getElementById('internal-correction-notes');
    const submitInternalCorrectionBtn = document.getElementById('submit-internal-correction-btn');

    internalApproveBtn.addEventListener('click', () => handleInternalApproval(true));
    internalRejectBtn.addEventListener('click', () => {
        internalCorrectionNotes.style.display = 'block';
        submitInternalCorrectionBtn.style.display = 'block';
    });
    submitInternalCorrectionBtn.addEventListener('click', () => handleInternalApproval(false));

    async function handleInternalApproval(isApproved) {
        const data = { approved: isApproved };
        if (!isApproved) {
            data.notes = internalCorrectionNotes.value;
        }
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/internal-approval`, data, 'Aprobación interna procesada con éxito.');
    }

    // --- Client Approval Actions ---
    const clientApproveBtn = document.getElementById('client-approve-btn');
    const clientRejectBtn = document.getElementById('client-reject-btn');
    const clientCorrectionNotes = document.getElementById('client-correction-notes');
    const submitClientCorrectionBtn = document.getElementById('submit-client-correction-btn');

    clientApproveBtn.addEventListener('click', () => handleClientApproval(true));
    clientRejectBtn.addEventListener('click', () => {
        clientCorrectionNotes.style.display = 'block';
        submitClientCorrectionBtn.style.display = 'block';
    });
    submitClientCorrectionBtn.addEventListener('click', () => handleClientApproval(false));

    async function handleClientApproval(isApproved) {
        const data = { approved: isApproved };
        if (!isApproved) {
            data.notes = clientCorrectionNotes.value;
        }
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/client-approval`, data, 'Aprobación del cliente procesada con éxito.');
    }

    // --- Pro Forma and Production Actions ---
    const generateProFormaBtn = document.getElementById('generate-pro-forma-btn');
    const productionListForm = document.getElementById('production-list-form');
    const startProductionBtn = document.getElementById('start-production-btn');

    generateProFormaBtn.addEventListener('click', () => {
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/generate-proforma`, {}, 'Pro Forma generada (simulado), proyecto movido a Pendiente de Listado.');
    });

    productionListForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(productionListForm);
        // Lógica de subida de archivo... (simulada en el backend por ahora)
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/upload-production-list`, formData, 'Listado de producción subido con éxito.', true);
    });

    startProductionBtn.addEventListener('click', () => {
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/start-production`, {}, '¡Producción iniciada!');
    });

    // --- Production Steps Actions ---
    document.getElementById('mark-diagramado-btn').addEventListener('click', () => {
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/mark-diagramado`, {}, 'Proyecto marcado como Diagramado.');
    });

    document.getElementById('mark-impreso-btn').addEventListener('click', () => {
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/mark-impreso`, {}, 'Proyecto marcado como Impreso.');
    });

    document.getElementById('mark-calandrado-btn').addEventListener('click', () => {
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/mark-calandrado`, {}, 'Proyecto marcado como Calandrado.');
    });

    document.getElementById('envio-confeccion-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const taller = document.getElementById('taller-input').value;
        const fecha = document.getElementById('fecha-entrega-input').value;
        const data = { taller_confeccion_asignado: taller, fecha_envio_confeccion: fecha };
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/send-to-sewing`, data, 'Proyecto enviado a confección.');
    });

    // --- Quality Control and Closure Actions ---
    document.getElementById('mark-received-from-sewing-btn').addEventListener('click', () => {
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/mark-received-from-sewing`, {}, 'Proyecto recibido de confección.');
    });

    document.getElementById('mark-ready-for-delivery-btn').addEventListener('click', () => {
        updateProjectStatus(`/api/proyectos-confeccion/${projectId}/mark-ready-for-delivery`, {}, 'Proyecto listo para entrega.');
    });

    async function updateProjectStatus(url, data, successMessage, isFormData = false) {
        try {
            const options = {
                method: 'PUT',
            };
            if (isFormData) {
                options.body = data;
                options.method = 'POST'; // FormData usualmente usa POST
            } else {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }
            alert(successMessage);
            window.location.reload();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    fetchProjectDetails();
});