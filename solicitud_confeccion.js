document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solicitud-form');
    const asesorSelect = document.getElementById('nombre_asesor');
    const centroSelect = document.getElementById('nombre_centro');

    // ===== INICIO: NUEVOS ELEMENTOS PARA CARGA DE ARCHIVOS =====
    const btnAnadirArchivo = document.getElementById('btn-anadir-archivo');
    const inputArchivoOculto = document.getElementById('input-archivo-oculto');
    const listaArchivosSubidos = document.getElementById('lista-archivos-subidos');
    let archivosParaEnviar = [];
    // ===== FIN: NUEVOS ELEMENTOS =====

    // --- CONFIGURACIÓN PARA CONECTARSE A LA API DE GESTIÓN ---
    const GESTION_API_URL = 'https://be-gestion.onrender.com/api/formalized-centers';
    const ADVISORS_API_URL = 'https://be-gestion.onrender.com/api/advisors-list';
    const API_KEY = 'MI_LLAVE_SECRETA_12345';
    // --- FIN: CONFIGURACIÓN ---

    // --- INICIO: FUNCIÓN COMPLETA DE loadAdvisors ---
    const loadAdvisors = () => {
        fetch(ADVISORS_API_URL, {
            headers: { 'X-API-Key': API_KEY },
            cache: 'no-store' // <-- AÑADE ESTA LÍNEA TAMBIÉN
        })
// ...
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
    // --- FIN: FUNCIÓN COMPLETA DE loadAdvisors ---

    // --- INICIO: FUNCIÓN COMPLETA DE loadFormalizedCenters ---
    const loadFormalizedCenters = () => {
        fetch(GESTION_API_URL, {
            headers: { 'X-API-Key': API_KEY },
            cache: 'no-store' // <-- AÑADE ESTA LÍNEA
        })
// ...
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
    // --- FIN: FUNCIÓN COMPLETA DE loadFormalizedCenters ---
    
    // ===== INICIO: NUEVA LÓGICA PARA SUBIR ARCHIVOS ASÍNCRONAMENTE =====
    
    // 1. Cuando el usuario hace clic en nuestro botón, activamos el input oculto
    btnAnadirArchivo.addEventListener('click', () => {
        inputArchivoOculto.click();
    });

    // 2. Cuando el usuario selecciona archivos en el input oculto
    inputArchivoOculto.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        btnAnadirArchivo.textContent = 'Subiendo...';
        btnAnadirArchivo.disabled = true;

        for (const file of files) {
            const formData = new FormData();
            formData.append('archivo', file);

            try {
                const response = await fetch('/api/archivos/temporal', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Error al subir ${file.name}`);
                }
                
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

    // 3. Función para añadir el archivo a la lista visual en el HTML
    const addFileToUI = (fileName, filePath) => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.dataset.filePath = filePath;
        fileElement.innerHTML = `
            <span>✅ ${fileName}</span>
            <button type="button" class="btn-remove-file" style="cursor: pointer; margin-left: 10px;">❌</button>
        `;
        listaArchivosSubidos.appendChild(fileElement);

        fileElement.querySelector('.btn-remove-file').addEventListener('click', () => {
            const pathToRemove = fileElement.dataset.filePath;
            archivosParaEnviar = archivosParaEnviar.filter(f => f.filePath !== pathToRemove);
            listaArchivosSubidos.removeChild(fileElement);
        });
    };
    // ===== FIN: NUEVA LÓGICA =====
    
    // 4. Lógica de envío del formulario principal (MODIFICADA)
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

    // Cargar datos iniciales
    loadAdvisors();
    loadFormalizedCenters();
});
