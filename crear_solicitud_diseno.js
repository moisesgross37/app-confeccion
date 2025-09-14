document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solicitud-diseno-form');
    const clienteInput = document.getElementById('cliente');
    const clienteIdInput = document.getElementById('cliente-id');
    const suggestionsContainer = document.getElementById('cliente-suggestions');

    // --- Lógica de Autocompletado de Cliente ---
    clienteInput.addEventListener('input', async () => {
        const searchTerm = clienteInput.value;
        if (searchTerm.length < 2) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/centers/search?q=${searchTerm}`);
            const centers = await response.json();

            suggestionsContainer.innerHTML = '';
            if (centers.length > 0) {
                centers.forEach(center => {
                    const suggestionDiv = document.createElement('div');
                    suggestionDiv.textContent = center.name;
                    suggestionDiv.classList.add('suggestion-item');
                    suggestionDiv.addEventListener('click', () => {
                        clienteInput.value = center.name;
                        clienteIdInput.value = center.id;
                        suggestionsContainer.innerHTML = '';
                        suggestionsContainer.style.display = 'none';
                    });
                    suggestionsContainer.appendChild(suggestionDiv);
                });
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error buscando clientes:', error);
        }
    });

    // Ocultar sugerencias si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (e.target !== clienteInput) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // --- Lógica de Envío del Formulario ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const data = {
            cliente: formData.get('cliente'),
            cliente_id: formData.get('cliente_id'),
            nombre_proyecto: formData.get('nombre_proyecto'),
            descripcion_idea_cliente: formData.get('descripcion_idea_cliente'),
            // La subida de archivos se manejará en una fase posterior.
            // Por ahora, solo enviamos los datos de texto.
        };

        try {
            const response = await fetch('/api/proyectos-confeccion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Error al crear la solicitud.');
            }

            alert('¡Solicitud de diseño creada con éxito!');
            window.location.href = '/confeccion-dashboard'; // Redirigir al dashboard

        } catch (error) {
            console.error('Error en el envío:', error);
            alert(`Error: ${error.message}`);
        }
    });
});
