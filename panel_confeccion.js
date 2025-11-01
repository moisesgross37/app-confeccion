document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#proyectos-table-body');
    const filtroAsesor = document.getElementById('filtro-asesor');
    const filtroDisenador = document.getElementById('filtro-disenador');
    const filtroEstatus = document.getElementById('filtro-estatus');
    
    // --- ¡NUEVO ELEMENTO! ---
    const filtroCompletados = document.getElementById('filtro-completados');
    
    let currentUser = null;
    let todosLosProyectos = []; // Esta variable guardará los proyectos cargados

    const populateFilters = (proyectos) => {
        const asesores = [...new Set(proyectos.map(p => p.nombre_asesor).filter(Boolean))];
        const disenadores = [...new Set(proyectos.map(p => p.nombre_disenador).filter(Boolean))];
        const estatus = [...new Set(proyectos.map(p => p.status).filter(Boolean))];

        filtroAsesor.innerHTML = '<option value="todos">-- Todos los Asesores --</option>';
        filtroDisenador.innerHTML = '<option value="todos">-- Todos los Diseñadores --</option>';
        filtroEstatus.innerHTML = '<option value="todos">-- Todos los Estatus --</option>';

        asesores.sort().forEach(nombre => filtroAsesor.add(new Option(nombre, nombre)));
        disenadores.sort().forEach(nombre => filtroDisenador.add(new Option(nombre, nombre)));
        estatus.sort().forEach(nombre => filtroEstatus.add(new Option(nombre, nombre)));
    };

    // --- ¡FUNCIÓN MODIFICADA! ---
    // Ahora 'applyFilters' solo filtra la lista que YA TENEMOS cargada
    const applyFilters = () => {
        const asesorSeleccionado = filtroAsesor.value;
        const disenadorSeleccionado = filtroDisenador.value;
        const estatusSeleccionado = filtroEstatus.value;

        const proyectosFiltrados = todosLosProyectos.filter(proyecto => {
            const matchAsesor = (asesorSeleccionado === 'todos') || (proyecto.nombre_asesor === asesorSeleccionado);
            const matchDisenador = (disenadorSeleccionado === 'todos') || (proyecto.nombre_disenador === disenadorSeleccionado);
            const matchEstatus = (estatusSeleccionado === 'todos') || (proyecto.status === estatusSeleccionado);
            return matchAsesor && matchDisenador && matchEstatus;
        });

        renderTable(proyectosFiltrados, currentUser); // Pasamos currentUser a renderTable
    };

    // --- ¡NUEVA FUNCIÓN DE CARGA! ---
    // Esta función es la que habla con el servidor
    const fetchProyectos = () => {
        // 1. Revisa si el checkbox "Completados" está marcado
        const verCompletados = filtroCompletados.checked;
        
        // 2. Construye la URL de la API
        let apiUrl = '/api/proyectos';
        if (verCompletados) {
            apiUrl += '?filtro=completados'; // Llama a la API para ver los archivados
        }
        
        // 3. Muestra "Cargando..." en la tabla
        tableBody.innerHTML = '<tr><td colspan="7">Cargando proyectos...</td></tr>';

        // 4. Llama a la API y luego actualiza todo
        Promise.all([
            fetch(apiUrl, { cache: 'no-store' }).then(res => res.json()),
            fetch('/api/me').then(res => res.json())
        ])
        .then(([proyectos, user]) => {
            todosLosProyectos = proyectos; // Guardamos los proyectos globalmente
            currentUser = user; // Guardamos el usuario globalmente

            populateFilters(todosLosProyectos);
            renderTable(todosLosProyectos, currentUser); 
        })
        .catch(error => {
            console.error('Error al cargar los proyectos o el usuario:', error);
            tableBody.innerHTML = `<tr><td colspan="7">Error al cargar los proyectos. Verifique la consola.</td></tr>`;
        });
    };

    // La función de renderizado no cambia, solo la copiamos
    const renderTable = (proyectos, user) => {
        tableBody.innerHTML = '';

        if (!proyectos || proyectos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7">No hay proyectos que coincidan con los filtros.</td></tr>';
            return;
        }

        proyectos.forEach(proyecto => {
            const row = document.createElement('tr');
            let eliminarButtonHtml = '';
            if (user && user.rol === 'Administrador') {
                eliminarButtonHtml = `
                    <button class="button-danger" 
                            data-project-id="${proyecto.id}" 
                            data-project-code="${proyecto.codigo_proyecto || proyecto.id}">
                        Eliminar
                    </button>
                `;
            }

            const createdAt = new Date(proyecto.created_at);
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0); 
            let antiguedadHtml = '';

            if (!proyecto.created_at || isNaN(createdAt.getTime())) {
                antiguedadHtml = '<td>--</td>'; 
            } else {
                const startOfCreateDay = new Date(createdAt);
                startOfCreateDay.setHours(0, 0, 0, 0); 
                const diffTime = startOfToday.getTime() - startOfCreateDay.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                let daysText = `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
                let daysClass = '';

                if (diffDays < 0) { 
                     daysText = "Fecha Futura";
                     daysClass = 'bg-secondary text-white'; 
                } else if (diffDays === 0) { 
                     daysText = "Hoy";
                     daysClass = 'bg-info text-dark'; 
                } else if (diffDays >= 1 && diffDays <= 10) {
                    daysClass = 'bg-info text-dark'; 
                } else if (diffDays >= 11 && diffDays <= 17) {
                    daysClass = 'bg-warning text-dark'; 
                } else { 
                    daysClass = 'bg-danger text-white'; 
                }
                
                antiguedadHtml = `<td class="${daysClass}">${daysText}</td>`;
            }
            
            row.innerHTML = `
                <td>${proyecto.id}</td>
                <td>${proyecto.cliente}</td>
                <td>${proyecto.nombre_asesor}</td>
                <td>${proyecto.nombre_disenador || 'No asignado'}</td>
                <td><mark>${proyecto.status}</mark></td>
                ${antiguedadHtml} 
                <td>
                    <a href="detalle_proyecto.html?id=${proyecto.id}" class="button">Ver</a>
                    ${eliminarButtonHtml}
                </td>
            `;
            tableBody.appendChild(row);
        });
    };

    // Lógica del botón Eliminar (sin cambios)
    tableBody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('button-danger')) {
            const button = event.target;
            const projectId = button.dataset.projectId;
            const projectCode = button.dataset.projectCode;
            if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${projectCode}"? Esta acción no se puede deshacer.`)) {
                return;
            }
            try {
                const response = await fetch(`/api/proyectos/${projectId}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Error desconocido del servidor.' }));
                    throw new Error(errorData.message);
                }
                const result = await response.json();
                alert(result.message);
                fetchProyectos(); // Recargamos la lista en lugar de toda la página
            } catch (error) {
                console.error('Error al eliminar:', error);
                alert(`No se pudo eliminar el proyecto: ${error.message}`);
            }
        }
    });

    // --- EVENT LISTENERS (MODIFICADOS) ---
    // Los filtros normales (asesor, diseñador, estatus) solo aplican filtros
    filtroAsesor.addEventListener('change', applyFilters);
    filtroDisenador.addEventListener('change', applyFilters);
    filtroEstatus.addEventListener('change', applyFilters);
    
    // El NUEVO checkbox "Completados" es el único que vuelve a llamar al servidor
    filtroCompletados.addEventListener('change', fetchProyectos);

    // --- CARGA INICIAL ---
    fetchProyectos(); // Carga la lista de proyectos (activos por defecto) al iniciar
});
