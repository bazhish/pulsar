# Importação de extrato CSV

A importação CSV é uma ponte manual antes de qualquer integração bancária direta.

## Formato esperado

O arquivo deve ter:

- extensão `.csv`
- `Content-Type` CSV aceito pelo backend
- tamanho máximo de 1 MB
- cabeçalho com colunas para data, descrição e valor
- coluna de tipo opcional

Exemplo:

```csv
data;descricao;valor;tipo
2024-05-01;Salario;3000;entrada
02/05/2024;Mercado;-125,50;saida
```

Datas aceitas:

- `YYYY-MM-DD`
- `DD/MM/YYYY`
- `DD-MM-YYYY`

Tipos aceitos:

- entradas: `income`, `entrada`, `credito`, `crédito`, `credit`, `receita`
- saídas: `expense`, `saida`, `saída`, `debito`, `débito`, `debit`, `despesa`

Se a coluna de tipo não existir, valores negativos viram saída e valores positivos viram entrada.

## Fluxo

1. `POST /api/imports/csv/upload` recebe o arquivo, valida e retorna colunas disponíveis.
2. `POST /api/imports/csv/preview` recebe o mapeamento e retorna linhas válidas/ inválidas.
3. `POST /api/imports/csv/confirm` cria transações com `source = "csv_import"`.

O arquivo original não é salvo. Apenas linhas parseadas ficam temporariamente em memória até a confirmação ou expiração.

## Duplicidade

O backend calcula `duplicate_hash` usando:

```text
user_id + data + descrição normalizada + valor
```

Quando o mesmo hash já existe para o usuário, a linha é ignorada.
