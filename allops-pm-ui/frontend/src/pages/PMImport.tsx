import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchPMById, fetchCustomerById, fetchImportHeader, fetchAlfrescoApiResponses, fetchAppContentSizing, fetchAppOtherApiResponses, importPMData, importAlfrescoApiData, importAppContentSizingData, importAppOtherApiData } from '../api/pm';

type HeaderInfo = {
  cust_id?: number | string;
  cust_code?: string;
  cust_name?: string;
  pm_id?: number | string;
  pm_name?: string;
  pm_year?: string | number;
  pm_round?: string | number;
};

type EnvRow = {
  cust_id: number;
  env_id: number;
  env_name: string;
  server_id: number;
  server_name?: string;
  has_pm_round?: boolean;
};

type AlfApiRow = {
  pm_id: number;
  pm_name: string;
  cust_name: string;
  env_id: number;
  env_name: string;
  api_date: string | null;
  api_json: string | null;
};

type AppSizingRow = {
  pm_id: number;
  env_id: number;
  env_name: string;
  year_month_file: string | null;
  app_size_json: string | null;
};

type AppOtherApiRow = {
  pm_id: number;
  res_id: number;
  env_id: number;
  env_name: string;
  year_month_file: string | null;
  json_app_response: string | null;
};

const PMImport: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preCustId = searchParams.get('custId') || searchParams.get('cust_id');
  const custNameParam = searchParams.get('cust_name') || '';
  const custCodeParam = searchParams.get('cust_code') || '';
  const pmNameParam = searchParams.get('pm_name') || '';
  const pmYearParam = searchParams.get('pm_year') || '';
  const pmRoundParam = searchParams.get('pm_round') || '';
  const pmIdParam = searchParams.get('pm_id') || searchParams.get('pmId');

  const [header, setHeader] = useState<HeaderInfo>({});
  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [serverNameMap, setServerNameMap] = useState<Record<number, string>>({});
  const [pmStatuses, setPmStatuses] = useState<Record<string, { exists: boolean }>>({});
  const [alfRows, setAlfRows] = useState<AlfApiRow[]>([]);
  const [alfLoading, setAlfLoading] = useState(false);
  const [alfError, setAlfError] = useState<string | null>(null);
  const [alfImporting, setAlfImporting] = useState(false);
  const [appRows, setAppRows] = useState<AppSizingRow[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [appImporting, setAppImporting] = useState(false);
  const [appSelectedEnvId, setAppSelectedEnvId] = useState<string>('all');
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const appCsvInputRef = useRef<HTMLInputElement | null>(null);
  const [appOtherRows, setAppOtherRows] = useState<AppOtherApiRow[]>([]);
  const [appOtherLoading, setAppOtherLoading] = useState(false);
  const [appOtherError, setAppOtherError] = useState<string | null>(null);
  const [appOtherSelectedEnvId, setAppOtherSelectedEnvId] = useState<string>('all');
  const appOtherCsvInputRef = useRef<HTMLInputElement | null>(null);
  const [appOtherImporting, setAppOtherImporting] = useState(false);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const pmCsvInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const parseJsonRecords = (text: string): any[] => {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (primaryError) {
      const lines = text.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (lines.length === 0) {
        throw new Error('EMPTY_FILE');
      }
      try {
        return lines.map((line) => JSON.parse(line));
      } catch (ndjsonError) {
        throw new Error('INVALID_JSON');
      }
    }
  };

  useEffect(() => {
    const loadHeader = async () => {
      try {
        const opts: { cust_id?: number; pm_id?: number } = {};
        if (preCustId) opts.cust_id = Number(preCustId);
        if (pmIdParam) opts.pm_id = Number(pmIdParam);

        let headerResolved = false;

        if (opts.cust_id || opts.pm_id) {
          try {
            const resp = await fetchImportHeader(opts);
            if (resp?.header) {
              const h = resp.header;
              setHeader({
                cust_id: h.cust_id,
                cust_code: h.cust_code,
                cust_name: h.cust_name,
                pm_id: h.pm_id,
                pm_name: h.pm_name,
                pm_year: h.pm_year,
                pm_round: h.pm_round
              });
              headerResolved = true;
            }

            if (Array.isArray(resp?.envs)) {
              const rows: EnvRow[] = resp.envs.map((r: any) => {
                const parsedServerId = Number(r.server_id);
                const serverId = Number.isFinite(parsedServerId) ? parsedServerId : 0;
                return {
                  cust_id: r.cust_id,
                  env_id: r.env_id,
                  env_name: r.env_name,
                  server_id: serverId,
                  server_name: r.server_name,
                  has_pm_round: r.has_pm_round
                };
              });
              setEnvRows(rows);

              const serverMap: Record<number, string> = {};
              rows.forEach((row) => {
                if (row.server_id > 0) {
                  serverMap[row.server_id] = row.server_name || String(row.server_id);
                }
              });
              setServerNameMap(serverMap);

              const statusMap: Record<string, { exists: boolean }> = {};
              rows.forEach((row) => {
                if (row.server_id > 0) {
                  const key = `${row.env_id}:${row.server_id}`;
                  statusMap[key] = { exists: !!row.has_pm_round };
                }
              });
              setPmStatuses(statusMap);
            }
          } catch (err) {
            // fall back to legacy logic below
          }
        }

        if (!headerResolved && pmIdParam) {
          try {
            const pm = await fetchPMById(Number(pmIdParam));
            if (pm) {
              let custName = pm.cust_name || '';
              if (!custName && pm.cust_id) {
                try {
                  const c = await fetchCustomerById(pm.cust_id);
                  custName = c?.cust_name || '';
                } catch (err) {
                  // ignore fallback errors
                }
              }

              setHeader({
                cust_id: pm.cust_id,
                cust_name: custName,
                pm_id: pm.pm_id,
                pm_name: pm.pm_name,
                pm_year: pm.pm_year,
                pm_round: pm.pm_round
              });
              headerResolved = true;
            }
          } catch (err) {
            // ignore fallback errors
          }
        }

        if (!headerResolved && preCustId) {
          try {
            const customer = await fetchCustomerById(Number(preCustId));
            setHeader((prev) => ({
              ...prev,
              cust_id: preCustId,
              cust_name: customer?.cust_name || custNameParam
            }));
          } catch (err) {
            setHeader((prev) => ({
              ...prev,
              cust_id: preCustId,
              cust_name: custNameParam
            }));
          }
        } else if (!headerResolved && custNameParam) {
          setHeader((prev) => ({ ...prev, cust_name: custNameParam }));
        }
      } catch (err) {
        // swallow fetch errors
      }
    };

    loadHeader();
  }, [preCustId, pmIdParam, custNameParam]);

  useEffect(() => {
    try {
      const cid = header.cust_id || (preCustId ? Number(preCustId) : null);
      const pid = header.pm_id || (pmIdParam ? Number(pmIdParam) : null);
      if (cid) {
        const payload: Record<string, unknown> = {
          cust_id: cid,
          cust_name: header.cust_name || custNameParam,
          cust_code: header.cust_code || custCodeParam
        };
        if (pid) payload.pm_id = pid;
        localStorage.setItem('pm_import_customer', JSON.stringify(payload));
      }
    } catch (err) {
      // ignore localStorage errors
    }
  }, [header.cust_id, header.cust_name, header.cust_code, header.pm_id, preCustId, pmIdParam, custNameParam, custCodeParam]);

  const resolvedPmId = useMemo(() => {
    if (header.pm_id !== undefined && header.pm_id !== null) {
      const numeric = Number(header.pm_id);
      if (!Number.isNaN(numeric)) return numeric;
    }
    if (pmIdParam) {
      const numeric = Number(pmIdParam);
      if (!Number.isNaN(numeric)) return numeric;
    }
    return null;
  }, [header.pm_id, pmIdParam]);

  useEffect(() => {
    const loadAlfrescoApi = async () => {
      if (!resolvedPmId) {
        setAlfRows([]);
        return;
      }
      setAlfLoading(true);
      setAlfError(null);
      try {
        const data = await fetchAlfrescoApiResponses(resolvedPmId);
        const mapped = Array.isArray(data)
          ? data.map((row: any) => ({
              pm_id: row.pm_id,
              pm_name: row.pm_name,
              cust_name: row.cust_name,
              env_id: row.env_id,
              env_name: row.env_name,
              api_date: row.api_date || null,
              api_json: row.api_json || null
            }))
          : [];
        setAlfRows(mapped);
      } catch (error) {
        setAlfError('ไม่สามารถโหลดข้อมูล Alfresco API ได้');
        setAlfRows([]);
      } finally {
        setAlfLoading(false);
      }
    };

    loadAlfrescoApi();
  }, [resolvedPmId]);

  useEffect(() => {
    const loadAppSizing = async () => {
      if (!resolvedPmId) {
        setAppRows([]);
        return;
      }
      setAppLoading(true);
      setAppError(null);
      try {
        const data = await fetchAppContentSizing(resolvedPmId);
        const mapped = Array.isArray(data)
          ? data.map((row: any) => ({
              pm_id: row.pm_id,
              env_id: row.env_id,
              env_name: row.env_name,
              year_month_file: row.year_month_file || null,
              app_size_json: row.app_size_json || null
            }))
          : [];
        setAppRows(mapped);
        setAppSelectedEnvId('all');
      } catch (error) {
        setAppError('ไม่สามารถโหลดข้อมูล Application sizing ได้');
        setAppRows([]);
      } finally {
        setAppLoading(false);
      }
    };

    loadAppSizing();
  }, [resolvedPmId]);

  useEffect(() => {
    const loadAppOtherResponses = async () => {
      if (!resolvedPmId) {
        setAppOtherRows([]);
        return;
      }
      setAppOtherLoading(true);
      setAppOtherError(null);
      try {
        const data = await fetchAppOtherApiResponses(resolvedPmId);
        const mapped = Array.isArray(data)
          ? data.map((row: any) => ({
              pm_id: row.pm_id,
              res_id: row.res_id,
              env_id: row.env_id,
              env_name: row.env_name,
              year_month_file: row.year_month_file || null,
              json_app_response: row.json_app_response || null
            }))
          : [];
        setAppOtherRows(mapped);
        setAppOtherSelectedEnvId('all');
      } catch (error) {
        setAppOtherError('ไม่สามารถโหลดข้อมูล Application Other API Response ได้');
        setAppOtherRows([]);
      } finally {
        setAppOtherLoading(false);
      }
    };

    loadAppOtherResponses();
  }, [resolvedPmId]);

  const pickDisplayValue = (candidates: Array<string | number | null | undefined>, fallback: string) => {
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) continue;
      const text = String(candidate).trim();
      if (text.length > 0) return text;
    }
    return fallback;
  };

  const titleCustomerName = pickDisplayValue([header.cust_name, custNameParam], '');
  const displayCustId = pickDisplayValue([header.cust_id, preCustId], '#{cust_id}');
  const displayCustName = pickDisplayValue([header.cust_name, custNameParam], '{cust_name}');
  const displayPmId = pickDisplayValue([header.pm_id, pmIdParam], 'PM_id');
  const displayPmName = pickDisplayValue([header.pm_name, pmNameParam], '{pm_name}');
  const displayPmYear = pickDisplayValue([header.pm_year, pmYearParam], '{year_pm}');
  const displayPmRound = pickDisplayValue([header.pm_round, pmRoundParam], '{pm_round}');
  const subtitleText = `${displayCustId}-${displayCustName}#(${displayPmId})-${displayPmName} ปี PM:${displayPmYear}รอบ PM:${displayPmRound}`;
  const resolvedPmName = pickDisplayValue([header.pm_name, pmNameParam], '');
  const resolvedCustName = pickDisplayValue([header.cust_name, custNameParam], '');
  const resolvedCustCode = pickDisplayValue([header.cust_code, custCodeParam], '');

  const validEnvRows = useMemo(() => envRows.filter((row) => Number(row.server_id) > 0), [envRows]);

  const envUniqueRows = useMemo(() => {
    const map = new Map<number, EnvRow>();
    envRows.forEach((row) => {
      if (!map.has(row.env_id)) map.set(row.env_id, row);
    });
    return Array.from(map.values());
  }, [envRows]);

  const allPmEnvsComplete = useMemo(() => {
    if (validEnvRows.length === 0) return false;
    return validEnvRows.every((row) => {
      const key = `${row.env_id}:${row.server_id}`;
      const status = pmStatuses[key];
      return status && status.exists;
    });
  }, [validEnvRows, pmStatuses]);

  const allAlfEnvsComplete = useMemo(() => {
    if (envUniqueRows.length === 0) return false;
    return envUniqueRows.every((env) => {
      const hasData = alfRows.some((row) => row.env_id === env.env_id && row.api_date);
      return hasData;
    });
  }, [envUniqueRows, alfRows]);

  const mergedAlfRows = useMemo(() => {
    const base: AlfApiRow[] = Array.isArray(alfRows) ? [...alfRows] : [];
    const seen = new Set<number>();
    base.forEach((row) => {
      seen.add(row.env_id);
    });

    envUniqueRows.forEach((env) => {
      const key = env.env_id;
      if (!seen.has(key)) {
        base.push({
          pm_id: resolvedPmId || 0,
          pm_name: resolvedPmName,
          cust_name: resolvedCustName,
          env_id: env.env_id,
          env_name: env.env_name,
          api_date: null,
          api_json: null
        });
        seen.add(key);
      }
    });

    return base.sort((a, b) => a.env_name.localeCompare(b.env_name));
  }, [alfRows, envUniqueRows, resolvedPmId, resolvedPmName, resolvedCustName]);

  const displayedAlfRows = mergedAlfRows;

  const mergedAppRows = useMemo(() => {
    const base: AppSizingRow[] = Array.isArray(appRows) ? [...appRows] : [];
    const seen = new Set<number>();
    base.forEach((row) => {
      seen.add(row.env_id);
    });

    envUniqueRows.forEach((env) => {
      if (!seen.has(env.env_id)) {
        base.push({
          pm_id: resolvedPmId || 0,
          env_id: env.env_id,
          env_name: env.env_name,
          year_month_file: null,
          app_size_json: null
        });
        seen.add(env.env_id);
      }
    });

    const score = (value: string | null) => {
      if (!value) return -Infinity;
      const numeric = Number(value.replace('-', ''));
      return Number.isNaN(numeric) ? -Infinity : numeric;
    };

    return base.sort((a, b) => {
      if (a.env_name === b.env_name) {
        return score(b.year_month_file) - score(a.year_month_file);
      }
      return a.env_name.localeCompare(b.env_name);
    });
  }, [appRows, envUniqueRows, resolvedPmId]);

  const appEnvOptions = useMemo(() => {
    const map = new Map<number, string>();
    mergedAppRows.forEach((row) => {
      map.set(row.env_id, row.env_name);
    });
    const envOptions = Array.from(map.entries()).map(([envId, envName]) => ({
      value: String(envId),
      label: envName
    })).sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: 'all', label: 'เลือก env' }, ...envOptions];
  }, [mergedAppRows]);

  const displayedAppRows = useMemo(() => {
    if (appSelectedEnvId === 'all') return mergedAppRows;
    return mergedAppRows.filter((row) => String(row.env_id) === appSelectedEnvId);
  }, [mergedAppRows, appSelectedEnvId]);

  const mergedAppOtherRows = useMemo(() => {
    const base: AppOtherApiRow[] = Array.isArray(appOtherRows) ? [...appOtherRows] : [];
    const seen = new Set<number>();
    base.forEach((row) => {
      seen.add(row.env_id);
    });

    envUniqueRows.forEach((env) => {
      if (!seen.has(env.env_id)) {
        base.push({
          pm_id: resolvedPmId || 0,
          res_id: 0,
          env_id: env.env_id,
          env_name: env.env_name,
          year_month_file: null,
          json_app_response: null
        });
        seen.add(env.env_id);
      }
    });

    const score = (value: string | null) => {
      if (!value) return -Infinity;
      const numeric = Number(value.replace('-', ''));
      return Number.isNaN(numeric) ? -Infinity : numeric;
    };

    return base.sort((a, b) => {
      if (a.env_name === b.env_name) {
        return score(b.year_month_file) - score(a.year_month_file);
      }
      return a.env_name.localeCompare(b.env_name);
    });
  }, [appOtherRows, envUniqueRows, resolvedPmId]);

  const appOtherEnvOptions = useMemo(() => {
    const map = new Map<number, string>();
    mergedAppOtherRows.forEach((row) => {
      map.set(row.env_id, row.env_name);
    });
    const envOptions = Array.from(map.entries()).map(([envId, envName]) => ({
      value: String(envId),
      label: envName
    })).sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: 'all', label: 'เลือก env' }, ...envOptions];
  }, [mergedAppOtherRows]);

  const displayedAppOtherRows = useMemo(() => {
    if (appOtherSelectedEnvId === 'all') return mergedAppOtherRows;
    return mergedAppOtherRows.filter((row) => String(row.env_id) === appOtherSelectedEnvId);
  }, [mergedAppOtherRows, appOtherSelectedEnvId]);

  const formatDate = (date: string | null) => {
    if (!date) return 'NONE';
    try {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return 'NONE';
      return parsed.toISOString().slice(0, 10);
    } catch (err) {
      return 'NONE';
    }
  };

  const resolveStatus = (date: string | null) => (date ? 'Success' : 'Pending');
  const formatYearMonth = (value: string | null) => (value && value.trim().length > 0 ? value : 'NONE');
  const resolveAppStatus = (value: string | null) => (value ? 'Success' : 'Pending');
  const resolveAppOtherStatus = (value: string | null) => (value ? 'Success' : 'Pending');

  const handleImportCsvClick = () => {
    csvInputRef.current?.click();
  };

  const handleCsvSelected: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAlfImporting(true);

    try {
      const text = await file.text();
      let jsonData: any[];
      try {
        jsonData = parseJsonRecords(text);
      } catch (parseError: any) {
        if (parseError?.message === 'EMPTY_FILE') {
          alert('ไฟล์ไม่มีข้อมูล');
        } else {
          alert('ไฟล์ไม่ใช่รูปแบบ JSON หรือ NDJSON ที่ถูกต้อง');
        }
        return;
      }

      // Import the data
      await importAlfrescoApiData(resolvedPmId || 0, resolvedCustCode, jsonData);
      
      alert('นำเข้าข้อมูล Alfresco API สำเร็จ');
      
      // Reload data
      window.location.reload();
    } catch (error: any) {
      console.error('Import error:', error);
      if (error.response?.data?.error) {
        alert(`เกิดข้อผิดพลาด: ${error.response.data.error}`);
      } else {
        alert('เกิดข้อผิดพลาดในการนำเข้าข้อมูล กรุณาตรวจสอบไฟล์');
      }
    } finally {
      setAlfImporting(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleAppImportCsvClick = () => {
    if (appImporting) return;
    appCsvInputRef.current?.click();
  };

  const handleAppCsvSelected: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!resolvedPmId) {
      alert('ไม่พบข้อมูล PM ที่ต้องการนำเข้า');
      event.target.value = '';
      return;
    }
    if (!resolvedCustCode) {
      alert('ไม่พบ Customer code ในหน้า Import');
      event.target.value = '';
      return;
    }

    setAppImporting(true);

    try {
      const text = await file.text();
      let jsonData: any[];
      try {
        jsonData = parseJsonRecords(text);
      } catch (parseError: any) {
        if (parseError?.message === 'EMPTY_FILE') {
          alert('ไฟล์ไม่มีข้อมูล');
        } else {
          alert('ไฟล์ไม่ใช่รูปแบบ JSON หรือ NDJSON ที่ถูกต้อง');
        }
        return;
      }

      await importAppContentSizingData(resolvedPmId, resolvedCustCode, jsonData);
      alert('นำเข้าข้อมูล Application sizing สำเร็จ');
      window.location.reload();
    } catch (error: any) {
      console.error('Application sizing import error:', error);
      if (error?.response?.data?.error) {
        alert(`เกิดข้อผิดพลาด: ${error.response.data.error}`);
      } else {
        alert('เกิดข้อผิดพลาดในการนำเข้าข้อมูล Application sizing กรุณาตรวจสอบไฟล์');
      }
    } finally {
      setAppImporting(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleAppOtherImportCsvClick = () => {
    if (appOtherImporting) return;
    appOtherCsvInputRef.current?.click();
  };

  const handleAppOtherCsvSelected: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!resolvedPmId) {
      alert('ไม่พบข้อมูล PM ที่ต้องการนำเข้า');
      event.target.value = '';
      return;
    }
    if (!resolvedCustCode) {
      alert('ไม่พบ Customer code ในหน้า Import');
      event.target.value = '';
      return;
    }
    if (!appOtherSelectedEnvId || appOtherSelectedEnvId === 'all') {
      alert('กรุณาเลือก ENV ที่ต้องการนำเข้าก่อน');
      event.target.value = '';
      return;
    }

    const envId = Number(appOtherSelectedEnvId);
    if (!Number.isFinite(envId) || envId <= 0) {
      alert('ENV ที่เลือกไม่ถูกต้อง');
      event.target.value = '';
      return;
    }

    setAppOtherImporting(true);

    try {
      const text = await file.text();
      let jsonData: any[];
      try {
        jsonData = parseJsonRecords(text);
      } catch (parseError: any) {
        if (parseError?.message === 'EMPTY_FILE') {
          alert('ไฟล์ไม่มีข้อมูล');
        } else {
          alert('ไฟล์ไม่ใช่รูปแบบ JSON หรือ NDJSON ที่ถูกต้อง');
        }
        return;
      }

      await importAppOtherApiData(resolvedPmId, resolvedCustCode, envId, jsonData);
      alert('นำเข้าข้อมูล Application Other API Response สำเร็จ');
      window.location.reload();
    } catch (error: any) {
      console.error('Application other API import error:', error);
      if (error?.response?.data?.error) {
        alert(`เกิดข้อผิดพลาด: ${error.response.data.error}`);
      } else {
        alert('เกิดข้อผิดพลาดในการนำเข้าข้อมูล Application Other API Response กรุณาตรวจสอบไฟล์');
      }
    } finally {
      setAppOtherImporting(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handlePmImportClick = (envId: number, serverId: number) => {
    const key = `${envId}:${serverId}`;
    const inputRef = pmCsvInputRefs.current[key];
    if (inputRef) {
      inputRef.click();
    }
  };

  const handlePmCsvSelected = async (event: React.ChangeEvent<HTMLInputElement>, envId: number, serverId: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const key = `${envId}:${serverId}`;
    setImporting((prev) => ({ ...prev, [key]: true }));

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Validate customer code and env names
      const payloadCust = (jsonData.cust_code ?? jsonData.customer ?? '').toLowerCase().trim();
      const payloadEnv = jsonData.env?.toLowerCase().trim();
      const headerCust = resolvedCustCode?.toLowerCase().trim();
      const envRow = envRows.find((r) => r.env_id === envId);
      const headerEnv = envRow?.env_name?.toLowerCase().trim();

      if (!payloadCust || payloadCust !== headerCust) {
        alert(`ข้อมูลไม่ถูกต้อง: Customer code ไม่ตรงกัน\nคาดหวัง: ${resolvedCustCode}\nได้รับ: ${jsonData.cust_code || jsonData.customer || 'ไม่มีข้อมูล'}`);
        return;
      }

      if (payloadEnv !== headerEnv) {
        alert(`ข้อมูลไม่ถูกต้อง: ชื่อ Environment ไม่ตรงกัน\nคาดหวัง: ${envRow?.env_name}\nได้รับ: ${jsonData.env}`);
        return;
      }

      // Import data
      const custId = header.cust_id ? Number(header.cust_id) : (preCustId ? Number(preCustId) : 0);
      await importPMData(resolvedPmId || 0, envId, serverId, custId, jsonData);
      
      alert('นำเข้าข้อมูลสำเร็จ');
      
      // Reload page data
      window.location.reload();
    } catch (error: any) {
      console.error('Import error:', error);
      if (error.response?.data?.error) {
        alert(`เกิดข้อผิดพลาด: ${error.response.data.error}`);
      } else {
        alert('เกิดข้อผิดพลาดในการนำเข้าข้อมูล กรุณาตรวจสอบไฟล์ JSON');
      }
    } finally {
      setImporting((prev) => ({ ...prev, [key]: false }));
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="container">
      <header className="page-header">
        <h1 className="page-title">Import PM{titleCustomerName ? ` (${titleCustomerName})` : ''}</h1>
        <p className="page-subtitle">{subtitleText}</p>
      </header>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ border: allPmEnvsComplete ? '2px solid #10b981' : 'none', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>PM</h3>
          <p style={{ marginTop: 4, color: '#4b5563' }}>Import รายละเอียดพื้นฐานของ env เช่น Spec server, Contentstore Alfresco</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#06b6d4', color: '#fff' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>ENV</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>SERVER</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {validEnvRows.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>ไม่มีข้อมูล env/server สำหรับลูกค้านี้</td></tr>
                ) : validEnvRows.map((row) => {
                  const key = `${row.env_id}:${row.server_id}`;
                  const status = pmStatuses[key];
                  const serverLabel = serverNameMap[row.server_id] || (row.server_id ? String(row.server_id) : '-');
                  const isImporting = importing[key] || false;
                  
                  return (
                    <tr key={key} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>{row.env_name}</td>
                      <td style={{ padding: 8 }}>{serverLabel}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {status && status.exists ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>Success</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handlePmImportClick(row.env_id, row.server_id)}
                              disabled={isImporting}
                              style={{
                                padding: '4px 12px',
                                borderRadius: 4,
                                background: isImporting ? '#9ca3af' : '#06b6d4',
                                color: '#fff',
                                border: 'none',
                                cursor: isImporting ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem'
                              }}
                            >
                              {isImporting ? 'กำลังนำเข้า...' : 'Import JSON'}
                            </button>
                            <input
                              ref={(el) => { pmCsvInputRefs.current[key] = el; }}
                              type="file"
                              accept=".json"
                              style={{ display: 'none' }}
                              onChange={(e) => handlePmCsvSelected(e, row.env_id, row.server_id)}
                            />
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ border: allAlfEnvsComplete ? '2px solid #10b981' : 'none', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Alfresco API Response</h3>
          <p style={{ marginTop: 4, color: '#4b5563' }}>นำเข้าข้อมูล Alfresco test API sample แต่ละ env</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <button 
              onClick={handleImportCsvClick} 
              disabled={alfImporting}
              style={{ 
                padding: '6px 12px', 
                borderRadius: 6, 
                background: alfImporting ? '#9ca3af' : '#06b6d4', 
                color: '#fff', 
                border: 'none',
                cursor: alfImporting ? 'not-allowed' : 'pointer'
              }}
            >
              {alfImporting ? 'กำลังนำเข้า...' : 'Import CSV'}
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.json"
              style={{ display: 'none' }}
              onChange={handleCsvSelected}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#06b6d4', color: '#fff' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>ENV</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>DATE DATA</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {alfLoading ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>กำลังโหลด...</td></tr>
                ) : alfError ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>{alfError}</td></tr>
                ) : displayedAlfRows.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>ไม่มีข้อมูล Alfresco API</td></tr>
                ) : (
                  displayedAlfRows.map((row, index) => (
                    <tr key={`${row.env_id}:${index}`} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>{row.env_name}</td>
                      <td style={{ padding: 8 }}>{formatDate(row.api_date)}</td>
                      <td style={{ padding: 8, color: row.api_date ? '#10b981' : '#6b7280', fontWeight: row.api_date ? 600 : 400 }}>
                        {resolveStatus(row.api_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Application data sizing</h3>
          <p style={{ marginTop: 4, color: '#4b5563' }}>นำเข้าข้อมูล json sizing แต่ละ application</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <label htmlFor="app-sizing-env-filter" style={{ fontWeight: 600 }}>ENV</label>
            <select
              id="app-sizing-env-filter"
              value={appSelectedEnvId}
              onChange={(event) => setAppSelectedEnvId(event.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 140 }}
            >
              {appEnvOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleAppImportCsvClick}
              disabled={appImporting || appSelectedEnvId === 'all'}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: appImporting || appSelectedEnvId === 'all' ? '#9ca3af' : '#06b6d4',
                color: '#fff',
                border: 'none',
                cursor: appImporting || appSelectedEnvId === 'all' ? 'not-allowed' : 'pointer'
              }}
            >
              {appSelectedEnvId === 'all' ? 'เลือก env ก่อน' : (appImporting ? 'กำลังนำเข้า...' : 'Import CSV')}
            </button>
            <input
              ref={appCsvInputRef}
              type="file"
              accept=".csv,.json"
              style={{ display: 'none' }}
              onChange={handleAppCsvSelected}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#06b6d4', color: '#fff' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>ENV</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>DATE DATA (YYYY-MM)</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {appLoading ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>กำลังโหลด...</td></tr>
                ) : appError ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>{appError}</td></tr>
                ) : displayedAppRows.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>ไม่มีข้อมูล Application sizing</td></tr>
                ) : (
                  displayedAppRows.map((row, index) => (
                    <tr key={`app-${row.env_id}:${index}`} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>{row.env_name}</td>
                      <td style={{ padding: 8 }}>{formatYearMonth(row.year_month_file)}</td>
                      <td style={{ padding: 8, color: row.year_month_file ? '#10b981' : '#6b7280', fontWeight: row.year_month_file ? 600 : 400 }}>
                        {resolveAppStatus(row.year_month_file)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body">
          <h3 style={{ marginTop: 0 }}>Application Other API Response</h3>
          <p style={{ marginTop: 4, color: '#4b5563' }}>นำเข้าข้อมูล json การ Response ของ other application</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <label htmlFor="app-other-env-filter" style={{ fontWeight: 600 }}>ENV</label>
            <select
              id="app-other-env-filter"
              value={appOtherSelectedEnvId}
              onChange={(event) => setAppOtherSelectedEnvId(event.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 140 }}
            >
              {appOtherEnvOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>เลือก ENV ที่ต้องการก่อนนำเข้า</span>
            <button
              onClick={handleAppOtherImportCsvClick}
              disabled={appOtherImporting || appOtherSelectedEnvId === 'all'}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: appOtherImporting || appOtherSelectedEnvId === 'all' ? '#9ca3af' : '#06b6d4',
                color: '#fff',
                border: 'none',
                cursor: appOtherImporting || appOtherSelectedEnvId === 'all' ? 'not-allowed' : 'pointer'
              }}
            >
              {appOtherSelectedEnvId === 'all' ? 'เลือก env ก่อน' : (appOtherImporting ? 'กำลังนำเข้า...' : 'Import CSV')}
            </button>
            <input
              ref={appOtherCsvInputRef}
              type="file"
              accept=".csv,.json"
              style={{ display: 'none' }}
              onChange={handleAppOtherCsvSelected}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#06b6d4', color: '#fff' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>ENV</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>DATE DATA (YYYY-MM)</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {appOtherLoading ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>กำลังโหลด...</td></tr>
                ) : appOtherError ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>{appOtherError}</td></tr>
                ) : displayedAppOtherRows.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 12 }}>ไม่มีข้อมูล Application Other API Response</td></tr>
                ) : (
                  displayedAppOtherRows.map((row, index) => (
                    <tr key={`app-other-${row.env_id}:${index}`} style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>{row.env_name}</td>
                      <td style={{ padding: 8 }}>{formatYearMonth(row.year_month_file)}</td>
                      <td style={{ padding: 8, color: row.year_month_file ? '#10b981' : '#6b7280', fontWeight: row.year_month_file ? 600 : 400 }}>
                        {resolveAppOtherStatus(row.year_month_file)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', right: 20, bottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 12px', borderRadius: 6 }}>Back</button>
      </div>
    </div>
  );
};

export default PMImport;
