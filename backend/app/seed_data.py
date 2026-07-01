"""Seed data — perfiles predefinidos con objeto y obligaciones específicas."""

import json
import logging

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory, engine
from app.models.perfil import Perfil, ActividadPerfil
from app.models.plantilla import PlantillaObservacion

logger = logging.getLogger(__name__)

# ─── PERFILES Y SUS DATOS (migrados de GESCO) ────────────────────────────────

PERFILES_DATA = [
    {
        "nombre": "AUXILIAR DE ENFERMERÍA",
        "objeto": "Prestar servicios de apoyo en el área asistencial como auxiliar de enfermería en los diferentes puntos de la ESE Norte 3, desarrollando actividades de promoción de la salud, prevención de la enfermedad y atención básica, de conformidad con los lineamientos del Plan de Intervenciones Colectivas (PIC) y demás programas institucionales.",
        "obligaciones": [
            "Apoyar la ejecución de las actividades del PIC en los municipios asignados por la ESE.",
            "Realizar la toma de medidas antropométricas y signos vitales a la población objeto.",
            "Aplicar encuestas de caracterización y tamizaje según lineamientos del programa.",
            "Promover estilos de vida saludable en la comunidad mediante actividades educativas.",
            "Mantener el orden y asepsia del material e instrumentos de trabajo.",
            "Elaborar y presentar informes mensuales de actividades realizadas.",
            "Asistir puntualmente a las capacitaciones programadas por la institución.",
            "Cumplir con los protocolos de bioseguridad establecidos por la ESE.",
        ],
        "actividades": [
            "Toma de signos vitales y medidas antropométricas",
            "Aplicación de encuestas de caracterización",
            "Educación en salud individual y grupal",
            "Apoyo en jornadas de vacunación",
            "Organización de material e insumos",
        ],
    },
    {
        "nombre": "AUXILIAR DE ENFERMERÍA S7",
        "objeto": "Prestar servicios de apoyo asistencial como auxiliar de enfermería en el marco del Programa de Atención Domiciliaria, realizando visitas domiciliarias para la promoción de la salud, prevención de la enfermedad y seguimiento a la población focalizada.",
        "obligaciones": [
            "Realizar visitas domiciliarias a la población asignada según la ruta de atención integral.",
            "Aplicar instrumentos de valoración familiar y social en cada visita.",
            "Desarrollar actividades educativas en el hogar sobre hábitos saludables.",
            "Identificar factores de riesgo en el entorno familiar y reportarlos al supervisor.",
            "Realizar tamizajes de salud mental y nutrición.",
            "Participar en las reuniones de equipo y actividades de capacitación.",
            "Diligenciar correctamente los registros y formatos establecidos.",
        ],
        "actividades": [
            "Visitas domiciliarias de seguimiento",
            "Valoración del entorno familiar",
            "Educación en salud en hogar",
            "Tamizaje nutricional y de salud mental",
        ],
    },
    {
        "nombre": "MÉDICO GENERAL",
        "objeto": "Prestar servicios profesionales como Médico General en los diferentes puntos de atención de la ESE Norte 3, realizando consulta médica general, actividades de promoción de la salud, prevención de la enfermedad, diagnóstico, tratamiento y seguimiento de patologías, en el marco de la Ruta Integral de Atención en Salud.",
        "obligaciones": [
            "Realizar consulta médica general ambulatoria a la población asignada.",
            "Prescribir tratamientos farmacológicos y no farmacológicos de acuerdo con el diagnóstico.",
            "Remitir oportunamente los pacientes a los niveles de mayor complejidad cuando sea necesario.",
            "Registrar completa y oportunamente las historias clínicas y demás documentación.",
            "Participar en las actividades de promoción y prevención programadas.",
            "Cumplir con las metas y estándares establecidos por la ESE.",
            "Asistir a las reuniones clínicas y administrativas programadas.",
            "Reportar eventos de interés en salud pública al sistema de vigilancia.",
        ],
        "actividades": [
            "Consulta médica general",
            "Prescripción farmacológica",
            "Remisión a especialistas",
            "Registro en historias clínicas",
            "Promoción y prevención",
        ],
    },
    {
        "nombre": "ENFERMERO(A)",
        "objeto": "Prestar servicios profesionales como Enfermero(a) en los puntos de atención de la ESE Norte 3, desarrollando actividades de cuidado integral al individuo, familia y comunidad, con énfasis en promoción de la salud, prevención de la enfermedad, vigilancia epidemiológica y ejecución del Plan de Intervenciones Colectivas.",
        "obligaciones": [
            "Brindar atención de enfermería integral a la población asignada.",
            "Realizar visita domiciliaria a la población con enfermedades crónicas no transmisibles.",
            "Participar en la ejecución del Plan de Intervenciones Colectivas.",
            "Realizar acciones de vigilancia epidemiológica y notificar eventos de interés.",
            "Liderar procesos de educación en salud a la comunidad.",
            "Ejecutar actividades de promoción de la salud y prevención de la enfermedad.",
            "Elaborar y presentar informes periódicos de gestión.",
        ],
        "actividades": [
            "Atención integral de enfermería",
            "Visitas domiciliarias a pacientes crónicos",
            "Vigilancia epidemiológica",
            "Educación en salud comunitaria",
            "Promoción y prevención",
        ],
    },
    {
        "nombre": "ODONTÓLOGO",
        "objeto": "Prestar servicios profesionales como Odontólogo en los puntos de atención de la ESE Norte 3, desarrollando actividades de promoción de la salud oral, prevención, diagnóstico y tratamiento de patologías bucodentales, y participación en los programas institucionales de salud bucal.",
        "obligaciones": [
            "Realizar consulta odontológica general a la población asignada.",
            "Ejecutar actividades de promoción de la salud oral y prevención de enfermedades bucodentales.",
            "Aplicar sellantes, flúor y demás medidas preventivas según lineamientos.",
            "Realizar tratamientos odontológicos básicos de acuerdo con su perfil.",
            "Remitir a especialistas los casos de mayor complejidad.",
            "Registrar adecuadamente la información clínica en los sistemas.",
            "Participar en jornadas de salud extramurales programadas.",
        ],
        "actividades": [
            "Consulta odontológica general",
            "Aplicación de sellantes y flúor",
            "Tratamientos odontológicos básicos",
            "Promoción de salud oral",
            "Jornadas extramurales",
        ],
    },
    {
        "nombre": "PSICÓLOGO",
        "objeto": "Prestar servicios profesionales como Psicólogo en los programas de salud mental de la ESE Norte 3, realizando atención psicológica individual y grupal, intervención en crisis, promoción de la salud mental y prevención de trastornos mentales en la población asignada.",
        "obligaciones": [
            "Realizar valoración psicológica integral a los usuarios asignados.",
            "Brindar atención psicológica individual y grupal.",
            "Ejecutar actividades de promoción de la salud mental y prevención de trastornos.",
            "Realizar intervención en crisis cuando sea requerido.",
            "Participar en la ruta de atención integral en salud mental.",
            "Elaborar informes psicológicos y mantener registros actualizados.",
            "Remitir a psiquiatría los casos que lo requieran.",
        ],
        "actividades": [
            "Valoración psicológica integral",
            "Atención psicológica individual",
            "Terapia grupal",
            "Intervención en crisis",
            "Promoción de salud mental",
        ],
    },
    {
        "nombre": "BACTERIÓLOGO",
        "objeto": "Prestar servicios profesionales como Bacteriólogo en el laboratorio clínico de la ESE Norte 3, realizando análisis bacteriológicos, hematológicos, parasitológicos y de química sanguínea, garantizando la calidad y oportunidad de los resultados.",
        "obligaciones": [
            "Realizar análisis de laboratorio clínico según solicitud médica.",
            "Procesar muestras biológicas garantizando la cadena de custodia.",
            "Mantener y calibrar los equipos de laboratorio.",
            "Implementar y mantener el programa de control de calidad.",
            "Reportar oportunamente los resultados al sistema de información.",
            "Gestionar el inventario de insumos y reactivos.",
            "Cumplir con los protocolos de bioseguridad del laboratorio.",
        ],
        "actividades": [
            "Análisis de laboratorio clínico",
            "Procesamiento de muestras biológicas",
            "Control de calidad de equipos",
            "Reporte de resultados",
            "Gestión de inventario de insumos",
        ],
    },
    {
        "nombre": "CONDUCTOR",
        "objeto": "Prestar servicios de conducción de vehículos automotores al servicio de la ESE Norte 3, para el transporte del talento humano, insumos y usuarios, garantizando la movilidad segura y oportuna en cumplimiento de las actividades misionales de la entidad.",
        "obligaciones": [
            "Conducir los vehículos asignados por la ESE para el transporte de personal e insumos.",
            "Mantener el vehículo en óptimas condiciones de aseo y funcionamiento.",
            "Realizar el mantenimiento preventivo básico del vehículo.",
            "Reportar cualquier novedad o daño del vehículo al superior inmediato.",
            "Cumplir con las normas de tránsito y seguridad vial.",
            "Apoyar la logística de las jornadas extramurales.",
            "Llevar el control de kilometraje y combustible.",
        ],
        "actividades": [
            "Conducción de vehículos institucionales",
            "Transporte de personal e insumos",
            "Mantenimiento preventivo de vehículos",
            "Apoyo logístico en jornadas extramurales",
        ],
    },
    {
        "nombre": "TÉCNICO AMBIENTAL",
        "objeto": "Prestar servicios como Técnico Ambiental en la ESE Norte 3, desarrollando actividades de gestión ambiental, manejo de residuos hospitalarios, educación ambiental y cumplimiento de la normatividad ambiental vigente en la entidad.",
        "obligaciones": [
            "Implementar el plan de gestión integral de residuos hospitalarios (PGIRH).",
            "Realizar capacitaciones al personal sobre manejo de residuos.",
            "Supervisar el correcto almacenamiento, transporte y disposición de residuos.",
            "Elaborar informes ambientales requeridos por las autoridades.",
            "Realizar seguimiento a los indicadores ambientales de la ESE.",
            "Participar en la elaboración de planes de contingencia ambiental.",
            "Asesorar en la implementación de prácticas sostenibles.",
        ],
        "actividades": [
            "Gestión de residuos hospitalarios",
            "Educación ambiental al personal",
            "Supervisión de disposición de residuos",
            "Elaboración de informes ambientales",
        ],
    },
    {
        "nombre": "TECNÓLOGO EN SISTEMAS",
        "objeto": "Prestar servicios de soporte técnico y mantenimiento de los sistemas de información y equipos de cómputo de la ESE Norte 3, garantizando la operatividad de la infraestructura tecnológica y la seguridad de la información.",
        "obligaciones": [
            "Realizar mantenimiento preventivo y correctivo de equipos de cómputo.",
            "Brindar soporte técnico a los usuarios de los sistemas de información.",
            "Administrar las cuentas de usuario y perfiles de acceso.",
            "Realizar copias de seguridad de la información institucional.",
            "Mantener actualizado el inventario de equipos y licencias.",
            "Apoyar la implementación de nuevos sistemas y actualizaciones.",
            "Garantizar la conectividad de red en los puntos de atención.",
        ],
        "actividades": [
            "Mantenimiento de equipos de cómputo",
            "Soporte técnico a usuarios",
            "Administración de sistemas",
            "Copias de seguridad",
            "Gestión de inventario tecnológico",
        ],
    },
    {
        "nombre": "MÉDICO RURAL",
        "objeto": "Prestar servicios profesionales como Médico Rural en los puntos de atención de la ESE Norte 3 ubicados en zonas rurales, garantizando el acceso a servicios de salud de la población dispersa mediante consulta médica, actividades comunitarias y articulación con la red de prestación de servicios.",
        "obligaciones": [
            "Realizar consulta médica en los centros de salud rurales asignados.",
            "Participar en brigadas de salud extramurales en zonas rurales.",
            "Realizar seguimiento a pacientes crónicos en áreas dispersas.",
            "Remitir oportunamente pacientes que requieran atención de mayor complejidad.",
            "Registrar y reportar la información de atención en salud.",
            "Participar en actividades de promoción y prevención comunitarias.",
            "Colaborar con el equipo extramural en la ejecución del PIC.",
        ],
        "actividades": [
            "Consulta médica rural",
            "Brigadas de salud extramurales",
            "Seguimiento a pacientes crónicos",
            "Articulación con red de servicios",
        ],
    },
    {
        "nombre": "OTRO",
        "objeto": "Prestar servicios profesionales o de apoyo a la gestión en la ESE Norte 3, según las necesidades del servicio y las funciones asignadas por el supervisor inmediato, en el marco de los planes, programas y proyectos institucionales.",
        "obligaciones": [
            "Desarrollar las actividades y funciones asignadas por el supervisor.",
            "Cumplir con los horarios y cronogramas establecidos.",
            "Presentar informes periódicos de las actividades realizadas.",
            "Participar en las reuniones y capacitaciones programadas.",
            "Cumplir con los protocolos y procedimientos institucionales.",
            "Reportar oportunamente novedades e incidencias.",
            "Mantener la confidencialidad de la información institucional.",
        ],
        "actividades": [
            "Desarrollo de funciones asignadas",
            "Presentación de informes",
            "Participación en capacitaciones",
            "Cumplimiento de protocolos",
        ],
    },
]

