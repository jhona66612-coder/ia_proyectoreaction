# Guía de uso
## TacticReaction
### Juega, observa y presenta un sistema de agentes inteligentes

Versión 2.0 · 19 de noviembre de 2026

TacticReaction es un juego por turnos de reacciones en cadena. Compites por el control de un tablero mientras descubres trampas y ventajas. Además de jugar, puedes observar cómo un agente decide y ejecutar experimentos para explicar inteligencia artificial en una exposición.

### Inicio en un minuto
1. Abre https://ia-proyectoreaction.onrender.com en tu navegador.
2. En «Prepara tu partida», elige «Tú contra la IA», tablero 6 × 8 y nivel «Táctico». Para aprender las reacciones, selecciona reglas «Clásico»; para demostrar todos los agentes usa «Táctico».
3. Pulsa «Empezar partida». El tablero abre en otra pestaña; si tu navegador la bloquea, continúa en la misma. No se inicia una partida automáticamente al visitar la configuración.
4. Pulsa una casilla vacía. Tu color es menta; el rival usa coral. La IA responderá automáticamente.
5. Pulsa «IA» abajo para ver el trabajo real de búsqueda. Abre el menú superior para ajustar animaciones, riesgo, ruta, sonido y descargar la partida.

No necesitas registrarte, introducir datos personales ni obtener una clave de IA. Usa un navegador actual con JavaScript y conexión a internet. Funciona con ratón, pantalla táctil y teclado. La vista /play dedica la pantalla al tablero; el análisis y las opciones se abren solo cuando los necesitas.

### Qué encontrarás
- Nueva partida: configuración y acceso para continuar una partida guardada.
- Pestaña de juego: tablero, turno y marcadores compactos; reglas, análisis y menú desplegables.
- Laboratorio: evaluación del agente y entrenamiento genético.
- Guías: estos manuales, arquitectura y código fuente.

Los números junto a los jugadores cuentan sus cargas; también se muestra cuántas casillas ocupan. El menta juega primero y el coral después. La animación termina antes de permitir el siguiente turno.

<!-- page -->
## Reglas del juego
### Colocar, explotar y capturar
Cada turno añade una carga a una celda vacía o propia. No puedes seleccionar una celda que pertenezca al rival. Sí puedes conquistarla mediante una explosión vecina.

Una esquina tiene 2 vecinos, un borde 3 y una celda interior 4. Ese número es su umbral de explosión: admite una carga menos antes de reaccionar. El indicador «2/4» significa dos cargas de las cuatro necesarias. Dos o tres bolitas se unen, se superponen y giran, pero cada esfera sigue contando.

Una explosión resta a la celda tantas cargas como vecinos ortogonales tenga. Envía una carga a cada vecino de arriba, abajo, izquierda y derecha, y cambia esos vecinos al color del jugador que provocó la reacción. Si un vecino supera a su vez la capacidad, continúa la cascada.

Ejemplo: una esquina con una carga recibe otra. Explota y envía una carga a cada uno de sus dos vecinos. Al alcanzar 2 bolitas rivales, las absorbe y convierte: quedan 3 del color atacante. La cantidad se conserva, salvo por trampas o ventajas. La animación muestra el viaje, la absorción y la unión; el texto inferior explica la causa. No hay envíos diagonales ni cargas que salgan del tablero.

### Eventos ocultos (solo reglas Táctico)
- Normal: la primera llegada revela que la celda es normal; no añade efectos especiales.
- Trampa (×): elimina todas las cargas de esa celda y la deja vacía. No se vuelve a activar en turnos posteriores.
- Ventaja (+): añade una carga extra inmediata. Puede provocar una explosión. También se consume una sola vez.

Los eventos se activan al colocar directamente o recibir una carga durante una cascada, antes de comprobar si explota. Una casilla ya revelada mantiene su símbolo para recordar qué ocurrió; no puede repetir su efecto. En reglas Clásico todas las celdas son normales y conocidas desde el inicio.

La suma de trampas y ventajas nunca supera el 25% del tablero. Dos trampas nunca están pegadas ortogonalmente. Ni la persona ni la IA conocen sus ubicaciones al comenzar.

### Victoria y empate
Después de que ambos hayan jugado, gana quien conserve cargas cuando el otro ya no tenga ninguna. Se comprueba tras la colocación y tras los envíos completos de cada explosión; la eliminación detiene la cadena aunque queden celdas sobrecargadas. La cola procesa las reacciones en orden de llegada.

Una trampa en la apertura puede dejarte sin cargas; no se declara la derrota hasta que ambos hayan jugado. Si ambos quedan sin cargas, hay empate. También hay empate al llegar a 300 jugadas, detectar un ciclo de propagación o alcanzar el límite de seguridad de una cascada. El resultado indica la causa.

<!-- page -->
## Modos y controles
### Tres maneras de jugar
- Tú contra la IA: juegas primero, en menta. El agente coral responde automáticamente.
- Dos jugadores locales: dos personas usan el mismo dispositivo y se alternan. No hay sala online ni conexión entre dispositivos.
- Observar IA contra IA: ambos participantes son agentes. «Un turno de IA» ejecuta una decisión; «Reproducir» avanza automáticamente; «Pausar» detiene el avance después del turno en curso.

