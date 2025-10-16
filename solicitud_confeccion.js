document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solicitud-form');
    const asesorSelect = document.getElementById('nombre_asesor');
    const centroSelect = document.getElementById('nombre_centro');
    // Los siguientes campos ya no se llenarán automáticamente, lo cual es correcto para la nueva lógica
    const quoteIdInput = document.getElementById('quote_id');
    const quoteNumberInput = document.getElementById('quote_number');
    const btnAnadirArchivo = document.getElementById('btn-anadir-archivo');
    const inputArchivoOculto = document.getElementById('input-archivo-oculto');
    const listaArchivosSubidos = document.getElementById('lista-archivos-subidos');
    let archivosParaEnviar = [];

    // --- FUNCIÓN MODIFICADA ---
    const loadAllCenters = () => {
        // 1. Usamos la nueva ruta del proxy que trae TODOS los centros
        fetch('/api/proxy/all-centers')
        .then(response => {
            if (response.status === 204) return [];
            if (!response.ok) throw new Error('Error al cargar la lista de centros.');
            return response.json();
        })
        .then(centros => {
            centroSelect.innerHTML = '<option value="" disabled selected>Seleccione un centro...</option>';
            if (!centros || centros.length === 0) {
                centroSelect.innerHTML += '<option value="" disabled>No hay centros disponibles.</option>';
                return;
            }
            // 2. La lógica se simplifica: solo mostramos el nombre del centro
            centros.forEach(centro => {
                const option = document.createElement('option');
                option.value = centro.name;
                option.textContent = centro.name; // Ya no mostramos el número de cotización
                centroSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error al cargar centros:', error);
            centroSelect.innerHTML = `<option value="" disabled selected>Error al cargar centros</option>`;
        });
    };

    const loadAdvisors = () => {
        fetch('/api/proxy/advisors-list')
        .then(response => {
            if (response.status === 204) return [];
            if (!response.ok) throw new Error('Error al cargar la lista de asesores.');
            return response.json();
        })
        .then(asesores => {
            asesorSelect.innerHTML = '<option value="" disabled selected>Seleccione un asesor...</option>';
            if (!asesores || asesores.length === 0) {
                asesorSelect.innerHTML += '<option value="" disabled>No hay asesores disponibles.</option>';
                return;
            }
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

    // Este listener ya no es necesario para llenar los datos de la cotización, pero lo dejamos por si se usa en el futuro.
    centroSelect.addEventListener('change', (event) => {
        const selectedOption = event.target.selectedOptions[0];
        quoteIdInput.value = selectedOption.dataset.quoteId || '';
        quoteNumberInput.value = selected-Option.dataset.quoteNumber || '';
    });

    btnAnadirArchivo.addEventListener('click', () => { inputArchivoOculto.click(); });

    inputArchivoOculto.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;
        btnAnadirArchivo.textContent = 'Subiendo...';
        btnAnadirArchivo.disabled = true;
        for (const file of files) {
            const formData = new FormData();
            formData.append('archivo', file);
            try {
                const response = await fetch('/api/archivos/temporal', { method: 'POST', body: formData });
                if (!response.ok) throw new Error(`Error al subir ${file.name}`);
                const result = await response.json();
                addFileToUI(result.fileName, result.filePath);
                archivosParaEnviar.push(result);
            } catch (error) {
                console.error('Error en la subida:', error);
                alert(`Hubo un error al subir el archivo: ${file.name}`);
            }
        }
        btnAnadirArchivo.textContent = 'Añadir Archivo(s)';
        btnAnadirArchivo.disabled = false;
        inputArchivoOculto.value = '';
    });

    const addFileToUI = (fileName, filePath) => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.dataset.filePath = filePath;
        fileElement.innerHTML = `<span>✅ ${fileName}</span><button type="button" class="btn-remove-file" style="cursor: pointer; margin-left: 10px;">❌</button>`;
        listaArchivosSubidos.appendChild(fileElement);
        fileElement.querySelector('.btn-remove-file').addEventListener('click', () => {
            const pathToRemove = fileElement.dataset.filePath;
            archivosParaEnviar = archivosParaEnviar.filter(f => f.filePath !== pathToRemove);
            listaArchivosSubidos.removeChild(fileElement);
        });
    };
    
    form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // 1. Creamos una "caja" (FormData) a partir de los datos del formulario.
    const formData = new FormData(form);

    // 2. Buscamos el input de archivos y añadimos cada archivo a la "caja".
    //    Le ponemos la etiqueta "imagenes_referencia" para que el servidor la reconozca.
    const inputArchivos = document.getElementById('input-archivo-oculto');
    for (const file of inputArchivos.files) {
        formData.append('imagenes_referencia', file);
    }
    
    // 3. Verificamos que al menos los campos requeridos estén llenos.
    if (!formData.get('nombre_centro') || !formData.get('nombre_asesor')) {
        alert('Por favor, seleccione el centro y el asesor.');
        return;
    }

    try {
        // 4. Enviamos la "caja" completa.
        //    OJO: NO especificamos 'Content-Type'. El navegador lo hará por nosotros
        //    de forma correcta cuando envía un FormData.
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
    }
});

    loadAdvisors();
    // 3. Llamamos a la nueva función
    loadAllCenters();
});
