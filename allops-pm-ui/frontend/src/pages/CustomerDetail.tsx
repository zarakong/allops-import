import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCustomerById, fetchCustomerServers, fetchCustomerEnvs, fetchCustomerWorkspaceDetails, fetchCustomerWorkspaceContentStore, fetchCustomerDiagram, uploadCustomerDiagram, fetchCustomerDiagramImage, updateServerPaths, fetchAllAppList, fetchServerApplications, addServerApplication, removeServerApplication, type AppListItem } from '../api/customers';
import { fetchPMPlansByCustomer } from '../api/pm';
import Modal from '../components/Modal';
import { extractVersionEntries, formatDateIso, formatGbLabel, KB_PER_GB } from '../utils/contentStoreFormatters';
import './CustomerDetail.css';

type DiagramRecord = {
  link_id: number;
  url: string;
  created_date: string;
  file_name?: string;
  source?: string;
  mode?: 'TEST' | 'PRD';
};

const DIAGRAM_MAX_FILE_MB = Number(process.env.REACT_APP_DIAGRAM_MAX_FILE_MB || 5);
const FILE_SIZE_LIMIT_BYTES = DIAGRAM_MAX_FILE_MB * 1024 * 1024;
const PNG_MIME = 'image/png';

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

type ContentStoreRow = {
  env_id: number;
  env_name?: string | null;
  cont_all_kb?: number | null;
  alf_version_json?: unknown;
  created_at?: string | null;
  pm_id?: number | null;
  pm_year?: number | null;
  pm_round?: number | null;
};

const parseDiskEntries = (raw: unknown): DiskEntry[] => {
  const extractFromObject = (value: unknown): DiskEntry[] => {
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

  const tryParseString = (text: string): DiskEntry[] => {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // Try parsing as direct array first (new format: [{"mount":"/", ...}, ...])
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed as DiskEntry[];
        }
      } catch (error) {
        // Continue to other attempts
      }
    }

    const attempts: string[] = [trimmed];

    // Some rows store only the body of the JSON without opening braces.
    if (trimmed.startsWith('"disk"')) {
      attempts.push(`{${trimmed}}`);
    }

    if (trimmed.startsWith('[')) {
      attempts.push(`{"disk":${trimmed}}`);
    }

    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      attempts.push(`{${trimmed}`);
    }

    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
      attempts.push(`${trimmed}}`);
    }

    for (const candidate of attempts) {
      try {
        const parsedCandidate = JSON.parse(candidate);
        const extracted = extractFromObject(parsedCandidate);
        if (extracted.length > 0) {
          return extracted;
        }
      } catch (error) {
        // keep trying
      }
    }

    const diskMatch = trimmed.match(/"disk"\s*:\s*(\[[\s\S]*\])/i);
    if (diskMatch) {
      try {
        const arr = JSON.parse(diskMatch[1]);
        if (Array.isArray(arr)) {
          return arr as DiskEntry[];
        }
      } catch (error) {
        // ignore
      }
    }

    return [];
  };

  if (typeof raw === 'string') {
    const extracted = tryParseString(raw);
    if (extracted.length > 0) {
      return extracted;
    }
    return [];
  }

  return extractFromObject(raw);
};

