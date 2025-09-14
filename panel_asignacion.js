document.addEventListener('DOMContentLoaded', () => {
    // Primero cargamos los diseñadores para que estén disponibles en los <select>
    cargarDisenadores().then(() => {
        cargarProyectosPendientes();
    });
});

let disenadores = [];

async function cargarDisenadores() {
    try {
        const response = await fetch('/api/diseñadores');
        if (!response.ok) {
            throw new Error('No se pudieron cargar los diseñadores.');
        }
        disenadores = await response.json();
    } catch (error) {
        console.error('Error al cargar diseñadores:', error);
        // Opcional: Mostrar un error en la UI si los diseñadores no se cargan
    }
}

async function cargarProyectosPendientes() {
    try {
        const response = await fetch('/api/proyectos/pendientes-asignacion');
        if (!response.ok) {
            throw new Error('No se pudieron cargar los proyectos pendientes.');
        }
        const proyectos = await response.json();
        const tablaBody = document.getElementById('tabla-proyectos-pendientes');
        tablaBody.innerHTML = ''; // Limpiar tabla antes de llenarla

        if (proyectos.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="5">No hay proyectos pendientes de asignación.</td></tr>';
            return;
        }

        proyectos.forEach(proyecto => {
            const fechaCreacion = new Date(proyecto.fecha_creacion).toLocaleDateString();
            const disenadorSelectId = `disenador-select-${proyecto.id}`;
            const asignarBtnId = `asignar-btn-${proyecto.id}`;

            // Generar opciones del select de diseñadores
            const opcionesDisenadores = disenadores.map(d => 
                `<option value="${d.id}">${d.nombre}</option>`
            ).join('');

            const fila = `
                <tr>
                    <td><a href="/detalle_proyecto.html?id=${proyecto.id}" target="_blank">${proyecto.codigo_proyecto}</a></td>
                    <td>${proyecto.cliente}</td>
                    <td>${fechaCreacion}</td>
                    <td>
                        <select id="${disenadorSelectId}">
                            <option value="">Seleccionar...</option>
                            ${opcionesDisenadores}
                        </select>
                    </td>
                    <td>
                        <button id="${asignarBtnId}" data-project-id="${proyecto.id}">Asignar</button>
                    </td>
                </tr>
            `;
            tablaBody.innerHTML += fila;
        });

        // Añadir event listeners a los botones después de crear todas las filas
        proyectos.forEach(proyecto => {
            const asignarBtnId = `asignar-btn-${proyecto.id}`;
            const disenadorSelectId = `disenador-select-${proyecto.id}`;
            
            const boton = document.getElementById(asignarBtnId);
            if (boton) {
                boton.addEventListener('click', () => {
                    const disenadorId = document.getElementById(disenadorSelectId).value;
                    if (disenadorId) {
                        asignarDisenador(proyecto.id, disenadorId);
                    } else {
                        alert('Por favor, seleccione un diseñador.');
                    }
                });
            }
        });

    } catch (error) {
        console.error('Error al cargar proyectos pendientes:', error);
        const tablaBody = document.getElementById('tabla-proyectos-pendientes');
        tablaBody.innerHTML = `<tr><td colspan="5">Error al cargar los proyectos: ${error.message}</td></tr>`;
    }
}

async function asignarDisenador(proyectoId, disenadorId) {
    try {
        const response = await fetch(`/api/proyectos/${proyectoId}/asignar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ diseñador_id: disenadorId }), // Asegúrate que el backend espera `diseñador_id`
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al asignar el diseñador.');
        }

        alert('Diseñador asignado correctamente. La tabla se actualizará.');
        cargarProyectosPendientes(); // Recargar la tabla para reflejar el cambio

    } catch (error) {
        console.error('Error al asignar diseñador:', error);
        alert(`Error: ${error.message}`);
    }
}
