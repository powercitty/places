# minilab.work — Prompt Consolidado

Crie uma aplicação premium em Next.js chamada **“minilab.work”**, concebida não como um dashboard genérico, mas como uma interface de **places operacionais** do ecossistema. Cada card representa um lugar com papel específico dentro do sistema. A interface precisa comunicar presença, prontidão, controle e profundidade real. O objetivo não é mostrar muitos dados, e sim revelar o nível certo de contexto e ação em cada camada.

-----

## OBJETIVO DO PRODUTO

Uma home screen / cockpit operacional baseada em grandes tiles/cards. Cada card representa um “place” do ecossistema. Na face frontal, mostra identidade, sinais de saúde, indicadores e affordances visuais. Ao clicar, o card:

1. Faz animação FLIP saindo do seu lugar no grid e indo para o centro da tela
1. Cresce suavemente até um estado expandido
1. Faz flip 3D para revelar o verso
1. No verso, mostra os detalhes do place com 2 ou 3 níveis de profundidade
1. Um botão X no canto superior direito fecha, faz flip back e devolve o card exatamente ao seu lugar original

O app deve ser altamente responsivo:

- **Desktop:** grid 3 × 3 (3 colunas por 3 linhas)
- **Mobile:** grid 2 × 4 (2 colunas por 4 linhas; a última linha pode ficar com um card sobrando ou com espaçamento elegante)
- **Tablet:** comportamento intermediário coerente, preferencialmente 3 colunas quando houver espaço suficiente

-----

## STACK E REQUISITOS TÉCNICOS

Usar:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (ou Motion) para animações FLIP, transições de layout e springs
- lucide-react apenas para ícones realmente úteis
- next/image para assets de imagem
- Estrutura orientada a componentes e dados configuráveis por JSON/TS object

Código limpo, legível, componentizado, com separação entre:

- Dados dos places
- Componentes de card
- Animações
- Tokens visuais
- Estados globais mínimos

Não usar bibliotecas pesadas desnecessárias. Não usar charts decorativos. Não usar widgets falsos sem propósito.

-----

## CONCEITO E ESTILO VISUAL

O visual deve ser premium, confiante, preciso e silenciosamente sofisticado.

Referências implícitas: launcher espacial / cockpit, design industrial suave, superfícies com profundidade física, contraste refinado, tipografia forte limpa e editorial, feedback tátil e óptico.

Especificações visuais:

- Fundo geral neutro e sofisticado, levemente quente ou levemente frio, sem ruído excessivo
- Cards grandes com cantos bem arredondados
- Cada card usa uma **imagem de fundo fornecida pelo usuário**
- Tratamento premium sobre a imagem: leve gradiente, controle de contraste, vinheta suave, preservando legibilidade
- Tipografia principal forte, sem exagero futurista
- Evitar excesso de brilho, glow gratuito ou skeuomorfismo brega
- Sombras que sugiram materialidade e profundidade, não “card flutuante genérico”
- Pode haver textura sutil, grão finíssimo, bordas internas, highlight controlado
- O design deve transmitir **“produto caro”**, não “template de dashboard”

-----

## INTERAÇÃO E COMPORTAMENTO

### Na grid principal

- **Hover (desktop):** leve elevação, microescala (~1.01 a 1.02), mudança sutil de luz e reforço de legibilidade
- **Pointer move:** parallax mínimo, muito contido, para dar sensação física
- **Press/tap:** leve compressão com spring curta
- Cursor interativo
- Mobile não depende de hover; deve ter press feedback claro

### Ao abrir um card

- Animação FLIP real (First, Last, Invert, Play) ou equivalente com layoutId
- O card cresce a partir da posição exata no grid até o centro da viewport
- **Duas fases coordenadas:**
  - **Fase 1:** tile sai da grid e ocupa a posição expandida central
  - **Fase 2:** card gira (rotateY) e revela o verso
- Spring calibrada, premium, sem bounce infantil
- Backdrop do resto da interface perde destaque suavemente (dim, blur sutil ou fade controlado)
- O card aberto vira a camada focal da experiência

### Ao fechar

