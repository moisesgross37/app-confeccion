document.addEventListener('DOMContentLoaded', () => {
    const projectList = document.getElementById('project-list');

    const loadProjects = async () => {
        try {
            const response = await fetch('/api/proyectos/pendientes-aprobacion-interna');
            if (!response.ok) {
                throw new Error('Error al cargar los proyectos');
            }
            const projects = await response.json();
            renderProjects(projects);
        } catch (error) {
            console.error('Error:', error);
            projectList.innerHTML = '<li>Error al cargar los datos.</li>';
        }
    };

    const renderProjects = (projects) => {
        projectList.innerHTML = '';
        if (projects.length === 0) {
            projectList.innerHTML = '<li>No hay proyectos pendientes de aprobación interna.</li>';
            return;
        }

        projects.forEach(project => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div>
                    <span>Código: ${project.codigo_proyecto}</span>
                    <span>Cliente: ${project.cliente}</span>
                </div>
                <img src="/${project.propuesta_diseno}" alt="Propuesta de diseño" width="200">
                <button class="btn-approve" data-project-id="${project.id}">Aprobar Internamente</button>
            `;
            projectList.appendChild(listItem);
        });
    };

    const approveInternal = async (projectId) => {
        try {
            const response = await fetch(`/api/proyectos/${projectId}/aprobar-internamente`, {
                method: 'PUT'
            });

            if (!response.ok) {
                throw new Error('Error al aprobar el proyecto');
            }

            loadProjects();

        } catch (error) {
            console.error('Error:', error);
            alert('Error al aprobar el proyecto');
        }
    };

    projectList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-approve')) {
            const projectId = e.target.dataset.projectId;
            approveInternal(projectId);
        }
    });

    loadProjects();
});