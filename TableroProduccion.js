import React, { useState, useEffect } from 'react'; // Import useState and useEffect

function TableroProduccion() {
    const [proyectos, setProyectos] = useState([]); // State to store projects

    useEffect(() => {
        // Fetch data when the component mounts
        const fetchProyectos = async () => {
            try {
                const response = await fetch('/api/proyectos/fase-final');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setProyectos(data); // Update the state with fetched data
                console.log(data); // Log the data to console for verification
            } catch (error) {
                console.error("Error fetching proyectos:", error);
            }
        };

        fetchProyectos();
    }, []); // Empty dependency array means this effect runs once on mount

    const columnStyle = {
        flex: 1,
        padding: '10px',
        margin: '0 10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        backgroundColor: '#f9f9f9',
        minHeight: '200px' // Added for better visual separation of columns
    };

    const containerStyle = {
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: '20px'
    };

    const cardStyle = {
        border: '1px solid #eee',
        padding: '10px',
        marginBottom: '10px',
        borderRadius: '5px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    return (
        <div>
            <h1>Línea de Tiempo de Confección</h1>
            <div style={containerStyle}>
                <div style={columnStyle}>
                    <h2>En Confección</h2>
                    {proyectos.filter(p => p.status === 'En Confección').map(proyecto => (
                        <div key={proyecto.id} style={cardStyle}>
                            <h3>{proyecto.nombre_proyecto || 'Proyecto sin nombre'}</h3>
                            {/* You can add more project details here */}
                        </div>
                    ))}
                </div>
                <div style={columnStyle}>
                    <h2>En Control de Calidad</h2>
                    {proyectos.filter(p => p.status === 'En Control de Calidad').map(proyecto => (
                        <div key={proyecto.id} style={cardStyle}>
                            <h3>{proyecto.nombre_proyecto || 'Proyecto sin nombre'}</h3>
                            {/* You can add more project details here */}
                        </div>
                    ))}
                </div>
                <div style={columnStyle}>
                    <h2>Listo para Entrega</h2>
                    {proyectos.filter(p => p.status === 'Listo para Entrega').map(proyecto => (
                        <div key={proyecto.id} style={cardStyle}>
                            <h3>{proyecto.nombre_proyecto || 'Proyecto sin nombre'}</h3>
                            {/* You can add more project details here */}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default TableroProduccion;