# Perfis de máquina (constituição)

Um arquivo por computador. O código do agente é o mesmo; o build recebe `--maquina <id>` e grava o perfil dentro do agente.

- `papel`: principal (LAB 8GB) · reserva (LAB 512, assume se o principal cair) · bancada (LAB 256, testa versão nova antes dos LABs)
- `registry`: a entidade do Registry que este agente materializa. `pf.host-runner.lab-256` ainda **não** está registrada — o LAB 256 aparece como "existe e não registrado" até o dono decidir.
- `modelo`: nome no Vercel AI Gateway.

## `comum.json` (vale para os 3)
- `supabase_url` e `supabase_chave_publica`: o endereço do `powerfarm.kernal` e a chave **pública** (feita para ficar à vista; quem protege os dados são as funções e o segredo de cada agente, que fica no Keychain).
- `rotulo_do_agente`: o nome do único serviço de launchd permitido (o próprio agente).
- `enderecos`: o que o principal e a reserva testam na nuvem a cada minuto (as duas máquinas testam; "fora do ar" só vale quando as duas veem).