- Botão X no topo direito, sempre visível, discreto e premium
- **Fase 1:** card gira de volta para frente
- **Fase 2:** retorna ao slot original usando animação reversa FLIP
- Estado do grid permanece estável
- Se houver scroll interno no verso, o retorno ainda deve parecer impecável
- Retorno levemente mais rápido que a abertura

### Feedback tátil e sensorial

- Hover: elevação óptica + reforço de contraste + micro movimento
- Press: compressão rápida
- Open: spring mais densa e precisa
- Close: retorno controlado
- Mobile: suporte opcional a `navigator.vibrate()` com vibração curtíssima em interações-chave, com fallback silencioso
- Respeitar `prefers-reduced-motion`
- Verso: entrada do conteúdo com stagger sutil, sem teatralidade

-----

## PRINCÍPIO MAIS IMPORTANTE — ARQUITETURA INTERNA

O interior de cada card **NÃO** deve ser tratado como “mais métricas”. Cada place precisa ter uma arquitetura interna orientada a:

- Papel no ecossistema
- Estado presente
- Atenção operacional
- Ações naturais daquele lugar
- Detalhes e políticas pertinentes

Cada verso precisa responder com clareza:

1. O que este place é?
1. O que está acontecendo aqui agora?
1. O que exige atenção?
1. O que eu posso fazer daqui?
1. Que detalhes valem ser inspecionados sem virar tela enterprise caótica?

**Nada de blocos genéricos** como “stats”, “recent activity” vazio, “performance” sem contexto, “quick actions” que poderiam existir em qualquer card. Tudo deve ser específico do place.

-----

## MODELO INTERNO — 3 CAMADAS

Todo card aberto usa a mesma lógica estrutural, com conteúdo específico:

### CAMADA 1 — STATE

Leitura imediata do estado do place. Cabe acima da dobra visual, sem scroll em desktop.

- Nome do place + descriptor funcional
- Status principal
- 1 frase operacional curta explicando a situação atual
- 3 a 5 sinais prioritários realmente úteis para aquele place
- 1 bloco de “attention” se algo pedir ação

### CAMADA 2 — CONTROL SURFACE

Ações e superfícies de operação.

- Ações plausíveis e contextualizadas
- Entradas para inspeção
- Ferramentas desse place
- Pequenos toggles apenas se fizerem sentido
- Grupos operacionais com hierarquia clara

### CAMADA 3 — DEEP DETAIL

Detalhes, políticas, relações e contexto expandido. Pode aparecer via tabs, accordions, nested panels ou seções expansíveis.

- Metadados, thresholds, relações com outros places
- Históricos resumidos, detalhes técnicos/operacionais
- Contexto para decisão

**A profundidade não vem de “mais widgets”, e sim de relações, causas, dependências e possibilidade de ação.**

Os níveis podem ser implementados com tabs horizontais elegantes, seções empilhadas com disclosure controlado, ou visão overview + painéis internos expansíveis. Experiência fluida e clara, não “enterprise pesada”.

-----

## ESTRUTURA VISUAL DO VERSO

### HEADER

- Título do place + descriptor
- Status chip
- Last change / last heartbeat / last sync, conforme o caso
- Botão X no canto superior direito

### SECTION A — CURRENT STATE

- Resumo operacional em linguagem curta e precisa
- Sinais primários
- Possível bloco “Attention now”

### SECTION B — ACTIVE SURFACES

- Painéis com os principais objetos daquele place (workers, relays, repos, credentials, backups, policies, flows etc.)
- Cada painel com propósito claro

### SECTION C — ACTIONS

- Cluster de ações reais e específicas
- No máximo 4 principais e algumas secundárias
- Sem ações inventadas ou genéricas

### SECTION D — DETAILS

- Expansão para níveis mais profundos
- Toggles, thresholds, bindings, relationships, notes operacionais

-----

## FACE FRONTAL DOS CARDS

A face frontal não deve tentar resumir tudo. Apenas sugerir:

