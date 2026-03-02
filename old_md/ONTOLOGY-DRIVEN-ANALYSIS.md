# 🧬 Ontología como Motor de Descubrimiento de Vectores de Ataque

## Por qué una Ontología y no Reglas Hardcoded

Una base de datos relacional (SQL) almacena filas y columnas. Sabes qué buscar antes de buscarlo.  
Un **grafo de conocimiento dirigido por una ontología OWL** almacena **entidades y las relaciones semánticas entre ellas**. No buscas respuestas: **descubres caminos que no sabías que existían**.

Esa es la diferencia fundamental de AEGIS: la ontología define el **universo posible de relaciones**, y el grafo materializa los datos reales dentro de ese universo. Cuando lanzas una búsqueda de *hidden links*, estás preguntando:

> *"¿Qué caminos existen entre estas entidades que yo no he definido explícitamente como sospechosos?"*

---

## Arquitectura Ontológica de AEGIS

### La Ontología: `water-sabotage.owl.ttl`

```
Ontology: http://aegis.intelligence/ontology/water
Formato:  OWL 2 en Turtle (TTL)
Dominio:  Infraestructura crítica — Suministro de agua
```

#### Jerarquía de Clases (TBox)

```
:Facility
  ├── :WaterTreatmentPlant
  ├── :PumpStation
  ├── :Reservoir
  └── :DistributionNode

:Event
  ├── :PhysicalAnomalyEvent     ← Anomalía sensor (cloro, turbidez, pH, caudal)
  ├── :AccessEvent               ← Acceso físico (badge, puerta, cámara)
  ├── :CyberAlertEvent           ← Alerta ciber (login PLC, anomalía SCADA)
  ├── :MaintenanceEvent          ← Mantenimiento (programado o no)
  └── :CitizenReportEvent        ← Queja ciudadana (olor, sabor, color, salud)

:Person
  ├── :Employee
  └── :Contractor

:Asset
  ├── :Valve
  ├── :PLC         ← Controlador lógico programable
  ├── :Camera
  └── :Pump

:Organization
:Sensor
:Observation
:Substance
:Location

:RiskCase
  └── :SuspectedSabotage         ← Requiere ≥3 linkedEvent (axioma OWL)
```

#### Propiedades Objeto (Object Properties)

Estas son las **relaciones semánticas** que conectan el grafo:

| Propiedad | Dominio → Rango | Significado |
|---|---|---|
| `:occursAt` | Event → Facility | Un evento ocurre en una instalación |
| `:involvesPerson` | Event → Person | Una persona está implicada en un evento |
| `:involvesAsset` | Event → Asset | Un activo está involucrado en un evento |
| `:involvesSubstance` | Event → Substance | Una sustancia es relevante para el evento |
| `:hasSensor` | Facility → Sensor | Sensores instalados en la instalación |
| `:hasAsset` | Facility → Asset | Activos físicos de la instalación |
| `:belongsTo` | Person → Organization | Persona pertenece a una organización |
| `:operatesIn` | Organization → Location | Organización opera en una zona |
| `:locatedAt` | Facility → Location | Ubicación geográfica |
| `:connectedTo` | Person ↔ Person | Conexión social/profesional (simétrica) |
| `:linkedEvent` | RiskCase → Event | Eventos vinculados a un caso |
| `:linkedFacility` | RiskCase → Facility | Instalación afectada |
| `:linkedPerson` | RiskCase → Person | Persona vinculada al caso |
| `:indicates` | Event → RiskCase | Un evento señala un caso de riesgo |

#### Axiomas OWL (Restricciones)

```turtle
:PhysicalAnomalyEvent rdfs:subClassOf [
    owl:onProperty :occursAt ;
    owl:someValuesFrom :Facility       # Toda anomalía física DEBE ocurrir en una instalación
] .

:AccessEvent rdfs:subClassOf [
    owl:onProperty :involvesPerson ;
    owl:someValuesFrom :Person         # Todo acceso DEBE involucrar a una persona
] .

:SuspectedSabotage rdfs:subClassOf [
    owl:onProperty :linkedEvent ;
    owl:minCardinality 3               # Un sabotaje sospechado requiere ≥3 eventos enlazados
] .
```

