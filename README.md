# WebCraft Studio — Landing page

Landing page para **WebCraft Studio**, agencia de diseño y desarrollo de páginas web. Diseño futurista y minimalista en tonos oscuros, orientado a captar clientes que buscan su propia web. 100 % adaptable a móviles.

Sitio estático (HTML + CSS + JavaScript, sin dependencias ni build).

## Estructura

```
├── index.html        # Hero, tecnologías, servicios, proyectos, proceso, cifras, planes, testimonios, FAQ, contacto
├── css/styles.css    # Estilos (colores y tipografías en :root)
├── js/config.js      # Configuración del formulario (endpoint, email)
├── js/main.js        # Menú móvil, animaciones, contadores y envío del formulario
└── assets/favicon.svg
```

## Ver en local

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

## Formulario de presupuesto

Recoge nombre, email, teléfono, empresa, tipo de web, presupuesto, plan y descripción del proyecto. Incluye validación en el navegador, campo *honeypot* anti-spam y los botones de cada plan preseleccionan el formulario.

Edita `js/config.js`:

```js
FORM_ENDPOINT: "https://formspree.io/f/TU_ID",   // o tu backend (POST JSON)
CONTACT_EMAIL: "hola@webcraftstudio.com",
```

- **Con `FORM_ENDPOINT`**: se envía como JSON (Formspree, Getform, Basin…).
- **Sin `FORM_ENDPOINT`**: abre el cliente de correo del visitante con la solicitud redactada.

## Personalización

- Colores (cian/violeta) y tipografías: variables en `:root` de `css/styles.css`.
- Textos, precios, proyectos y testimonios: `index.html` (los proyectos y testimonios son de ejemplo, sustitúyelos por los reales).

## Despliegue

Incluye un workflow de GitHub Pages (`.github/workflows/pages.yml`) que publica en cada push a `master`. También funciona en Netlify, Vercel o cualquier hosting estático.
