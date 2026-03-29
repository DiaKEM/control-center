import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  useGetAdminConfigQuery,
  useUpdateNightscoutMutation,
  useUpdatePushoverMutation,
  useUpdateTelegramMutation,
  useTestConnectionMutation,
  useGetDatabaseStatsQuery,
  useDeleteJobExecutionsMutation,
  useGetSchedulerConfigQuery,
  useUpdateSchedulerMutation,
  useGetGlucoseLimitsQuery,
  useUpdateGlucoseLimitsMutation,
  type ServiceKey,
  type GlucoseUnit,
  type GlucoseRange,
} from '@/features/admin/adminApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ─── secret input ─────────────────────────────────────────────────────────────

function SecretInput({
  id,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Hide' : 'Show'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── service tabs ─────────────────────────────────────────────────────────────

const SERVICE_TABS: { key: ServiceKey; label: string }[] = [
  { key: 'nightscout', label: 'Nightscout' },
  { key: 'pushover', label: 'Pushover' },
  { key: 'telegram', label: 'Telegram' },
];

// ─── connection status ────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

function ConnectionBadge({ status }: { status: TestStatus }) {
  if (status === 'idle') return null;
  if (status === 'testing')
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Testing…
      </span>
    );
  if (status === 'ok')
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" /> Connected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-destructive">
      <XCircle className="h-4 w-4" /> Connection failed
    </span>
  );
}

// ─── nightscout panel ─────────────────────────────────────────────────────────

