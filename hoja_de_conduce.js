document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener el ID del proyecto desde la URL
    const projectId = new URLSearchParams(window.location.search).get('id');
    if (!projectId) {
        document.body.innerHTML = '<h1>Error: No se ha especificado un ID de proyecto.</h1>';
        return;
    }

    // 2. Buscar el proyecto en la base de datos
    fetch(`/api/proyectos/${projectId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo encontrar el proyecto.');
            }
            return response.json();
        })
        .then(proyecto => {
            // 3. Rellenar los datos del proyecto
            document.getElementById('proyecto-codigo').textContent = proyecto.codigo_proyecto || 'N/A';
            document.getElementById('proyecto-centro').textContent = proyecto.cliente || 'N/A';

            // 4. Rellenar los datos del conduce (que guardamos en la Etapa 14)
            if (proyecto.conduce_data) {
                const conduce = proyecto.conduce_data;
                document.getElementById('fecha-cierre').textContent = new Date(conduce.fecha_cierre).toLocaleDateString('es-DO');
                document.getElementById('cerrado-por').textContent = conduce.cerrado_por || 'N/A';
                document.getElementById('conduce-comentarios').textContent = conduce.comentarios || 'Sin comentarios.';
                
                // 5. Rellenar la tabla de cantidades
                const tbody = document.getElementById('conduce-tbody');
                tbody.innerHTML = ''; // Limpiar
                
                if (conduce.tabla && conduce.tabla.length > 0) {
                    conduce.tabla.forEach(item => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${item.producto}</td>
                            <td>${item.cotizada}</td>
                            <td>${item.listado}</td>
                            <td>${item.entregada}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                } else {
                    tbody.innerHTML = '<tr><td colspan="4">No se registraron cantidades.</td></tr>';
                }

            } else {
                // Si por alguna razón no hay datos de conduce
                document.getElementById('conduce-comentarios').textContent = 'Error: No se encontraron datos de cierre para este proyecto.';
            }
        })
        .catch(error => {
            console.error('Error al cargar la hoja de conduce:', error);
            document.body.innerHTML = `<h1>Error al cargar los datos: ${error.message}</h1>`;
        });
});