- **Título principal** grande
- **Descriptor curto** (ex.: Cockpit / Edge / Compute / Identity / Official / Backup / Apps / Orchestration / Policy)
- **Status geral** (Healthy / Warning / Degraded / Syncing / Attention)
- **Até 3 sinais curtos** com label
- **3 status lights semafóricas** discretas e úteis (Connectivity / Integrity / Activity ou outra tríade adequada por place)
- Composição muito limpa
- Affordance sutil de profundidade (“tap to inspect” implícito, sem escrever)
- Pequeno elemento de assinatura visual no canto inferior direito, refinado e consistente

Evitar qualquer coisa que transforme a frente em mini-dashboard.

-----

## MODELAGEM DOS 9 PLACES

Cada place tem: uma “pergunta central” implícita, uma “atenção central” implícita, uma “ação central” implícita. Os componentes internos **não podem ser duplicados mecanicamente** entre os cards. A similaridade vem da estrutura visual, não do conteúdo.

-----

### 1. LAB 256 — COCKPIT PLACE

**Função:** Posto de controle humano. Desenvolvimento, debug, supervisão, setup, coordenação e operação contextual.

**Pergunta central:** “O operador está com contexto e controle?”

**Sensação interna:** “Daqui eu enxergo e opero.”

**O que pertence aqui:** contexto atual do operador, readiness do toolchain, estado dos repositórios, acesso a logs e consoles, ambiente local/remoto, checks de setup, tarefas correntes.

**O que NÃO pertence:** canonical data persistente, grandes execuções background, backup oficial, fluxo automatizado como fonte primária.

**Camada 1 — State:**

- Operator context, active workspace, repo cleanliness/divergence, log access readiness, environment readiness

**Camada 2 — Control Surface:**

- Debug Console, Repos in Focus, Recent Log Streams, Setup/Environment Checks, Active Tools

**Camada 3 — Deep Detail:**

- Branch + sync details, last debug sessions, environment bindings, machine readiness checks, linked LAB relations

**Ações principais:** Open debug console · Inspect active repo · Open recent logs · Run setup verification

**Sinais front:** operator presence, current task context, repo status, logs available, toolchain readiness

**Status lights:** Connectivity · Integrity · Activity

-----

### 2. LAB 8GB — ANTENNA PLACE

**Função:** Edge runtime, relay, ingress, presença always-on e ponte com o exterior.

**Pergunta central:** “O edge está sustentando presença e relay?”

**Sensação interna:** “Daqui o sistema respira para fora.”

**O que pertence aqui:** conectividade externa, ingress health, relay routes, heartbeat, lightweight services, network events, uptime edge, signal flow.

**O que NÃO pertence:** compute pesado, verdade canônica, storage oficial, gestão humana central.

**Camada 1 — State:**

- Edge presence, relay health, ingress state, heartbeat freshness, external reachability

**Camada 2 — Control Surface:**

- Ingress Endpoints, Relay Routes, Lightweight Services, Network Event Stream

**Camada 3 — Deep Detail:**

- Connectivity history, route bindings, failover hints, edge service toggles, trust relationship with LAB ID and LAB 512

**Ações principais:** Test relay · Inspect ingress · Restart edge service · View network events

**Sinais front:** ingress health, relay status, external connectivity, heartbeat, active lightweight services

**Status lights:** Connectivity · Integrity · Activity

-----

### 3. LAB 512 — COMPUTE PLACE

**Função:** Jobs pesados, workers, inference, execução prolongada e processamento confiável. O workhorse do ecossistema.

**Pergunta central:** “O compute está conseguindo executar carga com estabilidade?”

**Sensação interna:** “Daqui a máquina trabalha de verdade.”

**O que pertence aqui:** queue depth, active workloads, workers, execution health, runtime stability, retries/failures, compute envelope.

**O que NÃO pertence:** debug humano central, canonical truth, archival storage, config global abstrata.

**Camada 1 — State:**

- Compute load, worker health, queue condition, failure pressure, runtime stability

**Camada 2 — Control Surface:**

- Worker Pool, Job Queue, Failed/Retried Executions, Runtime Envelope

**Camada 3 — Deep Detail:**

- Current workload classes, error clusters, execution patterns, drain/retry policy, relationship with LAB 8GB ingress and SUPABASE outputs

