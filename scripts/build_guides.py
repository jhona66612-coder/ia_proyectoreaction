from pathlib import Path
import json,re,html
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Preformatted,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
benchmark=json.loads((ROOT/'results/benchmark.json').read_text(encoding='utf-8'))
training=json.loads((ROOT/'results/training.json').read_text(encoding='utf-8'))
held=sum(m['winner']==m['side'] for m in training['holdout'])
USE='''# Guía de uso
## TacticReaction
### Juega, observa y presenta un sistema de agentes inteligentes

Versión 1.0 · 19 de noviembre de 2026

TacticReaction es un juego por turnos de reacciones en cadena. Compites por el control de un tablero mientras descubres trampas y ventajas. Además de jugar, puedes observar cómo un agente decide y ejecutar experimentos para explicar inteligencia artificial en una exposición.

### Inicio en un minuto
1. Abre la aplicación publicada en Render. El enlace verificado está en docs/despliegue.md, dentro del repositorio de GitHub.
2. En «Tu próxima partida», elige «Tú contra la IA», tablero 6 × 6 y nivel «Táctico».
3. Pulsa «Nueva partida». Si es tu primera visita, la aplicación ya habrá preparado una arena por defecto.
4. Pulsa una casilla vacía. Tu color es menta; el rival usa coral. La IA responderá automáticamente.
5. Observa el panel «Dentro de la IA»: muestra el trabajo real de búsqueda, no cifras decorativas.

No necesitas registrarte, introducir datos personales ni obtener una clave de IA. Usa un navegador actual con JavaScript y conexión a internet. Funciona con ratón, pantalla táctil y teclado. En móvil, la configuración y el panel técnico aparecen debajo del tablero.

### Qué encontrarás
- Arena: juego, configuración, jugadores, tablero, decisiones y bitácora.
- Laboratorio: evaluación del agente y entrenamiento genético.
- Guías: estos manuales, arquitectura y código fuente.

El título «jugador 01» identifica al participante, no un nivel de dificultad. Los números junto a los jugadores cuentan sus cargas; también se muestra cuántas casillas ocupan.

<!-- page -->
## Reglas del juego
### Colocar, explotar y capturar
Cada turno añade una carga a una celda vacía o propia. No puedes seleccionar una celda que pertenezca al rival. Sí puedes conquistarla mediante una explosión vecina.

Una esquina admite 1 carga, un borde 2 y una celda interior 3. La explosión se produce al superar esa capacidad: con 2, 3 o 4 cargas, respectivamente. Los pequeños puntos inferiores recuerdan la capacidad de cada celda.

Una explosión resta a la celda tantas cargas como vecinos ortogonales tenga. Envía una carga a cada vecino de arriba, abajo, izquierda y derecha, y cambia esos vecinos al color del jugador que provocó la reacción. Si un vecino supera a su vez la capacidad, continúa la cascada.

Ejemplo: una esquina con una carga recibe otra. Explota y envía una carga a sus dos vecinos. Si uno era rival, lo captura. Las cargas anteriores de ese vecino permanecen y se suma la nueva, salvo que active una trampa.

### Eventos ocultos
- Normal: la primera llegada revela que la celda es normal; no añade efectos especiales.
- Trampa (×): elimina todas las cargas de esa celda y la deja vacía. No se vuelve a activar en turnos posteriores.
- Ventaja (+): añade una carga extra inmediata. Puede provocar una explosión. También se consume una sola vez.

Los eventos se activan al colocar directamente o recibir una carga durante una cascada. Una casilla ya revelada mantiene su símbolo para recordar qué ocurrió; el símbolo no indica que el efecto pueda repetirse.

La suma de trampas y ventajas nunca supera el 25% del tablero. Dos trampas nunca están pegadas ortogonalmente. Ni la persona ni la IA conocen sus ubicaciones al comenzar.

### Victoria y empate
Después de que ambos participantes hayan realizado al menos una jugada, gana quien conserve cargas cuando el otro ya no tenga ninguna. La eliminación se comprueba durante las cascadas y detiene la propagación.

Una trampa en la apertura puede dejarte sin cargas; no se declara la derrota hasta que ambos hayan jugado. Si ambos quedan sin cargas, hay empate. También hay empate al llegar a 300 jugadas, detectar un ciclo de propagación o alcanzar el límite de seguridad de una cascada. El resultado indica la causa.

<!-- page -->
## Modos y controles
### Tres maneras de jugar
- Tú contra la IA: juegas primero, en menta. El agente coral responde automáticamente.
- Dos jugadores locales: dos personas usan el mismo dispositivo y se alternan. No hay sala online ni conexión entre dispositivos.
- Observar IA contra IA: ambos participantes son agentes. «Un turno de IA» ejecuta una decisión; «Reproducir» avanza automáticamente; «Pausar» detiene el avance después del turno en curso.

### Tamaño y dificultad
El tablero 4 × 4 sirve para demostraciones rápidas, 6 × 6 para una partida normal y 8 × 8 para explorar más posibilidades. Cambiar los selectores no modifica la partida activa: pulsa «Nueva partida» para aplicar la configuración.

Explorador busca hasta profundidad 2 con un presupuesto de 180 ms. Táctico busca hasta 3 con 650 ms. Experto intenta llegar a 5 con 1100 ms. Son máximos: el agente conserva la última profundidad completada cuando se agota el tiempo.

### Herramientas de observación
- Mapa de riesgo: muestra la probabilidad estimada de trampa en cada celda sin explorar. Es una estimación, no la verdad oculta. Una celda con 0% puede contener una ventaja o ser normal.
- Ruta A*: dibuja una ruta táctica cuando existe un origen crítico y un objetivo rival. Es una orientación en un modelo relajado; no garantiza la siguiente explosión ni una victoria.
- Sonido: activa un tono breve por jugada. Está desactivado inicialmente.
- Bitácora: registra coordenada, jugador, explosiones y eventos. La flecha de descarga exporta un JSON de la partida.

Las letras identifican columnas y los números filas: A1 es la esquina superior izquierda. El tablero se puede recorrer con Tab; Enter o espacio activa una casilla enfocada. Las flechas desplazan el foco a una celda adyacente si está habilitada.

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
'''
AGENTS=f'''# Guía de agentes e inteligencia artificial
## TacticReaction
### Arquitectura, algoritmos y evidencia experimental

Versión 1.0 · 19 de noviembre de 2026

Este documento explica la implementación real del proyecto. Los algoritmos se ejecutan en JavaScript sobre Node.js. No se llama a un LLM, no se generan jugadas con texto y no se requiere un servicio de IA de pago.

### Arquitectura y significado de «agente»
El sistema coordina cuatro módulos especializados: generador, probabilístico, decisor y evolutivo. Cada módulo recibe un estado, persigue un objetivo y produce una acción o resultado. Su coordinación forma un agente híbrido basado en utilidad con aprendizaje offline.

En la arena hay dos participantes competitivos. Cada participante automático usa el decisor y las creencias; el generador prepara el entorno y el evolutivo aprende parámetros fuera de la partida. Los cuatro módulos no son cuatro jugadores independientes ni cuatro procesos que conversan mediante lenguaje natural.

Flujo: configuración > mapa válido > percepción pública > creencias > búsqueda > jugada legal > propagación > nuevas observaciones. El entrenamiento entrega los pesos al decisor por una vía separada.

### REAS de la implementación
- Rendimiento: victoria, control territorial y crítico, bajo riesgo y respuesta acotada. Se mide también tiempo, nodos, cortes y calidad probabilística.
- Entorno: cuadrícula discreta con propietarios, cargas y eventos estáticos ocultos. Parcialmente observable, secuencial, adversario y por turnos.
- Actuadores: seleccionar una coordenada válida y colocar una carga.
- Sensores: cargas y propietarios visibles, eventos ya revelados e historial público. La distribución real de eventos y la semilla de partida no forman parte de la percepción.

El servidor es autoritativo: valida turno, coordenada y propietario. La función observe elimina la semilla y sustituye cada evento desconocido por null. chooseMove vuelve a borrar cualquier evento no revelado como defensa adicional. Una prueba cambia el mapa secreto y comprueba que, con la misma percepción, la decisión no cambia.

Código: shared/engine.mjs, shared/ai.mjs y server/server.mjs.

<!-- page -->
## Generación y dinámica del entorno
### PSR: variables, dominios y restricciones
Cada evento que debe colocarse es una variable. Su dominio contiene las posiciones disponibles del tablero. Se exige que dos eventos no ocupen la misma posición, que las trampas tengan distancia Manhattan al menos 2 y que la densidad total no supere el 25%.

Para n celdas se usan K = floor(n / 8) trampas y V = floor(n / 8) ventajas: 2+2 en 4 × 4, 4+4 en 6 × 6 y 8+8 en 8 × 8.

Backtracking asigna posiciones y retrocede si no puede completar el mapa. MRV selecciona la variable con menos posiciones válidas; el desempate de grado prioriza trampas, que participan en restricciones adicionales. LCV prefiere posiciones con menor número de vecinos, preservando opciones. Forward checking revisa dominios tras una asignación.

AC-3 recorre arcos entre variables pendientes. Elimina una posición de un dominio si no tiene soporte compatible en el dominio de la otra variable, y vuelve a revisar los arcos afectados. En esta densidad baja muchas ejecuciones no necesitan eliminar valores; el algoritmo sigue ejecutándose.

### Búsqueda local y equidad
Con un mapa válido, se intercambian dos asignaciones y se acepta el cambio si conserva las restricciones y no aumenta el costo de desequilibrio. Se realizan como máximo 600 propuestas.

Costo = suma, por tipo de evento y por eje, de (cantidad en primera mitad - cantidad en segunda mitad) al cuadrado.

Es una mejora espacial mediante búsqueda local. No es una garantía de equilibrio de victorias, óptimo global ni seguridad de las aperturas. La generación tiene semilla y puede reproducirse. La web no permite elegir una semilla antes de una partida competitiva para evitar revelar el mapa a quien ya lo haya calculado.

### Motor de transición
La capacidad es grado ortogonal - 1. Una jugada suma una carga; una primera llegada activa el evento; las celdas sobrecargadas entran en una cola. Cada explosión resta el grado y reparte una carga a cada vecino, que pasa al jugador activo. El motor detecta terminalidad después de la colocación y de cada distribución completa.

Las trampas borran cargas; las ventajas suman una. Las alternativas de bloqueo e inmunidad mencionadas en la propuesta no se mezclan con estas reglas. La elección explícita facilita reproducir y explicar las partidas.

Se añaden empates por ciclo, límite de cascada y 300 jugadas para garantizar una salida observable ante casos extremos. No se atribuye una victoria arbitraria.

Código: generateMap, ac3, fairness, validMap, applyMove y terminal en shared/engine.mjs.

<!-- page -->
## Decisión adversaria y búsqueda informada
### Minimax con poda alfa-beta
MAX es el jugador que decide; MIN es su adversario. La búsqueda alterna jugadas legales, simula las reglas y evalúa las hojas. Alfa conserva la mejor cota del maximizador y beta la del minimizador. Cuando beta <= alfa, las continuaciones restantes no pueden mejorar la decisión de ese subárbol y se descartan.

La implementación ordena primero movimientos críticos y posiciones favorables. Usa profundización iterativa: completa profundidad 1, luego 2 y así sucesivamente. Solo reemplaza la clasificación de jugadas cuando completa toda una profundidad; si falta tiempo, conserva el resultado anterior.

Explorador: profundidad máxima 2, 180 ms, dos mundos. Táctico: 3, 650 ms, tres mundos. Experto: 5, 1100 ms, tres mundos. Un supervisor detiene el worker a 1400 ms y devuelve una jugada legal de respaldo, señalada en la explicación. Este es un mecanismo de mejor esfuerzo: la suspensión del proceso, red, cola y guardado no están cubiertos por una garantía dura de 1.5 segundos.

### Utilidad
Los estados terminales valen +1000 para victoria, -1000 para derrota y 0 para empate. Las hojas no terminales combinan cinco criterios: diferencia de cargas, diferencia de celdas críticas, control de esquinas/bordes, beneficio esperado y riesgo esperado. La evaluación no terminal se acota entre -900 y 900.

Eval = w1 * masa + w2 * críticas + w3 * posición + w4 * beneficio - w5 * riesgo.

Las celdas ocupadas ya fueron reveladas, por lo que el efecto probabilístico principal entra al valorar la acción candidata en la raíz. Se añade w4 * P(ventaja) - w5 * P(trampa) * (1 + 0.2 * P(estilo cauteloso)). Esto hace que los pesos de incertidumbre sí influyan en la elección de celdas nuevas.

### Incertidumbre: mundos plausibles
El agente construye muestras de eventos compatibles con la evidencia pública, los conteos y la separación entre trampas. Ejecuta la búsqueda sobre cada mundo y promedia la utilidad por acción. Nunca utiliza la distribución real del servidor.

Esta determinización aproxima la planificación bajo información parcial. No es expectiminimax exacto ni un POMDP completo; las decisiones futuras simuladas pueden beneficiarse de información específica del mundo muestreado (sesgo de determinización). Dos o tres muestras no garantizan una estimación precisa.

### A* y su alcance
A* conecta una celda propia crítica con un objetivo rival sobre el grafo de vecindad. Cada arista cuesta al menos 1 e incorpora cargas faltantes y riesgo. La heurística Manhattan es una cota admisible para este grafo; se prueba el costo contra Dijkstra. La ruta orienta el orden de exploración de Minimax.

La ruta mínima de este modelo relajado no equivale a la secuencia mínima de jugadas del juego completo: allí hay capturas, trampas, respuestas rivales y propagación simultánea. La interfaz la presenta como orientación táctica.

Código: shared/ai.mjs; aislamiento y supervisor: server/worker.mjs, server/server.mjs.

<!-- page -->
## Red bayesiana y filtrado temporal
### Variables y estructura
La red explícita BAYES_NETWORK contiene cuatro nodos: conteos de eventos restantes, existencia de una trampa revelada adyacente, tipo de evento de la celda y observación de revelación. Los dos primeros condicionan el evento, y el evento determina la observación.

Estados de evento: normal, trampa, ventaja. Para una celda revelada la observación es exacta y la distribución posterior es una masa puntual. Para una celda desconocida se utilizan conteos restantes y exclusión por vecindad.

P(trampa) = trampas restantes / posiciones desconocidas candidatas, salvo que una trampa revelada vecina fuerce P(trampa) = 0.

P(ventaja) = mínimo entre ventajas restantes / celdas desconocidas y 1 - P(trampa). P(normal) = 1 - P(trampa) - P(ventaja).

Estos son marginales aproximados bajo intercambiabilidad de las posiciones elegibles. No enumeran todos los mapas válidos ni todas las correlaciones de la búsqueda local. El recorte garantiza probabilidades no negativas y suma 1; no garantiza conteos esperados exactos cuando el recorte interviene.

### Actualización en el tiempo
Los eventos no se mueven: su transición temporal es la matriz identidad 3 × 3. La observación es una matriz identidad categórica porque una revelación no tiene ruido. filterCell aplica predicción y actualización por Bayes; antes de revelar se conserva la creencia, después se concentra en el evento observado.

Las nuevas revelaciones también cambian los conteos y restricciones globales. infer recalcula los marginales con toda la evidencia acumulada. No se multiplica repetidamente la misma revelación como si fueran observaciones independientes.

### HMM separado de estilo rival
Estados latentes: cauteloso y expansivo. Matriz de transición: primera fila [0.85, 0.15], segunda fila [0.20, 0.80]. Elegir una esquina/borde tiene verosimilitudes [0.75, 0.30]; elegir una celda interior tiene [0.25, 0.70]. Cada observador mantiene su propia distribución sobre su rival.

Se predice la distribución siguiente con la matriz y se multiplica por la verosimilitud de la acción observada; luego se normaliza. El resultado modula suavemente la penalización de riesgo de la utilidad.

Los parámetros y la etiqueta «cauteloso» son decisiones didácticas, no parámetros ajustados con datos humanos. La preferencia espacial no prueba que alguien conozca una trampa. Por eso el HMM no inventa evidencia sobre eventos ni mueve las trampas; complementa la política de decisión.

### Medir la inferencia
Antes de cada revelación se registra el error de Brier multicategoría, promediado entre los tres estados: suma de (probabilidad - indicador real) al cuadrado, dividida entre 3. Se usa evidencia anterior al movimiento para evitar evaluar después de conocer la respuesta. En cascadas, todas las revelaciones de ese movimiento usan ese mismo mapa previo.

Código: shared/belief.mjs. Los tests comprueban normalización, exclusión vecinal, filtrado y ausencia de acceso al mapa real.

<!-- page -->
## Aprendizaje evolutivo
### Cromosomas, fitness y operadores
Cada individuo es un vector de cinco pesos. La población inicial contiene el vector base [7, 4, 3, 2, 6] y cinco variaciones aleatorias. Cada candidato juega contra el agente base en dos mapas y ambos lados: cuatro partidas por evaluación.

Fitness = (victorias + 0.5 * empates) / partidas. Los mapas son comunes dentro de cada generación para comparar candidatos en condiciones semejantes. Cada nueva generación cambia las semillas; por eso la mejor aptitud puede bajar aunque se preserve un individuo élite.

- Selección: torneo de dos candidatos, gana el de mayor fitness.
- Cruce: uniforme; cada gen procede de uno de los dos padres con probabilidad 0.5.
- Mutación: probabilidad 0.25 por gen, perturbación uniforme de hasta ±1.5, limitada al intervalo [0.25, 15].
- Elitismo: conserva el mejor vector de la generación.

Cuatro generaciones de seis candidatos y cuatro partidas producen 96 partidas de entrenamiento. Se añaden cuatro partidas en semillas separadas para validación. El candidato elegido es el mejor de la última generación, no un supuesto óptimo global.

### Pesos incluidos en esta entrega
Masa: {training['weights'][0]:.3f}; críticas: {training['weights'][1]:.3f}; posición: {training['weights'][2]:.3f}; ventaja: {training['weights'][3]:.3f}; riesgo: {training['weights'][4]:.3f}.

La aptitud final observada fue {training['fitness']:.2f}. En validación independiente obtuvo {held} victorias de 4. Esta muestra es pequeña: no demuestra que los pesos sean superiores en tableros grandes o a mayor profundidad.

Los pesos provienen de una ejecución real, registrada en results/training.json. El servidor los carga al iniciar nuevas sesiones. Un entrenamiento en la web no cambia el artefacto global: «Aplicar pesos aprendidos» actualiza la sesión actual. Para cambiar globalmente los pesos, ejecuta el entrenamiento local, versiona el resultado y despliega la nueva versión.

### Ejecutar localmente
Requiere Node.js 22 o posterior. Dentro del proyecto:
```
npm ci
npm test
npm run train
npm run experiment -- 24
npm start
```

Sin Supabase, el servidor usa memoria temporal. Para usar la base, crea .env desde .env.example y ejecuta node --env-file=.env server/server.mjs. Usa solo la clave publicable y la URL del proyecto. No copies claves secretas al repositorio.

La semilla 2026 reproduce el mapa y la aleatoriedad algorítmica. Los presupuestos temporales pueden truncar búsquedas en momentos diferentes según el hardware, así que no se promete reproducibilidad bit a bit de todos los tiempos ni decisiones.

Código: shared/evolution.mjs, scripts/train.mjs y scripts/experiment.mjs.

<!-- page -->
## Evidencia y lectura de resultados
### Evaluación incluida
Se ejecutaron {benchmark['games']} partidas de 4 × 4 con el agente de referencia frente a un rival aleatorio. La profundidad fue 1, con presupuesto de 12 ms y una muestra por decisión. Los mapas se emparejaron con lados alternados. No es una evaluación del nivel Experto ni de los pesos evolucionados.

- Victorias: {benchmark['wins']}; derrotas: {benchmark['losses']}; empates: {benchmark['draws']}.
- Tasa observada de victoria: {benchmark['winRate']*100:.1f}%.
- Nodos evaluados: {benchmark['nodes']}.
- Tiempo medio medido por decisión del agente: {benchmark['meanMs']:.3f} ms; máximo: {benchmark['maxMs']:.2f} ms.
- Error de Brier medio: {benchmark['brier']:.4f}.
- Cortes alfa-beta: 0, coherente con una búsqueda de profundidad 1 sin niveles internos que podar.

Los datos íntegros están en results/benchmark.json. Estos tiempos son de la máquina de preparación, no mediciones de latencia HTTP de Render. Incluyen las decisiones automáticas del experimento; no incluyen carga de página, red ni escritura en Supabase.

### Qué demuestra cada comprobación
Las pruebas de motor verifican capacidades, capturas, activación única, terminalidad, ilegalidad y estabilidad. El generador se comprueba sobre 120 mapas de los tres tamaños. La prueba de confidencialidad cambia eventos secretos sin cambiar percepciones y exige la misma decisión.

Minimax con poda se compara con Minimax sin poda en una posición conocida y con profundidad completa: deben elegir la misma acción y puntuación, mientras alfa-beta visita menos nodos. A* se compara con Dijkstra en el mismo grafo ponderado.

El ciclo HTTP comprueba creación, jugada, revisión obsoleta, turno incorrecto, recuperación, aislamiento y rechazo de origen externo. En Supabase se verificaron lectura y actualización propias, denegación entre sesiones y denegación sin token; la transacción de prueba se revierte.

### Límites de interpretación
Una muestra pequeña contra un rival aleatorio no prueba inteligencia general ni superioridad frente a humanos. El conteo de «cortes» mide puntos donde se aplica alfa-beta; «ramas descartadas» estima continuaciones inmediatas omitidas, no el número exacto de todos los nodos descendientes que nunca se generaron.

El porcentaje de riesgo de una celda es una creencia del modelo, no una frecuencia garantizada. El error de Brier permite discutir calibración sin confundir una predicción con una certeza. Las ventajas espaciales y el estilo rival son aproximaciones explícitas.

### Experimento ampliado sugerido
Para una evaluación académica más sólida, aumenta las semillas, compara rival aleatorio y agente base, separa entrenamiento y test, alterna lados y registra tableros y presupuestos idénticos. Reporta incertidumbre estadística y distribución de tiempos, además del promedio. No mezcles los resultados de la configuración rápida con los del modo Experto.

<!-- page -->
## Operación, seguridad y trazabilidad
### Render y Supabase
Un único servicio Node sirve la interfaz y la API. Los workers calculan decisiones y experimentos sin bloquear el bucle HTTP. Se limita a dos cálculos de IA y un laboratorio simultáneos para adecuarse al servicio gratuito. /health informa disponibilidad del proceso y modo de almacenamiento.

Supabase conserva un documento JSON por sesión en reaction_sessions. La cookie de sesión contiene 32 bytes aleatorios codificados en hexadecimal; el identificador de la fila es su hash SHA-256. RLS compara el hash de la cabecera x-session-token con el identificador y exige el formato esperado. Las políticas de UPDATE incluyen USING y WITH CHECK.

La cookie es HttpOnly y SameSite=Strict; en Render también Secure. El servidor valida origen, método, tamaño del cuerpo, revisión y legalidad. Los archivos del servidor no se sirven como estáticos. El mapa oculto se guarda en Supabase y solo sale del servidor cuando la partida termina.

La clave de Supabase es publicable. La protección efectiva depende de RLS y del token de sesión, no de ocultar esa clave. No hay service_role, funciones SECURITY DEFINER ni datos de identidad personal. Un poseedor del token controla su propia sesión; no es un sistema de identidad ni un ranking competitivo protegido contra modificaciones de la propia cuenta.

### Alcance operativo
Render gratuito puede suspenderse por inactividad. Los experimentos en curso residen en memoria y se pierden si el servicio reinicia; las partidas guardadas permanecen en Supabase. La sesión del navegador no es transferible mediante login. El límite de solicitudes es local al proceso, no una defensa distribuida contra abuso.

No hay limpieza automática de filas al caducar las cookies. Para uso prolongado conviene definir una retención y un proceso de limpieza, además de protección de cuotas. La entrega está dimensionada para demostración académica y grupos pequeños, no para tráfico masivo.

### Referencias al repositorio
- shared/engine.mjs: reglas, PSR, AC-3 y búsqueda local.
- shared/belief.mjs: red, filtrado temporal, HMM y Brier.
- shared/ai.mjs: Minimax, alfa-beta, A*, muestreo y utilidad.
- shared/evolution.mjs: autojuego, evaluación y algoritmo genético.
- server/server.mjs: API, turnos, métricas y orquestación.
- server/storage.mjs: persistencia y capacidades de sesión.
- supabase/schema.sql: tabla y políticas RLS.
- tests/: comprobaciones reproducibles.
- docs/matriz-cumplimiento.md: correspondencia con cada requisito.

### Fuentes técnicas consultadas
Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

Render, despliegues y verificaciones de salud: https://render.com/docs/deploys y https://render.com/docs/health-checks

Node.js, worker threads: https://nodejs.org/api/worker_threads.html

'''

