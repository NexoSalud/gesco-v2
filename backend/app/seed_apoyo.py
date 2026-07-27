"""Script de carga de Apoyo Administrativo desde el DOCX de actividades.

Uso: docker exec -i gesco-v2-backend-1 python /app/app/seed_apoyo.py
"""

import asyncio
import json
import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.apoyo_administrativo import ApoyoAdministrativo
from app.models.actividad_apoyo import ActividadApoyo
from app.database import Base

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_apoyo")

DATABASE_URL = "postgresql+asyncpg://gesco:gesco123@db:5432/gesco_v2"

# ─── Datos extraídos del DOCX ──────────────────────────────────────────────

SECTIONS = [
    {
        "role": "COORDINACIÓN OPERATIVA Y DE SEGUIMIENTO",
        "names": ["ANGELA MARÍA CRUZ BOHORQUEZ"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Planear, organizar y monitorear el despliegue territorial de los Equipos Básicos de Salud, garantizando continuidad operativa, definición de metas, adecuada distribución de actividades según los perfiles y roles y coherencia con las prioridades en salud del territorio.",
            "Orientar la actuación de los equipos priorizando territorios con mayores brechas de inequidad, asegurando que las acciones contribuyan al cierre progresivo de brechas y el logro de resultados.",
            "Brindar orientación técnica permanente a los equipos para garantizar la aplicación y cumplimiento de los lineamientos y la normatividad vigente, así como promover el fortalecimiento de capacidades del talento humano.",
            "Coordinar con los actores de la red para asegurar la continuidad del cuidado, fortalecer los procesos de referencia y contrarreferencia y posicionar a los Equipos Básicos de Salud como parte integral de la red.",
            "Acompañar la formulación, implementación y monitoreo de los Planes de Cuidado Primario promoviendo el principio de concertación con las familias y comunidades.",
            "Organizar y analizar la información sobre las necesidades intersectoriales identificadas por los EBS y establecer mecanismos de comunicación y coordinación con las entidades territoriales para la respuesta en el marco de las competencias para la Gestión en Salud Pública (Artículo 9 Resolución 1597 de 2025)",
            "Garantizar la oportunidad y calidad del registro de la información en SI APS y el reporte de información necesaria y su uso para el análisis territorial, la toma de decisiones y el mejoramiento continuo de la implementación de quipos.",
            "Las coordinaciones podrán realizar las demás acciones que sean concertadas y pertinentes para el adecuado funcionamiento de los Equipos Básicos de Salud.",
        ]
    },
    {
        "role": "COORDINACIÓN DE FACTURACIÓN",
        "names": ["IBONE ANDREA GOMEZ OLAYA"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Apoyar la gestión, coordinación y seguimiento del proceso de facturación asociado a las actividades desarrolladas por los Equipos Básicos de Salud en los municipios de Puerto Tejada, Villa Rica y Padilla, garantizando su correcta, oportuna y completa ejecución conforme a los lineamientos técnicos, normativos y administrativos definidos por la E.S.E. NORTE 3.",
            "Apoyar los procesos de inducción, capacitación y actualización operativa relacionados con los procedimientos de facturación y el uso de los sistemas de información definidos por la E.S.E. NORTE 3, con el fin de asegurar la correcta aplicación de los protocolos establecidos.",
            "Verificar que la información soporte del proceso de facturación se encuentre completa, consistente, validada y alineada con los estándares institucionales, evitando reprocesos, inconsistencias, glosas o duplicidades.",
            "Apoyar la revisión, análisis y control de los reportes de facturación, identificando posibles inconsistencias, desviaciones o alertas, y gestionando las acciones correctivas que correspondan dentro del marco contractual.",
            "Realizar seguimiento administrativo al comportamiento del proceso de facturación, con el fin de optimizar tiempos, mejorar la calidad de la información y fortalecer el cumplimiento de las metas contractuales.",
            "Apoyar el seguimiento y monitoreo de las metas e indicadores definidos en el Plan Integral de Cuidado Primario (PICP) y el Plan de Cuidado Primario (PCP), en lo relacionado con los componentes administrativos y de facturación de los Equipos Básicos de Salud.",
            "Elaborar y apoyar el análisis de proyecciones, indicadores y metas asociadas al proceso de facturación de los Equipos Básicos de Salud, realizando seguimiento periódico a su cumplimiento.",
            "Participar en los espacios de seguimiento operativo y administrativo que se programen para evaluar el desempeño del proceso de facturación y el avance en la ejecución contractual.",
            "Apoyar la consolidación de información cuantitativa, estadística y administrativa que permita evidenciar los avances en el cumplimiento de metas y resultados de los Equipos Básicos de Salud.",
            "Apoyar la elaboración y consolidación de informes parciales y finales, así como la atención de requerimientos formulados por las Entidades Territoriales, la Gerencia de la E.S.E. NORTE 3 y/o el Ministerio de Salud y Protección Social, en el marco de la ejecución contractual.",
            "Apoyar y asistir a las reuniones presenciales, virtuales o mixtas convocadas por el Ministerio de Salud y Protección Social, las Secretarías de Salud Departamental y Municipal, así como por otras entidades e instituciones que, en el marco de la ejecución del contrato, requieran la participación del contratista; garantizando la presentación de la información, avances, resultados y demás requerimientos solicitados, así como la elaboración y entrega de los soportes, actas e informes derivados de dichos espacios cuando sean requeridos.",
        ]
    },
    {
        "role": "SISTEMAS, TECNOLOGÍA Y COMUNICACIONES",
        "names": ["KENNER ZAMBRANO"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Gestión de plataformas oficiales del sector salud - Administrar y operar SISPRO y PISIS, incluyendo: 1. Creación y actualización de usuarios 2. Registro de profesionales y equipos 3. Asignación de territorios y microterritorios. 4. Cargue y validación de archivos planos. 5. Validación de reportes.",
            "Elaborar y validar archivos planos requeridos (ej. SEG500USIN).",
            "Gestionar y operar la plataforma SIAPS (modo online y offline).",
            "Finalizar y validar creación de usuarios en PLENUS, cuando aplique.",
            "Realizar limpieza, depuración y validación de bases de datos.",
            "Verificar integridad, consistencia y trazabilidad de la información cargada.",
            "Generar y validar alertas de salud mental en plataformas oficiales.",
            "Verificar que las alertas cuenten con soporte en historia clínica y coherencia con facturación.",
            "Gestionar envío de alertas conforme a territorialización.",
            "Realizar seguimiento operativo a planes EBS y PIC Departamental.",
            "Apoyar el seguimiento en tiempo real del Plan de Cuidado Primario (PCP).",
            "Consolidar información para informes requeridos por Secretaría de Salud y Ministerio.",
            "Apoyar reporte del Talento Humano EBS para cargue en SISPRO–PISIS.",
            "Brindar soporte técnico presencial y virtual a auxiliares y equipos EBS.",
            "Administrar el inventario de los equipos tecnológicos asignados a la ejecución de la estrategia de Equipos Básicos de Salud (EBS), garantizando su adecuada custodia, control, entrega y recibido (celulares, tabletas y equipos de cómputo y equipos biomedicos), mediante el registro y seguimiento de las salidas y devoluciones, asegurando su uso responsable, conservación y disponibilidad durante la ejecución de las actividades contractuales.",
            "Realizar la gestión, análisis, monitoreo y trazabilidad de los indicadores establecidos en los lineamientos del programa de Equipos Básicos de Salud (EBS), del Plan de Intervenciones Colectivas (PIC) Departamental y de los indicadores institucionales, mediante la consolidación, validación y análisis de la información, elaborando reportes de seguimiento que permitan evaluar el cumplimiento de metas, identificar oportunidades de mejora y apoyar la toma de decisiones para el fortalecimiento de la gestión y el cumplimiento de los objetivos institucionales.",
            "Realizar la gestión, consolidación, elaboración, validación y reporte de los Registros Individuales de Prestación de Servicios de Salud (RIPS) correspondientes a las atenciones efectuadas por los Equipos Básicos de Salud (EBS) y el Plan de Intervenciones Colectivas (PIC) Departamental, garantizando la calidad, integridad, oportunidad y consistencia de la información, conforme a los lineamientos y la normatividad vigente para su correcta presentación y seguimiento.",
            "Diseñar, elaborar, programar, implementar y administrar plataformas, bases de datos y herramientas digitales que permitan la consolidación, organización, seguimiento y análisis de la información generada por las atenciones realizadas en el marco de los Equipos Básicos de Salud (EBS) y el Plan de Intervenciones Colectivas (PIC) Departamental, garantizando la trazabilidad de los registros, la calidad de los datos, la generación de reportes oportunos y el apoyo a los procesos de monitoreo, evaluación y toma de decisiones institucionales.",
            "Asistir, por delegación de la coordinación o de la entidad, a las reuniones, mesas técnicas, capacitaciones, asistencias técnicas, comités, jornadas y demás actividades convocadas por la Secretaría Departamental de Salud, las entidades territoriales, el Ministerio de Salud y Protección Social u otras entidades competentes, participando activamente y brindando el apoyo técnico y administrativo requerido, así como realizando el seguimiento y la socialización de los compromisos derivados de dichos espacios.",
            "Asistir a capacitaciones técnicas requeridas para la operación EBS.",
        ]
    },
    {
        "role": "PROGRAMACIÓN, AUTOMATIZACIÓN Y DESARROLLO",
        "names": ["MARVIN BANGUERO", "STIVEN XXXX"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Análisis de requerimientos funcionales y técnicos para identificar las necesidades de los Equipos Básicos de Salud y traducirlas en soluciones de software.",
            "Desarrollo de nuevos módulos y funcionalidades para las plataformas utilizadas por el programa, siguiendo las especificaciones definidas por el equipo.",
            "Mantenimiento correctivo y evolutivo de las aplicaciones existentes, corrigiendo errores e incorporando mejoras continuas.",
            "Diseñar e implementar mejoras en los procesos digitales para optimizar la gestión de la información de los Equipos Básicos de Salud.",
            "Diseño y optimización de bases de datos, garantizando la integridad, disponibilidad y rendimiento de la información.",
            "Realización de pruebas funcionales, técnicas y de calidad, asegurando el correcto funcionamiento de las aplicaciones antes de su despliegue.",
            "Documentación técnica del software, incluyendo arquitectura, procesos de desarrollo, manuales técnicos y control de versiones.",
            "Soporte técnico y atención de incidentes, brindando solución a problemas reportados por los usuarios y realizando seguimiento a su resolución.",
            "Participación en reuniones de planificación y seguimiento, colaborando con equipos interdisciplinarios para priorizar tareas y evaluar avances del proyecto.",
            "Implementación de mejoras en seguridad, rendimiento y usabilidad, aplicando buenas prácticas de desarrollo para fortalecer la calidad del software y proteger la información.",
            "Apoyar la implementación y mejora del Sistema de Información para la operación de los Equipos Básicos de Salud, asegurando su alineación con los lineamientos del Ministerio de Salud y Protección Social.",
            "Implementar mecanismos de cruce automatizado de información entre bases de datos (SISPRO, PISIS, SIAPS u otras herramientas institucionales), para fortalecer la trazabilidad y calidad del dato.",
            "Configurar y administrar herramientas de colaboración digital que faciliten la comunicación y coordinación operativa entre los integrantes de los Equipos Básicos de Salud.",
            "Brindar soporte técnico funcional a las herramientas tecnológicas utilizadas en la operación extramural e intramural de los EBS.",
            "Realizar monitoreo proactivo de la infraestructura tecnológica utilizada para la operación de los EBS, garantizando disponibilidad, estabilidad y rendimiento.",
            "Implementar y administrar mecanismos de respaldo, recuperación, almacenamiento y continuidad de la información generada durante la ejecución de las actividades intramurales y extramurales de los Equipos Básicos de Salud (EBS), garantizando la disponibilidad, integridad, seguridad, trazabilidad y conservación de los datos, con el fin de asegurar la continuidad de los procesos, la gestión de la información y el cumplimiento de los lineamientos institucionales y la normatividad vigente.",
            "Diseñar y desarrollar tableros de control e indicadores automatizados para el seguimiento de: Cobertura territorial. Intervenciones individuales, familiares y comunitarias. Indicadores extramurales (vacunación, materno-perinatal, salud mental, entre otros)",
            "Realizar análisis de datos demográficos y sanitarios de los territorios asignados (Puerto Tejada, Villa Rica y Padilla), identificando tendencias, brechas y alertas.",
            "Generar reportes técnicos automatizados para la toma de decisiones por parte de la Gerencia y los responsables de la estrategia EBS.",
            "Realizar procesos de migración, estructuración y organización de información histórica y evidencias documentales relacionadas con la ejecución de los EBS.",
            "Optimizar estructuras de bases de datos para garantizar integridad, trazabilidad y disponibilidad de la información en procesos de auditoría y seguimiento institucional.",
        ]
    },
    {
        "role": "CONTRATACIÓN",
        "names": ["YULI LARRAHONDO"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Apoyar la elaboración y trámite de la Solicitud de Certificado de Disponibilidad Presupuestal (CDP), conforme a la necesidad identificada para la implementación y operación de los Equipos Básicos de Salud.",
            "Apoyar la redacción, revisión y ajuste de los documentos contractuales asociados a la implementación y operación de los Equipos Básicos de Salud, incluyendo estudios previos, verificación de inexistencia, análisis de idoneidad, contratos, otrosíes, actas de inicio y actas de liquidación, conforme a los lineamientos del Ministerio de Salud y Protección Social.",
            "Elaborar y consolidar los informes mensuales de ejecución contractual de la estrategia de Equipos Básicos de Salud, asegurando su coherencia con el Plan Integral de Cuidado Primario (PICP), el Plan de Cuidado Primario (PCP) y las metas territoriales definidas.",
            "Realizar la rendición de cuentas mensual en la plataforma SIA OBSERVA, garantizando la veracidad, completitud y oportunidad de la información reportada.",
            "Apoyar la consolidación y presentación del reporte FT026 SNS y demás reportes sectoriales exigidos por las Entidades Territoriales y el Ministerio de Salud y Protección Social.",
            "Realizar la revisión documental de las garantías contractuales cuando a ello haya lugar, verificando su adecuación formal frente a las exigencias establecidas en el Estatuto Interno de Contratación.",
            "Realizar el seguimiento diario a la ejecución contractual de los Equipos Básicos de Salud, verificando el cumplimiento de las obligaciones pactadas y su correspondencia con los resultados operativos e indicadores definidos en el lineamiento ministerial.",
            "Mantener actualizado el cuadro de seguimiento y control de los Equipos Básicos de Salud, incorporando información sobre cobertura territorial, cumplimiento de metas, ejecución contractual y reportes sectoriales.",
            "Consolidar y validar la información del Talento Humano vinculado a la operación de los Equipos Básicos de Salud para su reporte en SISPRO y PISIS, conforme a los lineamientos técnicos vigentes.",
            "Apoyar la ejecución financiera y contractual de los recursos asignados a la operación de los Equipos Básicos de Salud mediante la Resolución correspondiente, realizando seguimiento a compromisos, obligaciones y pagos, sin asumir funciones de ordenación del gasto.",
            "Apoyar la atención de requerimientos de información formulados por la Secretaría de Salud Municipal, la Secretaría de Salud Departamental, el Ministerio de Salud y Protección Social y los organismos de inspección, vigilancia y control, relacionados con la ejecución de la estrategia de Equipos Básicos de Salud.",
            "Garantizar que toda la información contractual y de ejecución asociada a los Equipos Básicos de Salud se encuentre organizada, actualizada y disponible para procesos de auditoría y seguimiento institucional.",
            "Ejecutar las actividades bajo los principios de transparencia, eficiencia, trazabilidad y responsabilidad, en coherencia con los componentes de gestión, seguimiento y evaluación establecidos en el Lineamiento Técnico-Operativo de Equipos Básicos de Salud.",
            "Apoyar y asistir a las reuniones presenciales, virtuales o mixtas convocadas por el Ministerio de Salud y Protección Social, las Secretarías de Salud Departamental y Municipal, así como por otras entidades e instituciones que, en el marco de la ejecución del contrato, requieran la participación del contratista; garantizando la presentación de la información, avances, resultados y demás requerimientos solicitados, así como la elaboración y entrega de los soportes, actas e informes derivados de dichos espacios cuando sean requeridos.",
            "Recopilar, organizar y entregar oportunamente los soportes documentales requeridos para los procesos de contratación, pagos, supervisión y seguimiento, así como para la elaboración de informes, reportes e indicadores de ejecución de los Equipos Básicos de Salud, garantizando mensualmente la calidad, integridad, veracidad y oportunidad de la información presentada, de conformidad con los lineamientos establecidos por la entidad contratante y las disposiciones técnicas y administrativas vigentes.",
        ]
    },
    {
        "role": "APOYO AL PROCESO DE CONTRATACIÓN",
        "names": ["DAHIANNA ARANGO"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Revisar y verificar los documentos habilitantes exigidos para la contratación, asegurando su coherencia con el objeto contractual y la normatividad aplicable.",
            "Apoyar la redacción y revisión de contratos, otrosíes, actas de inicio, actas de liquidación y demás documentos necesarios para el perfeccionamiento y cierre de los procesos contractuales.",
            "Gestionar el trámite de firmas ante Gerencia y Supervisores, asegurando la correcta conformación del expediente contractual.",
            "Realizar el cargue y actualización de la información contractual en SECOP II, SIA OBSERVA y SIGEP II, conforme a los principios de transparencia y publicidad.",
            "Realizar el cargue mensual de pagos, informes de contratistas e informes de supervisión en las plataformas oficiales correspondientes.",
            "Actualizar los formatos institucionales de informes y cuentas de cobro, cuando se requiera, garantizando coherencia con las obligaciones contractuales y lineamientos vigentes.",
            "Revisar los informes, cuentas de cobro y soportes presentados por los contratistas, verificando su completitud documental y su correspondencia con lo pactado, sin ejercer funciones de supervisión directa ni validación laboral.",
            "Apoyar el proceso de supervisión contractual desde el componente documental, organizando y consolidando la información requerida para el seguimiento de la ejecución.",
            "Mantener actualizada la base de datos contractual y el cuadro de control administrativo de los procesos asociados a los Equipos Básicos de Salud.",
            "Apoyar la atención de requerimientos formulados por la Gerencia, las Secretarías de Salud y los organismos de inspección, vigilancia y control, en lo relacionado con la gestión contractual de los Equipos Básicos de Salud.",
            "Ejecutar las actividades bajo los principios de legalidad, transparencia, eficiencia y responsabilidad, en concordancia con el régimen contractual aplicable a la E.S.E. y con los lineamientos del Ministerio de Salud y Protección Social para la implementación de los Equipos Básicos de Salud.",
            "Apoyar y asistir a las reuniones presenciales, virtuales o mixtas convocadas por el Ministerio de Salud y Protección Social, las Secretarías de Salud Departamental y Municipal, así como por otras entidades e instituciones que, en el marco de la ejecución del contrato, requieran la participación del contratista; garantizando la presentación de la información, avances, resultados y demás requerimientos solicitados, así como la elaboración y entrega de los soportes, actas e informes derivados de dichos espacios cuando sean requeridos.",
            "Recopilar, organizar y entregar oportunamente los soportes documentales requeridos para los procesos de contratación, pagos, supervisión y seguimiento, así como para la elaboración de informes, reportes e indicadores de ejecución de los Equipos Básicos de Salud, garantizando mensualmente la calidad, integridad, veracidad y oportunidad de la información presentada, de conformidad con los lineamientos establecidos por la entidad contratante y las disposiciones técnicas y administrativas vigentes.",
        ]
    },
    {
        "role": "APOYO CONTABLE",
        "names": ["JULIAN (YULIAN)"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Apoyar la revisión documental de informes, cuentas de cobro y soportes contractuales presentados en el marco de la ejecución de los Equipos Básicos de Salud, verificando su completitud y coherencia formal con los requisitos establecidos.",
            "Apoyar la verificación de la correcta inclusión de los documentos soporte requeridos para el trámite contable y financiero de las obligaciones contractuales.",
            "Apoyar el registro y organización de la información necesaria para el proceso de causación contable de las obligaciones derivadas de la ejecución contractual de los Equipos Básicos de Salud, conforme a los procedimientos internos vigentes.",
            "Apoyar la elaboración y estructuración de los documentos requeridos para la generación de órdenes de pago, sin asumir funciones de validación, aprobación u ordenación del gasto.",
            "Apoyar la creación, actualización y verificación de terceros en el sistema contable o financiero institucional, asegurando la correcta incorporación de la información documental requerida.",
            "Apoyar el seguimiento mensual a la ejecución financiera, haciendo paralelos entre las disponibilidades presupuestales, los registros presupuestales, las cuentas causadas y los pagos efectuados, aportando al seguimiento y control financiero el programa.",
            "Consolidar información contable relacionada con compromisos, obligaciones y pagos efectuados en el marco de la operación de los Equipos Básicos de Salud.",
            "Organizar y mantener actualizado el archivo contable físico o digital de los documentos asociados a la ejecución contractual, garantizando trazabilidad y disponibilidad para auditorías.",
            "Apoyar la preparación de reportes contables y financieros requeridos por la Gerencia o el área financiera, relacionados con la ejecución de los recursos asignados a la estrategia de Equipos Básicos de Salud.",
            "Apoyar la conciliación documental entre los registros contables y la información contractual, con fines de control interno y trazabilidad administrativa.",
            "Ejecutar las actividades bajo los lineamientos internos del área contable, sin asumir funciones de supervisión contractual, validación definitiva de cuentas, ordenación del gasto ni toma de decisiones financieras.",
        ]
    },
    {
        "role": "APOYO A LA GESTIÓN",
        "names": ["NATHALIA ECHEVERRY"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Realizar funciones de fotocopiado, escaneo e impresión de documentos, según la necesidad del proceso administrativo de los Equipos Básicos en Salud de la E.S.E. NORTE 3.",
            "Administrar el inventario de los equipos tecnológicos asignados a la ejecución de la estrategia de Equipos Básicos de Salud (EBS), garantizando su adecuada custodia, control, entrega y recibido (celulares, tabletas y equipos de cómputo y equipos biomedicos), mediante el registro y seguimiento de las salidas y devoluciones, asegurando su uso responsable, conservación y disponibilidad durante la ejecución de las actividades contractuales.",
            "Gestionar, elaborar, actualizar, depurar y consolidar las bases de datos requeridas para la elaboración de informes, seguimiento de actividades, indicadores, caracterización de la población, reportes institucionales y demás procesos administrativos y operativos del Plan de Intervenciones Colectivas (PIC) Departamental, los Equipos Básicos de Salud (EBS) y otros programas institucionales, garantizando la calidad, consistencia, integridad y oportunidad de la información.",
            "Apoyar en el proceso de mantener registros de documentos y contratos, asegurando que estén disponibles y actualizados, antes, durante y después del plazo del contrato.",
            "Apoyar los procedimientos de gestión documental contractual y legal, aplicando las normas establecidas y aplicables al proceso.",
            "Apoyar en la coordinación del proceso de reclutamiento del personal, recepción de hojas de vida, organización de la documentación y verificación del cumplimiento de los requisitos habilitantes para el desempeño de funciones asistenciales y administrativas cuando aplique.",
            "Apoyar en la recepción, verificación y corrección de las cuentas de cobro e informes del personal asistencial, así como la afiliación al Sistema General de Seguridad Social Integral y el pago oportuno de los aportes en SALUD, PENSIÓN Y ARL de estos.",
            "Apoyar el proceso de seguimiento al cumplimiento de las funciones por parte del personal asistencial de los Equipos Básicos en Salud.",
            "Apoyar la organización y presentación ante las Coordinadoras de cada Unidad de Atención, los documentos necesarios para la supervisión de los contratos y el respectivo pago al personal contratado para los Equipos Básicos de Salud de la E.S.E. NORTE 3 Puerto Tejada, Villa Rica y Padilla.",
            "Recopilar y organizar el registro fotográfico de las actividades que realiza el personal asistencial en la ejecución de las obligaciones pactadas en el marco de los Equipos Básicos de Salud de la E.S.E. NORTE 3 Puerto Tejada, Villa Rica y Padilla.",
            "Asistir a todas las reuniones programadas por el coordinador, para planeación, seguimiento y cumplimiento de las actividades por parte del personal asistencial y administrativo.",
            "Estar afiliada al Sistema General de Seguridad Social Integral y realizar los aportes correspondientes.",
            "Presentar al Sindicato los informes parciales y el informe final, donde conste el cumplimiento efectivo de las actividades específicas para este perfil. Al informe deberá anexar la cuenta de cobro, certificación de que se encuentra activo en la ARL, planilla de pago de seguridad social (en caso de que realice los aportes el afiliado partícipe) y certificación bancaria vigente.",
        ]
    },
    {
        "role": "APOYO A LA GESTIÓN COMUNITARIA",
        "names": ["GESTORES"],
        "identificacion_prefix": "APOYO-",
        "actividades": [
            "Actuar como enlace comunitario entre el Equipo de Salud Territorial (EST) y las personas, familias y comunidades del territorio asignado, facilitando la comunicación y articulación comunitaria.",
            "Apoyar el relacionamiento inicial entre el EST y la comunidad, promoviendo la confianza, la participación social y el reconocimiento del enfoque comunitario en salud.",
            "Contribuir al análisis de los determinantes sociales del bienestar y la salud, aportando información relevante del contexto comunitario.",
            "Identificar de manera temprana situaciones de riesgo en salud a nivel individual, familiar y comunitario, y apoyar su canalización al equipo correspondiente.",
            "Fortalecer las actividades de información, educación y canalización de la población hacia los servicios de salud y sociales disponibles en el territorio.",
            "Apoyar el seguimiento familiar a las acciones definidas en el Plan Integral de Cuidado Primario (PICP), conforme a la planeación del Equipo Básico de Salud.",
            "Contribuir al diseño y desarrollo de estrategias de comunicación accesible e incluyente con personas, familias y comunidades, reconociendo sus necesidades de apoyo, ajustes razonables y contexto sociocultural.",
            "Apoyar el seguimiento y ajuste de los PICP dirigidos a la persona, familia y comunidad, de acuerdo con los resultados del trabajo comunitario.",
            "Apoyar la revisión del avance en el cumplimiento de las acciones y metas establecidas en los PICP para personas, familias y comunidades.",
            "Contribuir al seguimiento del cumplimiento de las metas de cobertura de la población asignada, en las intervenciones individuales, familiares y colectivas del PICP.",
            "Participar en las reuniones de retroalimentación comunitaria programadas por el Equipo Básico de Salud, orientadas a la identificación, análisis y toma de decisiones sobre los factores que inciden en el desempeño del equipo.",
            "Gestionar, en articulación con los servicios sociales del territorio, la asistencia social requerida por personas, familias o comunidades que, por su situación, lo necesiten.",
            "Identificar potencialidades y riesgos en los entornos comunitarios, para la priorización de intervenciones individuales, colectivas, sociosanitarias y ambientales, en coherencia con los Planes Territoriales de Salud.",
            "Apoyar la programación, planeación, logística y desarrollo de las actividades de los Equipos Básicos de Salud de la E.S.E. NORTE 3, relacionadas con el componente comunitario.",
            "Participar en las reuniones de seguimiento y evaluación programadas por la coordinación del Equipo Básico de Salud, en el marco del control y seguimiento contractual.",
            "Ejecutar las actividades propias del rol de Gestor Comunitario, directamente relacionadas con el objeto del contrato y la estrategia de Atención Primaria en Salud, conforme a los lineamientos técnicos aplicables.",
            "Acreditar durante la ejecución del contrato la afiliación vigente al Sistema General de Seguridad Social Integral en salud, pensión y riesgos laborales (ARL), y presentar mensualmente los soportes de pago correspondientes.",
            "Remitir de manera oportuna la documentación requerida para el seguimiento contractual, incluyendo informes parciales y finales de actividades, cronogramas de desplazamiento, soportes de seguridad social y demás documentos solicitados por la supervisión, conforme a sus facultades.",
            "Radicar, al finalizar la ejecución del contrato, la cuenta de cobro o factura con los respectivos soportes.",
            "Entregar los soportes físicos y digitales de los registros de firmas y demás documentos comunitarios requeridos, conforme a los procedimientos establecidos.",
            "Actuar conforme a los lineamientos técnicos y operativos definidos para la ejecución del programa de Equipos Básicos de Salud, en el marco del objeto contractual.",
        ]
    },
]