**Ações principais:** Inspect workers · Retry failed jobs · Drain node · Open execution logs

**Sinais front:** queue depth, active workers, job health, thermal/load envelope, long-run task status

**Status lights:** Connectivity · Integrity · Activity

-----

### 4. LAB ID — IDENTITY PLACE

**Função:** Lugar canônico de identidade, principal resolution, credenciais, capacidades e coerência entre entidades.

**Pergunta central:** “As identidades e capacidades estão coerentes e confiáveis?”

**Sensação interna:** “Daqui o ecossistema sabe quem é quem e o que pode.”

**O que pertence aqui:** principal registry, credential validity, capability state, trust resolution, machine/human/agent coherence, auth health.

**O que NÃO pertence:** apenas login visual, app settings genéricos, backup, compute.

**Camada 1 — State:**

- Auth integrity, credential freshness, trust resolution status, capability coherence, principal coverage

**Camada 2 — Control Surface:**

- Principals, Credentials, Capability Map, Trust Links

**Camada 3 — Deep Detail:**

- Rotations, revocations, pending trust anomalies, entity relationship detail, policy bindings

**Ações principais:** Inspect credentials · Verify principal · Rotate key · Review capabilities

**Sinais front:** auth health, token validity, trust graph status, principal resolution, capability sync

**Status lights:** Connectivity · Integrity · Activity

-----

### 5. SUPABASE — OFFICIAL PLACE

**Função:** Sistema de record oficial. Dados canônicos, estado compartilhado, storage oficial, realtime e outputs promovidos.

**Pergunta central:** “A verdade oficial está íntegra, consistente e disponível?”

**Sensação interna:** “Daqui sai a verdade oficial.”

**O que pertence aqui:** database health, schema/migrations, realtime state, storage integrity, canonical artifacts, official outputs, replication/sync.

**O que NÃO pertence:** drafts locais, preservação arquivística não-oficial, interface de operador genérica.

**Camada 1 — State:**

- Canonical health, db availability, realtime signal, storage confidence, migration posture

**Camada 2 — Control Surface:**

- Canonical Data, Realtime Channels, Storage Outputs, Migration Surface

**Camada 3 — Deep Detail:**

- Schema drift, replication concerns, promoted artifacts, integrity notes, relationship with backup/export surfaces

**Ações principais:** Inspect schema · Verify realtime · Review storage · Check migrations

**Sinais front:** db health, realtime status, storage integrity, replication/sync state, migration status

**Status lights:** Connectivity · Integrity · Activity

-----

### 6. GOOGLE DRIVE — BACKUP PLACE

**Função:** Preservação, arquivos, drafts arquivados, exportações, bundles recuperáveis, retenção fora do sistema oficial.

**Pergunta central:** “Os materiais preservados estão completos e recuperáveis?”

**Sensação interna:** “Daqui eu preservo sem confundir com o oficial.”

**O que pertence aqui:** backup freshness, snapshot inventory, export completeness, archive confidence, recovery paths, preserved bundles.

**O que NÃO pertence:** estado oficial compartilhado, realtime, truth source, operações de compute.

**Camada 1 — State:**

- Backup freshness, archive completeness, recovery confidence, latest snapshot, export health

**Camada 2 — Control Surface:**

- Snapshots, Preserved Bundles, Draft Archives, Recovery Exports

**Camada 3 — Deep Detail:**

- Retention notes, missing assets, backup lineage, restore confidence, differences versus official record

**Ações principais:** Inspect backups · Export current state · Verify archive · Open preserved bundle

**Sinais front:** backup freshness, archive completeness, sync/export status, last snapshot, recovery confidence

**Status lights:** Connectivity · Integrity · Activity

-----

### 7. APPS — EXECUTION SURFACE

**Função:** Superfície de acesso às ferramentas e apps operacionais que servem os outros places.

**Pergunta central:** “As ferramentas estão prontas e coerentes?”

**Sensação interna:** “Daqui eu abro o que uso para agir.”

**O que pertence aqui:** catálogo de tools, readiness das apps, consistência de versões, dependências, atalhos operacionais, apps pinned/recent.

