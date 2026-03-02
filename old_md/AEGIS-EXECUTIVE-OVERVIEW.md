# 🛡️ AEGIS — Executive Overview

> **Plataforma de Inteligencia para Protección de Infraestructuras Críticas del Agua**
>
> Sistema inspirado en Palantir Gotham, construido con IA, grafos de conocimiento y búsqueda heterogénea
> para detectar sabotajes en redes de abastecimiento de agua.

---

## 1. Arquitectura General

```mermaid
graph TB
    subgraph "🌐 FUENTES DE DATOS HETEROGÉNEAS"
        direction LR
        V["📹 Transcripciones<br/>de Vídeo CCTV"]
        M["📄 Informes de<br/>Mantenimiento (PDF)"]
        L["🔬 Análisis de<br/>Laboratorio"]
        P["👤 Perfiles de<br/>Trabajadores (HR)"]
        S["🖥️ Logs SCADA"]
        E["📧 Emails<br/>interceptados"]
        I["📋 Inspecciones<br/>regulatorias"]
        PH["📸 Análisis de<br/>fotos forenses"]
        B["🔑 Registros de<br/>badges de acceso"]
        DB["🗄️ Extractos de<br/>bases de datos"]
    end

    subgraph "⚙️ MOTOR DE PROCESAMIENTO"
        direction TB
        GEN["🛰️ Generador de Datos<br/><i>220 documentos + 500 eventos</i>"]
        SIM["🔄 Simulador de Eventos<br/><i>Continuo 24/7</i>"]
    end

    subgraph "🧠 PLATAFORMA AEGIS"
        direction TB
        
        subgraph "📊 ALMACENAMIENTO"
            NEO["🔵 Neo4j<br/><b>Grafo de Conocimiento</b><br/>Personas · Instalaciones · Eventos<br/>Documentos · Casos de Riesgo<br/>+ Ontología OWL"]
            OS["🟢 OpenSearch<br/><b>Búsqueda Full-Text</b><br/>aegis-events (35+)<br/>aegis-intel (220 docs)"]
            RED["🔴 Redis<br/><b>Cache + Pub/Sub</b><br/>Alertas en tiempo real"]
        end

        subgraph "🤖 INTELIGENCIA"
            IE["🧠 Inference Engine<br/><b>8 patrones de detección</b><br/>Auto-crea casos de riesgo"]
            AG["🤖 Agente ReAct (IA)<br/><b>Ollama + qwen2.5:7b</b><br/>5 herramientas autónomas"]
        end

        subgraph "🌐 API REST (.NET 10)"
            API["⚡ AEGIS API<br/>Events · Search · Graph<br/>AI · RiskCases · Dashboard"]
        end
    end

    subgraph "👁️ INTERFAZ DE ANALISTA"
        FE["🖥️ React + TypeScript<br/>Dashboard · Mapa · Grafo<br/>Timeline · Búsqueda · IA"]
    end

    V & M & L & P & S & E & I & PH & B & DB --> GEN
    GEN --> NEO
    GEN --> OS
    SIM --> API
    NEO <--> API
    OS <--> API
    RED <--> API
    IE --> NEO
    IE --> RED
    AG <--> NEO
    AG <--> OS
    API --> FE

    style NEO fill:#2563eb,color:#fff,stroke:#1d4ed8
    style OS fill:#16a34a,color:#fff,stroke:#15803d
    style RED fill:#dc2626,color:#fff,stroke:#b91c1c
    style IE fill:#7c3aed,color:#fff,stroke:#6d28d9
    style AG fill:#f59e0b,color:#fff,stroke:#d97706
    style FE fill:#06b6d4,color:#fff,stroke:#0891b2
    style API fill:#374151,color:#fff,stroke:#1f2937
```

---

## 2. Flujo Principal: De Datos Brutos a Inteligencia Accionable

