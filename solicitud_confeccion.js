document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(form);

        // Simple validation to ensure fields are not empty
        const centro = formData.get('nombre_centro');
        const asesor = formData.get('nombre_asesor');
        const detalles = formData.get('detalles_solicitud');

        if (!centro || !asesor || !detalles) {
            alert('Por favor, complete todos los campos antes de enviar.');
            return;
        }

        fetch('/api/solicitudes', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Hubo un problema con el servidor.');
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            alert('¡Solicitud enviada con éxito! Código de proyecto: ' + data.codigo_proyecto);
            // Redirect to the panel to see the new project
            window.location.href = '/panel_confeccion.html';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al enviar la solicitud. Por favor, intente de nuevo.');
        });
    });
});