# Swopa

Swopa es una PWA mobile-first para descubrir ropa con interaccion tipo swipe.

## Subirla a GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube el contenido completo de esta carpeta:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `manifest.webmanifest`
   - `service-worker.js`
   - `logo.png`
   - `assets/`
   - `data/`
   - imagenes `.webp`
   - `.nojekyll`
3. En GitHub entra a:
   - `Settings` -> `Pages`
4. En `Build and deployment` elige:
   - `Deploy from a branch`
5. En `Branch` elige:
   - `main`
   - carpeta `/ (root)`
6. Guarda los cambios.
7. Espera a que GitHub publique la app.

La URL final se vera asi:

`https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`

## Instalarla en el telefono

### iPhone

1. Abre la URL publicada en Safari.
2. Toca `Compartir`.
3. Toca `Agregar a pantalla de inicio`.

### Android

1. Abre la URL publicada en Chrome.
2. Toca `Instalar app` o `Agregar a pantalla principal`.

## Nota

No abras la app con `file://` si quieres que funcione como PWA. Debe abrirse desde la URL publicada de GitHub Pages.
