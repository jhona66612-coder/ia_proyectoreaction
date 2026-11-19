# Despliegue y operación

Repositorio: https://github.com/jhona66612-coder/ia_proyectoreaction

Aplicación publicada: https://ia-proyectoreaction.onrender.com

Panel de Render: https://dashboard.render.com/web/srv-dbvhh2m1egvs73dhgnt0

Proyecto Supabase: https://supabase.com/dashboard/project/tczgxinjixvyzdvvrons

## Configuración

- Proveedor: Render, espacio My Workspace.
- Tipo: Web Service, runtime Node.js, plan gratuito.
- Rama: main.
- Build: npm ci && npm test
- Inicio: npm start
- Node: 22 o superior.
- Puerto: variable PORT proporcionada por Render; escucha en 0.0.0.0.
- Endpoint de salud disponible: /health. Render usa su comprobación TCP predeterminada.
- Variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY; APP_ORIGIN opcional.
- Base: Supabase, proyecto ia-proyectoreaction, región sa-east-1.
- Esquema aplicado: supabase/schema.sql.

## Verificación realizada el 19/11/2026

Render confirmó el estado live. La prueba HTTP pública comprobó una partida IA contra IA hasta su fin, recuperación del mismo número de jugadas desde Supabase, aislamiento de otra sesión, ejecución de 12 partidas en el laboratorio y descarga HTTP 200 de ambas guías. En esa ejecución, la última decisión evaluó 3102 nodos, produjo 494 cortes y tardó 391.18 ms. Son mediciones de una ejecución, no un SLA.

En desarrollo se probaron además ocho turnos consecutivos con persistencia real. Las 19 pruebas automatizadas pasaron localmente y en el build de Render. Se inspeccionó la interfaz pública en navegador y se probaron jugadas y respuesta automática de la IA.

## Actualizar

Ejecuta las pruebas antes de subir cambios a main. Si el servicio está vinculado al proveedor Git con autodespliegue, Render despliega ese commit. Si usa una URL pública sin integración Git, solicita un despliegue manual de la versión nueva. Comprueba el estado live y /health; un despliegue simplemente aceptado todavía no está publicado.

## Copia local

El proyecto completo funciona con npm start y sin base externa, usando memoria. Para conectar Supabase, usa .env y node --env-file=.env server/server.mjs. .env está excluido del repositorio. La clave publicable se configura en Render, nunca hace falta service_role.

## Alcance de disponibilidad

El plan gratuito puede dormir por inactividad. El arranque y la red no forman parte del presupuesto del algoritmo. Las partidas están guardadas en Supabase; los trabajos temporales del laboratorio pueden perderse en reinicios. La cuota y disponibilidad dependen de ambos proveedores.
