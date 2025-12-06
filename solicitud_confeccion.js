document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('solicitud-form');
    const asesorSelect = document.getElementById('nombre_asesor');
    const centroSelect = document.getElementById('nombre_centro');
    const btnAnadirArchivo = document.getElementById('btn-anadir-archivo');
    const inputArchivoOculto = document.getElementById('input-archivo-oculto');
    const listaArchivosSubidos = document.getElementById('lista-archivos-subidos');
    
    // --- NUEVAS VARIABLES (TAREA 1.4) ---
    const productosContainer = document.getElementById('productos-checkbox-container');
    const productosHiddenInput = document.getElementById('productos-seleccionados');
    
    // --- TAREA 2: HACER DETALLES OPCIONALES AUTOMÁTICAMENTE ---
    // Buscamos cualquier campo de texto o textarea y le quitamos el "obligatorio" si lo tiene
    const camposTexto = form.querySelectorAll('textarea, input[type="text"]');
    camposTexto.forEach(campo => {
        // Excluimos los campos ocultos o de búsqueda, enfocándonos en la descripción
        if (campo.id !== 'nombre_centro' && campo.id !== 'nombre_asesor') {
            campo.removeAttribute('required');
        }
    });

    let selectedFiles = []; // Aquí se guardarán los archivos seleccionados

    // --- Carga inicial de datos (Centros) ---
    const loadAllCenters = () => {
        fetch('/api/proxy/all-centers')
            .then(res => res.ok ? res.json() : Promise.reject('Error al cargar los centros'))
            .then(centros => {
                centroSelect.innerHTML = '<option value="" disabled selected>Seleccione un centro...</option>';
                centros.forEach(centro => centroSelect.add(new Option(centro.name, centro.name)));
            }).catch(err => console.error(err));
    };

    // --- Carga inicial de datos (Asesores) ---
    const loadAdvisors = () => {
        fetch('/api/proxy/advisors-list')
            .then(res => res.ok ? res.json() : Promise.reject('Error al cargar asesores'))
            .then(asesores => {
                asesorSelect.innerHTML = '<option value="" disabled selected>Seleccione un asesor...</option>';
                asesores.forEach(asesor => asesorSelect.add(new Option(asesor.name, asesor.name)));
            }).catch(err => console.error(err));
    };

    // ==================================================
    // === FUNCIÓN DE CARGAR PRODUCTOS ===
    // ==================================================
    const loadProducts = () => {
        fetch('/api/proxy/productos')
            .then(res => res.ok ? res.json() : Promise.reject('Error al cargar productos'))
            .then(productos => {
                productosContainer.innerHTML = ''; 
                
                const productosFiltrados = productos
                    .filter(p => p.RENGLON && p.RENGLON.toUpperCase() === 'PROMOCIONALES')
                    .map(p => p['PRODUCTO / SERVICIO']) 
                    .filter(Boolean); 
                
                const productosUnicos = [...new Set(productosFiltrados)];
                
                if (productosUnicos.length === 0) {
                     productosContainer.innerHTML = '<p>No hay productos promocionales definidos.</p>';
                     return;
                }

                productosUnicos.sort().forEach((productoNombre, index) => {
                    const div = document.createElement('div');
                    div.className = 'checkbox-item'; 
                    div.innerHTML = `
                        <input type="checkbox" id="prod-${index}" name="producto_check" value="${productoNombre}" style="margin-right: 5px;">
                        <label for="prod-${index}">${productoNombre}</label>
                    `;
                    productosContainer.appendChild(div);
                });
            }).catch(err => {
                console.error(err);
                productosContainer.innerHTML = '<p style="color: red;">Error al cargar productos. Intente recargar.</p>';
            });
    };

    // --- LÓGICA DE ARCHIVOS (sin cambios) ---
    btnAnadirArchivo.addEventListener('click', () => {
        inputArchivoOculto.click(); 
    });

    inputArchivoOculto.addEventListener('change', () => {
        for (const file of inputArchivoOculto.files) {
            selectedFiles.push(file);
        }
        renderFileList(); 
        inputArchivoOculto.value = '';
    });

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

    listaArchivosSubidos.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-remove-file')) {
            const indexToRemove = parseInt(event.target.dataset.index, 10);
            selectedFiles.splice(indexToRemove, 1); 
            renderFileList(); 
        }
    });

    // ======================================================
    // === LÓGICA DE ENVÍO FINAL (VALIDACIONES AJUSTADAS) ===
    // ======================================================
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // --- Recolectar productos ---
        const productosSeleccionados = [];
        document.querySelectorAll('#productos-checkbox-container input[type="checkbox"]:checked').forEach(checkbox => {
            productosSeleccionados.push(checkbox.value);
        });

        // Guardamos el array como un string JSON en el input oculto
        productosHiddenInput.value = JSON.stringify(productosSeleccionados);
        
        const formData = new FormData(form);
        
        // Añade todos los archivos de nuestra lista al FormData
        for (const file of selectedFiles) {
            formData.append('imagenes_referencia', file);
        }

        // 1. VALIDACIÓN BÁSICA (CENTRO Y ASESOR)
        if (!formData.get('nombre_centro') || !formData.get('nombre_asesor')) {
            return alert('Por favor, seleccione el centro y el asesor.');
        }

        // 2. VALIDACIÓN DE PRODUCTOS (AHORA ES OBLIGATORIA)
        // Antes era un confirm, ahora es un Alert + Return (Bloqueo)
        if (productosSeleccionados.length === 0) {
             alert('⚠️ ATENCIÓN: Es OBLIGATORIO seleccionar al menos un producto del paquete para crear la solicitud.');
             return; // Detenemos el proceso aquí. No pasa nada más hasta que seleccionen.
        }

        // 3. VALIDACIÓN DE DETALLES/ARCHIVOS (ELIMINADA)
        // Ya no preguntamos nada si no hay archivos o detalles. Es opcional.
        
        // --- ENVÍO AL SERVIDOR ---
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

    // --- Cargar todos los datos al iniciar ---
    loadAdvisors();
    loadAllCenters();
    loadProducts();
});