---

## Relaciones Materializadas en Neo4j

La ontología se materializa como un grafo en Neo4j con estas relaciones Cypher:

```
(:Facility)-[:LOCATED_AT]->(:Location)
(:Facility)-[:HAS_SENSOR]->(:Sensor)
(:Facility)-[:HAS_ASSET]->(:Asset)
(:Person)-[:BELONGS_TO]->(:Organization)
(:Organization)-[:OPERATES_IN]->(:Location)
(:Person)-[:CONNECTED_TO]->(:Person)          ← Simétrica
(:Event)-[:OCCURS_AT]->(:Facility)
(:Event)-[:INVOLVES_PERSON]->(:Person)
(:Event)-[:INVOLVES_ASSET]->(:Asset)
(:RiskCase)-[:LINKED_EVENT]->(:Event)
(:RiskCase)-[:LINKED_FACILITY]->(:Facility)
(:RiskCase)-[:LINKED_PERSON]->(:Person)
```

---

## Vectores de Ataque Conocidos (InferenceEngine)

El `InferenceEngine` detecta **8 patrones predefinidos** en tiempo real (cada 30 segundos):

### Patrón 1 — Cluster de Severidad
```
≥2 eventos con severidad ≥4 en la misma instalación → RiskCase
```
**Vector**: Ataque concentrado. Múltiples indicadores de compromiso en un solo punto.

### Patrón 2 — Cadena Multi-Vector
```
≥3 tipos distintos de eventos de alta severidad en la misma instalación → RiskCase
```
**Vector**: Ataque coordinado que combina vectores físico + ciber + acceso. El atacante actúa en múltiples capas simultáneamente.

### Patrón 3 — Anomalía Fuera de Horario
```
Acceso o alerta ciber entre 22:00–06:00 con severidad ≥3 → RiskCase
```
**Vector**: Insider threat o intrusión nocturna. Actividad en horarios donde no debería haber nadie.

### Patrón 4 — Actor Repetido
```
Misma persona en ≥2 eventos de severidad ≥3 → RiskCase
```
**Vector**: Persona de interés. Correlación de actividad sospechosa de un individuo a lo largo del tiempo.

### Patrón 5 — Spike de Sensores Anómalos
```
≥3 lecturas anómalas de sensores en la misma instalación → RiskCase
```
**Vector**: Contaminación del agua o fallo inducido. Múltiples sensores fuera de rango simultáneamente.

### Patrón 6 — Dispersión Geográfica
```
Mismo tipo de evento en ≥3 instalaciones distintas → RiskCase
```
**Vector**: Ataque coordinado multi-sitio. Un adversario actuando en paralelo contra múltiples puntos de la red.

### Patrón 7 — Cascada de Escalación
```
Eventos con severidad creciente (3→4→5) en la misma instalación → RiskCase
```
**Vector**: Crisis en desarrollo. La situación empeora progresivamente — posible ataque por fases.

### Patrón 8 — Convergencia Ciber-Física
```
CyberAlert + PhysicalAnomaly en la misma instalación → RiskCase
```
**Vector**: Ataque híbrido. El atacante compromete los sistemas SCADA/PLC y simultáneamente se observan anomalías en los sensores físicos.

---

## Hidden Links: Descubrimiento de Vectores DESCONOCIDOS

### ¿Qué es el Link Analysis?

Los 8 patrones anteriores son **reglas predefinidas**. Capturan lo que ya sabemos.

El **Link Analysis** hace lo contrario: **descubre relaciones que NO hemos programado**.

```cypher
MATCH p = allShortestPaths((a)-[*..6]-(b))
RETURN p
```

Esta query de Cypher pide a Neo4j: *"Encuentra TODOS los caminos más cortos entre el nodo A y el nodo B, atravesando hasta 6 relaciones de cualquier tipo"*.

### ¿Por qué la Ontología es Clave?

