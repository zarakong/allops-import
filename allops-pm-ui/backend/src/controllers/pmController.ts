import { Request, Response } from 'express';
import { query } from '../db';

export const getPMTasks = async (req: Request, res: Response) => {
  // Support optional cust_id query, server-side search (q), pm_year and `all` flag.
  // Behavior:
  // - If cust_id provided and all=true -> return all plans for that customer
  // - If cust_id provided and pm_year provided -> filter by that year
  // - If no cust_id provided -> default pm_year to current year unless pm_year=all or pm_year provided
  const custId = req.query.cust_id ? Number(req.query.cust_id) : null;
  const q = (req.query.q as string) || null;
  const pmYear = (req.query.pm_year as string) || null;
  const allFlag = req.query.all === 'true' || req.query.all === '1';

  try {
    const baseSql = `SELECT c.cust_id, c.cust_name, c.cust_code, c.project_name,
        p.pm_id, p.pm_round, p.pm_name, p.remark, p.pm_year, p.created_at as pm_created_at,
        p.pm_status as status
      FROM public.pm_plan p
      JOIN public.customer c ON p.cust_id = c.cust_id`;

    const where: string[] = [];
    const params: any[] = [];

    if (custId) {
      params.push(custId);
      where.push(`p.cust_id = $${params.length}`);
    }

    // Determine year filtering: if pm_year provided and not 'all', use it.
    // If no custId (general PM page) and no pm_year provided and not allFlag,
    // default to current year only when there is no search `q`.
    // If `q` is provided but pm_year is not, do NOT limit by year (show all years matching the search).
    if (!allFlag) {
      if (pmYear) {
        params.push(pmYear);
        where.push(`p.pm_year = $${params.length}`);
      } else if (!custId && !q) {
        // default to current year for the main PM Plan page when no search term
        const currentYear = new Date().getFullYear().toString();
        params.push(currentYear);
        where.push(`p.pm_year = $${params.length}`);
      }
      // otherwise: if q is provided (search), and no pmYear, do not filter by year
    }

    if (q) {
      // search in customer name or code (case-insensitive)
      params.push(`%${q}%`);
      where.push(`(c.cust_name ILIKE $${params.length} OR c.cust_code ILIKE $${params.length})`);
    }

    const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    const sql = `${baseSql}${whereClause} ORDER BY p.pm_year DESC, p.pm_round DESC`;
    const result = await query(sql, params);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching PM plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPMTask = async (req: Request, res: Response) => {
  res.status(201).json({});
};

export const updatePMTask = async (req: Request, res: Response) => {
  res.status(200).json({});
};

export const deletePMTask = async (req: Request, res: Response) => {
  res.status(204).send();
};

export const getPMById = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const sql = `SELECT p.*, c.cust_name, c.cust_code FROM public.pm_plan p JOIN public.customer c ON p.cust_id = c.cust_id WHERE p.pm_id = $1`;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'PM plan not found' });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching pm by id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Lookup pm_round rows by pm_id + env_id + server_id
export const getPmRoundByKeys = async (req: Request, res: Response) => {
  try {
    const pmId = req.query.pm_id ? Number(req.query.pm_id) : null;
    const envId = req.query.env_id ? Number(req.query.env_id) : null;
    const serverId = req.query.server_id ? Number(req.query.server_id) : null;

    if (!pmId || !envId || !serverId) {
      return res.status(400).json({ error: 'pm_id, env_id and server_id are required' });
    }

    const sql = `SELECT pr.*, s.serv_name, s.serv_os, s.serv_ram
      FROM public.pm_round pr
      LEFT JOIN public.server s ON pr.server_id = s.serv_id
      WHERE pr.pm_id = $1 AND pr.env_id = $2 AND pr.server_id = $3`;
    const result = await query(sql, [pmId, envId, serverId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching pm_round by keys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const importPM = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const items = Array.isArray(payload) ? payload : (payload.pm ? (Array.isArray(payload.pm) ? payload.pm : [payload.pm]) : [payload]);
    const created: number[] = [];

    for (const it of items) {
      // determine cust_id
      let custId = it.cust_id ? Number(it.cust_id) : null;
      if (!custId && it.cust_code) {
        const r = await query('SELECT cust_id FROM public.customer WHERE cust_code = $1', [it.cust_code]);
        if (r.rows.length > 0) custId = r.rows[0].cust_id;
      }
      if (!custId) {
        return res.status(400).json({ error: 'Missing cust_id or cust_code for PM import item', item: it });
      }

      const pm_name = it.pm_name || 'PM';
      const pm_round = it.pm_round || 1;
      const pm_year = it.pm_year || (new Date().getFullYear().toString());
      const pm_status = it.pm_status === true;
      const createdAt = it.created_at ? new Date(it.created_at) : new Date();

      const r = await query('INSERT INTO pm_plan (cust_id, pm_round, pm_name, remark, created_at, pm_year, pm_status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING pm_id', [custId, pm_round, pm_name, it.remark || null, createdAt, pm_year, pm_status]);
      created.push(r.rows[0].pm_id);
    }

    res.status(201).json({ createdPmIds: created });
  } catch (error) {
    console.error('Error importing PMs:', error);
    res.status(500).json({ error: 'Internal server error', detail: (error as any).message });
  }
};

export const getAlfrescoApiResponses = async (req: Request, res: Response) => {
  try {
    const pmIdParam = req.params.pmId || req.params.id;
    const pmId = pmIdParam ? Number(pmIdParam) : null;

    if (!pmId) {
      return res.status(400).json({ error: 'pm_id is required' });
    }

    const sql = `SELECT
        pp.pm_id,
        pp.pm_name,
        c.cust_name,
        aa.env_id,
        e.env_name,
        aa.api_date,
        aa.api_json
      FROM public.pm_plan AS pp
      JOIN public.customer AS c ON c.cust_id = pp.cust_id
      JOIN public.alf_api AS aa ON aa.pm_id = pp.pm_id
      JOIN public.env AS e ON e.env_id = aa.env_id
      WHERE pp.pm_id = $1
      ORDER BY e.env_name ASC, aa.api_date DESC NULLS LAST`;

    const result = await query(sql, [pmId]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching Alfresco API responses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAppContentSizingRows = async (req: Request, res: Response) => {
  try {
    const pmIdParam = req.params.pmId || req.params.id;
    const pmId = pmIdParam ? Number(pmIdParam) : null;

    if (!pmId) {
      return res.status(400).json({ error: 'pm_id is required' });
    }

    const sql = `SELECT DISTINCT ON (acs.pm_id, acs.env_id, acs."Year_month_file")
        acs.pm_id,
        acs.env_id,
        e.env_name,
        acs."Year_month_file" AS year_month_file,
        acs.app_size_json
      FROM public.app_content_sizing AS acs
      JOIN public.env AS e ON e.env_id = acs.env_id
      WHERE acs.pm_id = $1
      ORDER BY acs.pm_id, acs.env_id, acs."Year_month_file" DESC NULLS LAST`;

    const result = await query(sql, [pmId]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching application content sizing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAppResponseRows = async (req: Request, res: Response) => {
  try {
    const pmIdParam = req.params.pmId || req.params.id;
    const pmId = pmIdParam ? Number(pmIdParam) : null;

    if (!pmId) {
      return res.status(400).json({ error: 'pm_id is required' });
    }

    const sql = `SELECT DISTINCT ON (ar.pm_id, ar.env_id, ar.year_month_file)
        ar.pm_id,
        ar.res_id,
        ar.env_id,
        e.env_name,
        ar.year_month_file,
        ar.json_app_response,
        ce.cust_id,
        ce.server_id AS customer_env_server_id
      FROM public.app_response AS ar
      JOIN public.env AS e ON e.env_id = ar.env_id
      LEFT JOIN public.pm_plan AS pp ON pp.pm_id = ar.pm_id
      LEFT JOIN public.customer_env AS ce ON ce.cust_id = pp.cust_id AND ce.env_id = ar.env_id
      WHERE ar.pm_id = $1
      ORDER BY ar.pm_id, ar.env_id, ar.year_month_file DESC NULLS LAST, ce.server_id NULLS LAST`;

    const result = await query(sql, [pmId]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching application response rows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Consolidated header + status endpoint for Import PM page
// Returns: header (cust_id, cust_name, cust_code, pm_id, pm_name, pm_year, pm_round)
// and envs: array of { env_id, env_name, server_id, server_name, has_pm_round }
export const getImportHeader = async (req: Request, res: Response) => {
  try {
    const custId = req.query.cust_id ? Number(req.query.cust_id) : null;
    const pmId = req.query.pm_id ? Number(req.query.pm_id) : null;

    if (!custId && !pmId) {
      return res.status(400).json({ error: 'cust_id or pm_id is required' });
    }

    // If only pmId provided, fetch its cust_id
    let effectiveCustId = custId;
    if (!effectiveCustId && pmId) {
      const r = await query('SELECT cust_id FROM public.pm_plan WHERE pm_id = $1', [pmId]);
      if (r.rows.length > 0) effectiveCustId = r.rows[0].cust_id;
    }

    if (!effectiveCustId) return res.status(404).json({ error: 'Customer not found for provided pm_id' });

    // Get header: customer and pm (if pmId provided)
    const headerSql = `SELECT c.cust_id, c.cust_name, c.cust_code, p.pm_id, p.pm_name, p.pm_year, p.pm_round
      FROM public.customer c
      LEFT JOIN public.pm_plan p ON p.pm_id = $2::bigint
      WHERE c.cust_id = $1::bigint`;
    const headerRes = await query(headerSql, [effectiveCustId, pmId]);
    const header = headerRes.rows.length > 0 ? headerRes.rows[0] : null;

    // Get env rows joined with server name and has_pm_round flag
    // Use EXISTS for efficient check
    const envSql = `SELECT ce.cust_id, e.env_id, e.env_name, ce.server_id,
      COALESCE(se.server_name, null) as server_name,
      CASE WHEN $1::bigint IS NOT NULL AND $2::bigint IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.pm_round pr WHERE pr.pm_id = $2::bigint AND pr.env_id = ce.env_id AND pr.server_id = ce.server_id
      ) THEN true ELSE false END AS has_pm_round
      FROM public.customer_env ce
      JOIN public.env e ON ce.env_id = e.env_id
      LEFT JOIN public.server_env se ON ce.server_id = se.server_id
      WHERE ce.cust_id = $1::bigint
      ORDER BY e.env_id, ce.server_id`;
  const envRes = await query(envSql, [effectiveCustId, pmId]);

    res.status(200).json({ header, envs: envRes.rows });
  } catch (error) {
    console.error('Error fetching import header:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Import PM data from JSON payload
export const importPMData = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const { pm_id, env_id, server_id, cust_id } = req.body.metadata || {};

    if (!pm_id || !env_id || !server_id) {
      return res.status(400).json({ error: 'pm_id, env_id, and server_id are required in metadata' });
    }

    const normalize = (value?: string | null) => (value || '').toString().trim().toLowerCase();

    // Validate customer and env match
    const payloadCustCode = normalize(payload.cust_code ?? payload.customer);
    const envName = payload.env;

    // Verify customer name matches
    const custCheck = await query('SELECT c.cust_id, c.cust_name, c.cust_code FROM public.customer c JOIN public.pm_plan p ON p.cust_id = c.cust_id WHERE p.pm_id = $1', [pm_id]);
    if (custCheck.rows.length === 0) {
      return res.status(404).json({ error: 'PM plan not found' });
    }

    const dbCustCode = normalize(custCheck.rows[0].cust_code);
    if (!payloadCustCode || payloadCustCode !== dbCustCode) {
      return res.status(400).json({
        error: `Customer code mismatch. Expected: ${custCheck.rows[0].cust_code}, Got: ${payload.cust_code || payload.customer || 'N/A'}`
      });
    }

    // Verify env name matches
    const envCheck = await query('SELECT env_id, env_name FROM public.env WHERE env_id = $1', [env_id]);
    if (envCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    const dbEnvName = envCheck.rows[0].env_name?.toLowerCase().trim();
    const payloadEnvName = envName?.toLowerCase().trim();
    if (dbEnvName !== payloadEnvName) {
      return res.status(400).json({ error: `Environment name mismatch. Expected: ${envCheck.rows[0].env_name}, Got: ${envName}` });
    }

    await query('BEGIN');

    const timestamp = payload.timestamp || new Date().toISOString();
    const datecheck = payload.datecheck || new Date().toISOString().slice(0, 10);

    // 1. Insert/Update server
    const serverSpec = payload.server_spec || {};
    const servName = serverSpec.hostname || 'unknown';
    const servOs = serverSpec.os?.name || null;
    const servOsVersion = serverSpec.os?.version || null;
    const servRam = serverSpec.memory?.total_kb || null;
    const servCpuModel = serverSpec.cpu_model_name || null;
    const servCpuCores = serverSpec.cpu?.cores || null;
    const servDisk = Array.isArray(serverSpec.disk) ? JSON.stringify(serverSpec.disk) : (serverSpec.disk ? JSON.stringify(serverSpec.disk) : null);

    const serverInsert = await query(
      `INSERT INTO public.server (env_id, pm_id, create_at, cust_id, serv_name, serv_os, serv_os_version, serv_ram, serv_cpu_model_name, serv_cpu_cores, server_id, serv_disk)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING serv_id`,
      [env_id, pm_id, timestamp, cust_id, servName, servOs, servOsVersion, servRam, servCpuModel, servCpuCores, server_id, servDisk]
    );
    const servId = serverInsert.rows[0].serv_id;

    // 2. Insert alf_contentstore
    const storages = payload.storages?.contentstore || {};
    const contAllKb = storages.summary_kb || null;
    const contYearJson = JSON.stringify(storages.Alf_conternt_year || []);
    const contMonthJson = JSON.stringify(storages.alf_last_12_months || []);
    // Keep workspace_env as-is with \n separators
    const alfVersionJson = payload.workspace_env || null;

    await query(
      `INSERT INTO public.alf_contentstore (pm_id, cont_all_kb, created_at, cont_year_json, cont_month_json, env_id, alf_version_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [pm_id, contAllKb, timestamp, contYearJson, contMonthJson, env_id, alfVersionJson]
    );

    // 3. Insert pm_round
    const alfresco = payload.alfresco || {};
    const transactions = payload.transactions || [];
    
    // Store only numeric values as JSON
    const jsonAlfApiTotal = alfresco.total_files || null;
    const jsonAlfApiSize = alfresco.total_bytes || null;
    const jsonAlfContSize = alfresco.total_mb || null;
    const jsonAlfTransact = JSON.stringify(transactions);
    const jsonWorkspace = payload.workspace_env || null;
    const jsonWorkspacePath = payload.env_workspace || null;

    await query(
      `INSERT INTO public.pm_round (created_at, env_id, json_alf_transact, json_alf_api_total, json_alf_api_size, json_alf_cont_size, pm_id, json_workspace, json_workspace_path, server_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [timestamp, env_id, jsonAlfTransact, jsonAlfApiTotal, jsonAlfApiSize, jsonAlfContSize, pm_id, jsonWorkspace, jsonWorkspacePath, server_id]
    );

    await query('COMMIT');

    res.status(201).json({ success: true, message: 'PM data imported successfully', serv_id: servId });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error importing PM data:', error);
    res.status(500).json({ error: 'Internal server error', detail: (error as any).message });
  }
};

export const importAppContentSizingData = async (req: Request, res: Response) => {
  const normalize = (value?: string | null) => (value || '').toString().trim().toLowerCase();

  try {
    const { pm_id, cust_code, jsonData } = req.body || {};

    if (!pm_id || !cust_code || !Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({ error: 'pm_id, cust_code และ jsonData (array) จำเป็นต้องระบุ' });
    }

    const pmResult = await query(
      `SELECT p.pm_id, p.cust_id, c.cust_code
       FROM public.pm_plan p
       JOIN public.customer c ON c.cust_id = p.cust_id
       WHERE p.pm_id = $1`,
      [pm_id]
    );

    if (pmResult.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ PM plan ที่ระบุ' });
    }

    const { cust_id: custId, cust_code: dbCustCode } = pmResult.rows[0];
    if (normalize(dbCustCode) !== normalize(cust_code)) {
      return res.status(400).json({ error: `Customer code mismatch. Expected: ${dbCustCode}, Got: ${cust_code}` });
    }

    const envResult = await query(
      `SELECT e.env_id, e.env_name
       FROM public.customer_env ce
       JOIN public.env e ON e.env_id = ce.env_id
       WHERE ce.cust_id = $1`,
      [custId]
    );

    if (envResult.rows.length === 0) {
      return res.status(400).json({ error: 'ลูกค้ายังไม่มี Environment ที่ผูกไว้' });
    }

    const envMap = new Map<string, number>();
    envResult.rows.forEach((row: any) => {
      envMap.set(normalize(row.env_name), Number(row.env_id));
    });

    const toYearMonth = (value: any): string | null => {
      if (value === undefined || value === null) return null;
      const text = String(value).trim();
      if (!text) return null;

      const directMatch = text.match(/^(\d{4})[-/](\d{1,2})/);
      if (directMatch) {
        const month = directMatch[2].padStart(2, '0');
        return `${directMatch[1]}-${month}`;
      }

      const parsed = new Date(text);
      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      }

      return null;
    };

    const deriveYearMonth = (row: any): string | null => {
      const candidates = [
        row?.year_month_file,
        row?.Year_month_file,
        row?.year_month,
        row?.date,
        row?.datetime,
        row?.timestamp
      ];
      for (const candidate of candidates) {
        const derived = toYearMonth(candidate);
        if (derived) {
          return derived;
        }
      }
      return null;
    };

    let txStarted = false;
    try {
      await query('BEGIN');
      txStarted = true;

      let inserted = 0;
      const skipped: Array<{ index: number; reason: string }> = [];

      for (let i = 0; i < jsonData.length; i += 1) {
        const row = jsonData[i];
        const envCandidate = row?.env ?? row?.env_name;
        const envIdFromPayload = Number(row?.env_id);
        const envId = Number.isFinite(envIdFromPayload) && envIdFromPayload > 0
          ? envIdFromPayload
          : envMap.get(normalize(envCandidate));

        if (!envId) {
          skipped.push({ index: i, reason: `ไม่พบ Environment: ${envCandidate ?? 'N/A'}` });
          continue;
        }

        const yearMonth = deriveYearMonth(row);
        const payloadJson = JSON.stringify(row);

        await query(
          `DELETE FROM public.app_content_sizing
           WHERE pm_id = $1
             AND env_id = $2
             AND (
               COALESCE("Year_month_file", '') = COALESCE($3, '')
               OR ("Year_month_file" IS NULL AND $3 IS NOT NULL)
             )`,
          [pm_id, envId, yearMonth]
        );

        await query(
          `INSERT INTO public.app_content_sizing (pm_id, env_id, app_size_json, "Year_month_file")
           VALUES ($1, $2, $3, $4)`,
          [pm_id, envId, payloadJson, yearMonth]
        );

        inserted += 1;
      }

      await query('COMMIT');
      return res.status(200).json({ inserted, skipped });
    } catch (error) {
      if (txStarted) {
        try {
          await query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback error (app sizing import):', rollbackError);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error importing application sizing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const importAppOtherApiResponses = async (req: Request, res: Response) => {
  const normalize = (value?: string | null) => (value || '').toString().trim().toLowerCase();

  const toYearMonth = (value: any): string | null => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    if (!text) return null;

    const match = text.match(/^(\d{4})[-/](\d{1,2})/);
    if (match) {
      const month = match[2].padStart(2, '0');
      return `${match[1]}-${month}`;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }

    return null;
  };

  try {
    const { pm_id, cust_code, env_id, jsonData } = req.body || {};

    if (!pm_id || !cust_code || !env_id || !Array.isArray(jsonData) || jsonData.length === 0) {
      return res.status(400).json({ error: 'pm_id, env_id, cust_code และ jsonData (array) จำเป็นต้องระบุ' });
    }

    const envId = Number(env_id);
    if (!Number.isFinite(envId) || envId <= 0) {
      return res.status(400).json({ error: 'env_id ไม่ถูกต้อง' });
    }

    const pmResult = await query(
      `SELECT p.pm_id, p.cust_id, c.cust_code
       FROM public.pm_plan p
       JOIN public.customer c ON c.cust_id = p.cust_id
       WHERE p.pm_id = $1`,
      [pm_id]
    );

    if (pmResult.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ PM plan ที่ระบุ' });
    }

    const { cust_id: custId, cust_code: dbCustCode } = pmResult.rows[0];
    if (normalize(dbCustCode) !== normalize(cust_code)) {
      return res.status(400).json({ error: `Customer code mismatch. Expected: ${dbCustCode}, Got: ${cust_code}` });
    }

    const envCheck = await query(
      `SELECT e.env_id, e.env_name
       FROM public.customer_env ce
       JOIN public.env e ON e.env_id = ce.env_id
       WHERE ce.cust_id = $1 AND ce.env_id = $2`,
      [custId, envId]
    );

    if (envCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Environment ไม่ตรงกับลูกค้าที่เลือก' });
    }

    const deriveYearMonth = (): string | null => {
      for (const row of jsonData) {
        const candidates = [
          row?.year_month_file,
          row?.Year_month_file,
          row?.year_month,
          row?.date,
          row?.datetime,
          row?.timestamp
        ];
        for (const candidate of candidates) {
          const derived = toYearMonth(candidate);
          if (derived) {
            return derived;
          }
        }
      }
      return null;
    };

    const derivedYearMonth = deriveYearMonth();
    const fallback = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();
    const yearMonth = derivedYearMonth || fallback;

    let txStarted = false;
    try {
      await query('BEGIN');
      txStarted = true;

      await query(
        `DELETE FROM public.app_response
         WHERE pm_id = $1
           AND env_id = $2
           AND COALESCE(year_month_file, '') = COALESCE($3, '')`,
        [pm_id, envId, yearMonth]
      );

      await query(
        `INSERT INTO public.app_response (pm_id, env_id, json_app_response, year_month_file)
         VALUES ($1, $2, $3, $4)`,
        [pm_id, envId, JSON.stringify(jsonData), yearMonth]
      );

      await query('COMMIT');
      return res.status(200).json({ inserted: 1, env_id: envId, year_month_file: yearMonth });
    } catch (error) {
      if (txStarted) {
        try {
          await query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback error (app other import):', rollbackError);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error importing application other API responses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const importAlfrescoApiData = async (req: Request, res: Response) => {
  try {
    const { pm_id, cust_code, jsonData } = req.body;

    if (!pm_id || !cust_code || !jsonData || !Array.isArray(jsonData)) {
      return res.status(400).json({ error: 'pm_id, cust_code, and jsonData (array) are required' });
    }

    // Validate first row for customer and env
    const firstRow = jsonData[0];
    if (!firstRow || !firstRow.customer || !firstRow.env) {
      return res.status(400).json({ error: 'First row must contain customer and env fields' });
    }

    const normalize = (value?: string | null) => (value || '').trim().toLowerCase();
    const normalizedIncoming = normalize(firstRow.customer);
    const normalizedParamCode = normalize(cust_code);

    // Validate customer code or customer name
    const customerCheck = await query(
      `SELECT cust_id, cust_code, cust_name
       FROM public.customer
       WHERE LOWER(cust_code) = LOWER($1) OR LOWER(cust_name) = LOWER($1)
       LIMIT 1`,
      [firstRow.customer]
    );

    if (customerCheck.rows.length === 0) {
      return res.status(400).json({ error: `Customer "${firstRow.customer}" not found` });
    }

    const { cust_id: custId, cust_code: dbCustCode, cust_name: dbCustName } = customerCheck.rows[0];
    const normalizedDbCode = normalize(dbCustCode);
    const normalizedDbName = normalize(dbCustName);

    const matchesCustomerField =
      normalizedIncoming === normalizedDbCode || normalizedIncoming === normalizedDbName;

    if (!matchesCustomerField) {
      return res.status(400).json({
        error: `Customer identifier "${firstRow.customer}" does not match customer code (${dbCustCode}) or name (${dbCustName})`
      });
    }

    if (normalizedParamCode && normalizedParamCode !== normalizedDbCode) {
      return res.status(400).json({
        error: `Customer code mismatch. Expected: ${dbCustCode}, Got: ${cust_code}`
      });
    }

    // Validate env exists for this customer
    const envCheck = await query(
      `SELECT e.env_id FROM public.env e
       JOIN public.customer_env ce ON ce.env_id = e.env_id
       WHERE ce.cust_id = $1 AND LOWER(e.env_name) = LOWER($2)`,
      [custId, firstRow.env]
    );

    if (envCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: `Environment "${firstRow.env}" not found for customer "${cust_code}"` 
      });
    }

    const envId = envCheck.rows[0].env_id;

    // Get the date from the last row (support both 'date' and 'datetime' fields)
    const lastRow = jsonData[jsonData.length - 1];
    let apiDate = lastRow.date || lastRow.datetime || null;
    
    // If datetime is in ISO format, extract just the date part
    if (apiDate && typeof apiDate === 'string' && apiDate.includes('T')) {
      apiDate = apiDate.split('T')[0];
    }

    // Insert into alf_api table
    await query(
      `INSERT INTO public.alf_api (pm_id, env_id, api_json, api_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [pm_id, envId, JSON.stringify(jsonData), apiDate]
    );

    return res.status(200).json({ message: 'Alfresco API data imported successfully' });
  } catch (error) {
    console.error('Error importing Alfresco API data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};