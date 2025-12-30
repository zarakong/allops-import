import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCustomerById, fetchCustomerServers, fetchCustomerEnvs, fetchCustomerWorkspaceDetails, fetchCustomerDiagram, uploadCustomerDiagram, fetchCustomerDiagramImage } from '../api/customers';
import { fetchPMPlansByCustomer } from '../api/pm';
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


const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const custId = id ? Number(id) : null;
  const [customer, setCustomer] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [customerEnvs, setCustomerEnvs] = useState<any[]>([]);
  const [workspaceDetails, setWorkspaceDetails] = useState<any[]>([]);
  const [diagram, setDiagram] = useState<DiagramRecord | null>(null);
  const [diagramUploading, setDiagramUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [diagramImageError, setDiagramImageError] = useState<string | null>(null);
  const [diagramPreviewUrl, setDiagramPreviewUrl] = useState<string | null>(null);
  const [diagramPreviewLoading, setDiagramPreviewLoading] = useState<boolean>(false);
  const [diagramFetchNonce, setDiagramFetchNonce] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
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
        const [cust, pm, sv, envs, workspace, diagramData] = await Promise.all([
          fetchCustomerById(custId),
          fetchPMPlansByCustomer(custId),
          fetchCustomerServers(custId),
          fetchCustomerEnvs(custId),
          fetchCustomerWorkspaceDetails(custId),
          fetchCustomerDiagram(custId),
        ]);
        setCustomer(cust);
        setPlans(pm || []);
        setServers(sv || []);
        setCustomerEnvs(envs || []);
        setWorkspaceDetails(workspace || []);
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

    const parsedServers = referenceServers.map((s: any, idx: number) => ({
      serv_id: s.serv_id ?? s.server_id ?? `placeholder-${idx}`,
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
    }));

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
  }, [customerEnvs, servers]);

  const { parsedServers, totalServers, completeCount, serverTone } = serverData;

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

    return envMap;
  }, [customerEnvs, workspaceDetails]);

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

  const workspaceRows = [
    {
      label: 'beflex version',
      values: envColumns.map(env => renderWorkspaceValue(workspaceByEnv.get(env.env_id)?.workspace_text))
    },
    {
      label: 'Date data',
      values: envColumns.map(env => workspaceByEnv.get(env.env_id)?.workspace_date || '?????')
    }
  ];

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
                            {[
                              { label: 'Server name', values: parsedServers.map((p: any) => p.hostname || '-') },
                              { label: 'Env', values: parsedServers.map((p: any) => p.env_name) },
                              { label: 'OS', values: parsedServers.map((p: any) => p.osName) },
                              { label: 'OS version', values: parsedServers.map((p: any) => p.osVersion) },
                              { label: 'CPU model name', values: parsedServers.map((p: any) => p.cpuModel) },
                              { label: 'CPU Cores', values: parsedServers.map((p: any) => p.cpuCores) },
                              { label: 'RAM', values: parsedServers.map((p: any) => p.ramDisplay) },
                              { label: 'Date data', values: parsedServers.map((p: any) => (p.create_at ? new Date(p.create_at).toLocaleDateString('th-TH') : '-')) }
                            ].map(row => (
                              <tr key={row.label}>
                                <td>{row.label}</td>
                                {row.values.map((v: any, idx: number) => (
                                  <td key={idx}>{v}</td>
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

    </>
  );
};

export default CustomerDetail;
