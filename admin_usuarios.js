document.addEventListener('DOMContentLoaded', () => {
    const addUserForm = document.getElementById('add-user-form');
    const usersList = document.getElementById('users-list');
    const errorMessage = document.getElementById('add-user-error');
    const API_URL = '/api/users';

    const fetchAndDisplayUsers = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Error al obtener la lista de usuarios.');
            
            const users = await response.json();
            usersList.innerHTML = ''; // Clear list before repopulating

            if (users.length === 0) {
                usersList.innerHTML = '<tr><td colspan="4">No hay usuarios registrados.</td></tr>';
                return;
            }

            users.forEach(user => {
                const row = document.createElement('tr');
                const deleteButtonHtml = user.username === 'admin'
                    ? '<span>(No se puede eliminar)</span>'
                    : `<button class="btn-delete" data-username="${user.username}">Eliminar</button>`;

                row.innerHTML = `
                    <td>${user.id || 'N/A'}</td>
                    <td>${user.username}</td>
                    <td>${user.rol}</td>
                    <td>${deleteButtonHtml}</td>
                `;
                usersList.appendChild(row);
            });
        } catch (error) {
            console.error(error);
            usersList.innerHTML = '<tr><td colspan="4">Error al cargar la lista de usuarios.</td></tr>';
        }
    };

    const addUser = async (event) => {
        event.preventDefault();
        errorMessage.style.display = 'none';

        const formData = new FormData(addUserForm);
        const userData = Object.fromEntries(formData.entries());

        if (!userData.username || !userData.password || !userData.rol) {
            alert('Todos los campos son obligatorios.');
            return;
        }

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear el usuario.');
            }

            addUserForm.reset();
            await fetchAndDisplayUsers(); // Refresh the list

        } catch (error) {
            console.error(error);
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    };

    const deleteUser = async (event) => {
        if (!event.target.classList.contains('btn-delete')) return;

        const username = event.target.dataset.username;
        if (!username) return;

        if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${username}"?`)) return;

        try {
            const response = await fetch(`${API_URL}/${username}`, { method: 'DELETE' });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar el usuario.');
            }
            
            await fetchAndDisplayUsers(); // Refresh the list

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // Attach event listeners
    addUserForm.addEventListener('submit', addUser);
    usersList.addEventListener('click', deleteUser);

    // Initial load
    fetchAndDisplayUsers();
});