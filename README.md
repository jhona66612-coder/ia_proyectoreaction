# TacticReaction

Juego táctico para demostrar agentes de inteligencia artificial, basado en la propuesta «Sistema multiagente táctico adversario con eventos ocultos, optimización evolutiva e inferencia probabilística dinámica».

## Jugar y estudiar

- [Jugar en Render](https://ia-proyectoreaction.onrender.com).
- [Guía de uso](docs/guia-uso.pdf) · [versión Markdown](docs/guia-uso.md).
- [Guía de agentes](docs/guia-agentes.pdf) · [versión Markdown](docs/guia-agentes.md).
- [Matriz de cumplimiento](docs/matriz-cumplimiento.md).

Tres modos: humano contra IA, dos jugadores locales y demostración IA contra IA. Once tamaños hasta 10 × 12 (columnas × filas), con formatos verticales para móvil; tres niveles de búsqueda; mapas de riesgo; explicación de decisiones; laboratorio de evaluación y aprendizaje; bitácora descargable; persistencia en Supabase.

La configuración está en `/` y «Empezar partida» abre `/play` en otra pestaña (o en la actual si el navegador bloquea ventanas). La arena usa casillas táctiles de 44–52 px, grupos de bolitas superpuestos que giran y cascadas animadas con viajes y absorción de rivales. Cada paso reproduce recibos públicos del motor; omitir la animación no altera el resultado. El menú ofrece velocidad, riesgo, ruta y sonido; el botón IA abre métricas y bitácora.

Reglas **Táctico** conserva los eventos ocultos de la propuesta; **Clásico** permite aprender sin eventos. El contador `2/4` muestra cargas actuales y umbral de explosión. Esquinas explotan con 2, bordes con 3 e interiores con 4: una carga por vecino ortogonal. Capturar 2 rivales con una carga produce 3 propias.

## Ejecutar

Requiere Node.js 22 o posterior. El juego no tiene dependencias npm de terceros ni necesita claves de modelos de lenguaje.

```sh
npm ci
npm test
npm start
```

Abre `http://localhost:3000`. Sin variables de Supabase funciona en memoria (las partidas desaparecen al reiniciar el servidor). Para persistencia copia `.env.example` a `.env`, completa URL y clave **publicable** y ejecuta:

```sh
node --env-file=.env server/server.mjs
```

La tabla y las políticas están en `supabase/schema.sql`. Nunca se necesita una clave `service_role`. Cada navegador recibe una capacidad aleatoria de 256 bits en cookie HttpOnly; RLS comprueba su hash para aislar las partidas.

## IA implementada

| Módulo | Implementación |
|---|---|
| Generador | PSR con backtracking, MRV, grado, LCV, forward checking, AC-3 y búsqueda local |
| Probabilístico | Red categórica de eventos condicionada por evidencia pública, filtro de identidad estática y HMM de estilo rival |
| Decisor | Minimax con alfa-beta, profundización iterativa y mundos plausibles muestreados; A* sobre grafo espacial relajado |
| Evolutivo | Autojuego, torneo, cruce uniforme, mutación y elitismo; pesos iniciales entrenados incluidos |

Los agentes son módulos especializados coordinados por el servidor. El juego competitivo tiene dos participantes, humanos o agentes decisores. No son cuatro jugadores ni cuatro LLM. El agente nunca recibe el mapa oculto real.

## Experimentos

```sh
npm run experiment -- 24
npm run train
```

Los resultados se guardan en `results/benchmark.json` y `results/training.json`. El servidor carga los pesos de `training.json` al arrancar. En la web, «Aplicar pesos aprendidos» cambia solo la sesión actual. El laboratorio usa búsqueda de profundidad 1 para ser ligero: observar cero podas allí es correcto. Usa el modo Táctico o Experto para estudiar alfa-beta.

La evaluación incluida no demuestra superioridad general: 24 partidas contra un rival aleatorio, con mapas emparejados y lados alternados. La validación genética emplea cuatro partidas separadas. Los tiempos dependen de hardware, carga y presupuesto; las semillas fijan mapas y aleatoriedad, pero los cortes por tiempo pueden alterar decisiones.

## Estructura

```text
public/       Configuración, arena móvil y reproducción de cascadas, sin CDN
shared/       Motor, generador, creencias, búsqueda y evolución
server/       API HTTP, sesiones Supabase y procesos de cálculo
tests/        Reglas, IA, confidencialidad y ciclo HTTP
scripts/      Evaluación, entrenamiento y generación de guías
supabase/     Esquema y políticas de seguridad
results/      Resultados reales incluidos en la entrega
docs/         Dos guías en PDF/Markdown y operación
```

## Decisiones y límites

- Trampa: borra todas las cargas de la celda. Ventaja: añade una carga. Eventos de un solo uso, también durante cascadas. No se implementan las variantes alternativas de bloqueo o inmunidad.
- Equilibrio espacial reduce diferencias entre mitades; no garantiza igualdad de victorias ni evita una derrota por trampa inicial.
- A* es óptimo en su grafo relajado, no en la dinámica completa adversaria. El muestreo de mundos es una aproximación, no un solver POMDP exacto.
- La distribución marginal no modela todas las correlaciones del generador. El HMM de estilo es un modelo didáctico con parámetros explícitos, no evidencia de que el rival conozca los eventos.
- Presupuesto de búsqueda de hasta 1.1 s; supervisor de 1.4 s y jugada de respaldo. El servicio gratuito, la red y el guardado no tienen una garantía de latencia de 1.5 s.
- Empates por eliminación simultánea, ciclo de cascada, límite de seguridad o 300 jugadas. En experimentos, también por el límite indicado en el resultado.
- No hay cuentas personales ni multijugador remoto. La sesión pertenece al navegador y se conserva hasta 30 días mediante cookie; borrar cookies pierde el acceso. No se recogen nombres ni correos.

## Verificación

`npm test` verifica reglas y seguridad del motor, 120 mapas cuadrados y los formatos rectangulares, reconstrucción de cascadas desde los recibos de animación, conservación de cargas, información oculta, equivalencia Minimax/alfa-beta, A* frente a Dijkstra y ciclo HTTP. Se probaron también las políticas RLS con dos capacidades diferentes y acceso sin token. Las guías se generan con ReportLab (dependencia solo de documentación) y se inspeccionan tras renderizarlas con Poppler.

## Fuentes técnicas

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Render: despliegues](https://render.com/docs/deploys).
- [Render: health checks](https://render.com/docs/health-checks).
- [Node.js: worker threads](https://nodejs.org/api/worker_threads.html).

El PDF original del usuario no se publica en el repositorio. La matriz documenta la correspondencia entre sus requisitos y el código entregado.
