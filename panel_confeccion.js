document.addEventListener('DOMContentLoaded', () => {
    // Referencias a las DOS tablas nuevas
    const tbodyInterna = document.getElementById('tabla-body-interna');
    const tbodyEspera = document.getElementById('tabla-body-espera');

    const filtroAsesor = document.getElementById('filtro-asesor');
    const filtroDisenador = document.getElementById('filtro-disenador');
    const filtroEstatus = document.getElementById('filtro-estatus');
    const filtroCompletados = document.getElementById('filtro-completados');
    
    let currentUser = null;
    let todosLosProyectos = [];

    // --- LISTA DE ESTATUS "EN ESPERA" (Cancha del Cliente) ---
    const estatusCliente = [
        'Pendiente Aprobación Cliente',
        'Pendiente Aprob. Proforma Cliente'
    ];

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

        renderTables(proyectosFiltrados, currentUser);
    };

    const fetchProyectos = () => {
        const verCompletados = filtroCompletados.checked;
        let apiUrl = '/api/proyectos';
        if (verCompletados) apiUrl += '?filtro=completados';
        
        // Ponemos mensaje de carga en ambas tablas
        tbodyInterna.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando...</td></tr>';
        tbodyEspera.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando...</td></tr>';

        Promise.all([
            fetch(apiUrl, { cache: 'no-store' }).then(res => res.json()),
            fetch('/api/me').then(res => res.json())
        ])
        .then(([proyectos, user]) => {
            todosLosProyectos = proyectos;
            currentUser = user;
            populateFilters(todosLosProyectos);
            renderTables(todosLosProyectos, currentUser); 
        })
        .catch(error => {
            console.error('Error:', error);
            tbodyInterna.innerHTML = '<tr><td colspan="7">Error de conexión.</td></tr>';
        });
    };

    // --- FUNCIÓN MAESTRA DE RENDERIZADO (DIVIDE EN DOS TABLAS) ---
    const renderTables = (proyectos, user) => {
        tbodyInterna.innerHTML = '';
        tbodyEspera.innerHTML = '';

        if (!proyectos || proyectos.length === 0) {
            tbodyInterna.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay proyectos.</td></tr>';
            return;
        }

        // Ordenamos por urgencia (los que llevan más días en su etapa actual van primero)
        proyectos.sort((a, b) => {
            const fechaA = a.fecha_ultimo_cambio_etapa ? new Date(a.fecha_ultimo_cambio_etapa) : new Date(a.fecha_creacion);
            const fechaB = b.fecha_ultimo_cambio_etapa ? new Date(b.fecha_ultimo_cambio_etapa) : new Date(b.fecha_creacion);
            return fechaA - fechaB; // Los más viejos primero (más urgentes)
        });

        proyectos.forEach(proyecto => {
            // 1. Determinar en qué tabla va
            const esEsperaCliente = estatusCliente.includes(proyecto.status) || proyecto.status === 'Completado';
            const targetTable = esEsperaCliente ? tbodyEspera : tbodyInterna;

            // 2. Calcular Tiempos
            const hoy = new Date();
            hoy.setHours(0,0,0,0);

            // A) Tiempo en Etapa Actual (El dato grande)
            // Si no existe la fecha de cambio (proyectos viejos), usamos la de creación como fallback
            const fechaEtapa = proyecto.fecha_ultimo_cambio_etapa ? new Date(proyecto.fecha_ultimo_cambio_etapa) : new Date(proyecto.created_at);
            fechaEtapa.setHours(0,0,0,0);
            const diffEtapa = Math.floor((hoy - fechaEtapa) / (1000 * 60 * 60 * 24));

            // B) Tiempo Total (El dato pequeño)
            const fechaCreacion = new Date(proyecto.created_at);
            fechaCreacion.setHours(0,0,0,0);
            const diffTotal = Math.floor((hoy - fechaCreacion) / (1000 * 60 * 60 * 24));

            // 3. Determinar Colores (Semáforo)
            let badgeClass = 'bg-secondary'; // Gris por defecto
            let daysText = `${diffEtapa} días`;

            if (!esEsperaCliente && proyecto.status !== 'Completado') {
                // Lógica de Semáforo solo para "Tu Cancha"
                if (diffEtapa <= 3) badgeClass = 'bg-success';       // Verde (0-3 días)
                else if (diffEtapa <= 7) badgeClass = 'bg-warning text-dark'; // Amarillo (4-7 días)
                else badgeClass = 'bg-danger';                       // Rojo (8+ días)
            } else {
                // Para "Esperando Cliente", siempre azul suave o gris
                badgeClass = 'bg-info text-dark';
            }

            // 4. HTML del Botón Eliminar (Solo Admin)
            let eliminarButtonHtml = '';
            if (user && user.rol === 'Administrador') {
                eliminarButtonHtml = `
                    <button class="button-danger" 
                            data-project-id="${proyecto.id}" 
                            data-project-code="${proyecto.codigo_proyecto || proyecto.id}"
                            style="padding: 2px 8px; font-size: 0.8em; margin-left:5px;">
                        🗑️
                    </button>
                `;
            }

            // 5. Construir la fila
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${proyecto.codigo_proyecto || proyecto.id}</strong></td>
                <td>${proyecto.cliente}</td>
                <td>${proyecto.nombre_asesor}</td>
                <td>${proyecto.nombre_disenador || '<span style="color:#999;">--</span>'}</td>
                <td>${proyecto.status}</td>
                
                <td style="text-align: center;">
                    <span class="badge ${badgeClass}" style="font-size: 1em; padding: 5px 10px; border-radius: 12px;">
                        ${daysText}
                    </span>
                    <br>
                    <small style="color: #666; font-size: 0.75em;">
                        Total: ${diffTotal} días
                    </small>
                </td>

                <td style="white-space: nowrap;">
                    <a href="detalle_proyecto.html?id=${proyecto.id}" class="button" style="padding: 4px 10px;">Ver</a>
                    ${eliminarButtonHtml}
                </td>
            `;
            targetTable.appendChild(row);
        });
    };

    // --- MANEJO DE ELIMINACIÓN (Para ambas tablas) ---
    const handleDelete = async (event) => {
        if (event.target.closest('.button-danger')) {
            const button = event.target.closest('.button-danger');
            const projectId = button.dataset.projectId;
            if (!confirm(`¿Estás seguro de eliminar este proyecto?`)) return;
            
            try {
                const response = await fetch(`/api/proyectos/${projectId}`, { method: 'DELETE' });
                if (response.ok) {
                    alert('Proyecto eliminado.');
                    fetchProyectos();
                } else {
                    throw new Error('Error al eliminar.');
                }
            } catch (error) {
                alert(error.message);
            }
        }
    };

    // Escuchamos clics en ambas tablas
    tbodyInterna.addEventListener('click', handleDelete);
    tbodyEspera.addEventListener('click', handleDelete);

    // Filtros
    filtroAsesor.addEventListener('change', applyFilters);
    filtroDisenador.addEventListener('change', applyFilters);
    filtroEstatus.addEventListener('change', applyFilters);
    filtroCompletados.addEventListener('change', fetchProyectos);

    fetchProyectos();
});