```mermaid
sequenceDiagram
    autonumber
    participant SRC as 📁 Fuentes<br/>Heterogéneas
    participant GEN as 🛰️ Generador
    participant NEO as 🔵 Neo4j<br/>Grafo
    participant OS as 🟢 OpenSearch<br/>Búsqueda
    participant IE as 🧠 Inference<br/>Engine
    participant RED as 🔴 Redis<br/>Alertas
    participant API as ⚡ API
    participant AI as 🤖 Agente IA<br/>ReAct
    participant UI as 👁️ Analista<br/>Dashboard

    rect rgb(30, 40, 60)
        Note over SRC,OS: 📥 FASE 1 — Ingestión de Datos Heterogéneos
        SRC->>GEN: 10 tipos: CCTV, PDFs, lab, SCADA,<br/>emails, badges, fotos, HR...
        GEN->>NEO: seed.cypher<br/>20 instalaciones · 100 personas<br/>220 documentos · 6 escenarios
        GEN->>OS: intel_documents.json<br/>220 docs indexados full-text
    end

    rect rgb(40, 20, 50)
        Note over IE,RED: 🔍 FASE 2 — Detección Automática (cada 30s)
        IE->>NEO: Consulta: eventos recientes ≥ severidad 4
        NEO-->>IE: Eventos correlacionados
        IE->>IE: Aplica 8 patrones:<br/>① Cluster severidad<br/>② Correlación multi-tipo<br/>③ Acceso fuera de horario<br/>④ Actor repetitivo<br/>⑤ Spike de sensores<br/>⑥ Propagación geográfica<br/>⑦ Cascada de escalación<br/>⑧ Convergencia ciber-física
        IE->>NEO: Crea RiskCase automático<br/>(confianza + puntuación)
        IE->>RED: Publica alerta SignalR
        RED-->>UI: 🚨 Push: "Nuevo caso de riesgo"
    end

    rect rgb(20, 40, 40)
        Note over UI,AI: 🕵️ FASE 3 — Investigación IA Autónoma
        UI->>API: Analista abre caso CASE-006
        API->>AI: Investiga caso (SSE streaming)
        AI->>AI: Thought: "Necesito entender<br/>el grafo primero"
        AI->>NEO: 🔧 get_ontology
        NEO-->>AI: Esquema: nodos, relaciones
        AI->>NEO: 🔧 query_graph<br/>MATCH (rc:RiskCase)-[:LINKED_EVENT]->(e)...
        NEO-->>AI: Eventos vinculados + personas
        AI->>NEO: 🔧 get_node_neighbors<br/>Explora conexiones del sospechoso
        NEO-->>AI: Red social, instalaciones visitadas
        AI->>OS: 🔧 search_events<br/>"unauthorized access Móstoles"
        OS-->>AI: Docs relevantes: emails,<br/>logs SCADA, badges, fotos
        AI->>AI: 🧠 Sintetiza hallazgos:<br/>Conexiones ocultas descubiertas
        AI-->>UI: 📋 Informe completo<br/>(streaming Markdown)
    end

    rect rgb(40, 35, 20)
        Note over UI,OS: 🔎 FASE 4 — Búsqueda Heterogénea
        UI->>API: Buscar: "chlorine tampering"
        API->>OS: Multi-match en aegis-events<br/>+ aegis-intel (fuzzy)
        OS-->>API: Resultados mezclados:<br/>📄 Informe maint. (score 11.2)<br/>🔬 Lab análisis (score 9.8)<br/>⚡ Evento sensor (score 8.7)<br/>📧 Email sospechoso (score 7.1)
        API-->>UI: Resultados con tipo, clasificación,<br/>instalación, persona, archivo fuente
    end
```

---

## 3. Grafo de Conocimiento: Entidades y Relaciones