**O que NÃO pertence:** canonical truth, automação orquestrada como fonte, políticas globais.

**Camada 1 — State:**

- App readiness, pinned tools availability, dependency confidence, launch health

**Camada 2 — Control Surface:**

- Pinned Apps, Recent Tools, Utility Surfaces, Version State

**Camada 3 — Deep Detail:**

- Dependency mismatches, app bindings, usage role, compatibility notes, launch context relations

**Ações principais:** Launch tool · Pin app · Inspect app health · Review updates

**Sinais front:** available tools, app readiness, version consistency, dependency health

**Status lights:** Connectivity · Integrity · Activity

-----

### 8. WORK FLOWS — ORCHESTRATION PLACE

**Função:** Fluxos, automações, pipelines, handoffs e execuções coordenadas entre pessoas, serviços e places.

**Pergunta central:** “A intenção está virando sequência confiável?”

**Sensação interna:** “Daqui a intenção vira sequência confiável.”

**O que pertence aqui:** active runs, failed steps, stuck handoffs, approvals, automation health, flow topology.

**O que NÃO pertence:** canonical data como fim em si, configuração global abstrata, debug local humano central.

**Camada 1 — State:**

- Active flow pressure, failure count, pending approvals, automation health, throughput confidence

**Camada 2 — Control Surface:**

- Current Runs, Failed Steps, Approval Queue, Flow Templates

**Camada 3 — Deep Detail:**

- Branch flows, dependencies between places, retry semantics, handoff notes, execution lineage

**Ações principais:** Inspect run · Retry failed step · Pause automation · Create branch flow

**Sinais front:** active flows, failed steps, throughput, pending approvals, automation health

**Status lights:** Connectivity · Integrity · Activity

-----

### 9. SETTINGS — POLICY / CONFIG PLACE

**Função:** Políticas, thresholds, integrações, feature flags e parâmetros globais confiáveis.

**Pergunta central:** “O comportamento do sistema está moldado com clareza?”

**Sensação interna:** “Daqui eu moldo o comportamento do sistema.”

**O que pertence aqui:** policy posture, config drift, integration bindings, thresholds, environment config, global toggles relevantes.

**O que NÃO pertence:** coisas técnicas soltas sem curadoria, debug profundo, backup/truth surfaces, apps launchers.

**Camada 1 — State:**

- Config coherence, drift alerts, integration health, policy compliance, last config change

**Camada 2 — Control Surface:**

- Integrations, Feature Flags, Thresholds, Environment Surfaces

**Camada 3 — Deep Detail:**

- Policy notes, change history summary, cross-environment compare, risky toggles, inherited defaults/overrides

**Ações principais:** Review integrations · Toggle feature · Inspect thresholds · Compare environment config

**Sinais front:** config drift, integration status, policy compliance, last config change, flags state

**Status lights:** Connectivity · Integrity · Activity

-----

## COMPONENTES NECESSÁRIOS

Criar componentes reutilizáveis que permitam conteúdo específico:

- PlaceGrid
- PlaceCard
- PlaceCardFront
- PlaceCardBack
- PlaceHeader
- StatusLights
- PrimarySignals / SignalRow
- AttentionBlock
- OperationalPanel
- ActionCluster
- DeepDetailSection
- ToggleRow
- MetricPill
- RelationMapMini
- CloseButton
- AmbientBackdrop
- MotionShell
- DepthSection

-----

## TIPOS DE CONTEÚDO INTERNOS VÁLIDOS

Usar apenas blocos com função real:

- Status lights
- Primary signals
- Attention block
- Current objects list
- Action cluster
- Relationship summary
- Policy / threshold rows
- Health strip
- Last event / last sync / last heartbeat
- Controlled toggles
- Small operational notes

**Evitar:** gráficos decorativos, tabelas enormes, “activity feed” vazio, cards dentro de cards sem sentido, mini widgets redundantes.

-----

## DADOS MOCKADOS

Criar mock data refinado, curto, plausível e coerente. Nada de lorem ipsum. Nada de números arbitrários em excesso. Os dados devem sugerir sistema vivo, com sobriedade.

Cada place deve ter:

