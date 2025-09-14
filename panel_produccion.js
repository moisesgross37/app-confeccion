document.addEventListener('DOMContentLoaded', () => {
    const projectList = document.getElementById('project-list');

    const loadProjects = async () => {
        try {
            const response = await fetch('/api/proyectos/en-produccion');
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
            projectList.innerHTML = '<li>No hay proyectos en producción.</li>';
            return;
        }

        projects.forEach(project => {
            const listItem = document.createElement('li');
            let buttonHtml = '';

            switch (project.status) {
                case 'En Lista de Producción':
                    buttonHtml = `<button class="btn-action" data-project-id="${project.id}" data-action="diagramacion-completada">Diagramación Completada</button>`;
                    break;
                case 'En Impresión':
                    buttonHtml = `<button class="btn-action" data-project-id="${project.id}" data-action="impresion-completada">Impresión Completada</button>`;
                    break;
                case 'En Calandrado':
                    buttonHtml = `<button class="btn-action" data-project-id="${project.id}" data-action="calandrado-completado">Calandrado Completado</button>`;
                    break;
                case 'Enviado a Fábrica':
                    buttonHtml = `<button class="btn-action" data-project-id="${project.id}" data-action="recibido-fabrica">Recibido de Fábrica</button>`;
                    break;
                default:
                    buttonHtml = '';
            }

            listItem.innerHTML = `
                <span>Código: ${project.codigo_proyecto}</span>
                <span>Cliente: ${project.cliente}</span>
                <span>Estado: ${project.status}</span>
                ${buttonHtml}
            `;
            projectList.appendChild(listItem);
        });
    };

    const updateProjectStatus = async (projectId, action) => {
        try {
            const response = await fetch(`/api/proyectos/${projectId}/${action}`, {
                method: 'PUT'
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el estado del proyecto');
            }

            loadProjects();

        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar el estado del proyecto');
        }
    };

    projectList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-action')) {
            const projectId = e.target.dataset.projectId;
            const action = e.target.dataset.action;
            updateProjectStatus(projectId, action);
        }
    });

    loadProjects();
});