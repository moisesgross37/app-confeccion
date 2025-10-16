document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solicitud-form');
    const asesorSelect = document.getElementById('nombre_asesor');
    const centroSelect = document.getElementById('nombre_centro');
    const btnAnadirArchivo = document.getElementById('btn-anadir-archivo');
    const inputArchivoOculto = document.getElementById('input-archivo-oculto');
    const listaArchivosSubidos = document.getElementById('lista-archivos-subidos');
    let selectedFiles = []; // Aquí se guardarán los archivos seleccionados

    // --- Carga inicial de datos (sin cambios) ---
    const loadAllCenters = () => {
        fetch('/api/proxy/all-centers')
            .then(res => res.ok ? res.json() : Promise.reject('Error al cargar los centros'))
            .then(centros => {
                centroSelect.innerHTML = '<option value="" disabled selected>Seleccione un centro...</option>';
                centros.forEach(centro => centroSelect.add(new Option(centro.name, centro.name)));
            }).catch(err => console.error(err));
    };

    const loadAdvisors = () => {
        fetch('/api/proxy/advisors-list')
            .then(res => res.ok ? res.json() : Promise.reject('Error al cargar asesores'))
            .then(asesores => {
                asesorSelect.innerHTML = '<option value="" disabled selected>Seleccione un asesor...</option>';
                asesores.forEach(asesor => asesorSelect.add(new Option(asesor.name, asesor.name)));
            }).catch(err => console.error(err));
    };

    // --- LÓGICA DE ARCHIVOS MEJORADA ---
    btnAnadirArchivo.addEventListener('click', () => {
        inputArchivoOculto.click(); // Simula un clic en el input oculto
    });

    inputArchivoOculto.addEventListener('change', () => {
        // Añade los nuevos archivos seleccionados a nuestra lista
        for (const file of inputArchivoOculto.files) {
            selectedFiles.push(file);
        }
        renderFileList(); // Actualiza la lista en la pantalla
        // Limpia el input para que el usuario pueda añadir más archivos si quiere
        inputArchivoOculto.value = '';
    });

    // Dibuja la lista de archivos en la pantalla
    const renderFileList = () => {
        listaArchivosSubidos.innerHTML = '';
        if (selectedFiles.length === 0) return;

        selectedFiles.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item';
            fileElement.innerHTML = `<span>✅ ${file.name}</span><button type="button" class="btn-remove-file" data-index="${index}">❌</button>`;
            listaArchivosSubidos.appendChild(fileElement);
        });
    };

    // Permite eliminar archivos de la lista antes de enviar
    listaArchivosSubidos.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-remove-file')) {
            const indexToRemove = parseInt(event.target.dataset.index, 10);
            selectedFiles.splice(indexToRemove, 1); // Elimina el archivo de nuestra lista
            renderFileList(); // Vuelve a dibujar la lista actualizada
        }
    });

    // --- LÓGICA DE ENVÍO FINAL (sin cambios) ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        
        // Añade todos los archivos de nuestra lista al FormData
        for (const file of selectedFiles) {
            formData.append('imagenes_referencia', file);
        }

        if (!formData.get('nombre_centro') || !formData.get('nombre_asesor')) {
            return alert('Por favor, seleccione el centro y el asesor.');
        }
        if (selectedFiles.length === 0) {
            return alert('Por favor, añada al menos un archivo de referencia.');
        }

        try {
            const botonSubmit = form.querySelector('button[type="submit"]');
            botonSubmit.textContent = 'Enviando...';
            botonSubmit.disabled = true;

            const response = await fetch('/api/solicitudes', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Error del servidor');

            alert('¡Solicitud enviada con éxito!');
            window.location.href = '/panel_confeccion.html';
        } catch (error) {
            alert(`Error al enviar la solicitud: ${error.message}`);
            const botonSubmit = form.querySelector('button[type="submit"]');
            botonSubmit.textContent = 'Crear Solicitud de Diseño';
            botonSubmit.disabled = false;
        }
    });

    loadAdvisors();
    loadAllCenters();
});