async def main():
    logger.info("Iniciando carga de Apoyo Administrativo...")
    
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        total_apoyos = 0
        total_actividades = 0
        creados = []
        
        for section in SECTIONS:
            role = section["role"]
            names = section["names"]
            actividades_text = section["actividades"]
            
            for name in names:
                # Check if already exists
                existing = await db.execute(
                    select(ApoyoAdministrativo).where(ApoyoAdministrativo.nombre == name)
                )
                if existing.scalar_one_or_none():
                    logger.info(f"  [SKIP] {name} — ya existe")
                    continue
                
                # Generate a unique identification
                ident = f"APOYO-{role.split()[0][:3].upper()}-{name.split()[0].upper()}"
                
                apoyo = ApoyoAdministrativo(
                    nombre=name,
                    identificacion=ident,
                    perfil=role,
                    activo=True,
                )
                db.add(apoyo)
                await db.flush()
                
                # Create activities
                for i, act_text in enumerate(actividades_text):
                    act = ActividadApoyo(
                        apoyo_id=apoyo.id,
                        descripcion=act_text,
                        tipo="GENERAL",
                        orden=i + 1,
                    )
                    db.add(act)
                
                total_apoyos += 1
                total_actividades += len(actividades_text)
                creados.append(f"{name} ({role}): {len(actividades_text)} actividades")
                logger.info(f"  [OK] {name} ({ident}) — {len(actividades_text)} actividades")
        
        await db.commit()
    
    logger.info(f"\nResumen:")
    logger.info(f"  Apoyos creados: {total_apoyos}")
    logger.info(f"  Actividades creadas: {total_actividades}")
    for c in creados:
        logger.info(f"    - {c}")
    
    await engine.dispose()
    logger.info("Carga completada exitosamente!")


if __name__ == "__main__":
    from docx import Document
    asyncio.run(main())
