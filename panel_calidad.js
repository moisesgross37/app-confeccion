document.addEventListener('DOMContentLoaded', () => {
    const projectList = document.getElementById('project-list');

    const loadProjects = async () => {
        try {
            const response = await fetch('/api/proyectos/en-control-calidad');
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
            projectList.innerHTML = '<li>No hay proyectos en control de calidad.</li>';
            return;
        }

        projects.forEach(project => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>Código: ${project.codigo_proyecto}</span>
                <span>Cliente: ${project.cliente}</span>
                <span>Estado: ${project.status}</span>
                <button class="btn-ready-for-delivery" data-project-id="${project.id}">Pedido Listo para Entrega</button>
            `;
            projectList.appendChild(listItem);
        });
    };

    const markReadyForDelivery = async (projectId) => {
        try {
            const response = await fetch(`/api/proyectos/${projectId}/listo-para-entrega`, {
                method: 'PUT'
            });

            if (!response.ok) {
                throw new Error('Error al marcar como listo para entrega');
            }

            loadProjects();

        } catch (error) {
            console.error('Error:', error);
            alert('Error al marcar como listo para entrega');
        }
    };

    projectList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-ready-for-delivery')) {
            const projectId = e.target.dataset.projectId;
            markReadyForDelivery(projectId);
        }
    });

    loadProjects();
});