- id, title, shortLabel, descriptor, shortSummary
- backgroundImage, theme
- status, primarySignals, statusLights, quickSignals
- attention
- overview, panels, operations, config
- actions, deepDetails, relations

-----

## RESPONSIVIDADE

**Desktop:**

- 3 colunas × 3 linhas
- Cards grandes, viewport aproveitada sem parecer espremida

**Mobile:**

- 2 colunas × 4 linhas
- Cards continuam grandes e legíveis
- Tipografia ajustada mas com presença
- Estado expandido ocupa quase toda a tela
- Fechar fácil com polegar
- Tabs/seções internas utilizáveis

**Tablet:**

- Composição intermediária coerente
- Não quebrar cards em proporções ruins

-----

## ACESSIBILIDADE E UX

- Teclado totalmente suportado
- Focus states bonitos e visíveis
- aria labels relevantes
- ESC fecha o card aberto
- Click fora pode fechar opcionalmente, sem atrapalhar interação
- Body scroll lock quando card estiver aberto
- Respeitar `prefers-reduced-motion`
- Contraste de texto impecável sobre imagens
- Mobile com toque confortável
- Suporte opcional a vibração curta em mobile para open/close/action

-----

## ESTADO E NAVEGAÇÃO

O estado aberto pode opcionalmente refletir na URL:

- `?place=lab-256`
- opcionalmente `&tab=operations`

Card aberto compartilhável e persistente ao refresh. Mas a experiência ainda deve parecer single-screen, sem navegar para outra página.

-----

## LAYOUT PRINCIPAL

- Margem respirada
- Grid com gaps generosos
- Cards dominam a composição
- Proporção dos cards: quadrados grandes com tipografia central forte
- Cards devem parecer objetos importantes, não meros atalhos

-----

## REGRAS DE CONTEÚDO

Cada place deve conter APENAS o que faz sentido para sua natureza. A similaridade deve vir da estrutura visual, não do conteúdo. Cada place precisa ter:

- Uma “pergunta central” implícita
- Uma “atenção central” implícita
- Uma “ação central” implícita

-----

## NÃO FAZER

- Não usar charts inúteis
- Não usar cards pequenos demais
- Não usar excesso de neon ou sci-fi cliché
- Não usar glassmorphism genérico em tudo
- Não encher o verso de números sem contexto
- Não transformar a interface em admin panel comum
- Não misturar muitas linguagens visuais
- Não fazer layout parecer template

-----

## EXTRAS DE QUALIDADE

Se fizer sentido:

- Brilho angular sutil acompanhando hover
- Máscaras ou gradients internos para legibilidade da tipografia sobre imagens
- Separadores muito discretos no verso
- Tema claro sofisticado agora, com base pronta para dark mode depois
- Loading state elegante para imagens
- Composição extremamente estável e precisa

-----

## ENTREGÁVEIS

1. Aplicação Next.js pronta para rodar
1. Componentes bem organizados
1. Dados mockados dos 9 places, ricos e específicos
1. Animações polidas (FLIP + flip 3D)
1. Responsividade completa
1. Estados de hover/press/open/close refinados
1. Interior de cada place semanticamente coerente
1. README curto explicando estrutura e como trocar as imagens dos cards
1. Código limpo com comentários apenas onde realmente ajuda

-----

## CRITÉRIOS DE ACEITAÇÃO

O resultado só é aceitável se:

- A grid já for linda parada, antes de qualquer clique
- O hover parecer caro e físico
- O open/close parecer impecável
- O flip 3D não quebrar legibilidade nem parecer gimmick
- A frente de cada card comunicar função e estado sem poluição
- O verso parecer um lugar operacional, não uma ficha decorada
- Cada place tiver conteúdo próprio, sem repetição mecânica
- Fique evidente o que pertence e o que não pertence a cada place
- A profundidade venha de relações e ações, não de widgets
- Mobile estiver realmente bom, não apenas “adaptado”
- A experiência inteira pareça **hyper premium, precisa e inevitável**

-----

*Toda decisão visual e estrutural deve reforçar a ideia de: “observabilidade operacional por places, com profundidade real, presença física e acabamento hyper premium”.*
