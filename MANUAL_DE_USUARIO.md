# Manual de Usuario — Gesco V2
## Sistema de Gestión de Contratos ESE Norte 3

---

## Índice

1. [¿Qué es Gesco V2?](#1-qué-es-gesco-v2)
2. [Acceso y navegación](#2-acceso-y-navegación)
3. [Panel Principal (Dashboard)](#3-panel-principal-dashboard)
4. [Resoluciones](#4-resoluciones)
5. [Contratos](#5-contratos)
6. [Contratistas](#6-contratistas)
7. [Supervisores](#7-supervisores)
8. [Perfiles](#8-perfiles)
9. [Plantillas de Observación](#9-plantillas-de-observación)
10. [Plantillas de Objeto](#10-plantillas-de-objeto)
11. [Importar desde Excel](#11-importar-desde-excel)
12. [Pagos y Supervisiones](#12-pagos-y-supervisiones)
13. [Configuración — Logos](#13-configuración--logos)
14. [Progreso de pago](#14-progreso-de-pago)
15. [Consejos útiles](#15-consejos-útiles)
16. [Solución de problemas comunes](#16-solución-de-problemas-comunes)

---

## 1. ¿Qué es Gesco V2?

Gesco V2 es un sistema web para gestionar los contratos de prestación de servicios de la **ESE Norte 3**. Permite:

- Registrar y administrar **contratos** de profesionales de la salud
- Gestionar **pagos y supervisiones** con evaluación de actividades
- Descargar **documentos legales** (contrato, actas, certificados)
- Importar datos desde **archivos Excel**
- Administrar **perfiles profesionales** con sus actividades
- Gestionar **supervisores** y asignarlos a contratos
- Personalizar **logos** en los encabezados de documentos
- Usar **plantillas** reutilizables para objetos del contrato y observaciones

---

## 2. Acceso y navegación

### Cómo acceder

Abre tu navegador (Chrome, Edge, Firefox) y ve a:

**https://contratos.esenorte3.lat**

El sistema carga directamente el **Dashboard** — no requiere inicio de sesión.

### Barra lateral (menú principal)

![Menú lateral](manual_screenshots/sidebar.png)

La barra lateral izquierda contiene todas las secciones del sistema:

| Icono | Sección | Descripción |
|-------|---------|-------------|
| 📊 | Dashboard | Panel principal con indicadores |
| 📄 | Resoluciones | Gestionar resoluciones presupuestales |
| ⚖️ | Contratos | Listar, crear y gestionar contratos |
| 👤 | Contratistas | Ver y editar datos de contratistas |
| ✅ | Supervisores | Gestionar supervisores asignables |
| 👥 | Perfiles | Administrar perfiles profesionales |
| 📋 | Plantillas | Plantillas de observación para supervisiones |
| 📄 | Obj. Plantillas | Plantillas reutilizables para el objeto del contrato |
| 📤 | Importar | Cargar datos desde Excel |

Algunas secciones como **Resoluciones** tienen un menú desplegable con sub-opciones (ej. "Todas las resoluciones" / "Nueva resolución").

### Barra superior (Navbar)

![Barra superior](manual_screenshots/navbar.png)

En la parte superior verás:

- **Migas de pan (breadcrumbs)**: muestra tu ubicación actual dentro del sistema. Ej: `Dashboard / Contratos / 001 del 01/02/2026`. Puedes hacer clic en cualquier nivel para volver atrás.
- **Icono de búsqueda**: acceso rápido a búsqueda (próximamente).
- **Indicador de conexión**: muestra "Conectado" (🟢) o "Sin conexión" (🔴) según el estado de tu internet.

---

## 3. Panel Principal (Dashboard)

![Dashboard](manual_screenshots/dashboard.png)

Cuando ingresas, lo primero que ves es el **Dashboard** con:

- **Resumen general**: muestra los datos de la **resolución activa** (presupuesto, comprometido, saldo)
- **Resolución activa**: tarjeta destacada con el código de la resolución vigente y link al detalle
- **Gráfico de ejecución**: donut con el porcentaje de presupuesto ejecutado
- **Alertas**: contratos próximos a vencer en los próximos 30 días

> 📌 El dashboard solo muestra información de la **resolución activa**. Para ver datos de otra resolución, actívala desde su detalle.

---

## 4. Resoluciones

Una **Resolución** es el acto administrativo que autoriza un presupuesto para contratar.

### Lista de resoluciones

![Lista de resoluciones](manual_screenshots/resoluciones.png)

Cada resolución se muestra como una **tarjeta** con:
- Código y título
- Badge **Activa** si es la resolución vigente
- Año de vigencia y total de contratos asociados
- **Barra de progreso** de ejecución presupuestal
- Presupuesto, comprometido y saldo disponibles

Puedes **buscar** resoluciones escribiendo en el campo de búsqueda (filtra por código o título en tiempo real).

### Crear una resolución

1. Ve a **Resoluciones** en el menú lateral
2. Haz clic en **Nueva Resolución** (o ve a `Resoluciones > Nueva resolución` en el menú desplegable)
3. Completa:
   - **Código**: ej. "RES-001-2026"
   - **Vigencia**: año (ej. 2026)
   - **Título**: descripción breve
   - **Presupuesto**: monto total asignado
   - **% Indirecto**: porcentaje para gastos indirectos (ej. 15)
4. Haz clic en **Guardar**

### Detalle de resolución

![Detalle de resolución](manual_screenshots/resolucion_detalle.png)

En el detalle ves la lista de contratos asociados y KPIs como:
- Total contratos, activos, anulados
- Presupuesto asignado y comprometido
- Saldo disponible

### Resolución activa (una a la vez)

Solo puede haber **una resolución activa** a la vez. El dashboard y los indicadores globales siempre muestran los datos de esa resolución.

- Cuando creas una resolución y no hay ninguna activa, se activa automáticamente
- Al activar una resolución, las demás se desactivan automáticamente
- Las resoluciones cerradas quedan como histórico y puedes consultarlas en cualquier momento

#### Activar / Cerrar una resolución

Desde el **detalle de la resolución** verás un botón según su estado:

| Botón | Cuándo aparece | Qué hace |
|-------|----------------|----------|
| 🟢 **Activar** (verde) | Cuando la resolución está cerrada | La activa y desactiva las demás. El dashboard empezará a mostrar sus datos |
| 🟠 **Cerrar** (ámbar) | Cuando la resolución está activa | La desactiva. Deja de mostrarse en el dashboard. Puedes activar otra después |

**Consejos:**
- Cambia de resolución activa según la vigencia que estés gestionando
- Al cerrar el año, puedes desactivar la resolución vieja y activar la nueva
- Puedes tener muchas resoluciones cerradas como histórico, pero solo **una activa**
- Las resoluciones cerradas siguen siendo accesibles desde el listado de resoluciones

### Editar / Eliminar

- Desde el detalle, haz clic en **Editar** para modificar datos
- Haz clic en **Eliminar** para borrar (solo si no tiene contratos asociados)

---

## 5. Contratos

### Lista de contratos

![Lista de contratos](manual_screenshots/contratos.png)

En **Contratos** del menú lateral verás todos los contratos registrados. Puedes:

- **Buscar**: escribe número de contrato, nombre o cédula del contratista
- **Filtrar por estado**: ACTIVO, FINALIZADO, ANULADO
- **Filtrar por resolución**: selecciona una resolución específica

La lista se muestra en formato de **tabla** con columnas: N° de Contrato, Contratista, Perfil, Valor, Estado, Fechas.

### Crear un contrato nuevo

![Nuevo contrato](manual_screenshots/nuevo_contrato.png)

1. Ve a **Contratos** → haz clic en **Nuevo Contrato**
2. **Buscar contratista**: escribe el nombre o CC del contratista. Si existe, se selecciona automáticamente. Si no, completa los datos manualmente.
3. **Completar datos del contrato**:
   - **Número de contrato**: ej. "001 del 01/02/2026"
   - **Resolución**: selecciona la resolución (opcional)
   - **Perfil**: selecciona el perfil profesional
   - **Valor Total**: monto del contrato
   - **Supervisor**: selecciona un supervisor de la lista
   - **Fecha inicio / Fecha fin**: período de vigencia
   - **Objeto**: descripción del servicio (puedes cargarlo desde una **Plantilla de Objeto**)
4. Haz clic en **Crear Contrato**

### Detalle del contrato

![Detalle del contrato](manual_screenshots/contrato_detalle.png)

Haz clic en cualquier contrato de la lista. Verás:

- **Información general**: contratista, valor, fechas, supervisor
- **Progreso de pago**: barra que muestra cuánto se ha pagado vs el total
- **Lista de pagos**: tabla con todos los pagos registrados
- **Botones para acciones**: Editar, descargar documentos, registrar pago, anular

### Editar un contrato

Desde el detalle, haz clic en **Editar**. Puedes modificar:
- Estado, perfil, valor, fechas
- Supervisor, CDP, rubro
- Objeto del contrato

También puedes cargar el **objeto del contrato** desde una **Plantilla de Objeto** precargada.

### Descargar documentos

Desde el detalle del contrato hay dos botones:

![Documentos desplegable](manual_screenshots/documentos_dropdown.png)

| Botón | Qué descarga |
|-------|-------------|
| **Contrato** | El contrato en Word (.docx) con todas las cláusulas legales |
| **Documentos ▼** | Menú desplegable con 8 documentos |

Los documentos disponibles son:

| Documento | Para qué sirve |
|-----------|---------------|
| Inexistencia | Certificado de que no hay personal disponible |
| Estudios Previos | Estudio previo de la contratación |
| Solicitud CDP | Solicitud de disponibilidad presupuestal |
| Invitación | Invitación formal a contratar |
| Idoneidad | Certificado de idoneidad del contratista |
| Designación | Designación del supervisor del contrato |
| Acta Inicio | Acta de inicio del contrato |
| Acta Liquidación | Acta final de liquidación del contrato |

---

## 6. Contratistas

### Buscar un contratista

![Lista de contratistas](manual_screenshots/contratistas.png)

1. Ve a **Contratistas** en el menú lateral
2. Escribe el nombre o número de cédula en el buscador
3. Los resultados aparecen automáticamente mientras escribes

### Ver detalle / Editar

![Detalle de contratista](manual_screenshots/contratista_detalle.png)

Haz clic en un contratista para ver sus datos:
- Nombre, identificación, tipo de persona, teléfono, dirección
- **Contratos asociados**: lista de todos los contratos de ese contratista

Para editar, haz clic en **Editar** y modifica los campos necesarios.

---

## 7. Supervisores

Los **Supervisores** son las personas asignadas para supervisar los contratos. Puedes gestionar su información de forma independiente y luego asignarlos a los contratos.

### Lista de supervisores

En **Supervisores** del menú lateral verás todos los supervisores registrados como **tarjetas**. Cada tarjeta muestra:

- Nombre completo
- Número de identificación (CC)
- Cargo
- Teléfono

Puedes **buscar** por nombre o identificación usando el campo de búsqueda.

### Crear un nuevo supervisor

1. Ve a **Supervisores** → haz clic en **Nuevo Supervisor**
2. Completa los campos:
   - **Nombre ***: nombre completo del supervisor (obligatorio)
   - **Identificación ***: número de cédula (obligatorio)
   - **Cargo**: ej. "COORDINADOR EBS", "JEFE DE ENFERMERÍA"
   - **Nivel Profesional**: UNIVERSITARIO, TECNÓLOGO, TÉCNICO, ESPECIALISTA o MAESTRÍA
   - **Teléfono**: número de contacto
   - **Correo**: dirección de correo electrónico
3. Haz clic en **Crear Supervisor**

### Detalle del supervisor

Haz clic en cualquier supervisor de la lista. Verás:

- **Datos personales**: identificación, nombre, cargo, nivel profesional, teléfono, correo
- **Botón Editar**: permite modificar los datos
- **Botón Eliminar**: elimina el supervisor del sistema

### Editar un supervisor

Desde el detalle, haz clic en **Editar** (o en el botón **Guardar** que cambia según el modo). Puedes modificar todos los campos excepto la identificación.

### Eliminar un supervisor

1. Desde el detalle, haz clic en **Eliminar**
2. Confirma la acción en el diálogo de confirmación
3. El supervisor se elimina permanentemente

---

## 8. Perfiles

Los **Perfiles** son los cargos profesionales (MEDICINA, ENFERMERIA, PSICOLOGIA, etc.). Cada perfil tiene:

- **Objeto del contrato**: texto base para los contratos de ese perfil
- **Obligaciones**: lista de obligaciones generales
- **Actividades**: lista de actividades que el profesional debe cumplir

### Lista de perfiles

![Lista de perfiles](manual_screenshots/perfiles.png)

### Gestión de perfiles

1. Ve a **Perfiles** en el menú lateral
2. Verás tarjetas con todos los perfiles registrados
3. Haz clic en un perfil para editarlo

#### Pestañas del perfil:

![Modal de perfil](manual_screenshots/perfil_modal.png)

| Pestaña | Qué contiene |
|---------|-------------|
| **Objeto del contrato** | Texto del objeto contractual. Se usa al crear contratos |
| **Obligaciones** | Lista de obligaciones. Puedes agregar, editar y eliminar |
| **Actividades** | Lista de actividades con su tipo |

#### Tipos de actividad:

- **GENERAL** (azul): obligaciones generales del contratista
- **ESPECÍFICA** (ámbar): obligaciones específicas según el perfil

### Editor WYSIWYG de actividades

Al agregar o editar una actividad, verás un **editor de texto enriquecido** con las siguientes herramientas:

| Botón | Función |
|-------|---------|
| **B** | Negrita |
| **I** | Cursiva |
| **H1** / **H2** | Títulos y subtítulos |
| **≡** / **1.** | Listas con viñetas y numeradas |
| **⊞** | Insertar tabla (3×3 con encabezado) |
| **↩ / ↪** | Deshacer / Rehacer |

Cuando insertas una tabla y haces clic dentro de ella, aparecen botones contextuales:

| Botón | Función |
|-------|---------|
| +col / -col | Agregar o eliminar columna |
| +row / -row | Agregar o eliminar fila |
| 🗑️ | Eliminar tabla completa |

### Crear un nuevo perfil

Haz clic en **Nuevo Perfil**, escribe el nombre y el objeto, luego agrega las actividades desde la pestaña correspondiente.

### Actividades en el contrato DOCX

Cuando descargas el contrato en Word, las actividades aparecen así:

```
OBLIGACIONES GENERALES:
1. Realizar la identificación integral del riesgo...
2. Ejecutar las atenciones individuales...
...

OBLIGACIONES ESPECÍFICAS:
37. Realizar un total de 540 atenciones...
    GRUPO ETAREO | ATENCIÓN | No.
    ADULTEZ     | CONSULTA | 100
...
```

---

## 9. Plantillas de Observación

Las **Plantillas de Observación** son textos predefinidos que se pueden cargar en el campo de **Observaciones** al registrar un pago. Ahorran tiempo al evitar escribir evaluaciones repetitivas.

### Lista de plantillas

![Lista de plantillas](manual_screenshots/plantillas.png)

### Crear una plantilla

1. Ve a **Plantillas** en el menú lateral
2. Haz clic en **Nueva Plantilla**
3. Completa el nombre y el contenido de la plantilla
4. Haz clic en **Crear Plantilla**

### Editar / Eliminar

- Haz clic en el ícono de **lápiz** ✏️ en una tarjeta para editar
- Haz clic en **Vista** para ver el contenido completo en un modal
- Haz clic en el ícono de **basurero** 🗑️ para eliminar (requiere confirmación)

### Usar plantilla en un pago

1. Ve al detalle del contrato y haz clic en **Pago**
2. En el campo **Observaciones**, despliega el selector "— Cargar desde plantilla —"
3. Selecciona la plantilla deseada
4. Haz clic en **Cargar**
5. El contenido de la plantilla se agrega al texto existente

---

## 10. Plantillas de Objeto

Las **Plantillas de Objeto** son textos reutilizables que describen el **objeto del contrato** (el servicio a prestar). Se usan al crear o editar contratos para precargar la descripción, ahorrando tiempo y asegurando consistencia.

### Lista de plantillas de objeto

En **Obj. Plantillas** del menú lateral verás todas las plantillas registradas como tarjetas. Cada tarjeta muestra:

- **Título**: nombre de la plantilla (ej. "Medicina General", "Enfermería")
- **Contenido**: vista previa del texto (limitado a 4 líneas)
- **Botones**: Editar y Eliminar

### Crear una plantilla de objeto

1. Ve a **Obj. Plantillas** → haz clic en **Nueva Plantilla**
2. Completa:
   - **Título**: nombre descriptivo (ej. "Medicina General")
   - **Contenido**: texto completo del objeto del contrato
3. Haz clic en **Crear**

### Editar / Eliminar

- Haz clic en **Editar** para modificar título o contenido
- Haz clic en el icono 🗑️ para eliminar (requiere confirmación)

### Usar plantilla de objeto en un contrato

1. Ve a **Contratos** → **Nuevo Contrato**
2. En el campo **Objeto**, verás un selector desplegable con las plantillas disponibles
3. Selecciona una y el contenido se cargará automáticamente
4. Puedes editar el texto después de cargarlo

---

## 11. Importar desde Excel

![Página de importación](manual_screenshots/importar.png)

### Preparar el archivo

El Excel debe tener los siguientes encabezados (columnas):

| Columna | Descripción |
|---------|-------------|
| TIPO DE INFORME | PARCIAL o FINAL |
| N° DE CONTRATO | Número único del contrato |
| PERIODO INFORME DESDE | Fecha inicio del período |
| PERIODO INFORME HASTA | Fecha fin del período |
| NOMBRE CONTRATISTA | Nombre completo |
| No. DE IDENTIFICACIÓN | CC o NIT |
| EXPEDIDA EN | Lugar de expedición |
| PERFIL | Nombre del perfil |
| VALOR A PAGAR | Monto del pago |
| PAGO No | Número del pago |

### Importar

1. Ve a **Importar** en el menú lateral
2. Selecciona la **resolución** a la que pertenecerán los contratos
3. Selecciona el archivo Excel (.xlsx)
4. Haz clic en **Importar**
5. El sistema te mostrará cuántos contratos y pagos se crearon

**Notas importantes:**
- Si un contrato ya existe, solo se crea el pago (no se duplica el contrato)
- Los perfiles se normalizan automáticamente (ej. "MÉDICO GRAL" → "MEDICINA")
- Si el valor a pagar es $0, no se registra el pago (el contrato sí se crea)
- Las actividades del perfil se asignan automáticamente al contrato

---

## 12. Pagos y Supervisiones

### Registrar un pago

![Modal de pago](manual_screenshots/pago_modal_nuevo.png)

1. Ve al detalle del contrato
2. Haz clic en **Pago**
3. Completa el formulario:
   - **Tipo de Informe**: PARCIAL o FINAL
   - **Período Desde / Hasta**: fechas del período evaluado
   - **Valor a Pagar**: monto del pago
   - **Observaciones**: notas relevantes (puedes cargar desde una plantilla, ver sección [Plantillas de Observación](#9-plantillas-de-observación))

4. **Evaluación de Actividades**: cada actividad del contrato aparece como una **tarjeta** con:
   - Número de actividad en un círculo con color
   - Descripción de la actividad (con formato)
   - Botones **✅ Cumple** y **❌ No Cumple**
   - La tarjeta cambia de color según la selección: verde si cumple, rojo si no cumple

   > Puedes hacer clic en **✅ Marcar todas como Cumple** para aprobar todas las actividades de una vez.

5. **Cargar plantilla en observaciones**: debajo del campo de observaciones hay un selector desplegable que lista todas las plantillas disponibles. Selecciona una y haz clic en **Cargar** para insertar su contenido.

6. **Planillas de Seguridad Social**: agrega una o más planillas con los datos de EPS, ARL, AFP y CCF.

7. Si el pago cubre el saldo total, aparecerá la opción **"Finalizar contrato al registrar este pago"**.

8. Haz clic en **Registrar Pago**. Las evaluaciones de actividades se guardan automáticamente.

### Editar un pago

En la tabla de pagos, haz clic en el ícono de **lápiz** ✏️. Puedes modificar todos los datos del pago.

### Eliminar un pago

Haz clic en el ícono de **basurero** 🗑️ y confirma la eliminación.

### Descargar PDF de supervisión

En la tabla de pagos, haz clic en el ícono de **impresora** 🖨️ para descargar el informe de supervisión en PDF. El PDF incluye:

- Datos del contrato y del contratista
- Tipo de informe (PARCIAL / FINAL)
- Valor a pagar en letras
- Actividades con marca de cumplimiento (✅)
- Planillas de seguridad social (EPS, ARL, AFP)
- Certificación del supervisor
- Firmas del supervisor y del contratista

---

## 13. Configuración — Logos

La sección **Configuración** te permite subir los logos que aparecerán en los encabezados de los documentos legales (contratos DOCX).

### Acceder

Ve a **Configuración** desde el menú lateral (icono ⚙️ en la parte inferior).

### Subir logos

La página muestra dos zonas:

| Posición | Descripción |
|----------|-------------|
| **Logo Izquierdo** | Aparece en la esquina superior izquierda del documento |
| **Logo Derecho** | Aparece en la esquina superior derecha del documento |

Para cada logo:

1. Haz clic en la zona de carga o arrastra una imagen
2. Formatos aceptados: **PNG, JPEG, WebP**
3. La imagen se sube automáticamente y se muestra la previsualización

### Cambiar / Eliminar logos

- **Cambiar**: haz clic en "Cambiar imagen" y selecciona un nuevo archivo
- **Eliminar**: haz clic en el icono 🗑️ para eliminar el logo

> 📌 Los logos se insertan automáticamente en el encabezado de los contratos DOCX al descargarlos. Si no hay logos subidos, el documento se genera con el texto de encabezado estándar.

---

## 14. Progreso de pago

Cada contrato muestra una tarjeta de **Progreso de Pago** con:

- **Pagado**: suma de todos los pagos registrados
- **Saldo**: valor del contrato menos lo pagado
- **Barra de progreso**: porcentaje visual de avance

El progreso se calcula automáticamente: no necesitas hacer nada, solo registrar los pagos.

---

## 15. Consejos útiles

- ✅ **Revisa el perfil** del contratista antes de importar — las actividades del perfil determinan lo que se evalúa en las supervisiones
- ✅ **Contratos con slashes**: los números como "022 del 02/02/2026" se manejan solos
- ✅ **Para ver contratos de un contratista**: ve a Contratistas, busca, y en su detalle verás todos sus contratos
- ✅ **Supervisores**: crea primero los supervisores y luego asígnalos a los contratos. Así mantienes un registro centralizado
- ✅ **Plantillas de Objeto**: úsalas para estandarizar la descripción de los servicios por perfil. Evita escribir el mismo texto una y otra vez
- ✅ **Actividades en DOCX**: al descargar el contrato, las actividades aparecen numeradas con su tipo (GENERAL/ESPECÍFICA)
- ✅ **Evaluar actividades**: el modal de pago muestra cada actividad con botones Cumple/No Cumple. Usa **"Marcar todas como Cumple"** para agilizar
- ✅ **Tablas en actividades**: usa el editor WYSIWYG para crear tablas dentro de las actividades (ej. grupos etarios por atención)
- ✅ **Plantillas de observaciones**: crea textos predefinidos en Plantillas y cárgalos en el campo de observaciones del pago
- ✅ **Finalizar contrato**: marca la casilla al hacer el último pago
- ✅ **Logos en documentos**: sube los logos de la ESE en Configuración para que aparezcan automáticamente en los contratos DOCX
- ✅ **Navegación con breadcrumbs**: usa las migas de pan en la barra superior para navegar rápidamente entre secciones

---

## 16. Solución de problemas comunes

| Problema | Causa posible | Solución |
|----------|--------------|----------|
| No encuentra un contratista | El nombre tiene errores ortográficos | Busca por número de cédula |
| El Excel no importa | Columnas incorrectas | Usa la plantilla original del proyecto |
| No aparecen actividades en supervisión | El perfil no tiene actividades | Ve a Perfiles y agrega actividades |
| El PDF no se descarga | Error temporal | Intenta de nuevo en 1 minuto |
| El contrato no aparece en la lista | Está filtrado por estado o resolución | Limpia los filtros |
| Error al guardar perfil | Actividad con tipo inválido | Solo usa GENERAL o ESPECÍFICA |
| Los documentos se descargan con `<< >>` | Placeholder sin reemplazar | Verifica que el contrato tenga todos los datos completos |
| No aparece la sección Supervisores | Menú no visible en tu sesión | Recarga la página |
| El logo subido no aparece en el DOCX | El documento se generó antes de subir el logo | Descarga el contrato nuevamente después de subir el logo |

---

*Documento actualizado el 17 de julio de 2026 (v2.2) — Gesco V2 ESE Norte 3*
