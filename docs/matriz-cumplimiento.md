# Correspondencia con la propuesta

| Requisito | Entrega | Evidencia / límite |
|---|---|---|
| Tablero N × M, capacidades 1/2/3 | `shared/engine.mjs` | 4–10 columnas y 4–12 filas; once formatos cuadrados y verticales en la interfaz |
| Arena móvil y reacciones visibles | `public/animation.js`, `public/mobile.css` | Casillas 44–52 px, fusión giratoria, viajes y absorción; recibos públicos del motor, verificados por reconstrucción |
| Configuración independiente | `/` y `/play` | Partida en otra pestaña; alternativa en la actual si el navegador la bloquea |
| Jugadas en vacías o propias | `legalMoves`, `applyMove` | Valida también en servidor; pruebas rechazan las ilegales |
| Trampas y ventajas desconocidas | `observe` y frontera de `chooseMove` | Evento no revelado = null; semilla solo al finalizar |
| Efectos de eventos | `applyMove` | Se eligen las variantes borrar cargas / +1 carga; consumo único |
| Cascadas ortogonales y captura | `applyMove` | Cada explosión resta grado y añade 1 a cada vecino |
| Victoria tras jugar ambos | `terminal` | Se interrumpe la cascada cuando ocurre eliminación |
| Prevención de ciclos | Estado y cola repetidos + límites | Empate documentado; no se inventa un ganador |
| Densidad máxima 25% | `generateMap`, `validMap` | 120 mapas comprobados en pruebas |
| Distancia Manhattan entre trampas >= 2 | Restricción binaria y AC-3 | No hay trampas adyacentes |
| PSR | Backtracking, MRV, grado, LCV, forward checking, AC-3 | Contadores de nodos, retrocesos y revisiones |
| Búsqueda local | Intercambio de asignaciones válidas | Minimiza desequilibrio de mitades; no garantiza óptimo global |
| Minimax / alfa-beta | `shared/ai.mjs` | Prueba de misma decisión con y sin poda |
| A* | `astar` | Ruta óptima en grafo espacial relajado; comprobada contra Dijkstra |
| Red bayesiana estática | `BAYES_NETWORK`, `infer`, `filterCell` | Marginales aproximadas condicionadas por conteos y vecindad |
| Modelo temporal | Transición identidad de eventos + HMM de estilo rival | Matrices y observaciones explícitas; memoria por jugador |
| Algoritmo genético offline | `shared/evolution.mjs`, `scripts/train.mjs` | 96 partidas de entrenamiento + 4 de validación por ejecución |
| Utilidad ponderada de cinco pesos | `features`, `evaluate`, corrección de evento en raíz | Terminal ±1000/0; pesos incluidos y aplicables desde la web |
| Tiempo < 1.5 s de agente | Presupuesto 180/650/1100 ms, supervisor 1400 ms | Objetivo de cómputo; no garantía dura bajo suspensión del host |
| Métricas experimentales | Laboratorio, JSON y panel IA | Victorias, nodos, cortes, tiempo, error de Brier |
| Juego completo | Tres modos, guardado, fin de partida, reinicio, exportación | Multijugador local; no se solicitó online |
| Guía de uso | `docs/guia-uso.pdf` / `.md` | Reglas y demostración |
| Guía técnica de agentes | `docs/guia-agentes.pdf` / `.md` | Arquitectura, fórmulas, código, evidencias y límites |
| GitHub / Render / Supabase | Repositorio solicitado, servicio y base dedicada | Identificadores y verificación en `docs/despliegue.md` |

La sección teórica de la propuesta menciona BFS, DFS, costo uniforme, mínimos conflictos y recocido simulado como alternativas de contexto. Se implementan los algoritmos elegidos para los objetivos: A*, backtracking con consistencia de arcos y búsqueda local por mejora de intercambios; no se presentan los métodos alternativos como ejecutados.