```mermaid
graph LR
    subgraph "🏗️ Infraestructura"
        F["🏭 Facility<br/><i>20 instalaciones</i>"]
        A["⚙️ Asset<br/><i>PLCs, Válvulas, Bombas</i>"]
        S["📡 Sensor<br/><i>~100 sensores</i>"]
        L["📍 Location<br/><i>20 municipios Madrid</i>"]
    end

    subgraph "👥 Personas"
        P["👤 Person<br/><i>55 empleados + 45 contratistas</i>"]
        O["🏢 Organization<br/><i>8 empresas</i>"]
    end

    subgraph "⚡ Eventos"
        E["🔴 Event<br/><i>Sabotaje, Acceso, Ciber</i>"]
        RC["🚨 RiskCase<br/><i>Auto-generados por IA</i>"]
    end

    subgraph "📚 Documentos Intel"
        D["📎 Document<br/><i>220 heterogéneos</i>"]
    end

    F -->|HAS_SENSOR| S
    F -->|HAS_ASSET| A
    F -->|LOCATED_AT| L
    P -->|BELONGS_TO| O
    O -->|OPERATES_IN| L
    E -->|OCCURS_AT| F
    E -->|INVOLVES_PERSON| P
    E -->|INVOLVES_ASSET| A
    P -->|CONNECTED_TO| P
    RC -->|LINKED_EVENT| E
    RC -->|LINKED_FACILITY| F
    RC -->|LINKED_PERSON| P
    D -->|REFERENCES_FACILITY| F
    D -->|REFERENCES_PERSON| P

    style F fill:#2563eb,color:#fff
    style P fill:#f59e0b,color:#fff
    style E fill:#dc2626,color:#fff
    style RC fill:#7c3aed,color:#fff
    style D fill:#16a34a,color:#fff
    style O fill:#6b7280,color:#fff
    style S fill:#06b6d4,color:#fff
    style A fill:#374151,color:#fff
    style L fill:#4b5563,color:#fff
```

---

## 4. Capacidades del Agente IA (ReAct)

```mermaid
flowchart TD
    START(("🕵️ Analista<br/>solicita investigación")) --> T1

    T1["🧠 Thought<br/><i>Necesito entender la estructura<br/>del grafo de conocimiento</i>"]
    T1 --> A1["🔧 Action: get_ontology<br/><i>Obtener esquema completo</i>"]
    A1 --> O1["👁️ Observation<br/><i>14 tipos de nodo, 18 relaciones,<br/>propiedades clave identificadas</i>"]

    O1 --> T2["🧠 Thought<br/><i>Ahora consulto los eventos<br/>vinculados al caso</i>"]
    T2 --> A2["🔧 Action: query_graph<br/><i>Cypher dinámico contra Neo4j</i>"]
    A2 --> O2["👁️ Observation<br/><i>5 eventos, 2 instalaciones,<br/>2 sospechosos identificados</i>"]

    O2 --> T3["🧠 Thought<br/><i>Exploro las conexiones sociales<br/>del sospechoso principal</i>"]
    T3 --> A3["🔧 Action: get_node_neighbors<br/><i>Red de contactos del sospechoso</i>"]
    A3 --> O3["👁️ Observation<br/><i>Conexión cruzada entre contratistas<br/>de empresas diferentes</i>"]

    O3 --> T4["🧠 Thought<br/><i>Busco documentos relevantes:<br/>logs SCADA, emails, informes</i>"]
    T4 --> A4["🔧 Action: search_events<br/><i>Búsqueda full-text OpenSearch</i>"]
    A4 --> O4["👁️ Observation<br/><i>Email sospechoso + log SCADA<br/>con acceso no autorizado</i>"]

    O4 --> ANSWER["📋 Answer<br/><b>Informe completo con:</b><br/>• Vector de ataque reconstruido<br/>• Red de actores identificada<br/>• Conexiones ocultas reveladas<br/>• Recomendaciones de mitigación"]

    style T1 fill:#7c3aed,color:#fff
    style T2 fill:#7c3aed,color:#fff
    style T3 fill:#7c3aed,color:#fff
    style T4 fill:#7c3aed,color:#fff
    style A1 fill:#f59e0b,color:#fff
    style A2 fill:#f59e0b,color:#fff
    style A3 fill:#f59e0b,color:#fff
    style A4 fill:#f59e0b,color:#fff
    style O1 fill:#06b6d4,color:#fff
    style O2 fill:#06b6d4,color:#fff
    style O3 fill:#06b6d4,color:#fff
    style O4 fill:#06b6d4,color:#fff
    style ANSWER fill:#16a34a,color:#fff
    style START fill:#dc2626,color:#fff
```

