# Testes automatizados do backend

Os testes de integração usam `TEST_DATABASE_URL` e nunca devem apontar para produção.

```powershell
$env:TEST_DATABASE_URL="postgresql://usuario:senha@localhost:5432/ritmo_test"
$env:JWT_SECRET_KEY="test-secret-key-for-local-tests-32chars"
python -m pytest -q
```

A suíte cria usuários com domínio `@example.test` e remove esses dados antes e depois de cada teste.
Se `TEST_DATABASE_URL` não estiver configurada, os testes de integração são pulados para evitar uso acidental do banco real.

Cobertura inicial:

- autenticação e login inválido
- criação de categoria, entrada e saída
- bootstrap mensal, metas e dashboard
- cartões, compra parcelada e simulação
- isolamento entre usuários
- rota protegida sem token
- importação CSV e deduplicação
