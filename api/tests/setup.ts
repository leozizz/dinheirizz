import { vi } from 'vitest'

// Mock seguro do Drizzle ORM: impede conexões reais ou comandos destrutivos no banco de dados na nuvem
export const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([
    {
      id: 'mock-tx-1',
      userId: '00000000-0000-0000-0000-000000000000',
      accountId: '00000000-0000-0000-0000-000000000000',
      categoryId: '1',
      amount: '150.00',
      description: 'Almoço Executivo',
      occurredAt: new Date('2026-09-02T12:00:00Z'),
      paid: true,
      createdAt: new Date('2026-09-02T12:00:00Z')
    }
  ]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([
    {
      id: 'mock-tx-created',
      userId: '00000000-0000-0000-0000-000000000000',
      accountId: '00000000-0000-0000-0000-000000000000',
      amount: '250.00',
      description: 'Supermercado',
      paid: true,
      occurredAt: new Date('2026-09-02T12:00:00Z'),
      createdAt: new Date('2026-09-02T12:00:00Z')
    }
  ]),
  delete: vi.fn().mockReturnThis()
}

// Garantia absoluta de ausência de credenciais reais de banco durante execução de testes
delete process.env.DATABASE_URL
process.env.SUPABASE_JWT_SECRET = 'test-super-secret-jwt-key-dinheirizz-minimum-32-chars'