---

## 5. Tipos de Documentos Intel Indexados

```mermaid
pie title Distribución de Documentos Intel (220 total)
    "📄 Informes Mantenimiento" : 30
    "👤 Perfiles Trabajadores" : 30
    "📹 Transcripciones Vídeo" : 25
    "🔬 Análisis Laboratorio" : 25
    "🖥️ Logs SCADA" : 25
    "📧 Emails" : 20
    "🔑 Registros Badges" : 20
    "📋 Inspecciones" : 15
    "📸 Fotos Forenses" : 15
    "🗄️ Extractos BBDD" : 15
```

---

## 6. Stack Tecnológico

```mermaid
graph LR
    subgraph "Frontend"
        R["React 19"]
        TS["TypeScript"]
        CY["Cytoscape.js<br/><i>Grafos interactivos</i>"]
        LF["Leaflet<br/><i>Mapas</i>"]
        VT["Vite<br/><i>Build</i>"]
    end

    subgraph "Backend"
        NET[".NET 10"]
        SIG["SignalR<br/><i>Real-time</i>"]
        SSE["SSE<br/><i>Streaming IA</i>"]
    end

    subgraph "Datos"
        N4["Neo4j 5<br/><i>Grafos</i>"]
        OSR["OpenSearch 2.18<br/><i>Full-text</i>"]
        RD["Redis 7<br/><i>Cache</i>"]
    end

    subgraph "IA"
        OL["Ollama<br/><i>LLM local</i>"]
        QW["qwen2.5:7b<br/><i>Modelo</i>"]
        OWL["OWL/TTL<br/><i>Ontología</i>"]
    end

    subgraph "Infra"
        DK["Docker Compose<br/><i>7 servicios</i>"]
        NX["Nginx<br/><i>Reverse proxy</i>"]
    end

    R --> NET
    NET --> N4
    NET --> OSR
    NET --> RD
    NET --> OL
    OL --> QW

    style R fill:#06b6d4,color:#fff
    style NET fill:#512bd4,color:#fff
    style N4 fill:#2563eb,color:#fff
    style OSR fill:#16a34a,color:#fff
    style RD fill:#dc2626,color:#fff
    style OL fill:#f59e0b,color:#fff
    style DK fill:#0db7ed,color:#fff
```

---

## 7. Beneficios Clave

| Capacidad | Descripción | Impacto |
|-----------|-------------|---------|
| 🧠 **Detección automática** | 8 patrones ejecutándose cada 30s | De horas a **segundos** en detección |
| 🔗 **Descubrimiento de enlaces ocultos** | El grafo revela conexiones que un analista no vería | Descubre **redes de actores** cross-empresa |
| 📚 **Búsqueda heterogénea** | 10 tipos de documento en un solo buscador | Un analista busca "chlorine" y encuentra **emails + logs SCADA + informes de lab** a la vez |
| 🤖 **Investigación IA autónoma** | El agente navega el grafo y busca documentos solo | De **4h** de investigación manual a **2 min** de informe IA |
| 🌐 **Ontología semántica** | OWL/TTL define qué relaciones son posibles | La IA descubre **vectores de ataque emergentes** no programados |
| ⚡ **Tiempo real** | SignalR push + SSE streaming | El analista ve los **hallazgos en vivo** mientras la IA trabaja |
| 🔒 **IA local** | Ollama ejecuta el modelo on-premise | **Cero datos enviados** a cloud — cumple normativa CNPIC |
| 📊 **Visualización multi-capa** | Grafo + Mapa + Timeline + Dashboard | **Contexto completo** en una sola pantalla |

