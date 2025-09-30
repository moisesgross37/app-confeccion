document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#proyectos-table-body');
    // ===== NUEVO: Apuntamos a los filtros =====
    const filtroAsesor = document.getElementById('filtro-asesor');
    const filtroDisenador = document.getElementById('filtro-disenador');
    
    let currentUser = null;
    let todosLosProyectos = []; // Variable para guardar todos los proyectos

    // --- Función para poblar los menús de filtro ---
    const populateFilters = (proyectos) => {
        // Sacamos listas de nombres únicos
        const asesores = [...new Set(proyectos.map(p => p.nombre_asesor).filter(Boolean))];
        const disenadores = [...new Set(proyectos.map(p => p.nombre_disenador).filter(Boolean))];

        // Limpiamos filtros antiguos antes de añadir nuevos
        filtroAsesor.innerHTML = '<option value="todos">-- Todos los Asesores --</option>';
        filtroDisenador.innerHTML = '<option value="todos">-- Todos los Diseñadores --</option>';

        // Añadimos cada nombre a su respectivo menú <select>
        asesores.sort().forEach(nombre => {
            const option = new Option(nombre, nombre);
            filtroAsesor.add(option);
        });
        
        disenadores.sort().forEach(nombre => {
            const option = new Option(nombre, nombre);
            filtroDisenador.add(option);
        });
    };

    // --- Función para aplicar los filtros seleccionados a la tabla ---
    const applyFilters = () => {
        const asesorSeleccionado = filtroAsesor.value;
        const disenadorSeleccionado = filtroDisenador.value;

        const proyectosFiltrados = todosLosProyectos.filter(proyecto => {
            const matchAsesor = (asesorSeleccionado === 'todos') || (proyecto.nombre_asesor === asesorSeleccionado);
            const matchDisenador = (disenadorSeleccionado === 'todos') || (proyecto.nombre_disenador === disenadorSeleccionado);
            return matchAsesor && matchDisenador;
        });

        renderTable(proyectosFiltrados);
    };

    // --- Función para dibujar la tabla (la separamos para poder reutilizarla) ---
    const renderTable = (proyectos) => {
        tableBody.innerHTML = ''; // Limpiar la tabla

        if (!proyectos || proyectos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No hay proyectos que coincidan con los filtros.</td></tr>';
            return;
        }

        proyectos.forEach(proyecto => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${proyecto.codigo_proyecto || proyecto.id}</td>
                <td>${proyecto.cliente}</td>
                <td>${proyecto.nombre_asesor}</td>
                <td>${proyecto.nombre_disenador || 'No asignado'}</td>
                <td><mark>${proyecto.status}</mark></td>
            `;

            const accionesCell = document.createElement('td');
            const verButton = document.createElement('a');
            verButton.href = `detalle_proyecto.html?id=${proyecto.id}`;
            verButton.textContent = 'Ver / Gestionar';
            verButton.className = 'button';
            accionesCell.appendChild(verButton);

            if (currentUser && currentUser.rol === 'Administrador') {
                const eliminarButton = document.createElement('button');
                // ... (el código del botón eliminar sigue igual que antes) ...
                eliminarButton.textContent = 'Eliminar';
                eliminarButton.className = 'button-danger';
                eliminarButton.style.marginLeft = '10px';
                eliminarButton.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${proyecto.codigo_proyecto}"? Esta acción no se puede deshacer.`)) return;
                    try {
                        const response = await fetch(`/api/solicitudes/${proyecto.id}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message || 'Error en el servidor.');
                        alert(result.message);
                        window.location.reload();
                    } catch (error) {
                        console.error('Error al eliminar:', error);
                        alert(`No se pudo eliminar el proyecto: ${error.message}`);
                    }
                });
                accionesCell.appendChild(eliminarButton);
            }
            
            row.appendChild(accionesCell);
            tableBody.appendChild(row);
        });
    };

    // --- Carga inicial de datos ---
    Promise.all([
        fetch('/api/proyectos').then(res => res.json()),
        fetch('/api/me').then(res => res.json())
    ])
    .then(([proyectos, user]) => {
        currentUser = user;
        todosLosProyectos = proyectos; // Guardamos la lista completa

        populateFilters(todosLosProyectos); // Creamos las opciones de los filtros
        renderTable(todosLosProyectos); // Dibujamos la tabla inicial
    })
    .catch(error => {
        console.error('Error al cargar los proyectos o el usuario:', error);
        tableBody.innerHTML = `<tr><td colspan="6">Error al cargar los proyectos. Verifique la consola.</td></tr>`;
    });

    // --- Añadimos los listeners para que los filtros funcionen ---
    filtroAsesor.addEventListener('change', applyFilters);
    filtroDisenador.addEventListener('change', applyFilters);
});
