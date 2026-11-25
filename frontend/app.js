// Dirección del backend.
// CAMBIA "TU-APP" por el nombre de tu servicio en Render
// (lo ves en el panel de Render, ej: https://extintores-api.onrender.com).
const URL_BACKEND_PRODUCCION = 'https://extintores-api.onrender.com';

const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

const URL_BASE = esLocal ? 'http://localhost:3000' : URL_BACKEND_PRODUCCION;
const API_URL = URL_BASE + '/extintores';


// ---------- Sesión ----------

const CLAVE_TOKEN = 'extintores_token';
const CLAVE_USUARIO = 'extintores_usuario';

function obtenerToken() {
    return localStorage.getItem(CLAVE_TOKEN);
}

function mostrarLogin(mensaje = '') {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);

    document.getElementById('pantalla-app').hidden = true;
    document.getElementById('barra-sesion').hidden = true;
    document.getElementById('pantalla-registro').hidden = true;
    document.getElementById('pantalla-login').hidden = false;
    document.getElementById('mensaje-login').textContent = mensaje;
    document.getElementById('login-usuario').focus();
}

function mostrarRegistro() {
    document.getElementById('pantalla-login').hidden = true;
    document.getElementById('pantalla-registro').hidden = false;
    document.getElementById('mensaje-registro').textContent = '';
    document.getElementById('registro-usuario').focus();
}

function guardarSesion(resultado) {
    localStorage.setItem(CLAVE_TOKEN, resultado.token);
    localStorage.setItem(CLAVE_USUARIO, resultado.usuario);
}

function mostrarApp() {
    document.getElementById('pantalla-login').hidden = true;
    document.getElementById('pantalla-registro').hidden = true;
    document.getElementById('pantalla-app').hidden = false;
    document.getElementById('barra-sesion').hidden = false;
    document.getElementById('usuario-actual').textContent =
        'Usuario: ' + (localStorage.getItem(CLAVE_USUARIO) || '');

    cargarExtintores();
}

// fetch que envía el token. Si la sesión venció, vuelve al login.
async function fetchConSesion(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        headers: {
            ...opciones.headers,
            Authorization: 'Bearer ' + obtenerToken()
        }
    });

    if (respuesta.status === 401) {
        mostrarLogin('Tu sesión terminó. Vuelve a iniciar sesión.');
        throw new Error('Sesión no válida');
    }

    return respuesta;
}

// Iniciar sesión
document.getElementById('form-login').addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

        const boton = document.getElementById('boton-entrar');
        const mensaje = document.getElementById('mensaje-login');

        boton.disabled = true;
        mensaje.textContent = 'Entrando... (la primera vez puede tardar hasta 1 minuto)';

        try {
            const respuesta = await fetch(URL_BASE + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: document.getElementById('login-usuario').value,
                    password: document.getElementById('login-password').value
                })
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                mensaje.textContent = resultado.mensaje || 'No se pudo iniciar sesión.';
                return;
            }

            guardarSesion(resultado);

            document.getElementById('form-login').reset();
            mensaje.textContent = '';
            mostrarApp();

        } catch (error) {
            console.error(error);
            mensaje.textContent = 'Error al conectar con el servidor.';

        } finally {
            boton.disabled = false;
        }
    }
);

// Crear cuenta nueva
document.getElementById('form-registro').addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

        const boton = document.getElementById('boton-registrar');
        const mensaje = document.getElementById('mensaje-registro');

        const password = document.getElementById('registro-password').value;
        const password2 = document.getElementById('registro-password2').value;

        if (password !== password2) {
            mensaje.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        boton.disabled = true;
        mensaje.textContent = 'Creando cuenta... (la primera vez puede tardar hasta 1 minuto)';

        try {
            const respuesta = await fetch(URL_BASE + '/auth/registro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: document.getElementById('registro-usuario').value,
                    email: document.getElementById('registro-email').value,
                    password
                })
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                mensaje.textContent = resultado.mensaje || 'No se pudo crear la cuenta.';
                return;
            }

            guardarSesion(resultado);

            document.getElementById('form-registro').reset();
            mensaje.textContent = '';
            mostrarApp();

        } catch (error) {
            console.error(error);
            mensaje.textContent = 'Error al conectar con el servidor.';

        } finally {
            boton.disabled = false;
        }
    }
);

// Cambiar entre "Iniciar sesión" y "Crear cuenta"
document.getElementById('ir-a-registro').addEventListener('click', (event) => {
    event.preventDefault();
    mostrarRegistro();
});

document.getElementById('ir-a-login').addEventListener('click', (event) => {
    event.preventDefault();
    mostrarLogin();
});

// Cerrar sesión
document.getElementById('boton-salir').addEventListener('click', () => {
    mostrarLogin();
});


// Evita que el texto guardado se interprete como HTML
function escapar(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


// Cargar todos los extintores
async function cargarExtintores() {
    try {
        const respuesta = await fetchConSesion(API_URL);
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
                <h3>${escapar(extintor.codigo)}</h3>

                <p>
                    <strong>Ubicación:</strong>
                    ${escapar(extintor.ubicacion)}
                </p>

                <p>
                    <strong>Capacidad:</strong>
                    ${escapar(extintor.capacidad)} kg
                </p>

                <p>
                    <strong>Vencimiento:</strong>
                    ${escapar(extintor.fecha_vencimiento)}
                </p>

                <p>
                    <strong>Estado:</strong>
                    <span class="${claseEstado}">
                        ${escapar(extintor.estado)}
                    </span>
                </p>

                <p>
                    <strong>Prueba hidrostática:</strong>
                    ${escapar(extintor.ultima_mantencion || 'No registrada')}
                </p>

                <p>
                    <strong>Observaciones:</strong>
                    ${escapar(extintor.observaciones || 'Ninguna')}
                </p>

                <p>
                    <strong>Agregado por:</strong>
                    ${escapar(extintor.creado_por || 'No registrado')}
                    ${extintor.creado_en
                        ? '(' + escapar(new Date(extintor.creado_en).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })) + ')'
                        : ''}
                </p>

                ${
                    extintor.estado === 'vacío'
                    ?
                    `<button onclick="volverAutomatico(${Number(extintor.id)})">
                        Volver a estado automático
                    </button>`
                    :
                    `<button onclick="marcarVacio(${Number(extintor.id)})">
                        Marcar como vacío
                    </button>`
                }
            `;

            lista.appendChild(tarjeta);
        });

    } catch (error) {
        console.error('Error:', error);

        if (error.message !== 'Sesión no válida') {
            document.getElementById('lista-extintores').innerHTML =
                '<p>Error al conectar con el servidor.</p>';
        }
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
            const respuesta = await fetchConSesion(API_URL, {
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

            if (error.message !== 'Sesión no válida') {
                // Mostrar el motivo que manda el servidor (ej: código repetido)
                document.getElementById('mensaje').textContent =
                    error.message || 'Error al agregar el extintor.';
            }
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
        const respuesta = await fetchConSesion(
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

        if (error.message !== 'Sesión no válida') {
            alert('Error al marcar el extintor como vacío.');
        }
    }
}


// Volver al estado automático
async function volverAutomatico(id) {

    try {
        const respuesta = await fetchConSesion(
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

        if (error.message !== 'Sesión no válida') {
            alert('Error al volver al estado automático.');
        }
    }
}


// Al abrir la página: si ya hay sesión, entrar directo; si no, pedir login
if (obtenerToken()) {
    mostrarApp();
} else {
    mostrarLogin();
}
