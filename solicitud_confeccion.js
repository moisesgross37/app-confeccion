document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solicitud-form');
    const asesorSelect = document.getElementById('nombre_asesor');
    const centroSelect = document.getElementById('nombre_centro');
    const quoteIdInput = document.getElementById('quote_id');
    const quoteNumberInput = document.getElementById('quote_number');

    const btnAnadirArchivo = document.getElementById('btn-anadir-archivo');
    const inputArchivoOculto = document.getElementById('input-archivo-oculto');
    const listaArchivosSubidos = document.getElementById('lista-archivos-subidos');
    let archivosParaEnviar = [];

   const loadFormalizedCenters = () => {
    fetch('/api/proxy/formalized-centers')
    .then(response => {
        if (response.status === 204) return [];
        if (!response.ok) throw new Error('Error al cargar la lista de centros.');
        return response.json();
    })
    .then(centros => {
        centroSelect.innerHTML = '<option value="" disabled selected>Seleccione un centro calificado...</option>';
        centros.forEach(centro => {
            const option = document.createElement('option');
            option.value = centro.name;
            option.textContent = `${centro.name} (Cot. #${centro.quotenumber})`;
            option.dataset.quoteId = centro.quote_id;
            option.dataset.quoteNumber = centro.quotenumber;
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
    centroSelect.addEventListener('change', (event) => {
        const selectedOption = event.target.selectedOptions[0];
        quoteIdInput.value = selectedOption.dataset.quoteId || '';
        quoteNumberInput.value = selectedOption.dataset.quoteNumber || '';
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
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (!data.nombre_centro || !data.nombre_asesor || !data.detalles_solicitud) {
            alert('Por favor, complete todos los campos requeridos.');
            return;
        }
        data.archivos = archivosParaEnviar;
        try {
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Error desconocido del servidor');
            }
            alert('¡Solicitud enviada con éxito! Código de proyecto: ' + result.codigo_proyecto);
            window.location.href = '/panel_confeccion.html';
        } catch (error) {
            console.error('Error:', error);
            alert('Error al enviar la solicitud: ' + error.message);
        }
    });

    loadAdvisors();
    loadFormalizedCenters();
});
