document.addEventListener('DOMContentLoaded', () => {
    // Apuntamos específicamente al tbody usando su nuevo ID
    const tableBody = document.querySelector('#proyectos-table-body');
    let currentUser = null; // Variable para guardar los datos del usuario en sesión

    // Hacemos dos peticiones en paralelo: una para los proyectos y otra para el usuario
    Promise.all([
        fetch('/api/proyectos').then(res => res.json()),
        fetch('/api/me').then(res => res.json())
    ])
    .then(([proyectos, user]) => {
        currentUser = user; // Guardamos la información del usuario
        tableBody.innerHTML = ''; // Limpiar la tabla antes de añadir nuevas filas

        if (!proyectos || proyectos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No hay proyectos de confección registrados.</td></tr>'; // Se aumenta a 5 columnas
            return;
        }

        // Ya no es necesario el .reverse() porque el servidor los envía en el orden correcto
        proyectos.forEach(proyecto => {
            const row = document.createElement('tr');

            // Creamos las celdas de datos
            row.innerHTML = `
                <td>${proyecto.codigo_proyecto || proyecto.id}</td>
                <td>${proyecto.cliente}</td>
                <td>${proyecto.nombre_asesor}</td>
                <td><mark>${proyecto.status}</mark></td>
            `;

            // ===== INICIO: CÓDIGO AÑADIDO PARA ACCIONES =====
            
            // Creamos la celda para los botones
            const accionesCell = document.createElement('td');

            // 1. Botón de Ver Detalles (para todos los usuarios)
            const verButton = document.createElement('a');
            verButton.href = `detalle_proyecto.html?id=${proyecto.id}`;
            verButton.textContent = 'Ver / Gestionar';
            verButton.className = 'button'; // Asume una clase CSS para botones
            accionesCell.appendChild(verButton);

            // 2. Botón de Eliminar (SOLO para Administradores)
            if (currentUser && currentUser.rol === 'Administrador') {
                const eliminarButton = document.createElement('button');
                eliminarButton.textContent = 'Eliminar';
                eliminarButton.className = 'button-danger'; // Asume una clase para botones de peligro
                eliminarButton.style.marginLeft = '10px';

                eliminarButton.addEventListener('click', async (event) => {
                    event.stopPropagation(); // Evita que el clic active la navegación de la fila

                    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${proyecto.codigo_proyecto}"? Esta acción no se puede deshacer.`)) {
                        return;
                    }

                    try {
                        const response = await fetch(`/api/solicitudes/${proyecto.id}`, {
                            method: 'DELETE'
                        });

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(result.message || 'Error en el servidor.');
                        }

                        alert(result.message);
                        window.location.reload(); // Recargar la página para ver la tabla actualizada

                    } catch (error) {
                        console.error('Error al eliminar:', error);
                        alert(`No se pudo eliminar el proyecto: ${error.message}`);
                    }
                });
                
                accionesCell.appendChild(eliminarButton);
            }
            
            // Añadimos la celda de acciones a la fila
            row.appendChild(accionesCell);

            // ===== FIN: CÓDIGO AÑADIDO PARA ACCIONES =====

            tableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error al cargar los proyectos o el usuario:', error);
        tableBody.innerHTML = `<tr><td colspan="5">Error al cargar los proyectos. Verifique la consola.</td></tr>`; // Se aumenta a 5 columnas
    });
});
