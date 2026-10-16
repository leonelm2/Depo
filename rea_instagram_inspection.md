# Análisis con REA e Implementación de InstaClone

Se utilizó **REA (Reverse Engineering Anything)** mediante el proveedor de escenarios de navegador Playwright/CDP (`capture_browser_scenario`) para inspeccionar la aplicación web oficial de [Instagram](https://www.instagram.com/).

---

## 1. Evidencia e Inspección de REA

### 1.1 Tokens y Variables CSS Extraídas del `:root` Oficial
Durante la inspección del DOM y estilos computados en Instagram Web, se recuperaron las variables principales del sistema de diseño de Meta:

| Token / Variable CSS | Valor Original Inspeccionado | Rol en la Interfaz |
| :--- | :--- | :--- |
| `--accent` | `#0095F6` | Azul icónico de botones primarios y enlaces activos |
| `--ig-primary-button` | `rgb(74, 93, 249)` / `#0095F6` | Botón de acción principal |
| `--ig-error-or-destructive` | `#ED4956` / `#FF3040` | Corazón de "Me gusta" y alertas |
| `--feed-width` | `470px` | Ancho estándar de las tarjetas del feed principal |
| `--feed-sidebar-width` | `319px` | Ancho del riel derecho de sugerencias |
| `--nav-medium-width` | `244px` | Ancho de la barra de navegación lateral en escritorio |
| `--nav-narrow-width` | `72px` | Ancho colapsado en tablet / pantallas medianas |
| `--ig-story-gradient` | `linear-gradient(45deg, #f09433, #dc2743, #bc1888)` | Anillo degradado de historias sin leer |
| `--card-background` (Dark) | `#121212` / `#242526` | Fondo de tarjetas en modo oscuro |

### 1.2 Jerarquía de Componentes y Accesibilidad Detectada
- **Navegación Desktop**: Barra lateral izquierda fija con marca tipográfica, enlaces semánticos con micro-iconos SVG (Inicio, Explorar, Reels, Mensajes, Notificaciones, Crear, Perfil) y selector de tema.
- **Stories Tray**: Contenedor horizontal de avatares con borde de gradiente dinámico y estado leído/no leído.
- **Tarjetas de Feed**:
  - Cabecera con avatar, nombre de usuario, insignia verificada, ubicación y menú contextual.
  - Contenedor multimedia con soporte para doble toque/clic con animación de corazón flotante.
  - Barra de acciones: Me gusta, Comentar, Compartir y Guardar.
  - Contador reactivo de likes, texto con hashtags clickeables, listado de comentarios y barra para comentar con emojis rápidos.
- **Visor Inmersivo de Historias**: Modal a pantalla completa con barras de progreso segmentadas (5 s por historia), pausa interactiva y controles de navegación por deslizamiento.
- **Modal de Creación con Filtros**: Carga de imágenes con previsualización en tiempo real de filtros clásicos de Instagram (*Clarendon, Gingham, Moon, Juno, Lark, Valencia, Slumber*) mediante filtros CSS.

---

## 2. Capturas de la Aplicación Desarrollada

A continuación se muestran las capturas generadas mediante REA sobre la aplicación en ejecución:

````carousel
![Feed Principal en Modo Oscuro](C:/Users/Pc/.gemini/antigravity-ide/brain/9fef7f56-7d44-4b9f-9a4d-78eccc7144b2/instaclone_preview.png)
<!-- slide -->
![Visor Interactivo de Historias](C:/Users/Pc/.gemini/antigravity-ide/brain/9fef7f56-7d44-4b9f-9a4d-78eccc7144b2/story_modal_preview.png)
<!-- slide -->
![Perfil de Usuario y Cuadrícula de Fotos](C:/Users/Pc/.gemini/antigravity-ide/brain/9fef7f56-7d44-4b9f-9a4d-78eccc7144b2/profile_preview.png)
<!-- slide -->
![Modal de Creación con Filtros en Vivo](C:/Users/Pc/.gemini/antigravity-ide/brain/9fef7f56-7d44-4b9f-9a4d-78eccc7144b2/create_modal_preview.png)
<!-- slide -->
![Feed en Modo Claro](C:/Users/Pc/.gemini/antigravity-ide/brain/9fef7f56-7d44-4b9f-9a4d-78eccc7144b2/light_mode_preview.png)
````

---

## 3. Estructura de Archivos del Proyecto

El proyecto fue creado en [`C:/Users/Pc/.gemini/antigravity-ide/scratch/insta-clone`](file:///C:/Users/Pc/.gemini/antigravity-ide/scratch/insta-clone):

- [index.html](file:///C:/Users/Pc/.gemini/antigravity-ide/scratch/insta-clone/index.html): Maqueta semántica completa con navegación responsiva, feed, historias, visor modal y modal de creación.
- [style.css](file:///C:/Users/Pc/.gemini/antigravity-ide/scratch/insta-clone/style.css): Sistema de diseño completo basado en los tokens de Instagram, soporte para temas claro/oscuro y filtros CSS.
- [app.js](file:///C:/Users/Pc/.gemini/antigravity-ide/scratch/insta-clone/app.js): Motor reactivo de historias, likes con doble clic, publicación de fotos con filtros, guardados y comentarios.
- [server.js](file:///C:/Users/Pc/.gemini/antigravity-ide/scratch/insta-clone/server.js): Servidor estático local en Node.js ejecutándose en `http://127.0.0.1:3456`.
