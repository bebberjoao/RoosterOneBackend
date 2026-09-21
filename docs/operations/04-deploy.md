# Deploy

## Estado atual: não identificado no código analisado

Não há pipeline, `Dockerfile`, `docker-compose`, arquivo de configuração de plataforma (ex.: `Procfile`, `render.yaml`, `fly.toml`, `vercel.json`, `netlify.toml`) nem qualquer outro artefato de deploy em nenhum dos dois repositórios (`RoosterOneBackend-main`, `RoosterOneFrontEnd-main`). Isso foi confirmado por varredura direta dos dois repositórios — nenhum arquivo com esses nomes/padrões existe.

Em outras palavras: **este projeto, no estado atual do código, não tem um caminho de deploy definido.** Qualquer publicação em um ambiente real (homologação, produção) exigiria decisões de infraestrutura que ainda não foram tomadas/documentadas no repositório.

---

## Recomendação futura

O que segue **não existe hoje** — é uma sugestão de passos mínimos, baseada apenas nos scripts que o `package.json` de cada repositório já expõe, para caso a equipe decida estruturar um deploy manual ou automatizado no futuro.

### Backend (Recomendação futura)

```bash
npm install
npm run prisma:generate
npm run prisma:deploy   # aplica migrations em produção, sem prompts interativos
npm run build           # nest build -> gera dist/
npm run start:prod      # node dist/src/main.js
```

Pré-condições que precisariam existir no ambiente de destino, hoje não automatizadas por nada no repositório:
- Variáveis de ambiente de produção definidas (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`, e `SMTP_*`/`MAIL_FROM` se o envio real de e-mail for necessário) — ver `01-configuracao.md`.
- PostgreSQL de produção acessível a partir do ambiente de deploy.
- Processo supervisionado (ex.: `pm2`, serviço systemd, orquestrador de containers) para manter `start:prod` rodando e reiniciar em caso de falha — nada disso está configurado no repositório.

### Frontend (Recomendação futura)

```bash
npm install
npm run build      # vite build -> gera o artefato estático/SSR
npm run preview    # apenas para validar localmente; não é um servidor de produção
```

Pré-condições que precisariam existir, hoje não automatizadas por nada no repositório:
- `VITE_API_URL` de produção apontando para a URL pública do backend.
- Uma plataforma de hospedagem para servir o resultado do build (o projeto usa `@tanstack/react-start` com Nitro — o `vite.config.ts` comenta que o build usa `cloudflare` como target padrão do Nitro, o que sugere Cloudflare como plataforma alvo mais provável, mas isso é uma inferência de configuração de build, não uma configuração de deploy efetivamente presente ou documentada no repositório).

### O que falta para isso deixar de ser "recomendação" e virar processo real

- Definir e versionar a infraestrutura alvo (servidor, PaaS, containers).
- Escrever os artefatos de deploy correspondentes (`Dockerfile`, arquivo de configuração da plataforma escolhida, etc.).
- Definir estratégia de segredos em produção (hoje o `.env` é só um arquivo local, sem gestão de secrets).
- Definir estratégia de execução de migrations em produção (`prisma:deploy` existe como script, mas não há automação que o dispare).
