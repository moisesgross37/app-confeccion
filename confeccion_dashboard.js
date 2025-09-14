document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard script loaded. Initializing...');
    const projectListContainer = document.getElementById('project-list-container');

    if (!projectListContainer) {
        console.error('Fatal Error: Project list container not found.');
        return;
    }

    const fetchAndRenderProjects = async () => {
        try {
            // FIX: Corrected API endpoint from /api/proyectos_confeccion to /api/proyectos
            const response = await fetch('/api/proyectos');
            if (!response.ok) {
                throw new Error(`Error al cargar los proyectos: ${response.statusText}`);
            }
            const projects = await response.json();
            renderProjects(projects, projectListContainer);
        } catch (error) {
            console.error(error);
            projectListContainer.innerHTML = '<p class="error-message">No se pudieron cargar los proyectos. Intente recargar la página.</p>';
        }
    };

    const renderProjects = (projects, container) => {
        container.innerHTML = ''; // Clear previous content

        if (projects.length === 0) {
            container.innerHTML = '<p>No hay proyectos para mostrar.</p>';
            return;
        }
        
        // Sort projects by most recently created
        projects.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

        projects.forEach(project => {
            const projectCard = createProjectCard(project);
            container.appendChild(projectCard);
        });
    };

    const createProjectCard = (project) => {
        const cardLink = document.createElement('a');
        cardLink.className = 'project-card-link';
        cardLink.href = `detalle_proyecto.html?id=${project.id}`;

        const today = new Date();
        const creationDate = new Date(project.fecha_creacion);
        const totalDays = Math.ceil((today - creationDate) / (1000 * 60 * 60 * 24));

        cardLink.innerHTML = `
            <div class="project-card-header">
                <h3>${project.codigo_proyecto || 'Proyecto sin código'}</h3>
                <span class="project-status">${project.status}</span>
            </div>
            <div class="project-card-body">
                <p><strong>Cliente:</strong> ${project.cliente || 'No especificado'}</p>
                <p><strong>Asesor:</strong> ${project.nombre_asesor || 'No especificado'}</p>
            </div>
            <div class="project-card-footer">
                <p>Creado hace ${totalDays} día(s)</p>
            </div>
        `;
        return cardLink;
    };

    // Initial Load
    fetchAndRenderProjects();
});