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