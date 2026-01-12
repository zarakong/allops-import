import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPMDetails } from '../api/pm';
import { DiagramUploadResponse, fetchCustomerDiagram, fetchCustomerDiagramImage } from '../api/customers';
import { extractVersionText, formatGbLabel, formatDateIso, formatGbNumber, KB_PER_GB } from '../utils/contentStoreFormatters';
import './PMDetails.css';

type DiskEntry = {
  mount?: string;
  size_kb?: number | string;
  used_kb?: number | string;
  avail_kb?: number | string;
};

type PathUsageSummary = {
  path: string;
  displayText: string;
};

type ServerSnapshot = {
  serv_id: number;
  env_id: number;
  env_name?: string;
  pm_id: number;
  create_at?: string;
  cust_id?: number;
  serv_name?: string;
  serv_os?: string;
  serv_os_version?: string;
  serv_ram?: number;
  serv_cpu_model_name?: string;
  serv_cpu_cores?: number;
  server_id?: number;
  serv_disk?: unknown;
  path_app?: string | null;
  path_data?: string | null;
  reference_server_name?: string | null;
  applications?: string[] | string | unknown;
};

type PMDetailsResponse = {
  header: any;
  servers: ServerSnapshot[];
  pmRounds: any[];
  contentStores: any[];
  alfrescoApi: any[];
  appSizing: any[];
  appResponses: any[];
};

const normalizePathValue = (value?: string | null) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return trimmed || '/';
  return trimmed.replace(/\/+$/g, '') || '/';
};

const matchesMount = (path: string, mount?: string) => {
  if (!mount) return false;
  const normalizedMount = normalizePathValue(mount);
  if (!normalizedMount) return false;
  if (normalizedMount === '/') {
    return path === '/';
  }
  return path === normalizedMount || path.startsWith(`${normalizedMount}/`);
};

const parseDiskEntries = (raw: unknown): DiskEntry[] => {
  const extract = (value: unknown): DiskEntry[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as DiskEntry[];
    if (typeof value === 'object' && Array.isArray((value as { disk?: DiskEntry[] }).disk)) {
      return ((value as { disk?: DiskEntry[] }).disk) || [];
    }
    return [];
  };

  if (!raw) return [];

  // Handle direct array (new format)
  if (Array.isArray(raw)) {
    return raw as DiskEntry[];
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    
    // Try parsing as direct array first (new format: [{"mount":"/", ...}, ...])
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed as DiskEntry[];
        }
      } catch (err) {
        // Continue to other attempts
      }
    }
    
    const attempts = [trimmed];
    if (trimmed.startsWith('[')) attempts.push(`{"disk":${trimmed}}`);
    if (trimmed.startsWith('"disk"')) attempts.push(`{${trimmed}}`);
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) attempts.push(`{${trimmed}`);
    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) attempts.push(`${trimmed}}`);
    for (const candidate of attempts) {
      try {
        const parsed = JSON.parse(candidate);
        const extracted = extract(parsed);
        if (extracted.length > 0) return extracted;
      } catch (err) {
        continue;
      }
    }
    const match = trimmed.match(/"disk"\s*:\s*(\[[\s\S]*\])/i);
    if (match) {
      try {
        const arr = JSON.parse(match[1]);
        if (Array.isArray(arr)) return arr as DiskEntry[];
      } catch (err) {
        return [];
      }
    }
    return [];
  }

  return extract(raw);
};

const formatGbFromKb = (kbValue: unknown) => {
  const numeric = Number(kbValue);
  if (!Number.isFinite(numeric)) return '-';
  return `${(numeric / KB_PER_GB).toFixed(2)} GB`;
};

