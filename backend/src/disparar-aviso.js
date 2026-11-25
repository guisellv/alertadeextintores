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
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;

    if (!token || !repo) {
        console.log('Falta GITHUB_TOKEN o GITHUB_REPO: el aviso se enviará en la revisión diaria.');
        return;
    }

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
        throw new Error(`GitHub respondió ${respuesta.status}: ${await respuesta.text()}`);
    }

    console.log('Aviso de extintor nuevo enviado a GitHub Actions.');
}

module.exports = { dispararAvisoNuevo };
