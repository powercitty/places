# Perfis de máquina (constituição)

Um arquivo por computador. O código do agente é o mesmo; o build recebe `--maquina <id>` e grava o perfil dentro do agente.

- `papel`: principal (LAB 8GB) · reserva (LAB 512, assume se o principal cair) · bancada (LAB 256, testa versão nova antes dos LABs)
- `registry`: a entidade do Registry que este agente materializa. `pf.host-runner.lab-256` ainda **não** está registrada — o LAB 256 aparece como "existe e não registrado" até o dono decidir.
- `modelo`: nome no Vercel AI Gateway.
