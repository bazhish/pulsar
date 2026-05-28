# Deploy no Railway

## Pré-requisitos
- Conta no Railway (railway.app) - gratuita
- Conta no Supabase (supabase.com) - gratuita
- Git instalado
- Código no GitHub (repositório público ou privado)

## 1. Configurar Supabase
1. Criar projeto em supabase.com
2. Ir em Settings -> Database -> Connection string (URI mode)
3. Copiar a connection string (formato: `postgresql://...`)
4. Guardar para usar no passo 3

## 2. Criar repositório no GitHub
1. Rodar `git init` se o repositório ainda não existir
2. Conferir se o `.gitignore` contém: `.env`, `data/`, `__pycache__/`, `*.pyc`
3. Rodar `git add . && git commit -m "Initial commit"`
4. Criar repositório no GitHub e fazer push

## 3. Deploy no Railway
1. Acessar railway.app -> New Project -> Deploy from GitHub repo
2. Selecionar o repositório
3. Ir em Variables e adicionar:
   - `DATABASE_URL` = connection string do Supabase
   - `JWT_SECRET_KEY` = gerar com `python -c "import secrets; print(secrets.token_hex(32))"`
   - `ENVIRONMENT` = `production`
   - `ALLOWED_ORIGINS` = `*` (temporário, apenas para o primeiro deploy)
4. O deploy inicia automaticamente
5. Aguardar o healthcheck ficar verde
6. Copiar a URL gerada, por exemplo `https://seu-app.up.railway.app`
7. Atualizar `ALLOWED_ORIGINS` para a URL exata, por exemplo `https://seu-app.up.railway.app`
8. Fazer redeploy

## 4. Verificação pós-deploy
- Acessar `https://[sua-url]/api/health` -> deve retornar `{"ok": true, "db": "connected"}`
- Acessar `https://[sua-url]/` -> deve exibir o dashboard
- Criar uma conta de teste
- Fazer login e criar algumas transações
- Verificar que o logout funciona
- Verificar que HTTPS está ativo no navegador

## Manutenção
- Novos deploys: `git push` -> Railway faz redeploy automático
- Logs: railway.app -> seu projeto -> Deployments -> View Logs
- Banco: acessar Supabase dashboard para ver ou editar dados diretamente

## Checklist de segurança pré-produção
- [ ] `JWT_SECRET_KEY` tem pelo menos 32 caracteres e não está no código
- [ ] `DATABASE_URL` não está no código ou em nenhum arquivo commitado
- [ ] `.env` está no `.gitignore`
- [ ] `ALLOWED_ORIGINS` não é `*` em produção depois do primeiro deploy
- [ ] Rate limiting está ativo no endpoint de login
- [ ] Senhas são hasheadas com bcrypt custo >= 12
- [ ] `hashed_password` nunca aparece em nenhuma resposta de API
- [ ] Todas as rotas de dados requerem Bearer token
- [ ] Isolamento por `user_id` está em todas as queries
- [ ] Headers de segurança estão sendo injetados
- [ ] HTTPS está ativo (Railway/Render fornecem automaticamente)
- [ ] Não há dados de teste hardcoded no código de produção
- [ ] Logs não contêm tokens, senhas, `DATABASE_URL` ou dados sensíveis de usuário

## Domínio gratuito opcional
1. Criar um subdomínio `.is-a.dev` gratuitamente em github.com/is-a-dev/register
2. Configurar CNAME apontando para o domínio do Railway
3. Atualizar `ALLOWED_ORIGINS` com o novo domínio HTTPS
