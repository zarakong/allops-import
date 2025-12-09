import { addCustomerServerEnvs } from '../customersController';
import * as db from '../../db';

jest.mock('../../db');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('addCustomerServerEnvs', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('inserts new server and links customer_env when no existing', async () => {
    // Simulate calls: BEGIN, existingCheck (no rows), INSERT server_env, INSERT customer_env, COMMIT
    mockQuery.mockImplementationOnce(async (sql: string) => ({ rows: [] } as any)); // BEGIN - still returns
    mockQuery.mockImplementationOnce(async (sql: string, params?: any[]) => ({ rows: [] } as any)); // existingCheck -> no rows
    mockQuery.mockImplementationOnce(async (sql: string, params?: any[]) => ({ rows: [{ server_id: 999 }] } as any)); // insert server_env
    mockQuery.mockImplementationOnce(async (sql: string, params?: any[]) => ({ rows: [] } as any)); // insert customer_env
    mockQuery.mockImplementationOnce(async (sql: string) => ({ rows: [] } as any)); // COMMIT

    const req: any = { params: { id: '10' }, body: { entries: [{ env_id: 2, server_name: 'srv-1' }] } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await addCustomerServerEnvs(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ created: expect.any(Array) }));
    const created = (res.json as jest.Mock).mock.calls[0][0].created;
    expect(created[0]).toMatchObject({ env_id: 2, server_id: 999, server_name: 'srv-1', existing: false });
  });

  it('returns existing server when found', async () => {
    mockQuery.mockImplementationOnce(async (sql: string) => ({ rows: [] } as any)); // BEGIN
    mockQuery.mockImplementationOnce(async (sql: string, params?: any[]) => ({ rows: [{ server_id: 555 }] } as any)); // existingCheck -> found
    mockQuery.mockImplementationOnce(async (sql: string) => ({ rows: [] } as any)); // COMMIT

    const req: any = { params: { id: '11' }, body: { entries: [{ env_id: 3, server_name: 'srv-exists' }] } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await addCustomerServerEnvs(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const created = (res.json as jest.Mock).mock.calls[0][0].created;
    expect(created[0]).toMatchObject({ env_id: 3, server_id: 555, server_name: 'srv-exists', existing: true });
  });
});