La ontología define un **esquema rico de relaciones** entre entidades. Cada relación es un posible paso en un camino oculto. Sin ontología, tendrías nodos sueltos sin relaciones significativas. Con la ontología, tienes un **grafo denso de relaciones semánticas** que permite descubrir conexiones indirectas.

#### Ejemplo Concreto: Descubrir un Insider Threat No Programado

Imagina que seleccionas dos nodos en el Link Analysis:
- **PER-042** (Carlos, contratista de AquaServ Maintenance)
- **FAC-001** (ETAP Retiro, planta de tratamiento)

Carlos **nunca ha sido vinculado** a ningún evento en FAC-001 directamente. El InferenceEngine no ha generado ningún caso sobre él. Pero el Link Analysis descubre:

```
PER-042 (Carlos)
  ──[:BELONGS_TO]──► ORG-AquaServ
      ──[:OPERATES_IN]──► LOC-Madrid-Central
          ◄──[:LOCATED_AT]── FAC-001 (ETAP Retiro)
              ──[:HAS_ASSET]──► PLC-001
                  ◄──[:INVOLVES_ASSET]── EVT-xxx (CyberAlert: PLC login attempt)
                      ──[:INVOLVES_PERSON]──► PER-007 (Pedro, otro contratista de AquaServ)
                          ──[:CONNECTED_TO]──► PER-042 (Carlos)  ← ¡CÍRCULO!
```

**Lo que acabamos de descubrir**:

1. Carlos trabaja para la misma empresa que Pedro
2. La empresa opera en la misma zona donde está la planta
3. Pedro estuvo involucrado en un intento de acceso al PLC de esa planta
4. Carlos y Pedro tienen una conexión directa entre ellos

**Ninguna regla del InferenceEngine habría detectado esto.** No hay una regla para "contratista de la misma empresa que un sospechoso que tiene conexión social con él". Es un **vector de ataque emergente** que surge de la estructura del grafo.

### Tipos de Vectores que Emergen del Grafo

La ontología habilita el descubrimiento de estos tipos de conexiones ocultas:

#### 1. Cadena Organizacional
```
Person ──[:BELONGS_TO]──► Organization ──[:OPERATES_IN]──► Location ◄──[:LOCATED_AT]── Facility
```
> *"¿Qué personas de qué organizaciones tienen presencia en la zona de esta instalación?"*

#### 2. Confluencia de Actores
```
Person A ──[:CONNECTED_TO]──► Person B ──[:INVOLVES_PERSON]──◄ Event ──[:OCCURS_AT]──► Facility
```
> *"Personas conectadas socialmente donde una ya está vinculada a eventos en la instalación"*

#### 3. Vector Activo-Compartido
```
Event₁ ──[:INVOLVES_ASSET]──► Asset ◄──[:INVOLVES_ASSET]── Event₂
```
> *"Dos eventos aparentemente inconexos que comparten el mismo activo físico (misma válvula, mismo PLC)"*

#### 4. Patrón de Sustancia Cruzada
```
Event₁ ──[:INVOLVES_SUBSTANCE]──► Substance ◄──[:INVOLVES_SUBSTANCE]── Event₂ (otra instalación)
```
> *"Misma sustancia contaminante detectada en instalaciones diferentes — ¿fuente común?"*

#### 5. Cadena Sensor → Anomalía → Persona
```
Facility ──[:HAS_SENSOR]──► Sensor ──[:PRODUCES_OBSERVATION]──► Observation
                                                                      ↕
Facility ◄──[:OCCURS_AT]── Event ──[:INVOLVES_PERSON]──► Person ──[:BELONGS_TO]──► Organization
```
> *"Correlacionar quién estaba involucrado en la instalación cuando los sensores empezaron a dar lecturas anómalas"*

#### 6. Triángulo Geográfico
```
Person ──[:BELONGS_TO]──► Org ──[:OPERATES_IN]──► Location
                                                        ↕
                                                   Facility₁, Facility₂, Facility₃
```
> *"Organización con operaciones que cubren geográficamente múltiples instalaciones críticas simultáneamente"*

---

## El Agente IA + Ontología: Razonamiento Dinámico

