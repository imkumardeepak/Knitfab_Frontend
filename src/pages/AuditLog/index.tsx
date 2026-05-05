import React, { useState, useEffect, useCallback } from 'react';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { Pagination } from '@/components/ui/pagination';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  userId: number | null;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  entityId: number | null;
  entityName: string | null;
  oldValues: string | null;
  newValues: string | null;
  changeSummary: string | null;
  ipAddress: string | null;
  isSystemAction: boolean;
  timestamp: string;
}

interface PagedResult {
  items: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CREATE:  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  UPDATE:  { bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-700 dark:text-blue-400',       dot: 'bg-blue-500'   },
  DELETE:  { bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-700 dark:text-red-400',         dot: 'bg-red-500'    },
  CANCEL:  { bg: 'bg-orange-100 dark:bg-orange-900/30',   text: 'text-orange-700 dark:text-orange-400',   dot: 'bg-orange-500' },
  LOGIN:   { bg: 'bg-violet-100 dark:bg-violet-900/30',   text: 'text-violet-700 dark:text-violet-400',   dot: 'bg-violet-500' },
  LOGOUT:  { bg: 'bg-slate-100 dark:bg-slate-800',        text: 'text-slate-600 dark:text-slate-400',     dot: 'bg-slate-400'  },
  PRINT:   { bg: 'bg-amber-100 dark:bg-amber-900/30',     text: 'text-amber-700 dark:text-amber-400',     dot: 'bg-amber-500'  },
  SYNC:    { bg: 'bg-cyan-100 dark:bg-cyan-900/30',       text: 'text-cyan-700 dark:text-cyan-400',       dot: 'bg-cyan-500'   },
};

const getActionStyle = (action: string) =>
  ACTION_COLORS[action.toUpperCase()] ?? {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    dot: 'bg-gray-400',
  };

const MODULE_COLORS: Record<string, string> = {
  'SalesOrder':      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300',
  'DispatchPlanning':'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300',
  'Auth':            'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300',
  'ProductionAllotment': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300',
};
const getModuleStyle = (module: string) =>
  MODULE_COLORS[module] ?? 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300';

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonSafe(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function JsonDiff({ oldRaw, newRaw }: { oldRaw: string | null; newRaw: string | null }) {
  const oldObj = parseJsonSafe(oldRaw);
  const newObj = parseJsonSafe(newRaw);

  if (!oldObj && !newObj) return null;

  const keys = Array.from(new Set([
    ...Object.keys(oldObj ?? {}),
    ...Object.keys(newObj ?? {}),
  ]));

  return (
    <div className="overflow-auto rounded-lg border border-border text-xs font-mono">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">Field</th>
            {oldObj && <th className="px-3 py-2 font-medium text-red-600 dark:text-red-400">Before</th>}
            {newObj && <th className="px-3 py-2 font-medium text-emerald-600 dark:text-emerald-400">After</th>}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const oldVal = oldObj?.[key];
            const newVal = newObj?.[key];
            const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
            return (
              <tr
                key={key}
                className={`border-b border-border/50 ${changed ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
              >
                <td className="px-3 py-1.5 font-medium text-foreground/80">{key}</td>
                {oldObj && (
                  <td className="px-3 py-1.5 text-red-700 dark:text-red-400">
                    {oldVal !== undefined ? String(oldVal) : <span className="text-muted-foreground">—</span>}
                  </td>
                )}
                {newObj && (
                  <td className="px-3 py-1.5 text-emerald-700 dark:text-emerald-400">
                    {newVal !== undefined ? String(newVal) : <span className="text-muted-foreground">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── API ──────────────────────────────────────────────────────────────────────

async function fetchLogs(params: Record<string, string | number>): Promise<PagedResult> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== '' && v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await apiClient.get<PagedResult>(`/AuditLog?${qs}`);
  return res.data;
}

async function fetchDropdown(path: string): Promise<string[]> {
  try {
    const res = await apiClient.get<string[]>(`/AuditLog/${path}`);
    return res.data;
  } catch {
    return [];
  }
}

// ── Main Page ────────────────────────────────────────────────────────────────

const AuditLog: React.FC = () => {

  // Filters
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toDateStr = today.toISOString().slice(0, 10);
  const fromDateStr = firstOfMonth.toISOString().slice(0, 10);

  const [from, setFrom] = useState(fromDateStr);
  const [to, setTo] = useState(toDateStr);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [entityName, setEntityName] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Data
  const [data, setData] = useState<PagedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);

  // UI
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Load dropdowns once
  useEffect(() => {
    fetchDropdown('modules').then(setModules).catch(() => {});
    fetchDropdown('actions').then(setActions).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        pageSize: pageSize,
        from: from ? `${from}T00:00:00Z` : '',
        to: to ? `${to}T23:59:59Z` : '',
        module,
        action,
        entityName,
      };
      const result = await fetchLogs(params);
      setData(result);
    } catch (e) {
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, from, to, module, action, entityName]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { setPage(1); load(); };

  const handleReset = () => {
    setFrom(fromDateStr);
    setTo(toDateStr);
    setModule('');
    setAction('');
    setEntityName('');
    setPage(1);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Complete history of every state change in the system
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {data.totalCount.toLocaleString()} record{data.totalCount !== 1 ? 's' : ''} found
            </span>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* From date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              id="audit-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* To date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              id="audit-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Module */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Module</label>
            <select
              id="audit-module"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Modules</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {/* Action */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Action</label>
            <select
              id="audit-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {/* Entity search */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Entity / Reference</label>
            <input
              id="audit-entity"
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="e.g. SO-1023"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              id="audit-search-btn"
              onClick={handleSearch}
              className="flex-1 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
            >
              Search
            </button>
            <button
              id="audit-reset-btn"
              onClick={handleReset}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading audit logs…</span>
            </div>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <svg className="mb-3 h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">No audit logs found</p>
            <p className="text-xs">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.items.map((log) => {
                  const actionStyle = getActionStyle(log.action);
                  const isExpanded = expandedRow === log.id;
                  const hasDiff = log.oldValues || log.newValues;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`transition-colors hover:bg-muted/20 ${isExpanded ? 'bg-muted/10' : ''}`}
                      >
                        {/* Timestamp */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-xs font-medium text-foreground">
                            {formatDateTime(log.timestamp)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatRelativeTime(log.timestamp)}
                          </div>
                        </td>
                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {log.isSystemAction ? '🤖' : log.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-medium text-foreground leading-tight">
                                {log.userName}
                              </div>
                              {log.userRole && (
                                <div className="text-xs text-muted-foreground">{log.userRole}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Action */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${actionStyle.bg} ${actionStyle.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${actionStyle.dot}`} />
                            {log.action}
                          </span>
                        </td>
                        {/* Module */}
                        <td className="px-4 py-3">
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getModuleStyle(log.module)}`}>
                            {log.module}
                          </span>
                        </td>
                        {/* Entity */}
                        <td className="px-4 py-3">
                          {log.entityName ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                              {log.entityName}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* Summary */}
                        <td className="max-w-xs px-4 py-3">
                          <p className="line-clamp-2 text-xs text-foreground/80">
                            {log.changeSummary ?? <span className="text-muted-foreground">No summary</span>}
                          </p>
                        </td>
                        {/* Expand */}
                        <td className="px-4 py-3 text-center">
                          {hasDiff ? (
                            <button
                              id={`audit-expand-${log.id}`}
                              onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title={isExpanded ? 'Collapse' : 'Expand diff'}
                            >
                              <svg
                                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded diff row */}
                      {isExpanded && (
                        <tr className="bg-muted/5">
                          <td colSpan={7} className="px-4 pb-4 pt-1">
                            <div className="rounded-lg border border-border/60 bg-card p-3">
                              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Change Details
                              </p>
                              {log.ipAddress && (
                                <p className="mb-2 text-xs text-muted-foreground">
                                  IP: <span className="font-mono">{log.ipAddress}</span>
                                </p>
                              )}
                              <JsonDiff oldRaw={log.oldValues} newRaw={log.newValues} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {data && data.totalPages > 0 && (
        <Pagination
          currentPage={data.page}
          totalPages={data.totalPages}
          pageSize={data.pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          totalItems={data.totalCount}
        />
      )}
    </div>
  );
};

export default AuditLog;
