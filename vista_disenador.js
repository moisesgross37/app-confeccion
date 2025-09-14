document.addEventListener('DOMContentLoaded', () => {
    const designUploadInput = document.getElementById('design-upload');
    const submitButton = document.getElementById('submit-internal-approval');
    const proformaUploadInput = document.getElementById('proforma-upload');
    const submitProformaButton = document.getElementById('submit-proforma');

    const getProjectId = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('projectId');
    };

    const handleSubmit = async () => {
        const projectId = getProjectId();
        if (!projectId) {
            alert('No se ha especificado un ID de proyecto.');
            return;
        }

        const file = designUploadInput.files[0];
        if (!file) {
            alert('Por favor, selecciona un archivo.');
            return;
        }

        const formData = new FormData();
        formData.append('propuesta', file);

        try {
            const response = await fetch(`/api/proyectos/${projectId}/propuesta-diseno`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error al enviar la propuesta.');
            }

            alert('Propuesta enviada para aprobación interna.');
            window.location.href = '/confeccion_dashboard.html';

        } catch (error) {
            console.error('Error:', error);
            alert('Error al enviar la propuesta.');
        }
    };

    const handleProformaSubmit = async () => {
        const projectId = getProjectId();
        if (!projectId) {
            alert('No se ha especificado un ID de proyecto.');
            return;
        }

        const file = proformaUploadInput.files[0];
        if (!file) {
            alert('Por favor, selecciona un archivo.');
            return;
        }

        const formData = new FormData();
        formData.append('proforma', file);

        try {
            const response = await fetch(`/api/proyectos/${projectId}/subir-proforma`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error al subir la proforma.');
            }

            alert('Proforma subida para revisión.');
            window.location.href = '/confeccion_dashboard.html';

        } catch (error) {
            console.error('Error:', error);
            alert('Error al subir la proforma.');
        }
    };

    submitButton.addEventListener('click', handleSubmit);
    submitProformaButton.addEventListener('click', handleProformaSubmit);
});