### Tamaño y dificultad
Los tamaños se expresan en columnas × filas: 4 × 4, 4 × 6, 5 × 7, 6 × 6, 6 × 8, 6 × 10, 7 × 9, 8 × 8, 8 × 10, 8 × 12 y 10 × 12. El formato 6 × 8 es vertical; 4 × 6 y 5 × 7 caben mejor en móviles bajos. Cada casilla mide entre 44 y 52 px. Los tableros que no caben se deslizan sin reducir el área táctil. Cambiar selectores no altera una partida activa hasta pulsar «Empezar partida».

Explorador busca hasta profundidad 2 con un presupuesto de 180 ms. Táctico busca hasta 3 con 650 ms. Experto intenta llegar a 5 con 1100 ms. Son máximos: el agente conserva la última profundidad completada cuando se agota el tiempo.

### Herramientas de observación
- Mapa de riesgo: muestra la probabilidad estimada de trampa en cada celda sin explorar. Es una estimación, no la verdad oculta. Una celda con 0% puede contener una ventaja o ser normal.
- Ruta A*: dibuja una ruta táctica cuando existe un origen crítico y un objetivo rival. Es una orientación en un modelo relajado; no garantiza la siguiente explosión ni una victoria.
- Sonido: activa un tono breve por jugada. Está desactivado inicialmente.
- Bitácora: aparece en «IA» y registra coordenada, jugador, explosiones y eventos. «Descargar bitácora» en el menú exporta el JSON.
- Velocidad: lenta, normal, rápida o sin animación. «Omitir» lleva al resultado ya calculado; no cambia la jugada. Se respeta la preferencia del dispositivo de reducir movimiento.

Las letras identifican columnas y los números filas: A1 es la esquina superior izquierda. Tab recorre las casillas habilitadas; Enter o espacio las activa. Las flechas desplazan el foco. Las reacciones largas se aceleran; en cascadas extremas se abrevia la animación y se muestra el resultado completo.

### Guardado y privacidad
Las partidas se guardan automáticamente en Supabase. Al actualizar la página se recupera la última jugada guardada en ese navegador. La sesión usa una cookie HttpOnly de hasta 30 días. Borrar cookies, usar incógnito o cambiar de navegador crea otra sesión; no existe recuperación por correo.

Al iniciar otra partida se reemplaza la actual: descarga antes su bitácora si deseas conservarla. El JSON no incluye el mapa secreto ni la semilla durante una partida activa. Al terminar se revela el mapa y la semilla para su estudio.

<!-- page -->
## Laboratorio y exposición
### Evaluar al agente
Abre «Laboratorio» y pulsa «Iniciar evaluación». Se ejecutan 12 partidas de 4 × 4 contra un rival aleatorio, con mapas emparejados y lados alternados. El panel muestra victorias, derrotas, empates, nodos, tiempos y error de Brier.

El error de Brier mide la calidad de las probabilidades antes de descubrir un evento. Un valor menor es mejor. No lo leas como porcentaje de acierto ni como probabilidad de victoria.

La evaluación web usa profundidad 1 para terminar rápidamente. Por ese motivo no tiene podas internas alfa-beta. Para observar podas reales, juega en Táctico o Experto y mira el panel de la arena.

### Entrenar pesos
Pulsa «Entrenar con autojuego». Compiten seis estrategias durante cuatro generaciones, con 96 partidas de entrenamiento y cuatro de validación separada. Al finalizar aparecen la curva de aptitud y los cinco pesos aprendidos.

«Aplicar pesos aprendidos» modifica la estrategia de los agentes de tu sesión desde su siguiente turno. No cambia las reglas, los eventos ni las sesiones de otras personas. Descarga el JSON para conservar el resultado: los experimentos del laboratorio no son una biblioteca permanente y pueden perderse al reiniciar el servicio.

### Guion de demostración de 7 minutos
1. Minuto 1: presenta el problema. Todo el tablero es visible, pero los eventos permanecen ocultos.
2. Minutos 2-3: juega dos o tres turnos y explica capacidades, captura y cascadas.
3. Minuto 4: activa el mapa de riesgo. Explica que descubrir una trampa elimina la posibilidad de otra trampa en sus vecinos ortogonales.
4. Minuto 5: cambia a IA contra IA. Ejecuta turnos de uno en uno y relaciona nodos, poda, tiempo y profundidad con la decisión.
5. Minuto 6: abre el laboratorio y ejecuta una evaluación. Distingue métricas medidas de promesas de rendimiento.
6. Minuto 7: muestra el entrenamiento genético, aplica los pesos y abre la guía técnica para explicar la arquitectura.

### Si aparece un problema
- El servicio tarda al abrir: Render gratuito puede suspenderse por inactividad. Espera el arranque y recarga; es distinto del tiempo de cálculo del agente.
- «No se pudo guardar»: revisa la conexión y reintenta. La aplicación conserva la última jugada guardada; no afirma guardar en Supabase si falló.
- «La partida cambió»: otra pestaña modificó la sesión. Recarga para recuperar la revisión actual.
- «La IA está atendiendo otra partida»: espera unos segundos y pulsa «Reintentar turno de IA».
- No aparece una ruta A*: todavía no existe una celda crítica propia y un objetivo rival para construirla.
- Un experimento se interrumpió: vuelve a iniciarlo o usa los comandos locales indicados en la guía técnica.
