"""Seed data — perfiles predefinidos con objeto y obligaciones específicas.
Perfiles tomados del proyecto gestionContractos (EBS ESE Norte 3)."""

import json
import logging

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.perfil import Perfil, ActividadPerfil
from app.models.plantilla import PlantillaObservacion
from app.models.resolucion import Resolucion
from app.models.contrato import Contrato
from app.models.contratista import Contratista
from app.models.pago import Pago
from app.models.planilla import Planilla

logger = logging.getLogger(__name__)

PERFILES_DATA = [
    {
        "nombre": "MEDICINA",
        "objeto": "Prestar servicios profesionales como Médico en los Equipos Básicos en Salud (EBS) para el fortalecimiento de la Atención Primaria en Salud, desarrollando actividades de promoción, prevención, diagnóstico, tratamiento y seguimiento de la población asignada en el marco de la Resolución 1010 de 2025.",
        "obligaciones": [
            "Realizar la identificación integral del riesgo individual, familiar y comunitario de la población adscrita al microterritorio asignado.",
            "Ejecutar las atenciones individuales de promoción y mantenimiento de la salud, conforme a la Resolución 3280 de 2018.",
            "Aplicar las guías de práctica clínica, protocolos institucionales y lineamientos técnicos definidos por la E.S.E. NORTE 3.",
            "Realizar acciones de inducción a la demanda de servicios de salud, priorizando eventos de salud pública.",
            "Identificar, notificar y gestionar oportunamente los eventos de interés en salud pública.",
            "Realizar la canalización oportuna de las personas a los servicios de salud.",
            "Hacer seguimiento efectivo al acceso y continuidad de las atenciones en salud dentro de la red.",
            "Promover la articulación intersectorial y transectorial de los servicios de salud.",
            "Diligenciar diaria, completa y oportunamente los RIPS con códigos CIE-10.",
            "Cumplir con las metas del programa con referencia al 100% de la población caracterizada.",
        ],
        "actividades": [
            "Atención en salud por medicina general",
            "Tamizaje para cáncer de próstata (PSA)",
            "Tamizaje para cáncer de mama (valoración clínica)",
            "Tamizaje para cáncer de colon (sangre oculta)",
            "Control por medicina general y educación",
            "Atención Preconcepcional",
            "Asesoría en anticoncepción",
        ],
    },
    {
        "nombre": "ENFERMERIA",
        "objeto": "Prestar servicios profesionales como Enfermero(a) en los Equipos Básicos en Salud (EBS), desarrollando actividades de cuidado integral, promoción de la salud, prevención de la enfermedad.",
        "obligaciones": [
            "Formular, implementar y realizar seguimiento al Plan Integral de Cuidado Primario (PICP).",
            "Identificar y analizar los riesgos individuales, familiares y comunitarios.",
            "Brindar orientación e información clara sobre la oferta de servicios de salud.",
            "Inducir a la demanda de servicios de salud y notificar eventos de interés en salud pública.",
            "Realizar canalización oportuna a servicios de nivel primario y red de prestación.",
            "Sistematizar, registrar y reportar la información en sistemas definidos por Minsalud.",
            "Aplicar guías de promoción, Resolución 3280, RIAS y guías de eventos de interés.",
            "Diligenciar los RIPS utilizando los códigos CIE-10.",
            "Cumplir con las normas de bioseguridad y seguridad del paciente.",
        ],
        "actividades": [
            "Atención integral de enfermería",
            "Visitas domiciliarias a pacientes crónicos",
            "Vigilancia epidemiológica",
            "Educación en salud comunitaria",
            "Promoción y prevención",
            "Tamizaje nutricional",
        ],
    },
    {
        "nombre": "PSICOLOGIA",
        "objeto": "Prestar servicios profesionales como Psicólogo en los programas de salud mental de la ESE Norte 3.",
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
        "nombre": "SALUD ORAL",
        "objeto": "Prestar servicios profesionales como Odontólogo en los puntos de atención de la ESE Norte 3.",
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
        "nombre": "AUXILIAR ENFERMERIA",
        "objeto": "Prestar servicios de apoyo como Auxiliar de Enfermería en los Equipos Básicos en Salud.",
        "obligaciones": [
            "Apoyar la ejecución de las actividades del PIC en los municipios asignados.",
            "Realizar la toma de medidas antropométricas y signos vitales a la población objeto.",
            "Aplicar encuestas de caracterización y tamizaje según lineamientos del programa.",
            "Promover estilos de vida saludable en la comunidad mediante actividades educativas.",
            "Mantener el orden y asepsia del material e instrumentos de trabajo.",
            "Elaborar y presentar informes mensuales de actividades realizadas.",
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
        "nombre": "AUXILIAR VACUNACION",
        "objeto": "Prestar servicios de apoyo como Auxiliar de Vacunación en los Equipos Básicos en Salud.",
        "obligaciones": [
            "Apoyar las jornadas de vacunación programadas por la ESE.",
            "Realizar registro y seguimiento del esquema de vacunación.",
            "Promover la vacunación como medida de prevención de enfermedades.",
            "Mantener la cadena de frío de los biológicos.",
            "Diligenciar los registros de vacunación.",
            "Cumplir con los protocolos de bioseguridad.",
        ],
        "actividades": [
            "Jornadas de vacunación",
            "Registro de esquemas de vacunación",
            "Promoción de vacunación",
            "Mantenimiento de cadena de frío",
        ],
    },
    {
        "nombre": "GESTOR COMUNITARIO",
        "objeto": "Prestar servicios como Gestor Comunitario en los Equipos Básicos en Salud, promoviendo la participación comunitaria.",
        "obligaciones": [
            "Promover la participación de la comunidad en las actividades de salud.",
            "Realizar visitas domiciliarias para identificación de riesgos.",
            "Articular con líderes comunitarios y organizaciones sociales.",
            "Apoyar la ejecución del Plan de Intervenciones Colectivas.",
            "Promover estilos de vida saludable en la comunidad.",
        ],
        "actividades": [
            "Visitas domiciliarias comunitarias",
            "Articulación con líderes comunitarios",
            "Promoción de salud comunitaria",
            "Apoyo a jornadas de salud",
        ],
    },
    {
        "nombre": "SINDICATO",
        "objeto": "Prestar servicios de apoyo administrativo y operativo para el fortalecimiento de la Atención Primaria en Salud.",
        "obligaciones": [
            "Apoyar las actividades administrativas y operativas de la ESE.",
            "Cumplir con los cronogramas y programaciones establecidas.",
            "Presentar informes de actividades realizadas.",
            "Cumplir con los protocolos institucionales.",
        ],
        "actividades": [
            "Apoyo administrativo",
            "Gestión documental",
            "Coordinación operativa",
        ],
    },
    {
        "nombre": "OTRO",
        "objeto": "Prestar servicios profesionales o de apoyo a la gestión según las necesidades del servicio.",
        "obligaciones": [
            "Desarrollar las actividades y funciones asignadas por el supervisor.",
            "Cumplir con los horarios y cronogramas establecidos.",
            "Presentar informes periódicos de las actividades realizadas.",
            "Participar en las reuniones y capacitaciones programadas.",
            "Cumplir con los protocolos y procedimientos institucionales.",
        ],
        "actividades": [
            "Desarrollo de funciones asignadas",
            "Presentación de informes",
            "Participación en capacitaciones",
            "Cumplimiento de protocolos",
        ],
    },
]

PLANTILLAS_OBSERVACION = [
    {"titulo": "Cumplimiento total", "contenido": "El contratista cumplió a cabalidad con las actividades programadas durante el período."},
    {"titulo": "Cumplimiento parcial", "contenido": "El contratista cumplió parcialmente con las actividades programadas."},
    {"titulo": "Incumplimiento", "contenido": "El contratista no cumplió con las actividades programadas."},
    {"titulo": "Documentación incompleta", "contenido": "El contratista presentó la documentación de manera incompleta."},
    {"titulo": "Novedades en seguridad social", "contenido": "Se presentan novedades en los aportes a seguridad social del contratista."},
]

PERFIL_NORMALIZATION = {
    "MEDICO": "MEDICINA",
    "MEDICINA": "MEDICINA",
    "MEDICO GENERAL": "MEDICINA",
    "MEDICO RURAL": "MEDICINA",
    "MEDICINA GENERAL": "MEDICINA",
    "ENFERMERO": "ENFERMERIA",
    "ENFERMERA": "ENFERMERIA",
    "ENFERMERIA": "ENFERMERIA",
    "ENFERMERO(A)": "ENFERMERIA",
    "ENF": "ENFERMERIA",
    "PSICOLOGO": "PSICOLOGIA",
    "PSICÓLOGO": "PSICOLOGIA",
    "PSICOLOGIA": "PSICOLOGIA",
    "PSIC": "PSICOLOGIA",
    "ODONTOLOGO": "SALUD ORAL",
    "ODONTÓLOGO": "SALUD ORAL",
    "SALUD ORAL": "SALUD ORAL",
    "DENTISTA": "SALUD ORAL",
    "AUXILIAR ENFERMERIA": "AUXILIAR ENFERMERIA",
    "AUXILIAR DE ENFERMERÍA": "AUXILIAR ENFERMERIA",
    "AUX ENFERMERIA": "AUXILIAR ENFERMERIA",
    "AUX ENF": "AUXILIAR ENFERMERIA",
    "AUXILIAR DE ENFERMERIA": "AUXILIAR ENFERMERIA",
    "AUXILIAR VACUNACION": "AUXILIAR VACUNACION",
    "AUX VACUNACION": "AUXILIAR VACUNACION",
    "VACUNADOR": "AUXILIAR VACUNACION",
    "GESTOR COMUNITARIO": "GESTOR COMUNITARIO",
    "GESTOR": "GESTOR COMUNITARIO",
    "SINDICATO": "SINDICATO",
    "SINDICATO_103": "SINDICATO",
    "SINDICATO_106": "SINDICATO",
    "APOYO ADMINISTRATIVO": "SINDICATO",
    "CONDUCTOR": "OTRO",
    "BACTERIÓLOGO": "OTRO",
    "BACTERIOLOGO": "OTRO",
    "TÉCNICO AMBIENTAL": "OTRO",
    "TECNICO AMBIENTAL": "OTRO",
    "TECNÓLOGO EN SISTEMAS": "OTRO",
    "TECNOLOGO SISTEMAS": "OTRO",
}


async def seed_database():
    async with async_session_factory() as db:
        try:
            existing = await db.execute(select(Perfil))
            perfiles_existentes = existing.scalars().all()
            if perfiles_existentes:
                # Verificar si los perfiles actuales son los viejos (migrados de GESCO)
                # Chequear si el primer perfil tiene el formato nuevo (MEDICINA, ENFERMERIA...)
                nombres_viejos = {"AUXILIAR DE ENFERMERÍA", "MÉDICO GENERAL", "ENFERMERO(A)", "ODONTÓLOGO", "PSICÓLOGO", "BACTERIÓLOGO"}
                nombres_actuales = {p.nombre for p in perfiles_existentes}
                if nombres_actuales & nombres_viejos:
                    logger.info("Migrando perfiles viejos a nueva version gestionContractos...")
                    await db.execute(text("DELETE FROM actividades_perfil"))
                    await db.execute(text("DELETE FROM perfiles"))
                    await db.commit()
                else:
                    logger.info("Seed data ya existe, saltando...")
                    return

            logger.info("Insertando datos iniciales...")

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

            for pt in PLANTILLAS_OBSERVACION:
                plantilla = PlantillaObservacion(
                    titulo=pt["titulo"],
                    contenido=pt["contenido"],
                )
                db.add(plantilla)

            await db.commit()
            logger.info(f"Seed completado: {len(PERFILES_DATA)} perfiles creados")

            # Demo data
            try:
                existing_res = await db.execute(select(Resolucion).limit(1))
                if not existing_res.scalar_one_or_none():
                    logger.info("Insertando data demo...")
                    resolucion = Resolucion(
                        codigo="RES-DEMO-2026",
                        titulo="CONTRATACIÓN TALENTO HUMANO ESE NORTE 3",
                        vigencia=2026, presupuesto=500_000_000, indirect_percentage=15,
                    )
                    db.add(resolucion)
                    await db.flush()

                    contratistas_data = [
                        ("1143987654", "MARÍA ALEJANDRA VALENCIA"),
                        ("76345218", "LUIS ALBERTO MOSQUERA"),
                        ("1143890123", "DIANA PATRICIA HURTADO"),
                    ]
                    contratistas = []
                    for cc, nombre in contratistas_data:
                        cnt = Contratista(identificacion=cc, nombre=nombre)
                        db.add(cnt)
                        contratistas.append(cnt)
                    await db.flush()

                    contratos_data = [
                        {"numero": "CT-DEMO-001", "perfil": "MEDICINA", "contratista": contratistas[0], "monto": 48_000_000, "cuotas": 12},
                        {"numero": "CT-DEMO-002", "perfil": "ENFERMERIA", "contratista": contratistas[1], "monto": 28_800_000, "cuotas": 12},
                        {"numero": "CT-DEMO-003", "perfil": "PSICOLOGIA", "contratista": contratistas[2], "monto": 36_000_000, "cuotas": 12},
                    ]
                    for cd in contratos_data:
                        ct = Contrato(
                            resolucion_id=resolucion.id, contratista_id=cd["contratista"].id,
                            numero_contrato=cd["numero"], perfil=cd["perfil"],
                            estado="ACTIVO", monto_total=cd["monto"],
                            supervisor="Dr. Carlos Méndez", cuotas_total=cd["cuotas"], cuotas_pagadas=0,
                        )
                        db.add(ct)
                    await db.flush()

                    pago = Pago(
                        contrato_id="CT-DEMO-001", numero_pago=1, valor_a_pagar=4_000_000,
                        valor_pagado=4_000_000, tipo_informe="SUPERVISION",
                    )
                    db.add(pago)
                    await db.flush()

                    planilla = Planilla(
                        pago_id=pago.id, eps_nombre="NUEVA EPS", eps_valor=380_000,
                        arl_nombre="POSITIVA", arl_valor=52_000, afp_nombre="PORVENIR", afp_valor=345_000,
                        ccf_nombre="COMFACAUCA", ccf_valor=28_000,
                        valor_total=380_000 + 52_000 + 345_000 + 28_000,
                    )
                    db.add(planilla)
                    await db.commit()
                    logger.info("Demo data insertada")
            except Exception as e:
                await db.rollback()
                logger.warning(f"Error demo data: {e}")

        except Exception as e:
            await db.rollback()
            logger.warning(f"Error en seed: {e}")
