document.addEventListener('DOMContentLoaded', () => {
    // Apuntamos específicamente al tbody usando su nuevo ID
    const tableBody = document.querySelector('#proyectos-table-body');

    fetch('/api/proyectos')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al conectar con la API para obtener proyectos.');
            }
            return response.json();
        })
        .then(proyectos => {
            tableBody.innerHTML = ''; // Limpiar la tabla antes de añadir nuevas filas

            if (!proyectos || proyectos.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4">No hay proyectos de confección registrados.</td></tr>';
                return;
            }

            // Mostramos los proyectos del más nuevo al más viejo
            proyectos.reverse().forEach(proyecto => {
                const row = document.createElement('tr');
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    window.location.href = `detalle_proyecto.html?id=${proyecto.id}`;
                });

                row.innerHTML = `
                    <td>${proyecto.codigo_proyecto || proyecto.id}</td>
                    <td>${proyecto.cliente}</td>
                    <td>${proyecto.nombre_asesor}</td>
                    <td>${proyecto.status}</td>
                `;

                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error al cargar los proyectos:', error);
            tableBody.innerHTML = `<tr><td colspan="4">Error al cargar los proyectos. Verifique la consola.</td></tr>`;
        });
});