function NightscoutPanel({
  initial,
  testStatus,
  onTest,
}: {
  initial: { url: string; apiKey: string };
  testStatus: TestStatus;
  onTest: (config: Record<string, string>) => void;
}) {
  const [url, setUrl] = useState(initial.url);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [updateNightscout, { isLoading, isSuccess }] =
    useUpdateNightscoutMutation();

  useEffect(() => {
    setUrl(initial.url);
    setApiKey(initial.apiKey);
  }, [initial.url, initial.apiKey]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateNightscout({ url, apiKey });
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Nightscout is the data source for all monitoring jobs.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ns-url">Nightscout URL</Label>
        <Input
          id="ns-url"
          type="url"
          placeholder="https://your-nightscout.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ns-key">API Key</Label>
        <SecretInput
          id="ns-key"
          placeholder="your_api_secret"
          value={apiKey}
          onChange={setApiKey}
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save'
          )}
        </Button>
        {isSuccess && !isLoading && (
          <span className="text-sm text-green-600">Saved</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <ConnectionBadge status={testStatus} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onTest({ url, apiKey })}
            disabled={testStatus === 'testing'}
          >
            <Activity className="h-4 w-4" />
            Test connection
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── pushover panel ───────────────────────────────────────────────────────────

function PushoverPanel({
  initial,
  testStatus,
  onTest,
}: {
  initial: { appToken: string; userKey: string };
  testStatus: TestStatus;
  onTest: (config: Record<string, string>) => void;
}) {
  const [appToken, setAppToken] = useState(initial.appToken);
  const [userKey, setUserKey] = useState(initial.userKey);
  const [updatePushover, { isLoading, isSuccess }] =
    useUpdatePushoverMutation();

  useEffect(() => {
    setAppToken(initial.appToken);
    setUserKey(initial.userKey);
  }, [initial.appToken, initial.userKey]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePushover({ appToken, userKey });
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pushover delivers push notifications to your devices.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="po-token">App Token</Label>
        <SecretInput
          id="po-token"
          placeholder="your_app_token"
          value={appToken}
          onChange={setAppToken}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="po-user">User Key</Label>
        <SecretInput
          id="po-user"
          placeholder="your_user_key"
          value={userKey}
          onChange={setUserKey}
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save'
          )}
        </Button>
        {isSuccess && !isLoading && (
          <span className="text-sm text-green-600">Saved</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <ConnectionBadge status={testStatus} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onTest({ appToken, userKey })}
            disabled={testStatus === 'testing'}
          >
            <Send className="h-4 w-4" />
            Test connection
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── telegram panel ───────────────────────────────────────────────────────────

function TelegramPanel({
  initial,
  testStatus,
  onTest,
}: {
  initial: { botToken: string; chatId: string };
  testStatus: TestStatus;
  onTest: (config: Record<string, string>) => void;
}) {
  const [botToken, setBotToken] = useState(initial.botToken);
  const [chatId, setChatId] = useState(initial.chatId);
  const [updateTelegram, { isLoading, isSuccess }] =
    useUpdateTelegramMutation();

  useEffect(() => {
    setBotToken(initial.botToken);
    setChatId(initial.chatId);
  }, [initial.botToken, initial.chatId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTelegram({ botToken, chatId });
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Telegram delivers notifications via a bot to a chat or group.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tg-token">Bot Token</Label>
        <SecretInput
          id="tg-token"
          placeholder="123456:ABC-DEF…"
          value={botToken}
          onChange={setBotToken}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tg-chat">Chat ID</Label>
        <Input
          id="tg-chat"
          placeholder="-1001234567890"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save'
          )}
        </Button>
        {isSuccess && !isLoading && (
          <span className="text-sm text-green-600">Saved</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <ConnectionBadge status={testStatus} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => onTest({ botToken, chatId })}
            disabled={testStatus === 'testing'}
          >
            <Send className="h-4 w-4" />
            Test connection
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── scheduler panel ──────────────────────────────────────────────────────────

function SchedulerPanel() {
  const { data, isLoading, isError } = useGetSchedulerConfigQuery();
  const [updateScheduler, { isLoading: isSaving, isSuccess }] =
    useUpdateSchedulerMutation();
  const [expression, setExpression] = useState('');

  useEffect(() => {
    if (data) setExpression(data.expression);
  }, [data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateScheduler(expression);
  };

  const nextRun = data?.nextRun
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.nextRun))
    : null;

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Configure the cron expression for the automated job runner. Changes take
        effect immediately without a restart. The expression uses a 6-field
        format:{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          seconds minutes hours day month weekday
        </code>
        .
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load scheduler config.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cron-expr">Cron Expression</Label>
            <Input
              id="cron-expr"
              className="font-mono"
              placeholder="0 */15 * * * *"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
            />
          </div>

          <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Next run: </span>
            <span className="font-medium">{nextRun ?? '—'}</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={isSaving || !expression}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save & apply'
              )}
            </Button>
            {isSuccess && !isSaving && (
              <span className="text-sm text-green-600">Applied</span>
            )}
          </div>
        </>
      )}
    </form>
  );
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ─── database panel ───────────────────────────────────────────────────────────

