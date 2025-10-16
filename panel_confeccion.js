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

        renderTable(proyectosFiltrados);
    };

   // REEMPLAZA TU FUNCIÓN renderTable COMPLETA CON ESTA
const renderTable = (proyectos, user) => {
    tableBody.innerHTML = '';

    if (!proyectos || proyectos.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No hay proyectos que coincidan con los filtros.</td></tr>';
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

        row.innerHTML = `
            <td>${proyecto.id}</td>
            <td>${proyecto.cliente}</td>
            <td>${proyecto.nombre_asesor}</td>
            <td>${proyecto.nombre_disenador || 'No asignado'}</td>
            <td><mark>${proyecto.status}</mark></td>
            <td>
                <a href="detalle_proyecto.html?id=${proyecto.id}" class="button">Ver / Gestionar</a>
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

    populateFilters(todosLosProyectos);
    // Llamamos a la función de renderizado pasándole los proyectos y el usuario
    renderTable(todosLosProyectos, user); 
})
.catch(error => {
    console.error('Error al cargar los proyectos o el usuario:', error);
    tableBody.innerHTML = `<tr><td colspan="6">Error al cargar los proyectos. Verifique la consola.</td></tr>`;
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
