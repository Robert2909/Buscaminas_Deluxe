# Buscaminas Deluxe

Un juego web moderno, reactivo y de alta precisión del clásico **Buscaminas**, desarrollado con tecnologías web nativas (**HTML5, Vanilla CSS, JavaScript ES6+** y **Web Audio API procedural**) sin dependencias externas ni imágenes pesadas.

---

## Características Principales

* **8 Temas Visuales Completos y Adaptativos:**

  1. **Google Garden:** Estilo limpio inspirado en el clásico doodle moderno.
  2. **Corporate Pro:** Estética ejecutiva sobria en blanco, pizarra y azul ultramar.
  3. **Retro Windows 95:** Acabado nostálgico con marcos biselados y tipografía clásica.
  4. **VS Code:** Entorno oscuro inspirado en el editor de código, con breakpoints y acentos cian/magenta.
  5. **Cyberpunk Neon:** Alta saturación fluorescente, sombras resplandecientes y contrastes vivos.
  6. **Dark Glass:** Glassmorphism moderno con desenfoque de fondo y tarjetas translúcidas.
  7. **Sunset Desert:** Tonos cálidos terracota, arenas cobrizas y atardecer desértico.
  8. **Nordic Frost:** Atmósfera ártica gélida con azules glaciares y blanco polar.
* **Audio Procedural con Web Audio API:**

  * Sonidos 100% sintetizados en tiempo real por el navegador (excavación, banderas, acordes, notas en cascada, detonación encadenada y fanfarria de victoria).
  * Cero archivos `.mp3` o `.wav` externos: carga instantánea y cero consumo de ancho de banda.
* **PWA & Funcionamiento 100% Offline:**

  * Compatible con estándares de **Progressive Web App (PWA)** a través de `manifest.webmanifest` y `sw.js`.
  * Puede instalarse en teléfonos (Android / iOS) y ordenadores (Chrome / Edge) como una aplicación de escritorio o pantalla completa.
  * Funciona en modo avión y sin conexión a internet gracias al almacenamiento en caché local.
* **Área de Juego Optimizada (2 Barras Compactas):**

  * Toda la interfaz superior se condensa en dos barras funcionales:
    * **Barra 1:** Título de la marca, selector horizontal de los 7 niveles de dificultad y botones de utilidades globales.
    * **Barra 2 (HUD):** Modo pala/bandera, botón de deshacer en modo práctica, contador de minas restantes, carita interactiva y cronómetro.
  * Tablero adaptable con `ResizeObserver` que calcula dinámicamente el tamaño óptimo de las celdas aprovechando cada píxel disponible en la pantalla.
* **Calibrador de Riesgo Avanzado (10 Rangos):**

  * Al diseñar niveles personalizados, el creador evalúa la densidad de minas en 10 niveles precisos (desde *Iniciación* hasta *Caos Absoluto*), con retroalimentación cromática y gráfica inmediata.
* **Gestión de Estadísticas y Respaldo:**

  * Seguimiento de partidas jugadas, victorias, rachas, porcentajes de éxito y mejores tiempos por dificultad.
  * Copia de resumen al portapapeles.
  * Exportación e importación de copias de seguridad en formato `.json` para transferir récords entre dispositivos.
  * Opción de restablecimiento seguro de estadísticas.
* **Filosofía Cero Emojis:**

  * Todo el apartado gráfico (herramientas, caritas, banderas, minas e íconos de la interfaz) está construido con vectores SVG escalables y diseño CSS puro.

---

## Controles y Atajos de Teclado

### En Ratón / Pantalla Táctil


| Acción                          | Ratón / Teclado                        | Pantalla Táctil                              |
| :--------------------------------- | :---------------------------------------- | :---------------------------------------------- |
| **Cavar casilla**                | Clic izquierdo                          | Toque corto (en modo Pala)                    |
| **Colocar / Quitar bandera**     | Clic derecho                            | Pulsación prolongada o toque en modo Bandera |
| **Despeje rápido (Acorde)**     | Clic izquierdo en número ya satisfecho | Doble toque en número                        |
| **Alternar modo Pala / Bandera** | Barra espaciadora (`Space`)             | Botón en el HUD                              |
| **Reiniciar partida**            | Tecla`R` o clic en la carita            | Clic en la carita central                     |

### Atajos Globales de Teclado

* **`F`:** Alternar pantalla completa (*Fullscreen*).
* **`M`:** Silenciar / Activar audio procedural.
* **`Tab`:** Abrir el panel de ajustes y configuración.
* **`T`:** Abrir el selector de temas visuales.
* **`Space`:** Alternar entre modo excavación y modo marcado con bandera (o reiniciar en ventana de fin de partida).
* **`R`:** Reiniciar partida inmediatamente.
* **`Esc`:** Cerrar ventanas emergentes o inspeccionar el tablero tras la partida.
* **`1` a `7`:** Selección rápida de dificultad (1: Fácil, 2: Intermedio, ..., 7: Personalizado).
