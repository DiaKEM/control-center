import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Battery,
  BatteryCharging,
  Bell,
  CheckCircle2,
  Clock,
  Database,
  Droplets,
  Settings2,
  Syringe,
  TrendingDown,
  TrendingUp,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { selectUsername } from '@/features/auth/authSlice';
import {
  useGetAdminConfigQuery,
  useTestConnectionMutation,
  useGetDatabaseStatsQuery,
  useGetSchedulerConfigQuery,
  useGetNightscoutInfoQuery,
  type NightscoutInfo,
} from '@/features/admin/adminApi';
import { useGetJobExecutionsQuery } from '@/features/job-execution/jobExecutionApi';
import { useGetJobConfigurationsQuery } from '@/features/job-configuration/jobConfigurationApi';
import { cn } from '@/lib/utils';

// ─── helpers ──────────────────────────────────────────────────────────────────

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatNextRun(iso: string | null) {
  if (!iso) return 'Not scheduled';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: 'green' | 'red' | 'blue' | 'yellow';
  sub?: string;
}) {
  const accentClass = {
    green: 'text-green-600',
    red: 'text-red-500',
    blue: 'text-blue-600',
    yellow: 'text-yellow-500',
  }[accent ?? 'blue'];

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">
          {label}
        </span>
        <Icon className={cn('h-4 w-4', accentClass)} />
      </div>
      <div>
        <span className={cn('text-3xl font-bold', accentClass)}>{value}</span>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── glucose helpers ──────────────────────────────────────────────────────────

function formatGlucoseTime(ms: number | null) {
  if (!ms) return null;
  const diff = Math.round((Date.now() - ms) / 60_000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
}

function glucoseAgeColor(ms: number | null) {
  if (!ms) return 'text-muted-foreground';
  const diff = (Date.now() - ms) / 60_000;
  if (diff <= 5) return 'text-green-600 dark:text-green-400';
  if (diff <= 6) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-red-500';
}

// ─── nightscout status banner ─────────────────────────────────────────────────

type NsStatus = 'checking' | 'ok' | 'error' | 'unconfigured';

function NightscoutBanner({
  status,
  onRetest,
}: {
  status: NsStatus;
  onRetest: () => void;
}) {
  if (status === 'ok' || status === 'checking') return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        status === 'unconfigured'
          ? 'border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200'
          : 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
      )}
    >
      {status === 'unconfigured' ? (
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
      ) : (
        <WifiOff className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
      )}
      <div className="flex-1">
        <p className="font-semibold">
          {status === 'unconfigured'
            ? 'Nightscout not configured'
            : 'Nightscout connection failed'}
        </p>
        <p className="mt-0.5 text-xs opacity-80">
          {status === 'unconfigured' ? (
            <>
              Go to{' '}
              <Link
                to="/admin"
                className="underline underline-offset-2 hover:opacity-100"
              >
                Administration
              </Link>{' '}
              → Nightscout to enter your URL and API key.
            </>
          ) : (
            <>
              The configured Nightscout instance could not be reached. Check the
              URL and API key in{' '}
              <Link
                to="/admin"
                className="underline underline-offset-2 hover:opacity-100"
              >
                Administration
              </Link>
              .
            </>
          )}
        </p>
      </div>
      <button
        onClick={onRetest}
        className="text-xs underline underline-offset-2 opacity-70 hover:opacity-100 whitespace-nowrap"
      >
        Retry
      </button>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const username = useAppSelector(selectUsername);

  const [nsStatus, setNsStatus] = useState<NsStatus>('checking');

  const { data: config, isLoading: configLoading } = useGetAdminConfigQuery();
  const { data: dbStats } = useGetDatabaseStatsQuery();
  const { data: scheduler } = useGetSchedulerConfigQuery();
  const { data: executions } = useGetJobExecutionsQuery({ limit: 100 });
  const { data: configs } = useGetJobConfigurationsQuery();
  const {
    data: nsInfo,
    isLoading: nsInfoLoading,
    refetch: refetchNsInfo,
  } = useGetNightscoutInfoQuery(undefined, {
    skip: nsStatus === 'unconfigured',
    pollingInterval: 60_000,
  });

  const [testConnection] = useTestConnectionMutation();

  // Test Nightscout connection once config is loaded
  useEffect(() => {
    if (configLoading) return;
    if (!config?.nightscout?.url) {
      setNsStatus('unconfigured');
      return;
    }
    setNsStatus('checking');
    testConnection({
      service: 'nightscout',
      config: { url: config.nightscout.url, apiKey: config.nightscout.apiKey },
    })
      .then((res) => {
        const ok = 'data' in res && res.data?.ok === true;
        setNsStatus(ok ? 'ok' : 'error');
      })
      .catch(() => setNsStatus('error'));
  }, [config, configLoading]); // oxlint-disable-line react/exhaustive-deps

  const handleRetest = () => {
    if (!config?.nightscout?.url) {
      setNsStatus('unconfigured');
      return;
    }
    setNsStatus('checking');
    testConnection({
      service: 'nightscout',
      config: { url: config.nightscout.url, apiKey: config.nightscout.apiKey },
    })
      .then((res) => {
        const ok = 'data' in res && res.data?.ok === true;
        setNsStatus(ok ? 'ok' : 'error');
      })
      .catch(() => setNsStatus('error'));
  };

  // Derived stats from recent executions
  const today = executions?.filter((e) => isToday(e.startedAt)) ?? [];
  const todaySuccess = today.filter((e) => e.status === 'success').length;
  const todayFailed = today.filter((e) => e.status === 'failed').length;
  const todayNotifications = today.filter((e) => !!e.notificationSentAt).length;

  const pushoverOk = !!(
    config?.pushover?.appToken && config?.pushover?.userKey
  );
  const telegramOk = !!(config?.telegram?.botToken && config?.telegram?.chatId);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {username}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's an overview of your DiaKEM monitoring setup.
        </p>
      </div>

      {/* Nightscout warning */}
      {!configLoading && (
        <NightscoutBanner status={nsStatus} onRetest={handleRetest} />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Runs today"
          value={today.length}
          icon={Activity}
          accent="blue"
          sub="job executions"
        />
        <StatCard
          label="Successful today"
          value={todaySuccess}
          icon={CheckCircle2}
          accent="green"
        />
        <StatCard
          label="Failed today"
          value={todayFailed}
          icon={XCircle}
          accent={todayFailed > 0 ? 'red' : 'blue'}
        />
        <StatCard
          label="Notifications sent"
          value={todayNotifications}
          icon={Bell}
          accent="yellow"
          sub="today"
        />
      </div>

      {/* Nightscout details widget */}
      {nsStatus !== 'unconfigured' && (
        <NightscoutInfoWidget
          info={nsInfo ?? null}
          loading={nsInfoLoading}
          onRefresh={refetchNsInfo}
          nsStatus={nsStatus}
        />
      )}

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* System status */}
        <div className="rounded-lg border bg-card p-5 shadow-sm flex flex-col gap-4">
          <h2 className="font-semibold text-sm">System Status</h2>

          <div className="flex flex-col gap-3 text-sm">
            {/* Scheduler */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Next scheduler run
              </div>
              <span className="font-medium text-right">
                {scheduler ? formatNextRun(scheduler.nextRun) : '—'}
              </span>
            </div>

            {/* Job configs */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Settings2 className="h-4 w-4" />
                Job configurations
              </div>
              <span className="font-medium">{configs?.length ?? '—'}</span>
            </div>

            {/* DB */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Database className="h-4 w-4" />
                Total executions
              </div>
              <span className="font-medium">
                {dbStats ? dbStats.jobExecutions.count.toLocaleString() : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Database className="h-4 w-4" />
                Database size
              </div>
              <span className="font-medium">
                {dbStats ? `${dbStats.totalSizeMb.toFixed(1)} MB` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Notification providers */}
        <div className="rounded-lg border bg-card p-5 shadow-sm flex flex-col gap-4">
          <h2 className="font-semibold text-sm">Notification Providers</h2>

          <div className="flex flex-col gap-3 text-sm">
            <ProviderRow
              label="Pushover"
              configured={pushoverOk}
              loading={configLoading}
            />
            <ProviderRow
              label="Telegram"
              configured={telegramOk}
              loading={configLoading}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-auto">
            <Link
              to="/admin"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Configure in Administration
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Nightscout info widget ───────────────────────────────────────────────────

const TREND_MAP: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  DoubleUp: {
    label: '↑↑ Rising fast',
    icon: TrendingUp,
    color: 'text-red-500',
  },
  SingleUp: { label: '↑ Rising', icon: TrendingUp, color: 'text-orange-500' },
  FortyFiveUp: {
    label: '↗ Rising slowly',
    icon: TrendingUp,
    color: 'text-yellow-500',
  },
  Flat: { label: '→ Stable', icon: Minus, color: 'text-green-600' },
  FortyFiveDown: {
    label: '↘ Falling slowly',
    icon: TrendingDown,
    color: 'text-yellow-500',
  },
  SingleDown: {
    label: '↓ Falling',
    icon: TrendingDown,
    color: 'text-orange-500',
  },
  DoubleDown: {
    label: '↓↓ Falling fast',
    icon: TrendingDown,
    color: 'text-red-500',
  },
};

function InfoRow({
  label,
  value,
  icon: Icon,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </div>
      <span className={cn('text-sm font-medium text-right', valueClass)}>
        {value}
      </span>
    </div>
  );
}

function NightscoutInfoWidget({
  info,
  loading,
  onRefresh,
  nsStatus,
}: {
  info: NightscoutInfo | null;
  loading: boolean;
  onRefresh: () => void;
  nsStatus: NsStatus;
}) {
  const trend = info?.latestGlucose?.direction
    ? TREND_MAP[info.latestGlucose.direction]
    : null;

  const formatAge = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)}h`;
    return `${days.toFixed(1)}d`;
  };

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Nightscout Details</h2>
        <div className="flex items-center gap-2">
          {nsStatus === 'ok' && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
              <Wifi className="h-3.5 w-3.5" />
              Connected
            </span>
          )}
          {nsStatus === 'checking' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking…
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            />
          </button>
        </div>
      </div>

      {loading && !info ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Latest glucose */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Glucose
            </p>
            {info?.latestGlucose ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {info.latestGlucose.sgv}
                  </span>
                  <span className="text-sm text-muted-foreground">mg/dL</span>
                  {trend && (
                    <span className={cn('text-sm font-medium', trend.color)}>
                      {trend.label}
                    </span>
                  )}
                </div>
                {info.latestGlucose.date && (
                  <span
                    className={cn(
                      'text-xs font-medium -mt-2',
                      glucoseAgeColor(info.latestGlucose.date),
                    )}
                  >
                    {formatGlucoseTime(info.latestGlucose.date)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No data</span>
            )}
          </div>

          {/* Device details */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Device
            </p>
            <div className="flex flex-col gap-2">
              {info?.battery ? (
                <InfoRow
                  label="Battery"
                  icon={info.battery.isCharging ? BatteryCharging : Battery}
                  value={
                    <span
                      className={cn(
                        info.battery.level <= 20
                          ? 'text-red-500'
                          : 'text-foreground',
                      )}
                    >
                      {info.battery.level}%
                      {info.battery.isCharging === true && (
                        <span className="text-green-600 ml-1">⚡</span>
                      )}
                      {info.battery.isCharging === false && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          unplugged
                        </span>
                      )}
                    </span>
                  }
                />
              ) : (
                <InfoRow label="Battery" icon={Battery} value="—" />
              )}

              <InfoRow
                label="Reservoir"
                icon={Droplets}
                value={
                  info?.reservoirLevel != null
                    ? `${info.reservoirLevel} U`
                    : '—'
                }
                valueClass={
                  info?.reservoirLevel != null && info.reservoirLevel < 20
                    ? 'text-red-500'
                    : undefined
                }
              />
            </div>
          </div>

          {/* Sensor & pump ages */}
          <div className="flex flex-col gap-3 sm:col-span-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Consumables
            </p>
            <div className="flex flex-col gap-2">
              <InfoRow
                label="Sensor age"
                icon={Activity}
                value={info?.sensor ? formatAge(info.sensor.elapsedDays) : '—'}
                valueClass={
                  info?.sensor && info.sensor.elapsedDays > 10
                    ? 'text-red-500'
                    : info?.sensor && info.sensor.elapsedDays > 7
                      ? 'text-yellow-500'
                      : undefined
                }
              />
              <InfoRow
                label="Pump site age"
                icon={Syringe}
                value={info?.pump ? formatAge(info.pump.elapsedDays) : '—'}
                valueClass={
                  info?.pump && info.pump.elapsedDays > 3
                    ? 'text-red-500'
                    : info?.pump && info.pump.elapsedDays > 2
                      ? 'text-yellow-500'
                      : undefined
                }
              />
            </div>
          </div>

          {/* Version */}
          {info?.version && (
            <div className="sm:col-span-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">
                Nightscout v{info.version}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderRow({
  label,
  configured,
  loading,
}: {
  label: string;
  configured: boolean;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : configured ? (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Configured
        </span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground">
          <XCircle className="h-4 w-4" />
          Not configured
        </span>
      )}
    </div>
  );
}