const normalizePathValue = (value: string) => {
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

const renderPathLabel = (text: string) => (
  <div className="server-path-label">
    <span>{text}</span>
    <span className="server-path-hint">*Used / free space (GB)</span>
  </div>
);

const renderPathValue = (summary: PathUsageSummary | null) => {
  if (!summary) return '-';
  return summary.displayText;
};

const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const custId = id ? Number(id) : null;
  const [customer, setCustomer] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [customerEnvs, setCustomerEnvs] = useState<any[]>([]);
  const [workspaceDetails, setWorkspaceDetails] = useState<any[]>([]);
  const [contentStoreSummary, setContentStoreSummary] = useState<ContentStoreRow[]>([]);
  const [diagram, setDiagram] = useState<DiagramRecord | null>(null);
  const [diagramUploading, setDiagramUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [diagramImageError, setDiagramImageError] = useState<string | null>(null);
  const [diagramPreviewUrl, setDiagramPreviewUrl] = useState<string | null>(null);
  const [diagramPreviewLoading, setDiagramPreviewLoading] = useState<boolean>(false);
  const [diagramFetchNonce, setDiagramFetchNonce] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingServer, setEditingServer] = useState<any | null>(null);
  const [pathAppInput, setPathAppInput] = useState<string>('');
  const [pathDataInput, setPathDataInput] = useState<string>('');
  const [serverSaveLoading, setServerSaveLoading] = useState<boolean>(false);
  const [serverSaveError, setServerSaveError] = useState<string | null>(null);
  const [allAppList, setAllAppList] = useState<AppListItem[]>([]);
  const [serverApps, setServerApps] = useState<AppListItem[]>([]);
  const [appInputValue, setAppInputValue] = useState<string>('');
  const [appLoading, setAppLoading] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);
  const navigate = useNavigate();
  const diagramInputRef = useRef<HTMLInputElement | null>(null);
  const hasDiagramLink = Boolean(diagram?.url && diagram.url.trim());
  const hasActiveDiagramImage = Boolean(diagramPreviewUrl);

  useEffect(() => {
    setDiagramImageError(null);
    setDiagramPreviewUrl(null);
    setDiagramPreviewLoading(false);
  }, [diagram?.url]);

  useEffect(() => {
    if (!custId || !hasDiagramLink) {
      setDiagramPreviewUrl(null);
      setDiagramPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let objectUrl: string | null = null;

    const loadPreview = async () => {
      setDiagramPreviewLoading(true);
      setDiagramImageError(null);
      setDiagramPreviewUrl(null);

      try {
        const blob = await fetchCustomerDiagramImage(custId, {
          signal: controller.signal,
          cacheBust: diagramFetchNonce,
        });
        if (cancelled || controller.signal.aborted) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setDiagramPreviewUrl(objectUrl);
      } catch (error) {
        if (cancelled || controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setDiagramPreviewUrl(null);
        setDiagramImageError(extractErrorMessage(error));
      } finally {
        if (!cancelled) {
          setDiagramPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [custId, hasDiagramLink, diagram?.url, diagramFetchNonce]);

  useEffect(() => {
    const load = async () => {
      if (!custId) {
        setLoading(false);
        return;
      }
      try {
        const [cust, pm, sv, envs, workspace, diagramData, contentStoreRows] = await Promise.all([
          fetchCustomerById(custId),
          fetchPMPlansByCustomer(custId),
          fetchCustomerServers(custId),
          fetchCustomerEnvs(custId),
          fetchCustomerWorkspaceDetails(custId),
          fetchCustomerDiagram(custId),
          fetchCustomerWorkspaceContentStore(custId),
        ]);
        setCustomer(cust);
        setPlans(pm || []);
        setServers(sv || []);
        setCustomerEnvs(envs || []);
        setWorkspaceDetails(workspace || []);
        setContentStoreSummary(contentStoreRows || []);
        setDiagram(diagramData ? (diagramData as DiagramRecord) : null);
        setDiagramImageError(null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [custId]);

  // Helper: format kilobytes into human readable string
  const formatKb = (kb: number | null | undefined) => {
    if (kb === null || kb === undefined || isNaN(Number(kb))) return '0';
    const k = Number(kb);
    const mb = k / 1024;
    const gb = mb / 1024;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${k.toFixed(0)} KB`;
  };

  const renderWorkspaceValue = (text: string | null | undefined): React.ReactNode => {
    if (!text || text.trim() === '') {
      return '?????';
    }
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return '?????';
    }
    return (
      <span className="workspace-version">
        {lines.map((line, idx) => (
          <React.Fragment key={`${line}-${idx}`}>
            {line}
            {idx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  };

  const serverData = useMemo(() => {
    const globalPathApp = typeof customer?.path_app === 'string' ? customer.path_app : '';
    const globalPathData = typeof customer?.path_data === 'string' ? customer.path_data : '';
    const serverEnvEntries = Array.isArray(customerEnvs) ? customerEnvs : [];
    const validServerIds = new Set<number>();
    serverEnvEntries.forEach((entry: any) => {
      const sid = Number(entry.server_id);
      if (sid > 0) validServerIds.add(sid);
    });

    const placeholderServers = serverEnvEntries
      .filter((entry: any) => Number(entry.server_id) > 0)
      .map((entry: any, idx: number) => ({
        serv_id: Number(entry.server_id) || `placeholder-${idx}`,
        server_name: entry.server_name,
        env_name: entry.env_name,
        env_id: entry.env_id,
        pm_id: entry.pm_id,
        create_at: null,
        serv_os: '-',
        serv_os_version: '-',
        serv_cpu_model_name: '-',
        serv_cpu_cores: '-',
        serv_ram: null,
      }));

    const referenceServers = servers.length > 0 ? servers : placeholderServers;

    const missingEnvCount = serverEnvEntries
      ? serverEnvEntries.filter((e: any) =>
          Number(e.server_id) > 0 &&
          !referenceServers.some(
            (s: any) =>
              Number(s.env_id) === Number(e.env_id) &&
              Number(s.server_id ?? s.serv_id) === Number(e.server_id)
          )
        ).length
      : 0;

    const parsedServers = referenceServers.map((s: any, idx: number) => {
      const diskEntries = parseDiskEntries(s.serv_disk);
      const pathAppRaw = typeof s.path_app === 'string' ? s.path_app : '';
      const pathDataRaw = typeof s.path_data === 'string' ? s.path_data : '';
      const effectivePathApp = pathAppRaw || globalPathApp;
      const effectivePathData = pathDataRaw || globalPathData;
      const pathAppUsage = buildPathUsageSummary(effectivePathApp, diskEntries);
      const pathDataUsage = buildPathUsageSummary(effectivePathData, diskEntries);
      
      // Parse applications array
      const applications = Array.isArray(s.applications) 
        ? s.applications 
        : (typeof s.applications === 'string' 
            ? (s.applications.trim() ? JSON.parse(s.applications) : [])
            : []);
      
      return {
        serv_id: s.serv_id ?? s.server_id ?? `placeholder-${idx}`,
        server_id: s.server_id, // Keep original server_id for API calls
        env_id: s.env_id,
        hostname: s.server_name?.trim() || s.serv_name || `server-${s.serv_id ?? s.server_id ?? idx + 1}`,
        env_name: s.env_name || s.env_id || '-',
        pm_id: s.pm_id,
        create_at: s.create_at,
        osName: s.serv_os || '-',
        osVersion: s.serv_os_version || '-',
        cpuModel: s.serv_cpu_model_name || '-',
        cpuCores: s.serv_cpu_cores || '-',
        ramDisplay: (s.serv_ram || s.serv_ram === 0) ? formatKb(Number(s.serv_ram)) : '-',
        pathAppUsage,
        pathDataUsage,
        pathAppRaw,
        pathDataRaw,
        applications,
      };
    });

    const completeCount = parsedServers.filter(
      (p: any) =>
        p.hostname &&
        p.hostname !== '' &&
        p.osName !== '-' &&
        p.cpuModel !== '-' &&
        p.cpuCores !== '-' &&
        p.ramDisplay !== '-'
    ).length;

    const totalServers = validServerIds.size > 0 ? validServerIds.size : referenceServers.length;
    const serverTone = totalServers === 0 || missingEnvCount > 0 ? 'warn' : 'ok';

    return {
      referenceServers,
      parsedServers,
      totalServers,
      completeCount,
      serverTone,
      missingEnvCount,
    };
  }, [customerEnvs, servers, customer?.path_app, customer?.path_data]);

  const { parsedServers, totalServers, completeCount, serverTone } = serverData;

  const serverSpecRows = [
    {
      id: 'server-name',
      title: 'Server name',
      values: parsedServers.map((p: any) => p.hostname || '-'),
    },
    {
      id: 'env',
      title: 'Env',
      values: parsedServers.map((p: any) => p.env_name || '-'),
    },
    {
      id: 'os',
      title: 'OS',
      values: parsedServers.map((p: any) => p.osName || '-'),
    },
    {
      id: 'os-version',
      title: 'OS version',
      values: parsedServers.map((p: any) => p.osVersion || '-'),
    },
    {
      id: 'cpu-model',
      title: 'CPU model name',
      values: parsedServers.map((p: any) => p.cpuModel || '-'),
    },
    {
      id: 'cpu-cores',
      title: 'CPU Cores',
      values: parsedServers.map((p: any) => p.cpuCores || '-'),
    },
    {
      id: 'ram',
      title: 'RAM',
      values: parsedServers.map((p: any) => p.ramDisplay || '-'),
    },
    {
      id: 'path-app',
      title: 'Path app (GB)',
      labelNode: renderPathLabel('Path app (GB)'),
      values: parsedServers.map((p: any) => renderPathValue(p.pathAppUsage)),
    },
    {
      id: 'path-data',
      title: 'Path data (GB)',
      labelNode: renderPathLabel('Path data (GB)'),
      values: parsedServers.map((p: any) => renderPathValue(p.pathDataUsage)),
    },
    {
      id: 'application',
      title: 'Application',
      values: parsedServers.map((p: any) => {
        const apps = p.applications || [];
        if (apps.length === 0) return '-';
        return apps.map((app: string, idx: number) => (
          <React.Fragment key={`${app}-${idx}`}>
            {app}
            {idx < apps.length - 1 && <br />}
          </React.Fragment>
        ));
      }),
    },
    {
      id: 'date-data',
      title: 'Date data',
      values: parsedServers.map((p: any) => (p.create_at ? new Date(p.create_at).toLocaleDateString('th-TH') : '-')),
    },
    {
      id: 'action',
      title: 'Action',
      values: parsedServers.map((p: any) => {
        const editable = servers.length > 0 && Number.isFinite(Number(p?.serv_id));
        return (
          <button
            type="button"
            className="server-edit-icon"
            onClick={() => openServerEdit(p)}
            disabled={!editable}
            aria-label="แก้ไขข้อมูล Path"
            title={editable ? 'แก้ไขข้อมูล Server' : 'ไม่มีข้อมูลให้แก้ไข'}
          >
            ✎
          </button>
        );
      }),
    },
  ];

  const envList = useMemo(() => {
    const envMap: Array<{ env_id: number; env_name: string }> = [];
    const envSeen = new Set<number>();
    const pushEnv = (env_id: number, env_name: string) => {
      if (!envSeen.has(env_id)) {
        envSeen.add(env_id);
        envMap.push({ env_id, env_name });
      }
    };

    (customerEnvs || []).forEach((entry: any) => {
      const envId = Number(entry.env_id);
      const envName = entry.env_name || '-';
      if (envId) pushEnv(envId, envName);
    });

    (workspaceDetails || []).forEach((entry: any) => {
      const envId = Number(entry.env_id);
      const envName = entry.env_name || '-';
      if (envId) pushEnv(envId, envName);
    });

    (contentStoreSummary || []).forEach((entry: ContentStoreRow) => {
      const envId = Number(entry.env_id);
      const envName = entry.env_name || (envId ? `ENV ${envId}` : '-');
      if (envId) pushEnv(envId, envName);
    });

    return envMap;
  }, [customerEnvs, workspaceDetails, contentStoreSummary]);

  const envColumns = envList.length > 0 ? envList : [{ env_id: -1, env_name: 'ENV' }];

  const workspaceByEnv = useMemo(() => {
    const map = new Map<number, any>();
    (workspaceDetails || []).forEach((entry: any) => {
      const envId = Number(entry.env_id);
      if (envId) {
        map.set(envId, entry);
      }
    });
    return map;
  }, [workspaceDetails]);

  const contentStoreByEnv = useMemo(() => {
    const map = new Map<number, ContentStoreRow>();
    (contentStoreSummary || []).forEach((entry: ContentStoreRow) => {
      const envId = Number(entry.env_id);
      if (envId) {
        map.set(envId, entry);
      }
    });
    return map;
  }, [contentStoreSummary]);

  const renderVersionBlock = useCallback(
    (envId: number) => {
      const entries = extractVersionEntries(contentStoreByEnv.get(envId)?.alf_version_json);
      if (!entries.length) {
        return '-';
      }
      return (
        <ul className="workspace-version-list">
          {entries.map((entry, idx) => (
            <li key={`${envId}-${entry.label || idx}`} className="workspace-version-item">
              {entry.label ? (
                <>
                  <span className="workspace-version-key">{entry.label}</span>
                  <span className="workspace-version-sep">=</span>
                  <span className="workspace-version-value">{entry.value}</span>
                </>
              ) : (
                <span className="workspace-version-value">{entry.value}</span>
              )}
            </li>
          ))}
        </ul>
      );
    },
    [contentStoreByEnv]
  );

  const supportLabel = customer?.status ? 'Support' : 'END Support';
  const createdAtText = customer?.created_at ? new Date(customer.created_at).toLocaleString('th-TH') : '-';

  const latestPmDateText = useMemo(() => {
    if (!Array.isArray(plans) || plans.length === 0) return '-';
    const latestTimestamp = plans.reduce((latest: number | null, plan: any) => {
      if (!plan.pm_created_at) return latest;
      const ts = new Date(plan.pm_created_at).getTime();
      if (Number.isNaN(ts)) return latest;
      if (latest === null || ts > latest) return ts;
      return latest;
    }, null);
    if (!latestTimestamp) return '-';
    return new Date(latestTimestamp).toLocaleString('th-TH');
  }, [plans]);

  const customerMeta = [
    { label: 'Customer name', value: customer?.cust_name || '-' },
    { label: 'Customer code', value: customer?.cust_code || '-' },
    { label: 'Environment', value: customer?.env_name || envColumns.map(env => env.env_name).join(', ') || '-' },
    { label: 'วันที่สร้าง', value: createdAtText },
    { label: 'Latest PM created', value: latestPmDateText },
    { label: 'จำนวน PM Plans', value: plans.length },
  ];

  const workspaceRows = useMemo(() => {
    if (contentStoreSummary.length > 0) {
      return [
        {
          label: 'Version',
          values: envColumns.map(env => renderVersionBlock(env.env_id)),
        },
        {
          label: 'Content store sizing (GB)',
          values: envColumns.map(env => formatGbLabel(contentStoreByEnv.get(env.env_id)?.cont_all_kb)),
        },
        {
          label: 'Data date (yyyy-MM-dd)',
          values: envColumns.map(env => formatDateIso(contentStoreByEnv.get(env.env_id)?.created_at ?? null)),
        },
      ];
    }

    return [
      {
        label: 'beflex version',
        values: envColumns.map(env => renderWorkspaceValue(workspaceByEnv.get(env.env_id)?.workspace_text)),
      },
      {
        label: 'Date data',
        values: envColumns.map(env => workspaceByEnv.get(env.env_id)?.workspace_date || '?????'),
      },
    ];
  }, [contentStoreSummary, envColumns, contentStoreByEnv, workspaceByEnv]);

  const isAbortError = (error: unknown) => {
    if (!error) return false;
    const err = error as { code?: string; name?: string };
    if (err?.code === 'ERR_CANCELED') return true;
    if (err?.name === 'CanceledError' || err?.name === 'AbortError') return true;
    return error instanceof DOMException && error.name === 'AbortError';
  };

  const extractErrorMessage = (error: unknown) => {
    const err = error as { response?: { data?: any }; message?: string };
    const responseData = err?.response?.data;
    if (typeof responseData === 'string') {
      return responseData;
    }
    if (responseData?.detail) {
      return responseData.detail;
    }
    if (responseData?.error) {
      return responseData.error;
    }
    if (err?.message) {
      return err.message;
    }
    return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  };
  const validateDiagramFile = (file: File): string | null => {
    const lowerName = file.name.toLowerCase();
    const isPng = file.type === PNG_MIME || lowerName.endsWith('.png');
    if (!isPng) {
      return 'อนุญาตเฉพาะไฟล์ .png เท่านั้น';
    }
    if (file.size > FILE_SIZE_LIMIT_BYTES) {
      return `ไฟล์ต้องไม่เกิน ${DIAGRAM_MAX_FILE_MB} MB`;
    }
    return null;
  };

  const performDiagramUpload = async (file: File) => {
    if (!custId) {
      setUploadError('ไม่พบรหัสลูกค้า');
      return;
    }
    setUploadError(null);
    setUploadSuccessMessage(null);
    setDiagramUploading(true);
    try {
      await uploadCustomerDiagram(custId, { file });
      const latest = await fetchCustomerDiagram(custId);
      setDiagram(latest ? (latest as DiagramRecord) : null);
      setDiagramImageError(null);
      setUploadSuccessMessage('อัปโหลดสำเร็จ และอัปเดต Diagram แล้ว');
    } catch (error) {
      setUploadError(extractErrorMessage(error));
    } finally {
      setDiagramUploading(false);
    }
  };

  const handleUploadButtonClick = () => {
    if (!custId) {
      setUploadError('ไม่พบรหัสลูกค้า');
      return;
    }
    setUploadError(null);
    setUploadSuccessMessage(null);
    diagramInputRef.current?.click();
  };

  const handleDiagramFileInputChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateDiagramFile(file);
    if (validationError) {
      setUploadError(validationError);
      event.target.value = '';
      return;
    }
    await performDiagramUpload(file);
    event.target.value = '';
  };

  const handleRetryDiagramImage = () => {
    if (!hasDiagramLink) return;
    setDiagramImageError(null);
    setDiagramPreviewUrl(null);
    setDiagramPreviewLoading(false);
    setDiagramFetchNonce((prev) => prev + 1);
  };

  const openServerEdit = async (server: any) => {
    if (servers.length === 0) {
      return;
    }
    setEditingServer(server);
    setPathAppInput(server?.pathAppRaw || customer?.path_app || '');
    setPathDataInput(server?.pathDataRaw || customer?.path_data || '');
    setServerSaveError(null);
    setAppError(null);
    setAppInputValue('');
    
    // Load all app list and server apps
    // Use server_id (from server_env) not serv_id (from server table)
    const serverIdForApps = server?.server_id ?? server?.serv_id;
    try {
      const [allApps, currentApps] = await Promise.all([
        fetchAllAppList(),
        custId && serverIdForApps ? fetchServerApplications(custId, serverIdForApps) : Promise.resolve([])
      ]);
      setAllAppList(allApps);
      setServerApps(currentApps);
    } catch (error) {
      console.error('Error loading applications:', error);
      setAllAppList([]);
      setServerApps([]);
    }
  };

  const closeServerEdit = () => {
    setEditingServer(null);
    setPathAppInput('');
    setPathDataInput('');
    setServerSaveError(null);
    setAllAppList([]);
    setServerApps([]);
    setAppInputValue('');
    setAppError(null);
  };

  const handleSaveServerPaths = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!custId || !editingServer) {
      setServerSaveError('ไม่พบข้อมูลที่ต้องการแก้ไข');
      return;
    }
    setServerSaveLoading(true);
    setServerSaveError(null);
    const sanitizedApp = pathAppInput.trim();
    const sanitizedData = pathDataInput.trim();
    const serverId = Number(editingServer.serv_id);
    if (!Number.isFinite(serverId)) {
      setServerSaveError('ไม่พบรหัส Server');
      setServerSaveLoading(false);
      return;
    }
    try {
      await updateServerPaths(custId, serverId, {
        path_app: sanitizedApp || null,
        path_data: sanitizedData || null,
      });
      const refreshedServers = await fetchCustomerServers(custId);
      setServers(refreshedServers || []);
      closeServerEdit();
    } catch (error) {
      setServerSaveError(extractErrorMessage(error));
    } finally {
      setServerSaveLoading(false);
    }
  };

  const handleModalClose = () => {
    if (serverSaveLoading || appLoading) return;
    closeServerEdit();
  };

  const handleAddApplication = async () => {
    if (!custId || !editingServer || !appInputValue.trim()) {
      setAppError('กรุณาเลือกหรือกรอกชื่อ Application');
      return;
    }
    
    setAppLoading(true);
    setAppError(null);
    
    const serverIdForApps = editingServer?.server_id ?? editingServer?.serv_id;
    
    try {
      const newApp = await addServerApplication(custId, serverIdForApps, appInputValue.trim());
      setServerApps([...serverApps, newApp]);
      setAppInputValue('');
      
      // Reload server data to update the table
      const refreshedServers = await fetchCustomerServers(custId);
      setServers(refreshedServers || []);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || 'ไม่สามารถเพิ่ม Application ได้';
      setAppError(errorMsg);
    } finally {
      setAppLoading(false);
    }
  };

  const handleRemoveApplication = async (appId: number) => {
    if (!custId || !editingServer) return;
    
    setAppLoading(true);
    setAppError(null);
    
    const serverIdForApps = editingServer?.server_id ?? editingServer?.serv_id;
    
    try {
      await removeServerApplication(custId, serverIdForApps, appId);
      setServerApps(serverApps.filter(app => app.applist_id !== appId));
      
      // Reload server data to update the table
      const refreshedServers = await fetchCustomerServers(custId);
      setServers(refreshedServers || []);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.message || 'ไม่สามารถลบ Application ได้';
      setAppError(errorMsg);
    } finally {
      setAppLoading(false);
    }
  };

  const handleEditPm = (pmId: number) => {
    if (!pmId) return;
    navigate(`/pm/${pmId}`);
  };

  const handleImportPmJson = (plan: any) => {
    if (!plan) return;
    const query = new URLSearchParams();
    const targetCustId = plan.cust_id || customer?.cust_id || custId;
    if (targetCustId) query.set('custId', String(targetCustId));
    const resolvedCustName = plan.cust_name || customer?.cust_name;
    const resolvedCustCode = plan.cust_code || customer?.cust_code;
    if (resolvedCustName) query.set('cust_name', resolvedCustName);
    if (resolvedCustCode) query.set('cust_code', resolvedCustCode);
    if (plan.pm_id) query.set('pm_id', String(plan.pm_id));
    if (plan.pm_name) query.set('pm_name', plan.pm_name);
    if (plan.pm_year) query.set('pm_year', String(plan.pm_year));
    if (plan.pm_round) query.set('pm_round', String(plan.pm_round));
    const qs = query.toString();
    navigate(`/pm/import${qs ? `?${qs}` : ''}`);
  };

  return (
    <>
      <div className="container">
      <div className="page-header">
        <h1 className="page-title">Customer detail</h1>
        <p className="page-subtitle">รายละเอียดของลูกค้า</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/customer')}>
          ← ย้อนกลับ
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <div className="project-section">
                <h2 className="project-section-title">Project details</h2>

                <section className="project-card project-card--diagram">
                  <div className="project-card-header">
                    <div>
                      <h3 className="project-card-heading">Diagram project</h3>
                      <p className="project-card-subtitle">อัปเดตล่าสุด {diagram?.created_date || '-'}</p>
                      {diagram?.file_name && (
                        <p className="project-card-meta">ไฟล์: {diagram.file_name}</p>
                      )}
                    </div>
                    <div className="section-cta diagram-upload-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleUploadButtonClick}
                        disabled={diagramUploading}
                        style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                      >
                        {diagramUploading ? 'Uploading...' : 'Upload diagram'}
                      </button>
                      <input
                        ref={diagramInputRef}
                        type="file"
                        accept=".png,image/png"
                        style={{ display: 'none' }}
                        onChange={handleDiagramFileInputChange}
                      />
                    </div>
                  </div>
                  {(uploadError || uploadSuccessMessage) && (
                    <p
                      className={`diagram-upload-feedback ${uploadError ? 'diagram-upload-feedback--error' : 'diagram-upload-feedback--success'}`}
                    >
                      {uploadError || uploadSuccessMessage}
                    </p>
                  )}
                  {!hasDiagramLink ? (
                    <div className="empty-block">ยังไม่มีภาพ Diagram</div>
                  ) : (
                    <div className="diagram-wrapper">
                      {diagram?.created_date && (
                        <span className="diagram-timestamp-badge">อัปเดต {diagram.created_date}</span>
                      )}
                      {diagramPreviewLoading && (
                        <p className="diagram-upload-feedback" style={{ marginBottom: '0.5rem' }}>
                          กำลังดาวน์โหลดรูปไดอะแกรม...
                        </p>
                      )}
                      {hasActiveDiagramImage ? (
                        <img
                          src={diagramPreviewUrl || undefined}
                          alt="Diagram project"
                          className="diagram-image"
                        />
                      ) : (
                        !diagramPreviewLoading && (
                          <div className="empty-block" style={{ marginBottom: 0 }}>
                            ไม่สามารถแสดงภาพตัวอย่างได้
                          </div>
                        )
                      )}
                      {diagramImageError && (
                        <p className="diagram-upload-feedback diagram-upload-feedback--error" style={{ marginTop: '0.5rem' }}>
                          {diagramImageError}{' '}
                          {diagram?.url && (
                            <a href={diagram.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                              เปิดไฟล์จาก Google Drive
                            </a>
                          )}
                          {hasDiagramLink && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ marginLeft: '0.75rem' }}
                              onClick={handleRetryDiagramImage}
                            >
                              ลองโหลดอีกครั้ง
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </section>

                <section className="project-card project-card--customer">
                  <div className="project-card-header">
                    <div>
                      <h3 className="project-card-heading">Customer details</h3>
                      <p className="project-card-subtitle">ข้อมูลลูกค้าและ Environment</p>
                    </div>
                    <span className={`status-chip ${customer?.status ? 'status-chip--active' : 'status-chip--inactive'}`}>
                      {supportLabel}
                    </span>
                  </div>
                  {!customer && <div className="empty-block">ไม่พบข้อมูลลูกค้า</div>}
                  <div className="project-meta-grid">
                    {customerMeta.map((meta) => (
                      <div className="project-meta-item" key={meta.label}>
                        <p className="project-meta-label">{meta.label}</p>
                        <p className="project-meta-value">{meta.value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="customer-detail-grid">
                <section className="detail-card detail-card--servers">
                  <div className="section-header">
                    <div>
                      <p className="section-eyebrow">สรุป Server</p>
                      <h4 className="section-title section-title--hero">จำนวน Server ทั้งหมด ({totalServers}), ข้อมูลครบ ({completeCount})</h4>
                    </div>
                    <div className="section-cta">
                      <span className={`metric-chip metric-chip--${serverTone}`}>{totalServers} เซิร์ฟเวอร์</span>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }}
                        onClick={() => navigate(`/customer/${custId}/new-server`)}
                      >
                        New Server
                      </button>
                    </div>
                  </div>

                  {totalServers === 0 ? (
                    <div className="empty-block">ไม่มีข้อมูล Server</div>
                  ) : (
                    <div className="spec-wrapper">
                      <div className="table-scroll">
                        <table className="spec-table">
                          <thead>
                            <tr>
                              <th></th>
                              {parsedServers.map((p: any) => (
                                <th key={p.serv_id}>{p.hostname}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {serverSpecRows.map(row => (
                              <tr key={row.id}>
                                <td>{row.labelNode ?? row.title}</td>
                                {row.values.map((v: any, idx: number) => (
                                  <td key={`${row.id}-${idx}`}>{v}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>

                <section className="detail-card detail-card--workspace" id="alfresco_cust_details">
                  <div className="section-header">
                    <div>
                      <p className="section-eyebrow">beflex workspace (alfresco) details</p>
                      <h4 className="section-title">รายละเอียด version beflex workspace</h4>
                    </div>
                  </div>
                  {envList.length === 0 ? (
                    <div className="empty-block">ไม่มีข้อมูล Environment</div>
                  ) : (
                    <div className="table-scroll">
                      <table className="spec-table workspace-table">
                        <thead>
                          <tr>
                            <th>TITLE/ENV</th>
                            {envColumns.map((env) => (
                              <th key={`workspace-${env.env_id}`}>{env.env_name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {workspaceRows.map((row) => (
                            <tr key={row.label}>
                              <td>{row.label}</td>
                              {row.values.map((value, idx) => (
                                <td key={`${row.label}-${idx}`}>{value}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {contentStoreSummary.length > 0 && (
                        <p className="workspace-footnote">ข้อมูลอ้างอิงจาก PM ล่าสุดของแต่ละ Environment</p>
                      )}
                    </div>
                  )}
                </section>

                <section className="detail-card detail-card--pm">
                  <div className="section-header">
                    <div>
                      <p className="section-eyebrow">แผนการบำรุงรักษา</p>
                      <h4 className="section-title section-title--hero">รายการ PM Plans ({plans.length})</h4>
                    </div>
                  </div>
                  {plans.length === 0 ? (
                    <div className="empty-block">ไม่มีรายการ PM</div>
                  ) : (
                    <div className="table-scroll">
                      <table className="pm-table">
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>PM ID</th>
                            <th>ชื่อ</th>
                            <th>ปี</th>
                            <th>รอบ</th>
                            <th>วันที่ PM</th>
                            <th>สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plans.map(p => (
                            <tr key={p.pm_id}>
                              <td>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    title="Edit PM"
                                    onClick={() => handleEditPm(p.pm_id)}
                                  >
                                    ✎
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline"
                                    title="Import PM JSON"
                                    onClick={() => handleImportPmJson(p)}
                                  >
                                    ⤓
                                  </button>
                                </div>
                              </td>
                              <td>{p.pm_id}</td>
                              <td>{p.pm_name}</td>
                              <td>{p.pm_year}</td>
                              <td>{p.pm_round}</td>
                              <td>{p.pm_created_at ? new Date(p.pm_created_at).toLocaleString('th-TH') : '-'}</td>
                              <td>
                                <span className={`status-pill ${p.status ? 'status-pill--success' : 'status-pill--pending'}`}>
                                  {p.status ? 'Completed' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </div>
      </div>

      <Modal
        isOpen={Boolean(editingServer)}
        onClose={handleModalClose}
        title="แก้ไขรายละเอียด Server"
        size="sm"
      >
        {editingServer && (
          <form className="server-path-form" onSubmit={handleSaveServerPaths}>
            <p className="server-path-heading">
              แก้ไข Path Server : <strong>{editingServer.hostname || '-'}</strong>
            </p>
            <div className="server-path-field">
              <label className="server-path-label-inline">
                แก้ไข Path app ({editingServer?.pathAppRaw || customer?.path_app || '-'})
              </label>
              <input
                type="text"
                className="server-path-input"
                value={pathAppInput}
                onChange={(e) => setPathAppInput(e.target.value)}
                placeholder="/run"
                disabled={serverSaveLoading}
              />
            </div>
            <div className="server-path-field">
              <label className="server-path-label-inline">
                แก้ไข Path data ({editingServer?.pathDataRaw || customer?.path_data || '-'})
              </label>
              <input
                type="text"
                className="server-path-input"
                value={pathDataInput}
                onChange={(e) => setPathDataInput(e.target.value)}
                placeholder="/dev/shm"
                disabled={serverSaveLoading}
              />
            </div>

            <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

            <div className="server-path-field">
              <label className="server-path-label-inline">แก้ไขรายการ Application</label>
              
              {serverApps.length > 0 ? (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    รายการที่มีอยู่:
                  </div>
                  {serverApps.map((app) => (
                    <div
                      key={app.applist_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>{app.applist_name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveApplication(app.applist_id)}
                        disabled={appLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          padding: '0.25rem 0.5rem',
                        }}
                        title="ลบ Application"
                      >
                        −
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                  ยังไม่มี Application ที่เชื่อมโยง
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  list="app-suggestions"
                  className="server-path-input"
                  value={appInputValue}
                  onChange={(e) => setAppInputValue(e.target.value)}
                  placeholder="เลือกหรือพิมพ์ชื่อ Application"
                  disabled={appLoading}
                  style={{ flex: 1 }}
                />
                <datalist id="app-suggestions">
                  {allAppList.map((app) => (
                    <option key={app.applist_id} value={app.applist_name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={handleAddApplication}
                  disabled={appLoading || !appInputValue.trim()}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem' }}
                  title="เพิ่ม Application"
                >
                  +
                </button>
              </div>
              
              {appError && (
                <div className="server-path-error" style={{ marginTop: '0.5rem' }}>
                  {appError}
                </div>
              )}
            </div>

            {serverSaveError && <div className="server-path-error">{serverSaveError}</div>}
            
            <div className="server-path-actions" style={{ marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={serverSaveLoading || appLoading}>
                {serverSaveLoading ? 'saving...' : 'save'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleModalClose}
                disabled={serverSaveLoading || appLoading}
              >
                cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

    </>
  );
};

export default CustomerDetail;