const buildPathUsageSummary = (pathValue: string | null | undefined, entries: DiskEntry[]): PathUsageSummary | null => {
  if (!pathValue || !pathValue.trim()) return null;
  const normalizedPath = normalizePathValue(pathValue);
  if (!normalizedPath) return null;
  const matchedDisk = entries.find(entry => matchesMount(normalizedPath, entry.mount));
  if (!matchedDisk) {
    return {
      path: normalizedPath,
      displayText: `${normalizedPath}: - / -`,
    };
  }
  const pathLabel = normalizedPath === '/' ? '( / )' : normalizedPath;
  
  // Calculate percentages
  const usedKb = Number(matchedDisk.used_kb);
  const availKb = Number(matchedDisk.avail_kb);
  const sizeKb = Number(matchedDisk.size_kb);
  
  let usedPercent = '';
  let availPercent = '';
  
  if (Number.isFinite(usedKb) && Number.isFinite(availKb)) {
    const total = Number.isFinite(sizeKb) && sizeKb > 0 ? sizeKb : usedKb + availKb;
    if (total > 0) {
      const usedPct = (usedKb / total) * 100;
      const availPct = (availKb / total) * 100;
      usedPercent = ` (${usedPct.toFixed(1)}%)`;
      availPercent = ` (${availPct.toFixed(1)}%)`;
    }
  }
  
  return {
    path: normalizedPath,
    displayText: `${pathLabel}: ${formatGbFromKb(matchedDisk.used_kb)}${usedPercent} / ${formatGbFromKb(matchedDisk.avail_kb)}${availPercent}`,
  };
};

const formatDateTime = (value?: string | number | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH');
};

const formatDateOnly = (value?: string | number | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH');
};

const formatKbCompact = (value?: number | null) => {
  if (value === null || value === undefined) return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '-';
  const gb = numeric / 1024 / 1024;
  return `${gb.toFixed(2)} GB`;
};

const safeParseArray = (value: unknown): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
};

const formatMonthLabel = (monthKey: string) => {
  const match = monthKey.match(/^(\d{4})[/-](\d{1,2})/);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const d = new Date(year, month - 1, 1);
  if (Number.isNaN(d.getTime())) return monthKey;
  return d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
};

const normalizeGb = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return null;
  const rounded = Number(value.toFixed(2));
  if (Math.abs(rounded) < 0.01) return 0; // treat tiny values as zero to avoid -100% noise
  return rounded;
};

const formatGrowthPercent = (prevGbRaw: number | null, currentGbRaw: number | null) => {
  const prevGb = normalizeGb(prevGbRaw);
  const currentGb = normalizeGb(currentGbRaw);
  if (prevGb === null || currentGb === null) return '--';
  if (prevGb === 0 && currentGb === 0) return '--';
  if (prevGb === 0 && currentGb > 0) return '+∞';
  if (prevGb === 0 && currentGb < 0) return '-∞';
  const diff = currentGb - prevGb;
  const pct = (diff / prevGb) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
};

const extractYearFromPath = (path?: string | null) => {
  if (!path) return null;
  const parts = path.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  const yearNum = Number(last);
  if (!Number.isFinite(yearNum)) return null;
  return yearNum;
};

const renderPathLabel = (label: string) => (
  <div className="pm-spec-label">
    <span>{label}</span>
    <span className="pm-spec-hint">*Used / Free (GB)</span>
  </div>
);

const renderPathValue = (summary: PathUsageSummary | null, fallback?: string | null) => {
  if (summary?.displayText) return summary.displayText;
  if (fallback && fallback.trim()) return fallback;
  return '-';
};

const isAbortError = (error: unknown) => {
  if (!error) return false;
  const err = error as { name?: string; code?: string };
  return err?.name === 'AbortError' || err?.code === 'ERR_CANCELED';
};

const extractErrorMessage = (error: unknown) => {
  const err = error as { response?: { data?: any }; message?: string };
  const responseData = err?.response?.data;
  if (typeof responseData === 'string') return responseData;
  if (responseData?.error) return responseData.error;
  if (err?.message) return err.message;
  return 'ไม่สามารถโหลดข้อมูลเพิ่มเติมได้';
};