# ─── PLANTILLAS DE OBSERVACIÓN ────────────────────────────────────────────────

PLANTILLAS_OBSERVACION = [
    {
        "titulo": "Cumplimiento total",
        "contenido": "El contratista cumplió a cabalidad con las actividades programadas durante el período, presentó oportunamente la documentación requerida y no se evidencian novedades que afecten el desarrollo del contrato."
    },
    {
        "titulo": "Cumplimiento parcial",
        "contenido": "El contratista cumplió parcialmente con las actividades programadas. Se presentaron algunas novedades que fueron subsanadas durante el período. Se recomienda realizar seguimiento más frecuente."
    },
    {
        "titulo": "Incumplimiento",
        "contenido": "El contratista no cumplió con las actividades programadas ni presentó la documentación requerida. Se inicia proceso de verificación de causales de incumplimiento contractual."
    },
    {
        "titulo": "Documentación incompleta",
        "contenido": "El contratista presentó la documentación de manera incompleta. Se requiere la presentación de planillas de seguridad social y/o cuentas de cobro completas para proceder con el pago."
    },
    {
        "titulo": "Novedades en seguridad social",
        "contenido": "Se presentan novedades en los aportes a seguridad social del contratista. No se evidencia el pago completo de EPS, ARL y AFP para el período reportado."
    },
]


