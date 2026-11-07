# WebCraft Studio

Web del estudio de diseño y desarrollo web **WebCraft Studio** (Barcelona). Estilo **«Galaxia volcánica»**: fondo de galaxia nocturna que se recorre al bajar, con estrellas, estrellas fugaces y rocas volcánicas flotando. El suelo del hero y el pie son de roca volcánica, y las palabras destacadas van en celeste o lila.

Sitio estático (HTML + CSS + JS). Las librerías están copiadas en `vendor/` y no hay que compilar nada.

## Estructura

```
├── index.html               # Aviso, hero, diapositiva animada, servicios, proceso, proyectos, preguntas, contacto, pie
├── 404.html                 # Página de error con el mismo diseño
├── css/styles.css           # Estilos (paleta y tipografías en :root)
├── js/config.js             # ⚙️ TODO lo configurable: pre-apertura, fecha, redes, formulario, legales
├── js/main.js               # Menú, formulario, secuencia con scroll, animaciones
├── js/space.js              # Fondo espacial: galaxia, estrellas, estrellas fugaces, rocas
├── assets/space/            # galaxia.webp y rocas flotantes (generadas por código)
├── assets/textures/roca.webp # Textura de roca volcánica (generada por código, se repite sin cortes)
├── vendor/                  # GSAP, ScrollTrigger, SplitText y Lenis
├── assets/fonts/            # Syne y Manrope (alojadas en la propia web)
├── assets/hero/escritorio/  # 96 fotogramas WebP 1600×900
├── assets/hero/movil/       # 48 fotogramas WebP 720×960 (recorte vertical)
├── assets/proyectos/        # Capturas de proyectos
├── assets/og-image.png      # Vista previa al compartir
├── tools/extraer-fotogramas.sh
├── robots.txt · sitemap.xml
```

## Configuración (`js/config.js`)

| Variable | Qué hace |
|---|---|
| `PREAPERTURA` | `true`: aviso arriba, botones "Avísame cuando abráis" y formulario de lista de espera. `false`: botones "Pedir presupuesto" y formulario de proyecto. |
| `FECHA_APERTURA` | Texto de la fecha ("muy pronto" por defecto). |
| `EMAIL`, `INSTAGRAM`, `WHATSAPP` | Si están vacías, su enlace no aparece. WhatsApp se abre con el mensaje ya escrito. |
| `FORM_ENDPOINT` | Endpoint de Formspree. |
| `AVISO_LEGAL_URL`, `PRIVACIDAD_URL` | Si están vacías, sus enlaces no aparecen. |
| `VESTA_URL` | Enlace "Ver web" del proyecto Vesta. |
| `ANIMACION.MARCADOR` | Muestra la etiqueta "Marcador de posición". Ponlo en `false` con el vídeo real. |

## Animación de la diapositiva

1. Pon el vídeo (8 s, 16:9) en `assets/hero/`.
2. Ejecuta `bash tools/extraer-fotogramas.sh assets/hero/tu-video.mp4` (necesita ffmpeg).
3. En `js/config.js`, pon `ANIMACION.MARCADOR: false`.

En móvil se usan menos fotogramas y en vertical. En móviles lentos o con "reducir movimiento" se muestra el último fotograma como imagen fija.

## Ver en local

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

## Despliegue

`.github/workflows/pages.yml` publica en GitHub Pages en cada push a `master`. Si cambia el dominio, actualiza:
- `canonical`, `og:url` y `og:image` en `index.html`
- `robots.txt` y `sitemap.xml`
- `<base href>` en `404.html`

## Licencias

- GSAP: licencia estándar de GSAP, gratuita también para uso comercial.
- Lenis: MIT.
- Syne y Manrope: SIL Open Font License.