def safe(text):
    text=html.escape(text).replace('→',' &gt; ')
    text=re.sub(r'`([^`]+)`',r'<font name="Mono">\1</font>',text)
    return text

fontdir=Path('C:/Windows/Fonts')
for name,file in [('Body','segoeui.ttf'),('Bold','segoeuib.ttf'),('Mono','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(fontdir/file)))
styles={
 'title':ParagraphStyle('title',fontName='Bold',fontSize=30,leading=34,textColor=HexColor('#102e3a'),spaceAfter=18),
 'h2':ParagraphStyle('h2',fontName='Bold',fontSize=19,leading=23,textColor=HexColor('#123442'),spaceAfter=14),
 'h3':ParagraphStyle('h3',fontName='Bold',fontSize=11.5,leading=15,textColor=HexColor('#087b69'),spaceBefore=12,spaceAfter=6),
 'body':ParagraphStyle('body',fontName='Body',fontSize=9.5,leading=14,textColor=HexColor('#293e4a'),spaceAfter=9),
 'bullet':ParagraphStyle('bullet',fontName='Body',fontSize=9.5,leading=14,textColor=HexColor('#293e4a'),leftIndent=12,firstLineIndent=-8,spaceAfter=5),
 'code':ParagraphStyle('code',fontName='Mono',fontSize=9,leading=13,backColor=HexColor('#eef5f4'),borderPadding=10,spaceAfter=12)
}

def make(slug,title,content):
    (DOCS/f'{slug}.md').write_text(content,encoding='utf-8')
    story=[];lines=content.splitlines();buf=[];code=[];incode=False
    def flush():
        if buf:story.append(Paragraph(safe(' '.join(buf)),styles['body']));buf.clear()
    for line in lines:
        if line.startswith('```'):
            flush()
            if incode:story.append(Preformatted('\n'.join(code),styles['code']));code=[]
            incode=not incode;continue
        if incode:code.append(line);continue
        if not line.strip():flush();continue
        if line=='<!-- page -->':flush();story.append(PageBreak());continue
        if line.startswith('# '):flush();story.append(Paragraph(safe(line[2:]),styles['title']));continue
        if line.startswith('## '):flush();story.append(Paragraph(safe(line[3:]),styles['h2']));continue
        if line.startswith('### '):flush();story.append(Paragraph(safe(line[4:]),styles['h3']));continue
        if line.startswith('- ') or re.match(r'^\d+\. ',line):flush();story.append(Paragraph(safe(line),styles['bullet']));continue
        buf.append(line)
    flush()
    def decoration(canvas,doc):
        canvas.setFillColor(HexColor('#102431'));canvas.rect(0,806,595,36,fill=1,stroke=0)
        canvas.setFillColor(HexColor('#81edcc'));canvas.setFont('Bold',8);canvas.drawString(43,819,'TACTICREACTION')
        canvas.setFillColor(HexColor('#e0edf1'));canvas.setFont('Body',8);canvas.drawRightString(552,819,title)
        canvas.setStrokeColor(HexColor('#d4e1e4'));canvas.line(43,39,552,39)
        canvas.setFillColor(HexColor('#607681'));canvas.setFont('Body',7.5);canvas.drawString(43,26,'Proyecto de inteligencia artificial | v1.0 | 19/11/2026');canvas.drawRightString(552,26,str(doc.page))
    doc=SimpleDocTemplate(str(DOCS/f'{slug}.pdf'),pagesize=(595,842),leftMargin=43,rightMargin=43,topMargin=61,bottomMargin=54,title=title,author='TacticReaction')
    doc.build(story,onFirstPage=decoration,onLaterPages=decoration)

make('guia-uso','Guía de uso',USE)
make('guia-agentes','Guía de agentes e inteligencia artificial',AGENTS)
print('Guías generadas en docs/')
