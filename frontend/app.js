
// Dirección del backend.
// CAMBIA "TU-APP" por el nombre de tu servicio en Render
// (lo ves en el panel de Render, ej: https://extintores-api.onrender.com).
const URL_BACKEND_PRODUCCION = 'https://TU-APP.onrender.com';

const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

const API_URL = (esLocal ? 'http://localhost:3000' : URL_BACKEND_PRODUCCION) +
    '/extintores';


// Cargar todos los extintores
async function cargarExtintores() {
    try {
        const respuesta = await fetch(API_URL);
        const extintores = await respuesta.json();

        const lista = document.getElementById('lista-extintores');

        if (extintores.length === 0) {
            lista.innerHTML = '<p>No hay extintores registrados.</p>';
            return;
        }

        lista.innerHTML = '';

        extintores.forEach(extintor => {

            const tarjeta = document.createElement('div');

            // Elegir clase según el estado
            let claseEstado = '';

            if (extintor.estado === 'vigente') {
                claseEstado = 'estado-vigente';
            } else if (extintor.estado === 'próximo a vencer') {
                claseEstado = 'estado-proximo';
            } else if (extintor.estado === 'vencido') {
                claseEstado = 'estado-vencido';
            } else if (extintor.estado === 'vacío') {
                claseEstado = 'estado-vacio';
            }

            tarjeta.innerHTML = `
                <h3>${extintor.codigo}</h3>

                <p>
                    <strong>Ubicación:</strong>
                    ${extintor.ubicacion}
                </p>

                <p>
                    <strong>Capacidad:</strong>
                    ${extintor.capacidad} kg
                </p>

                <p>
                    <strong>Vencimiento:</strong>
                    ${extintor.fecha_vencimiento}
                </p>

                <p>
                    <strong>Estado:</strong>
                    <span class="${claseEstado}">
                        ${extintor.estado}
                    </span>
                </p>

                <p>
                    <strong>Última mantención:</strong>
                    ${extintor.ultima_mantencion || 'No registrada'}
                </p>

                <p>
                    <strong>Observaciones:</strong>
                    ${extintor.observaciones || 'Ninguna'}
                </p>

                ${
                    extintor.estado === 'vacío'
                    ?
                    `<button onclick="volverAutomatico(${extintor.id})">
                        Volver a estado automático
                    </button>`
                    :
                    `<button onclick="marcarVacio(${extintor.id})">
                        Marcar como vacío
                    </button>`
                }
            `;

            lista.appendChild(tarjeta);
        });

    } catch (error) {
        console.error('Error:', error);

        document.getElementById('lista-extintores').innerHTML =
            '<p>Error al conectar con el servidor.</p>';
    }
}


// Registrar un nuevo extintor
document.getElementById('form-extintor').addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

        const extintor = {
            codigo: document.getElementById('codigo').value,
            ubicacion: document.getElementById('ubicacion').value,
            capacidad: document.getElementById('capacidad').value,
            fecha_vencimiento:
                document.getElementById('fecha_vencimiento').value,
            ultima_mantencion:
                document.getElementById('ultima_mantencion').value,
            observaciones:
                document.getElementById('observaciones').value
        };

        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(extintor)
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.mensaje);
            }

            document.getElementById('mensaje').textContent =
                'Extintor agregado correctamente.';

            document.getElementById('form-extintor').reset();

            cargarExtintores();

        } catch (error) {
            console.error(error);

            document.getElementById('mensaje').textContent =
                'Error al agregar el extintor.';
        }
    }
);


// Marcar como vacío
async function marcarVacio(id) {

    const confirmar = confirm(
        '¿Estás seguro de que quieres marcar este extintor como vacío?'
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_URL}/${id}/vacio`,
            {
                method: 'PUT'
            }
        );

        if (!respuesta.ok) {
            throw new Error('No se pudo actualizar el extintor');
        }

        cargarExtintores();

    } catch (error) {
        console.error(error);

        alert('Error al marcar el extintor como vacío.');
    }
}


// Volver al estado automático
async function volverAutomatico(id) {

    try {
        const respuesta = await fetch(
            `${API_URL}/${id}/automatico`,
            {
                method: 'PUT'
            }
        );

        if (!respuesta.ok) {
            throw new Error('No se pudo actualizar el extintor');
        }

        cargarExtintores();

    } catch (error) {
        console.error(error);

        alert('Error al volver al estado automático.');
    }
}


// Cargar los extintores al abrir la página
cargarExtintores();