const PMDetails: React.FC = () => {
  const params = useParams();
  const pmId = params.pmId ? Number(params.pmId) : null;
  const navigate = useNavigate();
  const [details, setDetails] = useState<PMDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagramMeta, setDiagramMeta] = useState<DiagramUploadResponse | null>(null);
  const [diagramPreviewUrl, setDiagramPreviewUrl] = useState<string | null>(null);
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramError, setDiagramError] = useState<string | null>(null);
  const diagramObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!pmId) {
        setError('ไม่พบรหัส PM');
        setLoading(false);
        return;
      }
      try {
        const payload = await fetchPMDetails(pmId);
        setDetails(payload);
      } catch (err) {
        console.error(err);
        setError('ไม่สามารถโหลดข้อมูลรายละเอียด PM ได้');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pmId]);

  const header = details?.header;
  useEffect(() => {
    const custId = header?.cust_id;
    let cancelled = false;
    const controller = new AbortController();

    const loadDiagram = async () => {
      if (!custId) {
        setDiagramMeta(null);
        setDiagramPreviewUrl(null);
        setDiagramError(null);
        setDiagramLoading(false);
        return;
      }
      setDiagramLoading(true);
      setDiagramError(null);
      try {
        const meta = await fetchCustomerDiagram(custId);
        if (cancelled) return;
        setDiagramMeta(meta);
        setDiagramError(null);
        if (meta?.link_id) {
          const blob = await fetchCustomerDiagramImage(custId, { signal: controller.signal, cacheBust: Date.now() });
          if (cancelled) return;
          if (diagramObjectUrlRef.current) {
            URL.revokeObjectURL(diagramObjectUrlRef.current);
            diagramObjectUrlRef.current = null;
          }
          const objectUrl = URL.createObjectURL(blob);
          diagramObjectUrlRef.current = objectUrl;
          setDiagramPreviewUrl(objectUrl);
        } else {
          if (diagramObjectUrlRef.current) {
            URL.revokeObjectURL(diagramObjectUrlRef.current);
            diagramObjectUrlRef.current = null;
          }
          setDiagramPreviewUrl(null);
        }
      } catch (err) {
        if (cancelled || isAbortError(err)) return;
        setDiagramError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setDiagramLoading(false);
      }
    };

    loadDiagram();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [header?.cust_id]);

  useEffect(() => {
    return () => {
      if (diagramObjectUrlRef.current) {
        URL.revokeObjectURL(diagramObjectUrlRef.current);
      }
    };
  }, []);

  const serverSnapshots = details?.servers ?? [];
  const pmSummaryRows = useMemo(() => ([
    { label: 'Customer name', value: header ? `${header.cust_name || '-'} (${header.cust_code || '-'})` : '-' },
    { label: 'Project name', value: header?.pm_name || '-' },
    { label: 'ปีที่ PM', value: header?.pm_year || '-' },
    { label: 'รอบ PM', value: header?.pm_round ? `ครั้งที่ ${header.pm_round}` : '-' },
    { label: 'PM Date', value: formatDateOnly(header?.pm_check_date) },
  ]), [header]);

  const parsedServers = useMemo(() => {
    return serverSnapshots.map((server) => {
      const diskEntries = parseDiskEntries(server.serv_disk);
      const pathAppUsage = buildPathUsageSummary(server.path_app, diskEntries);
      const pathDataUsage = buildPathUsageSummary(server.path_data, diskEntries);
      
      // Parse applications array
      const applications = Array.isArray(server.applications) 
        ? server.applications 
        : (typeof server.applications === 'string' 
            ? (server.applications.trim() ? JSON.parse(server.applications) : [])
            : []);
      
      return {
        ...server,
        hostname: server.serv_name?.trim() || server.reference_server_name || `Server ${server.server_id || server.serv_id}`,
        envLabel: server.env_name || (server.env_id ? `ENV ${server.env_id}` : '-'),
        cpuLabel: server.serv_cpu_model_name
          ? `${server.serv_cpu_model_name}${server.serv_cpu_cores ? ` (${server.serv_cpu_cores} cores)` : ''}`
          : '-',
        ramLabel: formatKbCompact(server.serv_ram || null),
        pathAppUsage,
        pathDataUsage,
        updatedText: formatDateTime(server.create_at),
        applications,
      };
    });
  }, [serverSnapshots]);

  const serverCount = parsedServers.length;

  const serversByEnv = useMemo(() => {
    const groups = new Map<string, typeof parsedServers>();
    parsedServers.forEach((srv) => {
      const envKey = srv.env_name || `ENV ${srv.env_id}` || 'Unknown';
      if (!groups.has(envKey)) {
        groups.set(envKey, []);
      }
      groups.get(envKey)!.push(srv);
    });
    return Array.from(groups.entries()).map(([envName, servers]) => ({
      envName,
      servers,
      serverCount: servers.length,
    }));
  }, [parsedServers]);

  const serverSpecRows = useMemo(() => {
    if (parsedServers.length === 0) return [];
    return [
      { id: 'server-name', label: 'Server name', values: parsedServers.map((srv) => srv.hostname || '-') },
      { id: 'env', label: 'Environment', values: parsedServers.map((srv) => srv.envLabel || '-') },
      { id: 'os', label: 'OS / Version', values: parsedServers.map((srv) => srv.serv_os ? `${srv.serv_os} ${srv.serv_os_version || ''}`.trim() : '-') },
      { id: 'cpu', label: 'CPU model', values: parsedServers.map((srv) => srv.cpuLabel || '-') },
      { id: 'ram', label: 'RAM', values: parsedServers.map((srv) => srv.ramLabel || '-') },
      {
        id: 'path-app',
        label: 'Path app (GB)',
        labelNode: renderPathLabel('Path app (GB)'),
        values: parsedServers.map((srv) => renderPathValue(srv.pathAppUsage, srv.path_app || undefined)),
      },
      {
        id: 'path-data',
        label: 'Path data (GB)',
        labelNode: renderPathLabel('Path data (GB)'),
        values: parsedServers.map((srv) => renderPathValue(srv.pathDataUsage, srv.path_data || undefined)),
      },
      {
        id: 'application',
        label: 'Application',
        values: parsedServers.map((srv) => {
          const apps = srv.applications || [];
          if (apps.length === 0) return '-';
          return apps.map((app: string, idx: number) => (
            <React.Fragment key={`${app}-${idx}`}>
              {app}
              {idx < apps.length - 1 && <br />}
            </React.Fragment>
          ));
        }),
      },
      { id: 'date-data', label: 'Date data', values: parsedServers.map((srv) => formatDateOnly(srv.create_at)) },
    ];
  }, [parsedServers]);

  const contentStoreLatest = useMemo(() => {
    const latestByEnv = new Map<number, any>();
    (details?.contentStores ?? []).forEach((row) => {
      const envId = row.env_id || 0;
      const current = latestByEnv.get(envId);
      const rowDate = row.created_at ? new Date(row.created_at).getTime() : 0;
      const currentDate = current?.created_at ? new Date(current.created_at).getTime() : 0;
      if (!current || rowDate > currentDate) {
        latestByEnv.set(envId, row);
      }
    });
    return Array.from(latestByEnv.values()).sort((a, b) => {
      const nameA = (a.env_name || '').toLowerCase();
      const nameB = (b.env_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [details?.contentStores]);

  const contentStoreMonthlyRows = useMemo(() => {
    const envData = contentStoreLatest.map((row) => {
      const entries = safeParseArray(row.cont_month_json).map((it) => ({
        monthKey: String(it.month || ''),
        gb: formatGbNumber(it.size_kb),
      })).filter((it) => it.monthKey);
      // sort asc by date
      entries.sort((a, b) => {
        const parse = (key: string) => {
          const m = key.match(/^(\d{4})[/-](\d{1,2})/);
          if (!m) return 0;
          return new Date(Number(m[1]), Number(m[2]) - 1, 1).getTime();
        };
        return parse(a.monthKey) - parse(b.monthKey);
      });
      return { row, entries };
    });

    const allMonthKeys = new Set<string>();
    envData.forEach(({ entries }) => entries.forEach((e) => allMonthKeys.add(e.monthKey)));
    const orderedMonthKeys = Array.from(allMonthKeys.values()).sort((a, b) => {
      const toTs = (key: string) => {
        const m = key.match(/^(\d{4})[/-](\d{1,2})/);
        if (!m) return 0;
        return new Date(Number(m[1]), Number(m[2]) - 1, 1).getTime();
      };
      return toTs(a) - toTs(b);
    });

    return orderedMonthKeys.map((monthKey) => {
      const cells = envData.map(({ entries }) => entries.find((e) => e.monthKey === monthKey) || { gb: null });
      return { monthKey, cells };
    });
  }, [contentStoreLatest]);

  const contentStoreYearlyRows = useMemo(() => {
    const envData = contentStoreLatest.map((row) => {
      const entries = safeParseArray(row.cont_year_json).map((it) => ({
        year: extractYearFromPath(it.path) ?? extractYearFromPath(it.year) ?? null,
        gb: formatGbNumber(it.size_kb),
      })).filter((it) => it.year !== null);
      entries.sort((a, b) => (a.year || 0) - (b.year || 0));
      return { row, entries };
    });

    const allYears = new Set<number>();
    envData.forEach(({ entries }) => entries.forEach((e) => allYears.add(e.year as number)));
    const orderedYears = Array.from(allYears.values()).sort((a, b) => a - b);

    return orderedYears.map((year) => {
      const cells = envData.map(({ entries }) => entries.find((e) => e.year === year) || { gb: null });
      return { year, cells };
    });
  }, [contentStoreLatest]);

  const auditTimestamps = useMemo(() => {
    const stamps: number[] = [];
    const candidates = [header?.pm_check_date, header?.pm_created_at];
    parsedServers.forEach((srv) => candidates.push(srv.create_at));
    (details?.pmRounds ?? []).forEach((round) => candidates.push(round.created_at));
    candidates.forEach((value) => {
      if (!value) return;
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        stamps.push(date.getTime());
      }
    });
    return stamps;
  }, [header, parsedServers, details?.pmRounds]);

  const latestTimestamp = auditTimestamps.length > 0 ? Math.max(...auditTimestamps) : null;
  const operationDateText = latestTimestamp ? formatDateTime(latestTimestamp) : '-';

  

  const handleNavigateBack = () => navigate(-1);

  const handleOpenImport = () => {
    if (!header) return;
    const query = new URLSearchParams();
    if (header.cust_id) query.set('custId', String(header.cust_id));
    if (header.cust_name) query.set('cust_name', header.cust_name);
    if (header.cust_code) query.set('cust_code', header.cust_code);
    if (header.pm_id) query.set('pm_id', String(header.pm_id));
    if (header.pm_name) query.set('pm_name', header.pm_name);
    if (header.pm_year) query.set('pm_year', header.pm_year);
    if (header.pm_round) query.set('pm_round', String(header.pm_round));
    navigate(`/pm/import?${query.toString()}`);
  };

  const statusBadge = (text: string) => (
    <span className={`pm-status ${text === 'Completed' || text === 'Success' || text === 'Passed' ? 'pm-status--success' : 'pm-status--pending'}`}>
      {text}
    </span>
  );

  if (!pmId) {
    return <div className="container pm-details"><div className="pm-details__error-card">ไม่พบรหัส PM</div></div>;
  }

  return (
    <div className="container pm-details">
      <div className="page-header">
        <h1 className="page-title">Preventive Maintenance: PM</h1>
        <p className="page-subtitle">สรุปรายงานการบำรุงรักษาเชิงป้องกัน (Preventive Maintenance)</p>
      </div>

      <div className="pm-details__actions">
        <button className="btn btn-secondary" onClick={handleNavigateBack}>← Back</button>
        <button className="btn btn-primary" onClick={handleOpenImport} disabled={!header}>
          ไปยังหน้า Import PM
        </button>
      </div>

      {loading ? (
        <div className="pm-details__error-card">กำลังโหลดข้อมูล...</div>
      ) : error ? (
        <div className="pm-details__error-card">{error}</div>
      ) : !details ? (
        <div className="pm-details__error-card">ไม่พบข้อมูล PM ที่ร้องขอ</div>
      ) : (
        <>
          <section className="pm-report-section">
            <h2>1. PM Details</h2>
            <div className="pm-details__status-row">
              <div>
                <span className="pm-details__metric-label">สถานะ</span>
                {statusBadge(header?.pm_status ? 'Completed' : 'Pending')}
              </div>
              <div>
                <span className="pm-details__metric-label">ตรวจสอบล่าสุด</span>
                <strong>{operationDateText}</strong>
              </div>
            </div>
            <div className="pm-summary-grid">
              {pmSummaryRows.map((row) => (
                <div key={row.label} className="pm-summary-item">
                  <span className="pm-summary-label">{row.label}</span>
                  <strong className="pm-summary-value">{row.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="pm-report-section">
            <h2>2. Maintenance Overview</h2>

            {diagramLoading ? (
              <div className="pm-diagram-placeholder">กำลังโหลดภาพ Diagram...</div>
            ) : diagramError ? (
              <div className="pm-diagram-placeholder pm-diagram-placeholder--error">{diagramError}</div>
            ) : diagramPreviewUrl ? (
              <div className="pm-diagram-card">
                <img src={diagramPreviewUrl} alt="Diagram project" className="pm-diagram-image" />
                <div className="pm-diagram-meta">
                  <p>อัปเดตล่าสุด: {diagramMeta?.created_date || '-'}</p>
                  {diagramMeta?.file_name && <p>ไฟล์: {diagramMeta.file_name}</p>}
                  {diagramMeta?.url && (
                    <a href={diagramMeta.url} target="_blank" rel="noreferrer" className="pm-diagram-link">
                      เปิดไฟล์ต้นฉบับ
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="pm-diagram-placeholder">ยังไม่มีภาพ Diagram สำหรับลูกค้ารายนี้</div>
            )}

            <div className="pm-overview-summary">
              <h3>2.1 Server Configuration Summary</h3>
              <p className="pm-overview-intro">
                {serverCount > 0
                  ? `พบ Server ทั้งหมด ${serverCount} ตัว จัดกลุ่มตาม Environment ${serversByEnv.length} กลุ่ม`
                  : 'ยังไม่มีการบันทึกข้อมูล Server ในรอบนี้'}
              </p>
            </div>

            {serversByEnv.length > 0 && (
              <div className="pm-env-groups">
                {serversByEnv.map((envGroup) => (
                  <div key={envGroup.envName} className="pm-env-group">
                    <div className="pm-env-header">
                      <h4 className="pm-env-title">
                        {envGroup.envName}
                        <span className="pm-env-count">({envGroup.serverCount} server{envGroup.serverCount > 1 ? 's' : ''})</span>
                      </h4>
                    </div>
                    <div className="pm-server-cards">
                      {envGroup.servers.map((server) => (
                        <div key={server.serv_id} className="pm-server-card">
                          <div className="pm-server-card-header">
                            <h5 className="pm-server-name">{server.hostname}</h5>
                          </div>
                          <div className="pm-server-specs">
                            <div className="pm-spec-item">
                              <span className="pm-spec-label-sm">OS</span>
                              <span className="pm-spec-value-sm">
                                {server.serv_os ? `${server.serv_os} ${server.serv_os_version || ''}`.trim() : '-'}
                              </span>
                            </div>
                            <div className="pm-spec-item">
                              <span className="pm-spec-label-sm">CPU</span>
                              <span className="pm-spec-value-sm">{server.cpuLabel}</span>
                            </div>
                            <div className="pm-spec-item">
                              <span className="pm-spec-label-sm">RAM</span>
                              <span className="pm-spec-value-sm">{server.ramLabel}</span>
                            </div>
                          </div>
                          <div className="pm-server-storage">
                            <div className="pm-storage-item">
                              <span className="pm-storage-label">📁 Path App</span>
                              <span className="pm-storage-value">
                                {renderPathValue(server.pathAppUsage, server.path_app || undefined)}
                              </span>
                            </div>
                            <div className="pm-storage-item">
                              <span className="pm-storage-label">💾 Path Data</span>
                              <span className="pm-storage-value">
                                {renderPathValue(server.pathDataUsage, server.path_data || undefined)}
                              </span>
                            </div>
                            <div className="pm-storage-item">
                              <span className="pm-storage-label">🔧 Application</span>
                              <span className="pm-storage-value">
                                {server.applications && server.applications.length > 0
                                  ? server.applications.join(', ')
                                  : '-'}
                              </span>
                            </div>
                          </div>
                          <div className="pm-server-footer">
                            <span className="pm-server-date">อัปเดต: {formatDateOnly(server.create_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pm-overview-recommendations">
              <h3>2.2 Data Growth & Capacity Analysis</h3>
              <p className="pm-recommendation-text">
                แนวโน้มการเติบโตของข้อมูลควรติดตามอย่างต่อเนื่อง ควรเผื่อพื้นที่สำรองไม่น้อยกว่า 20% เพื่อรองรับการเติบโตระยะสั้น
              </p>

              <h3>2.3 System Health & Error Report</h3>
              <p className="pm-recommendation-text">
                แนะนำตรวจสอบ service สำคัญและ log ที่เกี่ยวข้อง หากพบ error ควรบันทึกและแจ้งทีมที่เกี่ยวข้องเพื่อแก้ไขทันที
              </p>

              <h3>2.4 Recommendations & Remarks</h3>
              <ul className="pm-recommendation-list">
                <li>วางแผนขยายพื้นที่จัดเก็บข้อมูล หากอัตราเติบโตสูงกว่าค่าปกติ</li>
                <li>ตรวจสุขภาพ service หลักและปรับ tuning หากพบ memory/CPU ใช้งานสูง</li>
                <li>ทบทวน log error สำคัญและจัดทำรายการแก้ไขเร่งด่วน</li>
              </ul>
            </div>
          </section>

          <section className="pm-report-section">
            <h2>3 Server details</h2>
            <h3>3.1 Server Spec</h3>
            {parsedServers.length === 0 ? (
              <div className="pm-diagram-placeholder">ยังไม่มีข้อมูล Server ในรอบนี้</div>
            ) : (
              <div className="pm-spec-table-wrapper">
                <table className="pm-spec-table">
                  <thead>
                    <tr>
                      <th></th>
                      {parsedServers.map((srv) => (
                        <th key={`spec-${srv.serv_id}`}>{srv.hostname}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {serverSpecRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.labelNode ?? row.label}</td>
                        {row.values.map((value, idx) => (
                          <td key={`${row.id}-${idx}`}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </section>

          <section className="pm-report-section">
            <h2>4.Beflex workspace details</h2>

            <div className="pm-overview-summary">
              <h3>4.1 beflex DMS (Content app, workspace)</h3>
              {contentStoreLatest.length === 0 ? (
                <p className="pm-overview-intro">ยังไม่มีข้อมูล Content store / Version สำหรับรอบนี้</p>
              ) : (
                <div className="pm-app-table-wrapper">
                  <table className="pm-app-table">
                    <thead>
                      <tr>
                        <th>TILE.ENV</th>
                        {contentStoreLatest.map((env) => (
                          <th key={`env-col-${env.env_id || env.env_name}`}>{env.env_name || (env.env_id ? `ENV ${env.env_id}` : 'N/A')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Version</td>
                        {contentStoreLatest.map((env) => (
                          <td key={`ver-${env.env_id}`}>{extractVersionText(env.alf_version_json)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>Content store sizing (GB)</td>
                        {contentStoreLatest.map((env) => (
                          <td key={`size-${env.env_id}`}>{formatGbLabel(env.cont_all_kb)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td>Data date (yyyy-MM-dd)</td>
                        {contentStoreLatest.map((env) => (
                          <td key={`date-${env.env_id}`}>{formatDateIso(env.created_at)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pm-overview-summary pm-app-section">
              <h3>4.2 beflex DMS ContentStore Sizing (Month)</h3>
              {contentStoreLatest.length === 0 ? (
                <p className="pm-overview-intro">ยังไม่มีข้อมูล Content store รายเดือน</p>
              ) : contentStoreMonthlyRows.length === 0 ? (
                <p className="pm-overview-intro">ยังไม่พบ cont_month_json สำหรับ env นี้</p>
              ) : (
                (() => {
                  const prevGb = new Map<number, number | null>();
                  return (
                    <div className="pm-app-table-wrapper">
                      <table className="pm-app-table pm-app-table--wide">
                        <thead>
                          <tr>
                            <th>เดือน</th>
                            {contentStoreLatest.map((env) => (
                              <React.Fragment key={`mh-${env.env_id}`}>
                                <th>{env.env_name || (env.env_id ? `ENV ${env.env_id}` : 'N/A')} CONTENTSTORE (GB)</th>
                                <th>การเติบโต (%)</th>
                              </React.Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {contentStoreMonthlyRows.map((row) => (
                            <tr key={row.monthKey}>
                              <td>{formatMonthLabel(row.monthKey)}</td>
                              {row.cells.map((cell, idx) => {
                                const currentGb = cell.gb ?? null;
                                const growth = formatGrowthPercent(prevGb.get(idx) ?? null, currentGb);
                                prevGb.set(idx, currentGb);
                                return (
                                  <React.Fragment key={`${row.monthKey}-${idx}`}>
                                    <td>{currentGb === null ? '-' : `${currentGb.toFixed(2)} GB`}</td>
                                    <td>{growth}</td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="pm-overview-summary pm-app-section">
              <h3>4.3 beflex DMS ContentStore Sizing (Year)</h3>
              {contentStoreLatest.length === 0 ? (
                <p className="pm-overview-intro">ยังไม่มีข้อมูล Content store รายปี</p>
              ) : contentStoreYearlyRows.length === 0 ? (
                <p className="pm-overview-intro">ยังไม่พบ cont_year_json สำหรับ env นี้</p>
              ) : (
                (() => {
                  const prevGb = new Map<number, number | null>();
                  return (
                    <div className="pm-app-table-wrapper">
                      <table className="pm-app-table pm-app-table--wide">
                        <thead>
                          <tr>
                            <th>ปี</th>
                            {contentStoreLatest.map((env) => (
                              <React.Fragment key={`yh-${env.env_id}`}>
                                <th>{env.env_name || (env.env_id ? `ENV ${env.env_id}` : 'N/A')} CONTENTSTORE (GB)</th>
                                <th>การเติบโต (%)</th>
                              </React.Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {contentStoreYearlyRows.map((row) => (
                            <tr key={row.year}>
                              <td>{row.year}</td>
                              {row.cells.map((cell, idx) => {
                                const currentGb = cell.gb ?? null;
                                const growth = formatGrowthPercent(prevGb.get(idx) ?? null, currentGb);
                                prevGb.set(idx, currentGb);
                                return (
                                  <React.Fragment key={`${row.year}-${idx}`}>
                                    <td>{currentGb === null ? '-' : `${currentGb.toFixed(2)} GB`}</td>
                                    <td>{growth}</td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default PMDetails;