async def seed_database():
    """Poblar datos iniciales si la base está vacía."""
    async with async_session_factory() as db:
        try:
            existing = await db.execute(select(Perfil).limit(1))
            if existing.scalar_one_or_none():
                logger.info("Seed data ya existe, saltando...")
                return

            logger.info("Insertando datos iniciales...")

            # Perfiles
            for pdata in PERFILES_DATA:
                obligaciones_json = json.dumps(pdata["obligaciones"], ensure_ascii=False)
                perfil = Perfil(
                    nombre=pdata["nombre"],
                    objeto=pdata["objeto"],
                    obligaciones_json=obligaciones_json,
                )
                db.add(perfil)
                await db.flush()

                for i, act in enumerate(pdata.get("actividades", [])):
                    actividad = ActividadPerfil(
                        perfil_id=perfil.id,
                        descripcion=act,
                        orden=i,
                    )
                    db.add(actividad)

            # Plantillas de observación
            for pt in PLANTILLAS_OBSERVACION:
                plantilla = PlantillaObservacion(
                    titulo=pt["titulo"],
                    contenido=pt["contenido"],
                )
                db.add(plantilla)

            await db.commit()
            logger.info(f"Seed completado: {len(PERFILES_DATA)} perfiles creados")

        except Exception as e:
            await db.rollback()
            logger.warning(f"Error en seed: {e}")
