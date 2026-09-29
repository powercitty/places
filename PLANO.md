# Plano geral da Powerfarm — fundação (aprovado pelo dono em 2026-09-25)

## Princípios
1. **Ver o que existe, não o que foi declarado.** O observador descobre sozinho; nada depende de cadastro.
2. **O Registry diz o que é oficial.** A tela cruza as duas coisas e mostra 4 situações:
   existe e está registrado · registrado mas não está lá (faltando) · existe e não registrado · existe e não deveria.
   Aparecer vem de existir; a etiqueta "registrado" vem do Registry.
3. **Nada depende de uma IA obedecer.** Travas onde ela não passa por cima: CI, disco, observador.
4. **Uma porta por computador:** o agente local é o único serviço autorizado (junto do túnel de acesso e do Manhattan).
5. **Tudo reversível:** nada é apagado de vez por automação; vai para o Lixo, com registro.
6. **Tudo visível sem terminal:** places, GitHub, Vercel.
7. **Um código só**, com perfil por máquina; CI obrigatório; entrega em escada com volta automática.
8. **Nenhum ponto único de queda:** tela na Vercel; LAB 8GB principal; LAB 512 reserva; LAB 256 bancada; nunca atualizar os dois LABs juntos.
9. **O dono aprova só a constituição.**

## Peças
| Peça | O que é |
|---|---|
| Arquivo | `Powerfarm Backup` no Drive (conta Google do Diretor): 4 pastas deduplicadas dos 3 computadores |
| Registry | `powerfarm.kernal` / `powerfarm_registry`: entidades, objetos e contratos, e mais nada. Escrito só pela fundação |
| Fundação | `Powerfarm.dmg`: dois cliques instalam o agente neste LAB e fundam a Powerfarm pelo contrato social (`fundacao/`) |
| Places | a tela; cruza Registry × observado |
| Agente local | Eve + Vercel AI Gateway + MCP 2026-07-28 sem estado. Observa, é porteiro (testes com ficha e prazo) e síndico (disco, dependências, versões). Materializa `powerfarm.host-runner.lab-8gb` e `powerfarm.host-runner.lab-512` |
| Camada de dependências | aube, uv, build de Rust compartilhado + sccache, dedup por clone APFS, limpeza do que se refaz |
| Repositório | este: `powerfarm/places` |

## Fases
| Fase | Entrega | Pronto quando |
|---|---|---|
| 0 | Powerfarm Backup no Drive; limpeza dos 3 LABs | Drive com as 4 pastas, sem repetição, conferido |
| 1 | Este repositório + CI | um PR de LLM passa ou é barrado sem ninguém olhar |
| 2 | Observador (agente v0 só olhando), LAB 256 → 512 → 8GB; places cruzado com Registry | MCP novo de qualquer IA aparece sozinho no places |
| 3 | Porteiro: testes com ficha e prazo; quarentena do que for criado por fora | nenhum plist fora do agente nos 3 LABs |
| 4 | Síndico: dependências, política de versões, robô de atualização | disco não cresce por node_modules/target/venv |
| 5 | Recuperação por lugar (Supabase, Drive, Apps, Engines) com "sim" do dono; failover 8GB→512 | incidente resolvido com o 8GB desligado |
| 6 | Arquivo contínuo pelos agentes | ninguém organiza à mão de novo |

## Padrões (o dono pode mudar)
Node = LTS mais nova (24) · prazo de teste = 3 dias · avisos no places, celular só para o que pede "sim" · Antenna: o agente assume o papel; código guardado sem rodar.
