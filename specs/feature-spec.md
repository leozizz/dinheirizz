Documento de Especificação: Módulo de Integração Supabase
​1. Objetivo:
- Estabelecer a ponte segura entre o PWA (Next.js) e a camada de persistência (Supabase), garantindo tipagem forte e performance.
​2. Stack Técnica:
​- Framework: Next.js 14+ (App Router).
​- ORM/SDK: Supabase-js.
​- Linguagem: TypeScript.
​3. Modelagem de Dados (Entidades):
​- Transaction: id (uuid), user_id (fk), description (text), amount (numeric), category_id (fk), date (timestamp), is_paid (boolean).
​- Category: id, name, icon, color.
​4. Regras de Backend (Server Actions/Route Handlers):
​- Autenticação: Utilizar o Middleware do Supabase para proteger rotas.
​- Data Fetching: Implementar getTransactions com paginação (limit/offset) e filtros por data (mês/ano).
​- Mutations: Criar Server Actions para upsertTransaction e deleteTransaction, garantindo que o user_id da transação seja sempre o do usuário logado (RLS - Row Level Security).
​5. Segurança:
​- Habilitar RLS em todas as tabelas no Supabase.
​- Políticas: SELECT/INSERT/UPDATE onde auth.uid() = user_id.