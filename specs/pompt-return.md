## Dados Retornados pelo Prompt - Supabase AI

- COLUMNS_SNAPSHOT
```sql
select table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default, is_identity, identity_generation
from information_schema.columns
where table_schema = 'public' and table_name in ('transactions','categories')
order by table_name, ordinal_position;
```

- Retorno da Querie COLUMNS_SNAPSHOT:
```json
[
    {
        "table_name": "categories",
        "ordinal_position": 1,
        "column_name": "id",
        "data_type": "uuid",
        "udt_name": "uuid",
        "is_nullable": "NO",
        "column_default": "gen_random_uuid()",
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "categories",
        "ordinal_position": 2,
        "column_name": "user_id",
        "data_type": "uuid",
        "udt_name": "uuid",
        "is_nullable": "NO",
        "column_default": null,
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "categories",
        "ordinal_position": 3,
        "column_name": "name",
        "data_type": "text",
        "udt_name": "text",
        "is_nullable": "NO",
        "column_default": null,
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "categories",
        "ordinal_position": 4,
        "column_name": "type",
        "data_type": "text",
        "udt_name": "text",
        "is_nullable": "NO",
        "column_default": "'expense'::text",
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "categories",
        "ordinal_position": 5,
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "udt_name": "timestamptz",
        "is_nullable": "NO",
        "column_default": "now()",
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 1,
        "column_name": "id",
        "data_type": "uuid",
        "udt_name": "uuid",
        "is_nullable": "NO",
        "column_default": "gen_random_uuid()",
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 2,
        "column_name": "user_id",
        "data_type": "uuid",
        "udt_name": "uuid",
        "is_nullable": "NO",
        "column_default": null,
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 3,
        "column_name": "account_id",
        "data_type": "uuid",
        "udt_name": "uuid",
        "is_nullable": "NO",
        "column_default": null,
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 4,
        "column_name": "category_id",
        "data_type": "uuid",
        "udt_name": "uuid",
        "is_nullable": "YES",
        "column_default": null,
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 5,
        "column_name": "occurred_at",
        "data_type": "date",
        "udt_name": "date",
        "is_nullable": "NO",
        "column_default": null,
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 6,
        "column_name": "amount",
        "data_type": "numeric",
        "udt_name": "numeric",
        "is_nullable": "NO",
        "column_default": null,
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 7,
        "column_name": "description",
        "data_type": "text",
        "udt_name": "text",
        "is_nullable": "YES",
        "column_default": null,
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 8,
        "column_name": "paid",
        "data_type": "boolean",
        "udt_name": "bool",
        "is_nullable": "NO",
        "column_default": "true",
        "is_identity": "NO",
        "identity_generation": null
    },
    {
        "table_name": "transactions",
        "ordinal_position": 9,
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "udt_name": "timestamptz",
        "is_nullable": "NO",
        "column_default": "now()",
        "is_identity": "NO",
        "identity_generation": null
    }
]
```
--- 

- CONSTRAINTS_SNAPSHOT
```sql
select pgc.relname as table_name, c.conname, c.contype, pg_get_constraintdef(c.oid) as constraint_def
from pg_constraint c
join pg_class pgc on pgc.oid = c.conrelid
where pgc.relname in ('transactions','categories')
order by table_name, conname;
```

- Retorno da Querie CONSTRAINTS_SNAPSHOT
```json
```
[
    {
        "table_name": "categories",
        "conname": "categories_pkey",
        "contype": "p",
        "constraint_def": "PRIMARY KEY (id)"
    },
    {
        "table_name": "categories",
        "conname": "categories_user_id_fkey",
        "contype": "f",
        "constraint_def": "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
    },
    {
        "table_name": "categories",
        "conname": "categories_user_id_name_key",
        "contype": "u",
        "constraint_def": "UNIQUE (user_id, name)"
    },
    {
        "table_name": "transactions",
        "conname": "transactions_account_id_fkey",
        "contype": "f",
        "constraint_def": "FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL"
    },
    {
        "table_name": "transactions",
        "conname": "transactions_amount_positive_chk",
        "contype": "c",
        "constraint_def": "CHECK ((amount > (0)::numeric))"
    },
    {
        "table_name": "transactions",
        "conname": "transactions_category_id_fkey",
        "contype": "f",
        "constraint_def": "FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL"
    },
    {
        "table_name": "transactions",
        "conname": "transactions_pkey",
        "contype": "p",
        "constraint_def": "PRIMARY KEY (id)"
    },
    {
        "table_name": "transactions",
        "conname": "transactions_user_id_fkey",
        "contype": "f",
        "constraint_def": "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
    }
]
---

- INDEXES_SNAPSHOT
```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename in ('transactions','categories')
order by tablename, indexname;
```