function DatabasePanel() {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetDatabaseStatsQuery();
  const [deleteJobExecutions, { isLoading: isDeleting }] =
    useDeleteJobExecutionsMutation();

  const [beforeDate, setBeforeDate] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const handleDelete = async () => {
    setConfirmOpen(false);
    const result = await deleteJobExecutions(
      new Date(beforeDate).toISOString(),
    ).unwrap();
    setLastResult(result.deletedCount);
    setBeforeDate('');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* DB stats */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Database Overview</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-muted-foreground"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading stats…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Failed to load database stats.
          </p>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total size" value={`${stats.totalSizeMb} MB`} />
            <StatCard
              label="Storage size"
              value={`${stats.storageSizeMb} MB`}
            />
            <StatCard label="Collections" value={String(stats.collections)} />
            <StatCard
              label="Job executions"
              value={String(stats.jobExecutions.count)}
            />
          </div>
        ) : null}
      </div>

      <div className="border-t" />

      {/* Delete section */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">Archive Job Executions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete all job execution entries older than the selected
            date.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="before-date">Delete entries older than</Label>
          <input
            id="before-date"
            type="date"
            className="h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={beforeDate}
            onChange={(e) => {
              setBeforeDate(e.target.value);
              setLastResult(null);
            }}
          />
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            disabled={!beforeDate || isDeleting}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete entries
          </Button>
          {lastResult !== null && (
            <span className="text-sm text-muted-foreground">
              <Database className="mr-1 inline h-3.5 w-3.5" />
              {lastResult === 0
                ? 'No entries deleted.'
                : `${lastResult} entr${lastResult === 1 ? 'y' : 'ies'} deleted.`}
            </span>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(v) => !v && setConfirmOpen(false)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Job Executions</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete all job execution entries older than{' '}
            <span className="font-medium text-foreground">
              {beforeDate
                ? new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'long',
                  }).format(new Date(beforeDate))
                : ''}
            </span>
            . This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── glucose limits panel ─────────────────────────────────────────────────────

const UNITS: GlucoseUnit[] = ['mg/dl', 'mmol/L'];

type RangeName = 'Very Low' | 'Low' | 'In Range' | 'High' | 'Very High';

const RANGE_STYLE: Record<RangeName, { dot: string; badge: string }> = {
  'Very Low': { dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' },
  Low: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800' },
  'In Range': { dot: 'bg-green-500', badge: 'bg-green-100  text-green-800' },
  High: { dot: 'bg-amber-500', badge: 'bg-amber-100  text-amber-800' },
  'Very High': { dot: 'bg-red-500', badge: 'bg-red-100    text-red-800' },
};

const DEFAULTS: Record<
  GlucoseUnit,
  Array<{ name: RangeName; lowerLimit: number; upperLimit: number }>
> = {
  'mg/dl': [
    { name: 'Very Low', lowerLimit: 0, upperLimit: 54 },
    { name: 'Low', lowerLimit: 54, upperLimit: 70 },
    { name: 'In Range', lowerLimit: 70, upperLimit: 180 },
    { name: 'High', lowerLimit: 180, upperLimit: 250 },
    { name: 'Very High', lowerLimit: 250, upperLimit: 400 },
  ],
  'mmol/L': [
    { name: 'Very Low', lowerLimit: 0, upperLimit: 3.0 },
    { name: 'Low', lowerLimit: 3.0, upperLimit: 3.9 },
    { name: 'In Range', lowerLimit: 3.9, upperLimit: 10.0 },
    { name: 'High', lowerLimit: 10.0, upperLimit: 13.9 },
    { name: 'Very High', lowerLimit: 13.9, upperLimit: 22.2 },
  ],
};

function GlucoseLimitsPanel() {
  const { data, isLoading, isError } = useGetGlucoseLimitsQuery();
  const [updateGlucoseLimits, { isLoading: isSaving, isSuccess }] =
    useUpdateGlucoseLimitsMutation();

  const [unit, setUnit] = useState<GlucoseUnit>('mg/dl');
  const [ranges, setRanges] = useState<GlucoseRange[]>(DEFAULTS['mg/dl']);

  useEffect(() => {
    if (data) {
      setUnit(data.unit);
      setRanges(data.ranges.length > 0 ? data.ranges : DEFAULTS[data.unit]);
    }
  }, [data]);

  const handleUnitChange = (newUnit: GlucoseUnit) => {
    setUnit(newUnit);
    setRanges(DEFAULTS[newUnit]);
  };

  const updateRange = (
    index: number,
    field: 'lowerLimit' | 'upperLimit',
    raw: string,
  ) => {
    const value = parseFloat(raw);
    setRanges((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, [field]: isNaN(value) ? 0 : value } : r,
      ),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateGlucoseLimits({ unit, ranges });
  };

  if (isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (isError)
    return (
      <p className="text-sm text-destructive">Failed to load glucose limits.</p>
    );

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      {/* Unit selector */}
      <div className="flex flex-col gap-1.5">
        <Label>Unit</Label>
        <div className="flex rounded-md border overflow-hidden w-fit">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => handleUnitChange(u)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium transition-colors',
                unit === u
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Ranges table */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                Range
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                Lower ({unit})
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                Upper ({unit})
              </th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((range, i) => {
              const style = RANGE_STYLE[range.name as RangeName];
              return (
                <tr
                  key={range.name}
                  className="border-b last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        style?.badge,
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          style?.dot,
                        )}
                      />
                      {range.name}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      className="h-8 w-28"
                      value={range.lowerLimit}
                      onChange={(e) =>
                        updateRange(i, 'lowerLimit', e.target.value)
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      className="h-8 w-28"
                      value={range.upperLimit}
                      onChange={(e) =>
                        updateRange(i, 'upperLimit', e.target.value)
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save'
          )}
        </Button>
        {isSuccess && !isSaving && (
          <span className="text-sm text-green-600">Saved</span>
        )}
      </div>
    </form>
  );
}

// ─── section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border">
      <div className="border-b px-6 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeService, setActiveService] = useState<ServiceKey>('nightscout');
  const [testStatuses, setTestStatuses] = useState<
    Record<ServiceKey, TestStatus>
  >({
    nightscout: 'idle',
    pushover: 'idle',
    telegram: 'idle',
  });

  const { data: config, isLoading, isError } = useGetAdminConfigQuery();
  const [testConnection] = useTestConnectionMutation();

  const handleTest = async (
    service: ServiceKey,
    cfg: Record<string, string>,
  ) => {
    setTestStatuses((s) => ({ ...s, [service]: 'testing' }));
    try {
      const result = await testConnection({ service, config: cfg }).unwrap();
      setTestStatuses((s) => ({ ...s, [service]: result.ok ? 'ok' : 'error' }));
    } catch {
      setTestStatuses((s) => ({ ...s, [service]: 'error' }));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          Configure service integrations. Changes take effect immediately
          without a restart.
        </p>
      </div>

      {/* ── Section 1: Third-party services ── */}
      <Section
        title="Third-party Services"
        description="Connect Nightscout, Pushover, and Telegram. Test and save each service independently."
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading configuration…
          </p>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Failed to load configuration.
          </p>
        ) : config ? (
          <div className="flex flex-col gap-0">
            {/* Service sub-tabs */}
            <div className="flex border-b -mx-6 px-6 mb-6">
              {SERVICE_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveService(key)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium transition-colors',
                    activeService === key
                      ? 'border-b-2 border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-w-lg">
              {activeService === 'nightscout' && (
                <NightscoutPanel
                  initial={config.nightscout}
                  testStatus={testStatuses.nightscout}
                  onTest={(cfg) => handleTest('nightscout', cfg)}
                />
              )}
              {activeService === 'pushover' && (
                <PushoverPanel
                  initial={config.pushover}
                  testStatus={testStatuses.pushover}
                  onTest={(cfg) => handleTest('pushover', cfg)}
                />
              )}
              {activeService === 'telegram' && (
                <TelegramPanel
                  initial={config.telegram}
                  testStatus={testStatuses.telegram}
                  onTest={(cfg) => handleTest('telegram', cfg)}
                />
              )}
            </div>
          </div>
        ) : null}
      </Section>

      {/* ── Section 2: Glucose Limits ── */}
      <Section
        title="Blood Glucose Limits"
        description="Define the target range for blood glucose levels. These limits are used by monitoring jobs to determine when to send alerts."
      >
        <GlucoseLimitsPanel />
      </Section>

      {/* ── Section 4: Scheduler ── */}
      <Section
        title="Scheduler"
        description="Configure when the automated job runner executes. Changes apply immediately."
      >
        <div className="max-w-lg">
          <SchedulerPanel />
        </div>
      </Section>

      {/* ── Section 3: Database ── */}
      <Section
        title="Database"
        description="Monitor database size and manage stored job execution records."
      >
        <DatabasePanel />
      </Section>
    </div>
  );
}
