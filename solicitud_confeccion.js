document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solicitud-form');
    const asesorSelect = document.getElementById('nombre_asesor');
    const centroSelect = document.getElementById('nombre_centro');
    const btnAnadirArchivo = document.getElementById('btn-anadir-archivo');
    const inputArchivoOculto = document.getElementById('input-archivo-oculto');
    const listaArchivosSubidos = document.getElementById('lista-archivos-subidos');

    // Carga los centros desde el servidor
    const loadAllCenters = () => {
        fetch('/api/proxy/all-centers')
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar centros.');
                return response.json();
            })
            .then(centros => {
                centroSelect.innerHTML = '<option value="" disabled selected>Seleccione un centro...</option>';
                centros.forEach(centro => {
                    const option = document.createElement('option');
                    option.value = centro.name;
                    option.textContent = centro.name;
                    centroSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error al cargar centros:', error);
                centroSelect.innerHTML = `<option value="" disabled selected>Error al cargar</option>`;
            });
    };

    // Carga los asesores desde el servidor
    const loadAdvisors = () => {
        fetch('/api/proxy/advisors-list')
            .then(response => {
                if (!response.ok) throw new Error('Error al cargar asesores.');
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
                asesorSelect.innerHTML = '<option value="" disabled selected>Error al cargar</option>';
            });
    };

    // --- LÓGICA DE ARCHIVOS SIMPLIFICADA ---
    // Simula un clic en el input de archivo oculto
    btnAnadirArchivo.addEventListener('click', () => {
        inputArchivoOculto.click();
    });

    // Cuando el usuario selecciona archivos, solo actualizamos la interfaz para que vea lo que eligió.
    // Ya NO lo subimos a ninguna ruta temporal.
    inputArchivoOculto.addEventListener('change', () => {
        listaArchivosSubidos.innerHTML = ''; // Limpiamos la lista anterior
        if (inputArchivoOculto.files.length > 0) {
            for (const file of inputArchivoOculto.files) {
                const fileElement = document.createElement('div');
                fileElement.className = 'file-item';
                fileElement.innerHTML = `<span>✅ ${file.name}</span>`;
                listaArchivosSubidos.appendChild(fileElement);
            }
        }
    });

    // --- LÓGICA DE ENVÍO FINAL Y CORRECTA ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // 1. Creamos el FormData directamente del formulario.
        //    Esto capturará los campos de texto Y los archivos del input (porque tiene el 'name' correcto).
        const formData = new FormData(form);

        // 2. Verificación simple
        if (!formData.get('nombre_centro') || !formData.get('nombre_asesor')) {
            alert('Por favor, seleccione el centro y el asesor.');
            return;
        }
        if (inputArchivoOculto.files.length === 0) {
            alert('Por favor, añada al menos un archivo de referencia.');
            return;
        }

        try {
            const botonSubmit = form.querySelector('button[type="submit"]');
            botonSubmit.textContent = 'Enviando...';
            botonSubmit.disabled = true;

            // 3. Enviamos el FormData. El navegador se encargará de los headers.
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Error desconocido del servidor');
            }

            alert('¡Solicitud enviada con éxito! Código de proyecto: ' + result.codigo_proyecto);
            window.location.href = '/panel_confeccion.html';

        } catch (error) {
            console.error('Error al enviar el formulario:', error);
            alert('Error al enviar la solicitud: ' + error.message);
            const botonSubmit = form.querySelector('button[type="submit"]');
            botonSubmit.textContent = 'Crear Solicitud de Diseño';
            botonSubmit.disabled = false;
        }
    });

    // Carga inicial de datos
    loadAdvisors();
    loadAllCenters();
});
