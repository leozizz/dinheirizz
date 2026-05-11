# Spec Técnica: Dinheirizz - Sistema Financeiro Inteligente

## Informações gerais

| Campo             | Valor                                   |
|-------------------|-----------------------------------------|
| **Projeto** | Dinheirizz                              |
| **Módulo** | Core Application (PWA + Backend)        |
| **Versão** | 1.0.0                                   |
| **Data** | 2026-05-08                              |
| **Tech Lead** | Gemini (Persona Dinheirizz)             |
| **Status** | Aprovado                                |

---

## Visão geral técnica

[cite_start]Aplicação financeira 100% serverless focada em baixo custo de manutenção e alta escalabilidade para pequenos grupos[cite: 111, 129]. [cite_start]A arquitetura utiliza o Supabase como espinha dorsal (Auth, DB e Edge Functions) e o Next.js para a interface PWA, eliminando a necessidade de servidores sempre ativos ou VPS[cite: 90, 156].

---

## Stack tecnológica

| Camada               | Tecnologia / Ferramenta          | Versão       | Justificativa               |
|----------------------|----------------------------------|--------------|-----------------------------|
| Linguagem principal  | TypeScript                       | 5.x          | [cite_start]Tipagem forte e consistência entre Front/Back[cite: 184, 188]. |
| Framework backend    | Supabase Edge Functions (Deno)  | —            | [cite_start]Execução event-driven e custo zero[cite: 78, 111]. |
| Framework frontend   | Next.js (App Router)             | 14+          | [cite_start]SEO, performance PWA e deploy na Vercel[cite: 44, 188]. |
| Banco de dados       | PostgreSQL (Supabase)            | 15.x         | [cite_start]Suporte nativo a RLS e consultas relacionais[cite: 46, 58]. |
| IA de Insights       | Gemini 1.5 Flash                 | —            | [cite_start]Free tier generoso e alta velocidade de processamento[cite: 48, 158]. |
| Mensageria           | WhatsApp Cloud API (Meta)        | v20+         | [cite_start]Oficial, estável e gratuita até 1.000 msgs/mês[cite: 88, 200]. |
| Infraestrutura       | Vercel + Supabase Platform       | —            | [cite_start]Ecossistema serverless otimizado para custo zero[cite: 45, 151]. |

---

## Diagrama de arquitetura
┌──────────────────────────────────────────────────────────┐
│             PWA (Next.js / Vercel / UI Glass)                      │
│       (Inserção Manual e Gráficos de Insights)                     │
└───────────────────────┬──────────────────────────────────┘
│ Supabase Auth / SQL
▼
┌───────────────────────────────────────────────────────────┐
│                    Supabase Platform                                │
│       [PostgreSQL] ◄───► [Edge Functions (Cron)]                   │
└───────────────────────────────┬───────────────────────────┘
│ JSON Agregado
▼
┌───────────────────┐       ┌───────────────────────────────┐
│  Google AI Studio    │       │         Meta Cloud API              │
│    (Gemini 1.5)      │ ◄───►│         (WhatsApp Bot)              │
└───────────────────┘       └───────────────────────────────┘

---

## Modelo de dados

### Entidade: transactions

| Campo         | Tipo           | Restrições                       | Descrição                    |
|---------------|----------------|----------------------------------|------------------------------|
| `id`          | UUID           | PK, NOT NULL, DEFAULT uuid_generate_v4() | ID da transação[cite: 189]. |
| `user_id`     | UUID           | FK (auth.users), NOT NULL        | Referência ao dono do dado[cite: 189]. |
| `description` | TEXT           | NOT NULL                         | Descrição do gasto[cite: 189]. |
| `amount`      | NUMERIC        | NOT NULL                         | Valor da transação[cite: 189]. |
| `category_id` | UUID           | FK (categories), NOT NULL        | Categoria do gasto[cite: 189]. |
| `date`        | TIMESTAMP      | NOT NULL, DEFAULT NOW()          | Data da transação[cite: 189]. |
| `is_paid`     | BOOLEAN        | DEFAULT TRUE                     | Status de pagamento[cite: 189]. |

---

## Contratos de API (Edge Function - Cron)

### `POST /send-weekly-report`

**Descrição:** Função disparada via Cron Job que agrega os dados da semana, consulta o Gemini e envia para o WhatsApp[cite: 184, 185].

**Lógica de Economia de Tokens:**
- Agrega dados via `reduce` no Deno antes de enviar para a IA[cite: 184].
- Envia apenas: `{ periodo, categorias: { nome: total }, total_geral, maior_gasto }`[cite: 184].

**Response (200 OK):**
```json
{
  "status": "success",
  "message_id": "wa_id_..."
}
```

## Fluxo de dados sensível / segurança

- **Row Level Security (RLS)**: Garante que o usuário Lucas nunca acesse dados dos "Amigos/Família" e vice-versa.
- **Secrets Management**: Chaves de API do Gemini e Meta armazenadas com segurança no Supabase Vault.
- **Middleware**: Proteção de rotas no Next.js validando o JWT do Supabase Auth.

## Estratégia de testes

|Camada | Ferramenta | Cobertura mínima |
|-------|------------|------------------|
|Unitário | Jest | 80% |
|Integração | Supabase Local Dev (Deno tests) | Fluxos críticos |
|E2E | Playwright | Happy paths (Login e Inserção) |

## Estratégia de implantação

- **Ambiente de desenvolvimento**: Supabase CLI para testes locais das Edge Functions sem consumo de cota.


- **CI/CD**: GitHub Actions para deploy automático na Vercel e Supabase.

- **Rollback**: Deploy via CLI permite reverter versões anteriores das funções instantaneamente.

## Decisões de arquitetura (ADRs)
**ADR-01: Substituição do n8n por Supabase Edge Functions**:
- **Status**: Aceita.
- **Contexto**: Necessidade de evitar a hibernação do Render e custos de VPS.
- **Decisão**: Utilizar TypeScript/Deno diretamente no Supabase.
- **Consequências**: Menos infra para gerenciar, integração nativa com o DB, mas exige código manual.

**ADR-02: IA System Prompt de "Elite"**:
- **Status**: Aceita.
- **Contexto**: Transformar dados brutos em insights financeiros de alto valor.
- **Decisão**: Adotar a persona de "Consultor Sênior" nas instruções da API do Gemini.

## Histórico de revisões

|Versão | Data | Autor | Descrição da alteração |
|-------|------|-------|------------------------|
|1.0 | 2026-05-08 | Lucas/Dinheirizz | Versão inicial da arquitetura serverless.|