El agente ReAct de AEGIS utiliza la ontología como **guía de razonamiento**:

1. **`get_ontology`** — El agente lee la estructura completa del grafo (tipos, propiedades, relaciones)
2. **`query_graph`** — Escribe queries Cypher **dinámicamente** basándose en lo que aprendió de la ontología
3. **`get_node_neighbors`** — Explora el vecindario de un nodo para descubrir conexiones
4. **`get_risk_patterns`** — Analiza frecuencia, severidad y densidad de relaciones

El agente NO tiene reglas if/then/else. Lee la ontología, comprende qué relaciones existen, y razona sobre por qué los patrones que observa son significativos.

```
Instrucción al agente:
"ALWAYS start by calling get_ontology to understand the graph structure"
"Reason about WHY patterns exist based on the ontology relationships"
```

Esto significa que si mañana añadimos un nuevo tipo de relación a la ontología (e.g., `:suppliesChemicalsTo` entre Organization y Facility), el agente **automáticamente** empezará a razonar sobre esa relación sin necesidad de cambiar una sola línea de código.

---

## Comparativa: Con Ontología vs Sin Ontología

| Aspecto | Sin Ontología (SQL/Reglas) | Con Ontología (Knowledge Graph) |
|---|---|---|
| **Detección** | Solo patrones preprogramados | Patrones programados + emergentes |
| **Nuevos vectores** | Requiere nueva regla de código | Se descubren automáticamente por la estructura del grafo |
| **Preguntas** | "¿Existe este patrón?" | "¿Qué caminos existen que no conozco?" |
| **Evolución** | Añadir código + deploy | Añadir relación a ontología + datos |
| **Profundidad** | Consultas planas (1 tabla) | Travesías de profundidad N (6+ saltos) |
| **Contexto** | Datos tabulares aislados | Entidades semánticamente conectadas |
| **IA** | Reglas rígidas | Agente razona dinámicamente sobre el schema |

---

## Ejemplo Real de la Plataforma

### Escenario de Sabotaje #1 (seed data)

```
Instalación: FAC-001 (ETAP Retiro)
Eventos:
  1. PhysicalAnomaly — Simultaneous pressure drops (SEV-5)
  2. AccessEvent — Unauthorized access badge (SEV-4) → PER-010
  3. CyberAlert — PLC login attempt from unknown IP (SEV-5) → PLC-001
  4. CitizenReport — Water taste complaints (SEV-4)
```

**InferenceEngine detecta** (reglas conocidas):
- Patrón 1: Cluster de severidad (4 eventos SEV≥4)
- Patrón 2: Multi-vector (4 tipos distintos)
- Patrón 8: Ciber-físico (CyberAlert + PhysicalAnomaly)

**Link Analysis descubre** (vectores desconocidos):
```
PER-010 ──[:CONNECTED_TO]──► PER-042
PER-042 ──[:BELONGS_TO]──► AquaServ Maintenance
AquaServ ──[:OPERATES_IN]──► Madrid-Central
FAC-001 ──[:LOCATED_AT]──► Madrid-Central
```

→ **Nuevo vector emergente**: El atacante (PER-010) tiene conexión social con un contratista (PER-042) cuya empresa opera en la misma zona que la instalación atacada. ¿Insider threat facilitado por un cómplice externo?

---

## Conclusión

La ontología OWL de AEGIS no es documentación — es el **motor de inferencia**. Define las relaciones posibles entre entidades, y esas relaciones son los caminos por los que viajan las búsquedas de hidden links.

Cada nueva relación añadida a la ontología (`water-sabotage.owl.ttl`) y materializada en Neo4j es un nuevo **eje de descubrimiento**. No hace falta escribir código nuevo para detectar un nuevo patrón — solo hace falta que las entidades estén conectadas semánticamente, y el algoritmo `allShortestPaths` las encontrará.

**Los 8 patrones del InferenceEngine capturan lo que ya sabemos.**  
**La ontología + Link Analysis descubren lo que aún no sabemos.**

Esa es la ventaja fundamental de un sistema de inteligencia basado en grafos de conocimiento sobre un sistema basado en reglas.
