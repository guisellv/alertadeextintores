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

async function dispararAvisoNuevo() {
    const token = (process.env.GITHUB_TOKEN || '').trim();

    // Acepta "usuario/repo" o el link completo "https://github.com/usuario/repo(.git)"
    const repo = (process.env.GITHUB_REPO || '')
        .trim()
        .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
        .replace(/\.git$/i, '')
        .replace(/\/+$/, '');

    if (!token || !repo) {
        console.log('Falta GITHUB_TOKEN o GITHUB_REPO: el aviso se enviará en la revisión diaria.');
        return;
    }

    console.log(`Pidiendo aviso inmediato a GitHub (repositorio: ${repo})...`);

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
            })
        }
    );

    if (!respuesta.ok) {
        const pistas = {
            401: 'el token está mal copiado o ya venció',
            403: 'el token no tiene el permiso "Actions: Read and write"',
            404: 'GITHUB_REPO está mal escrito o el token no tiene acceso a ese repositorio',
            422: 'el archivo alertas.yml en GitHub no tiene la opción "nuevos"'
        };
        throw new Error(
            `GitHub respondió ${respuesta.status} (${pistas[respuesta.status] || 'error desconocido'}): ` +
            await respuesta.text()
        );
    }

    console.log('Aviso de extintor nuevo enviado a GitHub Actions.');
}

module.exports = { dispararAvisoNuevo };
