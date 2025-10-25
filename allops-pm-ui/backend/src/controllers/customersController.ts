import { Request, Response } from 'express';
import { query } from '../db';

// Get all customers
export const getCustomers = async (req: Request, res: Response) => {
    try {
        const sql = `SELECT c.cust_id as id, c.cust_name, c.cust_code, c.project_name, c.created_at, c.cust_desc, c.status,
            string_agg(DISTINCT e.env_name, ', ' ORDER BY e.env_name) AS env_name
            FROM public.customer c
            LEFT JOIN public.customer_env ce ON ce.cust_id = c.cust_id
            LEFT JOIN public.env e ON e.env_id = ce.env_id
            GROUP BY c.cust_id, c.cust_name, c.cust_code, c.project_name, c.created_at, c.cust_desc, c.status
            ORDER BY c.created_at DESC`;
        const result = await query(sql);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a new customer
export const createCustomer = async (req: Request, res: Response) => {
    const { cust_name, cust_code, project_name, cust_desc, status } = req.body;
    try {
        const result = await query(
            'INSERT INTO customer (cust_name, cust_code, project_name, cust_desc, status) VALUES ($1, $2, $3, $4, $5) RETURNING cust_id as id, cust_name, cust_code, project_name, created_at, cust_desc, status',
            [cust_name, cust_code, project_name, cust_desc, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update a customer
export const updateCustomer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cust_name, cust_code, project_name, cust_desc, status } = req.body;
    try {
        const result = await query(
            'UPDATE customer SET cust_name = $1, cust_code = $2, project_name = $3, cust_desc = $4, status = $5 WHERE cust_id = $6 RETURNING cust_id as id, cust_name, cust_code, project_name, created_at, cust_desc, status',
            [cust_name, cust_code, project_name, cust_desc, status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get PM plans for a specific customer (RESTful)
export const getCustomerPMPlans = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Support optional server-side search by q (customer name or code) and pm_year
        const q = (req.query.q as string) || null;
        const pmYear = (req.query.pm_year as string) || null;

        const baseSql = `SELECT c.cust_id, c.cust_name, c.cust_code, c.project_name, c.created_at AS customer_created_at,
            p.pm_id, p.pm_round, p.pm_name, p.remark, p.pm_year, p.created_at AS pm_created_at, p.pm_status as status
            FROM public.customer c
            JOIN public.pm_plan p ON p.cust_id = c.cust_id`;

        const whereClauses: string[] = ['c.cust_id = $1'];
        const params: any[] = [id];

        if (q) {
            params.push(`%${q}%`);
            // search in customer name or customer code (case-insensitive)
            whereClauses.push(`(c.cust_name ILIKE $${params.length} OR c.cust_code ILIKE $${params.length})`);
        }

        if (pmYear) {
            params.push(pmYear);
            whereClauses.push(`p.pm_year = $${params.length}`);
        }

        const sql = `${baseSql} WHERE ${whereClauses.join(' AND ')} ORDER BY p.pm_year DESC, p.pm_round DESC`;
        const result = await query(sql, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching customer PM plans:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get a single customer by id
export const getCustomerById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const sql = `SELECT c.cust_id as id, c.cust_name, c.cust_code, c.project_name, c.created_at, c.cust_desc, c.status,
            string_agg(DISTINCT e.env_name, ', ' ORDER BY e.env_name) AS env_name
            FROM public.customer c
            LEFT JOIN public.customer_env ce ON ce.cust_id = c.cust_id
            LEFT JOIN public.env e ON e.env_id = ce.env_id
            WHERE c.cust_id = $1
            GROUP BY c.cust_id, c.cust_name, c.cust_code, c.project_name, c.created_at, c.cust_desc, c.status`;
        const result = await query(sql, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching customer by id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get servers for a specific customer (return latest record per env_id+pm_id+cust_id)
export const getCustomerServers = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const sql = `
SELECT s.serv_id, s.env_id, e.env_name, s.pm_id, s.create_at, s.server_spec_json, s.cust_id
FROM public.server s
LEFT JOIN public.env e ON e.env_id = s.env_id
JOIN (
  SELECT env_id, pm_id, cust_id, MAX(create_at) AS max_created
  FROM public.server
  WHERE cust_id = $1
  GROUP BY env_id, pm_id, cust_id
) recent ON s.env_id = recent.env_id AND s.pm_id = recent.pm_id AND s.cust_id = recent.cust_id AND s.create_at = recent.max_created
WHERE s.cust_id = $1
ORDER BY s.serv_id;
        `;
    const result = await query(sql, [id]);
    console.log('getCustomerServers result keys:', Object.keys(result || {}));
    // debug: log rowCount and rows length
    try { console.log('getCustomerServers rowCount=', (result as any).rowCount); } catch (e) {}
    try { console.log('getCustomerServers rows length=', Array.isArray((result as any).rows) ? (result as any).rows.length : typeof (result as any).rows); } catch (e) {}
    res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching customer servers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DEBUG: server counts grouped by cust_id
export const getServerCounts = async (_req: Request, res: Response) => {
    try {
        const sql = `SELECT cust_id, COUNT(*) AS cnt FROM public.server GROUP BY cust_id ORDER BY cnt DESC`;
        const result = await query(sql);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching server counts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create customer + related records in a single transaction
export const createCustomerBatch = async (req: Request, res: Response) => {
    const payload = req.body || {};
    const { customer, envs = [], apps = [], pmRows = [] } = payload;
    let client = null;
    console.log('createCustomerBatch payload summary:', {
        customer: customer && { cust_name: customer.cust_name, cust_code: customer.cust_code },
        envsCount: Array.isArray(envs) ? envs.length : null,
        appsCount: Array.isArray(apps) ? apps.length : null,
        pmRowsCount: Array.isArray(pmRows) ? pmRows.length : null,
    });
    try {
        // Start transaction
        await query('BEGIN');

        // 1) create customer
        const custRes = await query(
            'INSERT INTO customer (cust_name, cust_code, project_name, cust_desc, status) VALUES ($1, $2, $3, $4, $5) RETURNING cust_id as id, cust_name, cust_code, project_name, created_at, cust_desc, status',
            [customer.cust_name, customer.cust_code, customer.project_name || null, customer.cust_desc || null, true]
        );
        const custId = custRes.rows[0].id;

        // Helper to ensure env exists by name and return env_id
        const ensureEnvByName = async (envName: string) => {
            if (!envName) return null;
            const r = await query('SELECT env_id FROM env WHERE env_name = $1', [envName]);
            if (r.rows.length > 0) return r.rows[0].env_id;
            const ins = await query('INSERT INTO env (env_name) VALUES ($1) RETURNING env_id', [envName]);
            return ins.rows[0].env_id;
        };

        // 2) determine env_ids from payload (support env_id or env_name)
        const envIdSet = new Set<number>();
        for (const e of envs) {
            if (!e) continue;
            if (e.env_id) {
                envIdSet.add(Number(e.env_id));
            } else if (e.env_name) {
                const envId = await ensureEnvByName((e.env_name || '').trim());
                if (envId) envIdSet.add(envId);
            }
        }
        // also include env ids referenced by apps (in case frontend sent apps for envs not in envs list)
        for (const a of apps) {
            if (a && a.env_id) envIdSet.add(Number(a.env_id));
        }

        // link customer_env (ignore duplicates)
        for (const envId of Array.from(envIdSet)) {
            await query('INSERT INTO customer_env (cust_id, env_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [custId, envId]);
        }

        // 3) create PM plan rows
        const createdPmIds: number[] = [];
        for (const p of pmRows) {
            // p should contain pm_name, pm_year, round
            const pm_name = p.pm_name || 'PM';
            const pm_year = p.pm_year || null;
            const pm_round = p.round || 1;
            const res = await query('INSERT INTO pm_plan (cust_id, pm_round, pm_name, remark, created_at, pm_year, pm_status) VALUES ($1,$2,$3,$4, now(), $5, false) RETURNING pm_id', [custId, pm_round, pm_name, null, pm_year]);
            createdPmIds.push(res.rows[0].pm_id);
        }

        // If no PM rows were provided but apps exist, create a placeholder PM
        let firstPmId = createdPmIds.length > 0 ? createdPmIds[0] : null;
        if (!firstPmId && apps.length > 0) {
            const year = new Date().getFullYear().toString().slice(0,4);
            const res = await query('INSERT INTO pm_plan (cust_id, pm_round, pm_name, remark, created_at, pm_year, pm_status) VALUES ($1,$2,$3,$4, now(), $5, false) RETURNING pm_id', [custId, 1, 'Initial PM', null, year]);
            firstPmId = res.rows[0].pm_id;
            createdPmIds.push(res.rows[0].pm_id);
        }

        console.log('createCustomerBatch envIdSet=', Array.from(envIdSet));
        console.log('createCustomerBatch firstPmId=', firstPmId);

        // 4) For apps, create a server placeholder per env (if apps exist for that env) and insert app_details rows
        if (apps.length > 0) {
            // group apps by env_id
            const appsByEnv: Record<number, Array<{ app_name: string }>> = {};
            for (const a of apps) {
                const envId = Number(a.env_id);
                if (!envId) continue;
                if (!appsByEnv[envId]) appsByEnv[envId] = [];
                appsByEnv[envId].push({ app_name: a.app_name });
            }

            for (const envIdStr of Object.keys(appsByEnv)) {
                    const envId = Number(envIdStr);
                    console.log('Processing apps for envId=', envId, 'count=', appsByEnv[envId].length);

                    // DB schema updated: app_details.serv_id is nullable and FK removed.
                    // Instead of creating a server placeholder, insert app_details with serv_id = NULL
                    for (const appEntry of appsByEnv[envId]) {
                        await query('INSERT INTO app_details (pm_id, serv_id, app_name, created_at) VALUES ($1, $2, $3, now())', [firstPmId, null, appEntry.app_name]);
                    }
                }
        }

        await query('COMMIT');
        res.status(201).json({ cust_id: custId, createdPmIds });
    } catch (error) {
        console.error('Error creating customer batch:', error);
        try { await query('ROLLBACK'); } catch (e) { console.error('Rollback error', e); }
        res.status(500).json({ error: 'Internal server error', detail: (error as any).message });
    }
};

// Return list of envs
export const getEnvs = async (_req: Request, res: Response) => {
    try {
        const sql = `SELECT env_id as id, env_name FROM public.env ORDER BY env_name`;
        const result = await query(sql);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching envs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DEBUG: get app_details for a specific customer via server linkage
export const getCustomerApps = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const sql = `SELECT a.app_id, a.app_name, a.pm_id, a.serv_id, s.cust_id, s.env_id
            FROM public.app_details a
            JOIN public.server s ON a.serv_id = s.serv_id
            WHERE s.cust_id = $1`;
        const result = await query(sql, [id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching customer apps:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DEBUG: list recent app_details rows
export const getAllAppDetails = async (_req: Request, res: Response) => {
    try {
        const sql = `SELECT * FROM public.app_details ORDER BY created_at DESC LIMIT 50`;
        const result = await query(sql);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching app_details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};