- Retorno da Querie INDEXES_SNAPSHOT
```json
[
    {
        "tablename": "categories",
        "indexname": "categories_pkey",
        "indexdef": "CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id)"
    },
    {
        "tablename": "categories",
        "indexname": "categories_user_id_name_key",
        "indexdef": "CREATE UNIQUE INDEX categories_user_id_name_key ON public.categories USING btree (user_id, name)"
    },
    {
        "tablename": "categories",
        "indexname": "idx_categories_user_id",
        "indexdef": "CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id)"
    },
    {
        "tablename": "transactions",
        "indexname": "idx_transactions_occurred_at",
        "indexdef": "CREATE INDEX idx_transactions_occurred_at ON public.transactions USING btree (occurred_at)"
    },
    {
        "tablename": "transactions",
        "indexname": "idx_transactions_user_id",
        "indexdef": "CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id)"
    },
    {
        "tablename": "transactions",
        "indexname": "transactions_pkey",
        "indexdef": "CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id)"
    }
]
```

---

- RLS_STATUS
```sql
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('transactions','categories');
```

- Retorno da Querie RLS_STATUS
```json
[
    {
        "schema_name": "public",
        "table_name": "categories",
        "rls_enabled": true,
        "rls_forced": false
    },
    {
        "schema_name": "public",
        "table_name": "transactions",
        "rls_enabled": true,
        "rls_forced": false
    }
]
```

---

- POLICIES_FULL
```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('transactions','categories')
order by tablename, policyname;
```

- Retorno da Querie RLS_STATUS
```json
[
    {
        "schemaname": "public",
        "tablename": "categories",
        "policyname": "categories_delete_own",
        "permissive": "PERMISSIVE",
        "roles": "{authenticated}",
        "cmd": "DELETE",
        "qual": "(user_id = ( SELECT auth.uid() AS uid))",
        "with_check": null
    },
    {
        "schemaname": "public",
        "tablename": "categories",
        "policyname": "categories_insert_own",
        "permissive": "PERMISSIVE",
        "roles": "{authenticated}",
        "cmd": "INSERT",
        "qual": null,
        "with_check": "(user_id = ( SELECT auth.uid() AS uid))"
    },
    {
        "schemaname": "public",
        "tablename": "categories",
        "policyname": "categories_select_own",
        "permissive": "PERMISSIVE",
        "roles": "{authenticated}",
        "cmd": "SELECT",
        "qual": "(user_id = ( SELECT auth.uid() AS uid))",
        "with_check": null
    },
    {
        "schemaname": "public",
        "tablename": "categories",
        "policyname": "categories_update_own",
        "permissive": "PERMISSIVE",
        "roles": "{authenticated}",
        "cmd": "UPDATE",
        "qual": "(user_id = ( SELECT auth.uid() AS uid))",
        "with_check": "(user_id = ( SELECT auth.uid() AS uid))"
    },
    {
        "schemaname": "public",
        "tablename": "transactions",
        "policyname": "transactions_delete_own",
        "permissive": "PERMISSIVE",
        "roles": "{authenticated}",
        "cmd": "DELETE",
        "qual": "(user_id = ( SELECT auth.uid() AS uid))",
        "with_check": null
    },
    {
        "schemaname": "public",
        "tablename": "transactions",
        "policyname": "transactions_insert_own",
        "permissive": "PERMISSIVE",
        "roles": "{authenticated}",
        "cmd": "INSERT",
        "qual": null,
        "with_check": "(user_id = ( SELECT auth.uid() AS uid))"
    },
    {
        "schemaname": "public",
        "tablename": "transactions",
        "policyname": "transactions_select_own",
        "permissive": "PERMISSIVE",
        "roles": "{authenticated}",
        "cmd": "SELECT",
        "qual": "(user_id = ( SELECT auth.uid() AS uid))",
        "with_check": null
    },
    {
        "schemaname": "public",
        "tablename": "transactions",
        "policyname": "transactions_update_own",
        "permissive": "PERMISSIVE",
        "roles": "{authenticated}",
        "cmd": "UPDATE",
        "qual": "(user_id = ( SELECT auth.uid() AS uid))",
        "with_check": "(user_id = ( SELECT auth.uid() AS uid))"
    }
]
```

---

- TRIGGERS_SNAPSHOT
```sql
select event_object_table as table_name, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public' and event_object_table in ('transactions','categories')
order by table_name, trigger_name;
```

- Retorno da Querie TRIGGERS_SNAPSHOT
```json
[]
```

---

- PUBLIC_FUNCTIONS_SNAPSHOT
```sql
select p.oid, n.nspname as schema, p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_function_result(p.oid) as result_type, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
order by proname;
```

- Retorno da Querie PUBLIC_FUNCTIONS_SNAPSHOT
```json
[]
```