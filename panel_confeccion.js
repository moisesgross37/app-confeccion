document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#proyectos-table-body');
    const filtroAsesor = document.getElementById('filtro-asesor');
    const filtroDisenador = document.getElementById('filtro-disenador');
    const filtroEstatus = document.getElementById('filtro-estatus');
    
    let currentUser = null;
    let todosLosProyectos = [];

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

   // REEMPLAZA TU FUNCIÓN renderTable COMPLETA CON ESTA
   const renderTable = (proyectos, user) => {
        tableBody.innerHTML = '';

        if (!proyectos || proyectos.length === 0) {
            // === MODIFICACIÓN: Colspan ajustado a 7 por la nueva columna "Antigüedad" ===
            tableBody.innerHTML = '<tr><td colspan="7">No hay proyectos que coincidan con los filtros.</td></tr>';
            return;
        }

        proyectos.forEach(proyecto => {
            const row = document.createElement('tr');

            let eliminarButtonHtml = '';
            // La comprobación ahora es más directa porque el 'user' llega como parámetro.
            if (user && user.rol === 'Administrador') {
                eliminarButtonHtml = `
                    <button class="button-danger" 
                            data-project-id="${proyecto.id}" 
                            data-project-code="${proyecto.codigo_proyecto || proyecto.id}">
                        Eliminar
                    </button>
                `;
            }

            // ================================================================
            // === INICIO: CÓDIGO NUEVO PARA ANTIGÜEDAD ===
            // ================================================================
            
            // Usamos un método robusto para calcular días calendario
            const createdAt = new Date(proyecto.created_at);
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0); // Inicio del día de hoy

            let antiguedadHtml = '';

            // Verificamos que la fecha sea válida
            if (!proyecto.created_at || isNaN(createdAt.getTime())) {
                console.warn('Fecha "created_at" nula o inválida para proyecto ID:', proyecto.id);
                antiguedadHtml = '<td>--</td>'; // Mostrar guión si no hay fecha
            } else {
                const startOfCreateDay = new Date(createdAt);
                startOfCreateDay.setHours(0, 0, 0, 0); // Inicio del día de creación

                // Diferencia en milisegundos
                const diffTime = startOfToday.getTime() - startOfCreateDay.getTime();
                
                // Convertir a días calendario (0 = hoy, 1 = ayer, etc.)
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 

                let daysText = `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
                let daysClass = '';

                if (diffDays < 0) { // Por si la fecha está en el futuro
                     daysText = "Fecha Futura";
                     daysClass = 'bg-secondary text-white'; // Gris
                } else if (diffDays === 0) { // Creado hoy
                     daysText = "Hoy";
                     daysClass = 'bg-info text-dark'; // Azul
                } else if (diffDays >= 1 && diffDays <= 10) {
                    // daysText ya está correcto (ej: "1 día", "10 días")
                    daysClass = 'bg-info text-dark'; // Azul
                } else if (diffDays >= 11 && diffDays <= 17) {
                    daysClass = 'bg-warning text-dark'; // Naranja
                } else { // 18 o más (incluyendo los rangos de 18-28 y más)
                    daysClass = 'bg-danger text-white'; // Rojo
                }
                
                // Creamos la celda HTML completa
                antiguedadHtml = `<td class="${daysClass}">${daysText}</td>`;
            }
            // ================================================================
            // === FIN: CÓDIGO NUEVO PARA ANTIGÜEDAD ===
            // ================================================================


            // === MODIFICACIÓN: Se añade la variable ${antiguedadHtml} ===
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

    // REEMPLAZA TU BLOQUE Promise.all COMPLETO CON ESTE
    Promise.all([
        fetch('/api/proyectos', { cache: 'no-store' }).then(res => res.json()),
        fetch('/api/me').then(res => res.json())
    ])
    .then(([proyectos, user]) => {
        todosLosProyectos = proyectos; // Guardamos los proyectos globalmente
        currentUser = user; // Guardamos el usuario globalmente

        populateFilters(todosLosProyectos);
        // Llamamos a la función de renderizado pasándole los proyectos y el usuario
        renderTable(todosLosProyectos, currentUser); 
    })
    .catch(error => {
        console.error('Error al cargar los proyectos o el usuario:', error);
        // === MODIFICACIÓN: Colspan ajustado a 7 ===
        tableBody.innerHTML = `<tr><td colspan="7">Error al cargar los proyectos. Verifique la consola.</td></tr>`;
    });
    
    // --- Lógica para el botón Eliminar (usando delegación de eventos) ---
    
    // REEMPLAZA ESTE BLOQUE COMPLETO EN panel_confeccion.js
    tableBody.addEventListener('click', async (event) => {
        // Solo reacciona si se hace clic en un botón con la clase 'button-danger'
        if (event.target.classList.contains('button-danger')) {
            const button = event.target;
            const projectId = button.dataset.projectId;
            const projectCode = button.dataset.projectCode;

            if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${projectCode}"? Esta acción no se puede deshacer.`)) {
                return;
            }

            try {
                // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
                // Cambiamos la URL a la ruta correcta del servidor.
                const response = await fetch(`/api/proyectos/${projectId}`, { method: 'DELETE' });

                // El resto del código ya estaba bien, pero lo mejoramos un poco.
                if (!response.ok) {
                    // Si la respuesta no es OK, intentamos leer el mensaje de error.
                    const errorData = await response.json().catch(() => ({ message: 'Error desconocido del servidor.' }));
                    throw new Error(errorData.message);
                }
                
                const result = await response.json();
                alert(result.message);
                window.location.reload(); // Recarga la página para mostrar la tabla actualizada

            } catch (error) {
                console.error('Error al eliminar:', error);
                alert(`No se pudo eliminar el proyecto: ${error.message}`);
            }
        }
    });

    // --- Añadimos los listeners para que los filtros funcionen ---
    filtroAsesor.addEventListener('change', applyFilters);
    filtroDisenador.addEventListener('change', applyFilters);
    filtroEstatus.addEventListener('change', applyFilters);
});