---

## 8. Escenarios de Sabotaje Detectados

```mermaid
timeline
    title Línea Temporal de Sabotajes Detectados por AEGIS
    section Enero 2026
        CASE-001 : 🔴 Manipulación cloro : ETAP Norte : Confianza 92%
        CASE-002 : 🔴 Contaminación : Depósito Alcalá : Confianza 88%
    section Febrero 2026
        CASE-003 : 🟠 Ataque presión : Bombeo Sur : Confianza 75%
        CASE-004 : 🔴 Sobredosis química : ETAP Móstoles : Confianza 95%
        CASE-005 : 🟣 Exfiltración SCADA : Tres Cantos : Confianza 90%
        CASE-006 : 🔴 Ataque coordinado : Móstoles+Alcorcón : Confianza 97%
```

---

## 9. Ejemplo de Búsqueda: Lo que ve el analista

Cuando un analista busca **"chlorine tampering"**, AEGIS devuelve resultados de **múltiples fuentes** en un solo panel:

```
📚 Intel Documents (31 resultados)
├── 📄 Maintenance Report – Chlorine dosing pump at ETAP Norte     [INTERNAL]    📍 ETAP Norte        score 11.2
├── 📄 Maintenance Report – Chlorine dosing pump at Fuenlabrada    [INTERNAL]    📍 Bombeo Fuenlabrada score 11.2
├── 🔬 Lab Analysis – ETAP Móstoles – Sample #S-847291            [INTERNAL]    📍 ETAP Móstoles     score 9.8
├── 📧 Email: "Question about PLC configuration at ETAP Norte"     [CONFIDENTIAL] 👤 Carlos García    score 8.4
├── 🖥️ SCADA Log – ETAP Norte – 2026-01-15                       [RESTRICTED]  📍 ETAP Norte        score 7.9
├── 📸 Photo Analysis – Tampered sensor housing                    [RESTRICTED]  📍 ETAP Móstoles     score 7.1
└── 👤 Personnel Dossier – Dmitri Volkov                           [CONFIDENTIAL] 👤 Dmitri Volkov    score 6.3

⚡ Events (10 resultados)
├── 🔴 Chlorine residual dropped to 0.05 mg/L – critically low                  📍 ETAP Norte        score 8.7
├── 🟠 Chlorine level surged to 5.2 mg/L – dangerous overdose                   📍 ETAP Móstoles     score 8.2
└── 🔵 23 households report strong chlorine taste – Móstoles centro              📍 ETAP Móstoles     score 7.8
```

> **Sin AEGIS:** el analista tendría que revisar manualmente 10 sistemas diferentes.
> **Con AEGIS:** todo aparece en una sola búsqueda, rankeado por relevancia, con clasificación de seguridad.

---

## 10. Resumen Ejecutivo

```
┌─────────────────────────────────────────────────────────────────┐
│                    🛡️  AEGIS en Números                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   20 instalaciones monitorizadas (ETAPs, bombeos, depósitos)    │
│   100 personas tracked (empleados + contratistas)               │
│   220 documentos intel de 10 tipos diferentes                   │
│   8 patrones de detección automática                            │
│   6 escenarios de sabotaje detectados                           │
│   5 herramientas IA autónomas                                   │
│   2 índices de búsqueda (eventos + documentos)                  │
│   30s ciclo de detección                                        │
│   0 datos enviados a la nube                                    │
│                                                                 │
│   ⏱️  De 4h de investigación manual → 2 min con agente IA      │
│   🔍 De 10 sistemas separados → 1 búsqueda unificada           │
│   🧠 De detección reactiva → detección proactiva en 30s        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*Documento generado para presentación C-Level — AEGIS Platform v1.0*
*Basado en infraestructura real de Canal de Isabel II (Madrid)*
