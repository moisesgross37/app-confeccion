document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const asesorSelect = document.getElementById('nombre_asesor');
    const centroSelect = document.getElementById('nombre_centro');

    // --- CONFIGURACIÓN PARA CONECTARSE A LA API DE GESTIÓN ---
    const GESTION_API_URL = 'https://be-gestion.onrender.com/api/formalized-centers';
    const ADVISORS_API_URL = 'https://be-gestion.onrender.com/api/advisors-list'; // <-- NUEVA RUTA
    const API_KEY = 'MI_LLAVE_SECRETA_12345';
    // --- FIN: CONFIGURACIÓN ---

    // --- INICIO: FUNCIÓN DE ASESORES MODIFICADA ---
    const loadAdvisors = () => {
        fetch(ADVISORS_API_URL, { // <-- Se usa la nueva URL
            headers: {
                'X-API-Key': API_KEY // <-- Se añade la seguridad
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al cargar asesores desde el servidor principal.');
            return response.json();
        })
        .then(asesores => {
            asesorSelect.innerHTML = '<option value="" disabled selected>Seleccione un asesor...</option>';
            asesores.forEach(asesor => {
                const option = document.createElement('option');
                option.value = asesor.name;
                option.textContent = asesor.name;
                asesorSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar asesores:', error);
            asesorSelect.innerHTML = '<option value="" disabled selected>Error al cargar asesores</option>';
        });
    };
    // --- FIN: FUNCIÓN DE ASESORES MODIFICADA ---

    const loadFormalizedCenters = () => {
        fetch(GESTION_API_URL, {
            headers: {
                'X-API-Key': API_KEY
            }
        })
        .then(response => {
            if (!response.ok) {
                console.error('Respuesta de la API de gestión:', response);
                throw new Error(`Error ${response.status}: No se pudo conectar con el servidor de gestión.`);
            }
            return response.json();
        })
        .then(centros => {
            centroSelect.innerHTML = '<option value="" disabled selected>Seleccione un centro calificado...</option>';
            if (centros.length === 0) {
                centroSelect.innerHTML = '<option value="" disabled selected>No hay centros para formalizar acuerdo.</option>';
                return;
            }
            centros.forEach(centro => {
                const option = document.createElement('option');
                option.value = centro.name;
                option.textContent = centro.name;
                centroSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar los centros desde la API de gestión:', error);
            centroSelect.innerHTML = `<option value="" disabled selected>Error al cargar centros</option>`;
            alert('Hubo un error al cargar la lista de centros. Revise la consola para más detalles.');
        });
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        
        if (!formData.get('nombre_centro') || !formData.get('nombre_asesor') || !formData.get('detalles_solicitud')) {
            alert('Por favor, complete todos los campos requeridos.');
            return;
        }

        fetch('/api/solicitudes', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            alert('¡Solicitud enviada con éxito! Código de proyecto: ' + data.codigo_proyecto);
            window.location.href = '/panel_confeccion.html';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al enviar la solicitud: ' + error.message);
        });
    });

    // Cargar datos iniciales al abrir la página
    loadAdvisors();
    loadFormalizedCenters();
});
