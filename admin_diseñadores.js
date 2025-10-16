document.addEventListener('DOMContentLoaded', () => {
    const formAddDesigner = document.getElementById('add-designer-form');
    const designerNameInput = document.getElementById('designer_name');
    const designersList = document.getElementById('designers-list');
    const messageDiv = document.getElementById('message');

    // Función para mostrar mensajes
    const showMessage = (msg, type = 'success') => {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    };

    // Función para cargar los diseñadores existentes
    const loadDesigners = async () => {
        try {
            const response = await fetch('/api/designers');
            if (!response.ok) {
                throw new Error('Error al cargar los diseñadores');
            }
            const designers = await response.json();
            
            designersList.innerHTML = ''; // Limpiar lista actual
            if (designers.length === 0) {
                designersList.innerHTML = '<tr><td colspan="3">No hay diseñadores registrados.</td></tr>';
                return;
            }

            designers.forEach(designer => {
                const row = designersList.insertRow();
                row.insertCell(0).textContent = designer.id;
                row.insertCell(1).textContent = designer.name; // <--- AQUÍ SE CORRIGE: USAMOS 'name'
                
                const actionsCell = row.insertCell(2);
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Eliminar';
                deleteButton.className = 'button button-danger';
                deleteButton.onclick = async () => {
                    if (confirm(`¿Estás seguro de que quieres eliminar a ${designer.name}?`)) {
                        try {
                            const deleteResponse = await fetch(`/api/designers/${designer.id}`, {
                                method: 'DELETE'
                            });
                            if (!deleteResponse.ok) {
                                throw new Error('Error al eliminar el diseñador');
                            }
                            showMessage('Diseñador eliminado con éxito.');
                            loadDesigners(); // Recargar la lista
                        } catch (error) {
                            console.error('Error al eliminar diseñador:', error);
                            showMessage(error.message, 'error');
                        }
                    }
                };
                actionsCell.appendChild(deleteButton);
            });

        } catch (error) {
            console.error('Error al cargar diseñadores:', error);
            showMessage(error.message, 'error');
        }
    };

    // Manejar el envío del formulario para añadir diseñadores
    formAddDesigner.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = designerNameInput.value.trim();

        if (!name) {
            showMessage('El nombre del diseñador no puede estar vacío.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/designers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }) // <--- ASEGURAMOS QUE SE ENVÍA 'name'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al añadir el diseñador');
            }

            showMessage('Diseñador añadido con éxito.');
            designerNameInput.value = ''; // Limpiar el input
            loadDesigners(); // Recargar la lista
        } catch (error) {
            console.error('Error al añadir diseñador:', error);
            showMessage(error.message, 'error');
        }
    });

    // Cargar diseñadores al iniciar la página
    loadDesigners();
});
