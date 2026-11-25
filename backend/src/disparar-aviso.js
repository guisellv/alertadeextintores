// Pide a GitHub Actions que envíe AHORA el correo de "extintor agregado".
//
// Render gratis no puede enviar correos por Gmail, así que el servidor
// solo le avisa a GitHub, y GitHub manda el correo (tarda 1-2 minutos).
//
// Necesita en Render:
//   GITHUB_TOKEN = token de GitHub con permiso "Actions: Read and write"
//   GITHUB_REPO  = usuario/repositorio, ej: guisellv/alertadeextintores
//
// Si no están, el correo igual se envía en la revisión diaria.

// Resultado del último intento (se muestra en /estado, sin datos secretos)
let ultimoIntento = null;

function anotar(ok, mensaje) {
    ultimoIntento = { fecha: new Date().toISOString(), ok, mensaje };
    console.log((ok ? '' : 'ERROR aviso inmediato: ') + mensaje);
    return { ok, mensaje };
}

// Nunca lanza error: devuelve { ok, mensaje } para mostrarlo en la página
async function dispararAvisoNuevo() {
    const token = (process.env.GITHUB_TOKEN || '').trim();

    // Acepta "usuario/repo" o el link completo "https://github.com/usuario/repo(.git)"
    const repo = (process.env.GITHUB_REPO || '')
        .trim()
        .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
        .replace(/\.git$/i, '')
        .replace(/\/+$/, '');

    if (!token || !repo) {
        return anotar(false, 'Falta GITHUB_TOKEN o GITHUB_REPO en Render: el aviso se enviará en la revisión diaria.');
    }

    try {
        const respuesta = await fetch(
            `https://api.github.com/repos/${repo}/actions/workflows/alertas.yml/dispatches`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ref: process.env.GITHUB_RAMA || 'main',
                    inputs: { tipo: 'nuevos' }
                }),
                signal: AbortSignal.timeout(10000)
            }
        );

        if (respuesta.ok) {
            return anotar(true, 'Aviso por correo en camino (llega en 1 a 2 minutos).');
        }

        const pistas = {
            401: 'el token está mal copiado o ya venció',
            403: 'el token no tiene el permiso "Actions: Read and write"',
            404: `el token no tiene acceso al repositorio "${repo}" (¿lo creaste con otra cuenta de GitHub?) o el nombre está mal escrito`,
            422: 'el archivo alertas.yml en GitHub no tiene la opción "nuevos"'
        };

        let detalle = '';
        try {
            detalle = (await respuesta.json()).message || '';
        } catch { /* sin detalle */ }

        return anotar(false,
            `GitHub rechazó el aviso inmediato (${respuesta.status}: ${pistas[respuesta.status] || 'error desconocido'})` +
            (detalle ? ` [${detalle}]` : '') +
            '. El aviso se enviará en la revisión diaria.');

    } catch (error) {
        return anotar(false, `No se pudo conectar con GitHub (${error.message}). El aviso se enviará en la revisión diaria.`);
    }
}

function obtenerUltimoIntento() {
    return ultimoIntento;
}

module.exports = { dispararAvisoNuevo, obtenerUltimoIntento };
