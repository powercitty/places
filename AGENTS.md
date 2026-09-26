# AGENTS.md — constituição do `powerfarm/places`

Regras para qualquer agente (Claude, Codex, Cursor, Kimi, Gemini…) ou pessoa que mexa neste repositório.
O CI cobra estas regras; elas não dependem de você lembrar delas.

## O que é este repositório
- `apps/coloured-places` — a tela (places.minilab.work). Mostra o que **existe** nos computadores e lugares, cruzado com o que está **registrado** no Registry.
- `apps/agent` — o agente local (Eve). O mesmo código roda nos 3 LABs; muda só o perfil em `machines/`.
- `packages/contract` — o contrato entre a tela e o agente, o modelo das 4 situações e a versão do MCP.
- `machines/` — um perfil por computador (papel, lugares, modelo). **Constituição.**
- `policies/` — regras da casa, conferidas pelo CI. **Constituição.**

## Regras
1. **Ninguém escreve direto na `main`.** Tudo entra por Pull Request e passa em todas as checagens.
2. **Constituição** (`AGENTS.md`, `PLANO.md`, `mise.toml`, `policies/`, `machines/`, `.github/`) só muda com aprovação do dono. O resto entra sozinho se todas as checagens passarem.
3. **Versões vêm da política**, não da sua memória: `mise.toml` e `policies/versoes.json`. Node = LTS mais nova; o resto = estável mais nova. Não troque versão "porque sim". Para subir versão, use a política e os testes.
4. **Só pnpm.** Nunca crie `package-lock.json`, `yarn.lock` ou `bun.lock`. Nunca rode `npm install`.
5. **Nada que se refaz entra no repositório**: `node_modules`, `.next`, `.output`, `.eve`, `target`, `.venv`, binários compilados, modelos.
6. **Nenhum segredo no repositório.** Nada de `.env` (só `.env.example`). Segredos ficam no Keychain de cada LAB e nas variáveis da Vercel.
7. **Nenhum serviço fora do agente.** Não crie plist de launchd, cron, pm2 ou túnel por conta própria. Serviço de teste roda **pelo agente**, com ficha e prazo (fase 3).
8. **O agente só olha por padrão.** Qualquer ação que mexe em máquina ou nuvem precisa de aprovação humana (aprovação do Eve).
9. **O Registry (`powerfarm.kernal`, esquema `powerfarm_registry`) é só leitura** para todos. Quem escreve é só o agente principal, com o "sim" do dono.
10. **Simples primeiro.** Nada de Google ADK nem governança pesada nesta fase.

## Como conferir antes de abrir PR
```bash
mise install && pnpm install && pnpm verificar
```
`pnpm verificar` roda o mesmo que o CI: regras da casa, tipos, testes e o build dos 3 perfis de máquina.
