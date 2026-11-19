# Guía de agentes e inteligencia artificial
## TacticReaction
### Arquitectura, algoritmos y evidencia experimental

Versión 2.0 · 19 de noviembre de 2026

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
Masa: 3.359; críticas: 2.925; posición: 3.496; ventaja: 1.075; riesgo: 9.174.

La aptitud final observada fue 0.75. En validación independiente obtuvo 2 victorias de 4. Esta muestra es pequeña: no demuestra que los pesos sean superiores en tableros grandes o a mayor profundidad.

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
Se ejecutaron 24 partidas de 4 × 4 con el agente de referencia frente a un rival aleatorio. La profundidad fue 1, con presupuesto de 12 ms y una muestra por decisión. Los mapas se emparejaron con lados alternados. No es una evaluación del nivel Experto ni de los pesos evolucionados.

- Victorias: 20; derrotas: 4; empates: 0.
- Tasa observada de victoria: 83.3%.
- Nodos evaluados: 2138.
- Tiempo medio medido por decisión del agente: 0.169 ms; máximo: 4.49 ms.
- Error de Brier medio: 0.1286.
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
## Animación y vista móvil
### Separación entre simulación y presentación
El motor shared/engine.mjs produce una lista pública timeline cuando el servidor pide animate: true. Cada recepción incluye celda, jugador, estado anterior, estado con una carga añadida, estado tras el evento y cantidad capturada. Cada explosión registra su origen y los recibos de sus vecinos. Los eventos no revelados siguen como null; la semilla no forma parte de la animación.

public/animation.js reproduce estos recibos con Web Animations: llegada, unión, absorción, cambio de color, expansión y distribución ortogonal. No inventa movimientos ni recalcula reglas. El estado del servidor se guarda antes de comenzar la animación; omitirla, cerrar la pestaña o recargar conserva el resultado calculado.

Los grupos contienen esferas parcialmente superpuestas: dos forman una pareja unida, tres un trébol y cuatro muestran la sobrecarga transitoria. Un rotor CSS los hace girar dentro de su casilla. El contador conserva el número exacto incluso durante una sobrecarga mayor. El marcador se actualiza al terminar la secuencia.

### Captura y conservación
Capturar significa convertir todas las cargas rivales y sumar la que llega. Una recepción de dos cargas rivales produce tres propias. El efecto visual contrae el grupo rival y lo reemplaza por el grupo unido del atacante. Solo las trampas eliminan cargas; las ventajas añaden una. Las explosiones redistribuyen masa, no la crean ni la destruyen.

### Ritmo y límites
La interfaz bloquea nuevas jugadas hasta acabar la secuencia. El turno automático se programa después. La animación tiene tres velocidades y se puede omitir. También se desactiva cuando el usuario pide reducir movimiento en su sistema. Para mantener respuestas fluidas, las secuencias largas se aceleran; se devuelven hasta 160 cuadros lógicos y, si se exceden, se informa que se muestra directamente el resultado completo. La cola del motor siempre se resuelve con sus límites habituales.

Los recibos solo viajan en la respuesta de la jugada. La persistencia conserva la partida y su bitácora compacta, no todos los fotogramas. Las pruebas reconstruyen una cascada desde los recibos y comparan su resultado con el motor, además de verificar capturas, trampas, ventajas, conservación de cargas y ausencia de secretos sin revelar.

### Pantallas y reglas opcionales
La ruta / contiene configuración, laboratorio y guías. /play es la vista de juego; «Empezar partida» abre una pestaña y comparte la sesión segura del navegador. Si el navegador impide abrirla, se navega en la pestaña actual. Solo la vista de juego programa los turnos de IA; una pestaña en segundo plano no programa nuevas decisiones.

La cuadrícula usa casillas de 44 a 52 px y altura dinámica de la pantalla, con áreas seguras y desplazamiento interno para tableros grandes. Se ofrecen once formatos hasta 10 columnas y 12 filas. Las reglas Clásico crean un mapa normal conocido; sirven para aprender las cascadas. Las reglas Táctico conservan el generador y la inferencia de eventos de la propuesta. Los experimentos incluidos siguen usando el modo Táctico en 4 × 4.

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

