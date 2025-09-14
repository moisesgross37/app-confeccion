document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-designer-form');
    const input = document.getElementById('new-designer-name');
    const list = document.getElementById('designers-list');
    // CORRECCIÓN FINAL: Actualizamos la URL para que no tenga la "ñ"
    const API_URL = '/api/designers';

    const fetchAndDisplayDesigners = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Error al obtener diseñadores.');
            const designers = await response.json();
            list.innerHTML = '';
            if (designers.length === 0) {
                list.innerHTML = '<tr><td colspan="3">No hay diseñadores registrados.</td></tr>';
                return;
            }
            designers.forEach(designer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${designer.id}</td>
                    <td>${designer.nombre}</td>
                    <td><button class="btn-delete" data-id="${designer.id}">Eliminar</button></td>
                `;
                list.appendChild(row);
            });
        } catch (error) {
            console.error(error);
            list.innerHTML = '<tr><td colspan="3">Error al cargar diseñadores.</td></tr>';
        }
    };

    const addDesigner = async (name) => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: name }),
            });
            if (!response.ok) throw new Error('Error al añadir diseñador.');
            input.value = '';
            await fetchAndDisplayDesigners();
        } catch (error) {
            console.error(error);
            alert('No se pudo añadir el diseñador.');
        }
    };

    const deleteDesigner = async (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este diseñador?')) return;
        try {
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar diseñador.');
            await fetchAndDisplayDesigners();
        } catch (error) {
            console.error(error);
            alert('No se pudo eliminar el diseñador.');
        }
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = input.value.trim();
        if (name) addDesigner(name);
    });

    list.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-delete')) {
            const id = event.target.dataset.id;
            deleteDesigner(id);
        }
    });

    fetchAndDisplayDesigners();
});