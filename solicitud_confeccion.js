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
    // === FUNCIÓN DE CARGAR PRODUCTOS (MODIFICADA) ===
    // ==================================================
    const loadProducts = () => {
        fetch('/api/proxy/productos')
            .then(res => res.ok ? res.json() : Promise.reject('Error al cargar productos'))
            .then(productos => {
                productosContainer.innerHTML = ''; // Limpiar "Cargando..."
                
                // --- ¡AQUÍ ESTÁ TU FILTRO! ---
                // 1. Filtramos el array para incluir solo los que dicen "PROMOCIONALES"
                const productosFiltrados = productos
                    .filter(p => p.RENGLON && p.RENGLON.toUpperCase() === 'PROMOCIONALES')
                    .map(p => p['PRODUCTO / SERVICIO']) // 2. Obtenemos solo el nombre
                    .filter(Boolean); // 3. Filtramos nombres vacíos
                
                // 4. Obtenemos los nombres únicos
                const productosUnicos = [...new Set(productosFiltrados)];
                // --- FIN DE LA MODIFICACIÓN ---
                
                if (productosUnicos.length === 0) {
                     productosContainer.innerHTML = '<p>No hay productos promocionales definidos.</p>';
                     return;
                }

                // Creamos un checkbox por cada producto único
                productosUnicos.sort().forEach((productoNombre, index) => {
                    const div = document.createElement('div');
                    div.className = 'checkbox-item'; // Puedes darle estilo a esto en CSS
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

    // --- LÓGICA DE ENVÍO FINAL (sin cambios) ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // --- Recolectar productos ---
        const productosSeleccionados = [];
        document.querySelectorAll('#productos-checkbox-container input[type="checkbox"]:checked').forEach(checkbox => {
            productosSeleccionados.push(checkbox.value);
        });

        // Guardamos el array como un string JSON en el input oculto
        productosHiddenInput.value = JSON.stringify(productosSeleccionados);
        // --- FIN ---

        const formData = new FormData(form);
        
        // Añade todos los archivos de nuestra lista al FormData
        for (const file of selectedFiles) {
            formData.append('imagenes_referencia', file);
        }

        if (!formData.get('nombre_centro') || !formData.get('nombre_asesor')) {
            return alert('Por favor, seleccione el centro y el asesor.');
        }
        if (selectedFiles.length === 0) {
            // Lo hacemos opcional, ya que a veces la descripción es suficiente
            if (!confirm('No has añadido imágenes de referencia. ¿Estás seguro de que deseas continuar?')) {
                 return;
            }
        }
        if (productosSeleccionados.length === 0) {
             if (!confirm('No has seleccionado ningún producto. ¿Estás seguro de que deseas continuar?')) {
                 return;
            }
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

    // --- Cargar todos los datos al iniciar ---
    loadAdvisors();
    loadAllCenters();
    loadProducts(); // <-- Llamamos a la nueva función
});
