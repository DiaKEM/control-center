import React, { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BatteryMedium,
  Bell,
  CalendarRange,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Droplet,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sun,
  Trash2,
  Wifi,
} from 'lucide-react';
import {
  useGetJobConfigurationsQuery,
  useCreateJobConfigurationMutation,
  useUpdateJobConfigurationMutation,
  useDeleteJobConfigurationMutation,
  type JobConfiguration,
  type JobConfigurationPayload,
  type NotificationConfig,
  type NotificationProvider,
  type NotificationPriority,
} from '@/features/job-configuration/jobConfigurationApi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ─── constants ───────────────────────────────────────────────────────────────

const JOB_TYPE_KEYS = [
  'pump-age',
  'battery-level',
  'sensor-age',
  'insulin-level',
  'pump-occlusion',
  'nightly-report',
  'day-report',
  'weekly-report',
  'biweekly-report',
  'monthly-report',
];
const PROVIDERS: NotificationProvider[] = ['pushover', 'telegram'];
const PRIORITIES: NotificationPriority[] = ['low', 'mid', 'high', 'urgent'];
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── job type config ──────────────────────────────────────────────────────────

type JobTypeIcon = React.ElementType<{ className?: string }>;

const jobTypeConfig: Record<string, { icon: JobTypeIcon; label: string }> = {
  'pump-age': { icon: Clock, label: 'Pump Age' },
  'battery-level': { icon: BatteryMedium, label: 'Battery Level' },
  'sensor-age': { icon: Wifi, label: 'Sensor Age' },
  'insulin-level': { icon: Droplet, label: 'Insulin Level' },
  'pump-occlusion': { icon: ShieldAlert, label: 'Pump Occlusion' },
  'nightly-report': { icon: Moon, label: 'Nightly Report' },
  'day-report': { icon: Sun, label: 'Day Report' },
  'weekly-report': { icon: CalendarRange, label: 'Weekly Report' },
  'biweekly-report': { icon: CalendarRange, label: '14-Day Report' },
  'monthly-report': { icon: CalendarRange, label: '6-Month Report' },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const priorityConfig: Record<
  NotificationPriority,
  { label: string; className: string }
> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600' },
  mid: { label: 'Mid', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
};

function PriorityBadge({ priority }: { priority: NotificationPriority }) {
  const cfg = priorityConfig[priority] ?? priorityConfig.mid;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

function JobTypePill({ value }: { value: string }) {
  const cfg = jobTypeConfig[value];
  const Icon = cfg?.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {cfg?.label ?? value}
    </span>
  );
}

function NotificationsSummary({
  notifications,
}: {
  notifications: NotificationConfig[];
}) {
  if (notifications.length === 0)
    return <span className="text-sm text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {notifications.map((n, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
        >
          <Bell className="h-3 w-3 shrink-0" />
          {n.timePoint ? n.timePoint : `${n.intervalHours}h`}
        </span>
      ))}
    </div>
  );
}

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc') return <ArrowUp className="ml-1.5 h-3.5 w-3.5" />;
  if (isSorted === 'desc') return <ArrowDown className="ml-1.5 h-3.5 w-3.5" />;
  return (
    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/50" />
  );
}

// ─── column definitions ───────────────────────────────────────────────────────

const col = createColumnHelper<JobConfiguration>();

function buildColumns(
  onEdit: (cfg: JobConfiguration) => void,
  onDelete: (cfg: JobConfiguration) => void,
) {
  return [
    col.accessor('jobTypeKey', {
      header: 'Job Type',
      cell: (info) => <JobTypePill value={info.getValue()} />,
    }),
    col.accessor('threshold', {
      header: 'Threshold',
      cell: (info) => (
        <span className="text-sm tabular-nums">{info.getValue()}</span>
      ),
    }),
    col.accessor('priority', {
      header: 'Priority',
      cell: (info) => <PriorityBadge priority={info.getValue()} />,
    }),
    col.accessor('provider', {
      header: 'Providers',
      enableSorting: false,
      cell: (info) => (
        <div className="flex flex-wrap gap-1">
          {info.getValue().map((p) => (
            <span
              key={p}
              className="rounded bg-secondary px-1.5 py-0.5 text-xs capitalize text-secondary-foreground"
            >
              {p}
            </span>
          ))}
        </div>
      ),
    }),
    col.accessor('notifications', {
      header: 'Notifications',
      enableSorting: false,
      cell: (info) => <NotificationsSummary notifications={info.getValue()} />,
    }),
    col.display({
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Edit"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label="Delete"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    }),
  ];
}

// ─── empty form ───────────────────────────────────────────────────────────────

type DialogForm = Omit<JobConfigurationPayload, 'threshold'> & {
  threshold: string;
};

const emptyForm = (): DialogForm => ({
  jobTypeKey: JOB_TYPE_KEYS[0],
  threshold: '3',
  notifications: [],
  provider: [],
  priority: 'mid',
});

function formFromConfig(cfg: JobConfiguration): DialogForm {
  return {
    jobTypeKey: cfg.jobTypeKey,
    threshold: String(cfg.threshold),
    notifications: cfg.notifications,
    provider: cfg.provider,
    priority: cfg.priority,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50';

// ─── notification entry editor ────────────────────────────────────────────────

interface NotifEntryProps {
  entry: NotificationConfig;
  index: number;
  onChange: (i: number, updated: NotificationConfig) => void;
  onRemove: (i: number) => void;
}

function NotifEntry({ entry, index, onChange, onRemove }: NotifEntryProps) {
  const mode = entry.timePoint !== undefined ? 'timePoint' : 'intervalHours';

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      <select
        className="h-8 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        value={mode}
        onChange={(e) => {
          if (e.target.value === 'timePoint')
            onChange(index, { timePoint: '20:00' });
          else onChange(index, { intervalHours: 3 });
        }}
      >
        <option value="timePoint">Time</option>
        <option value="intervalHours">Interval</option>
      </select>

      {mode === 'timePoint' ? (
        <input
          type="time"
          className="h-8 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          value={entry.timePoint ?? '20:00'}
          onChange={(e) => onChange(index, { timePoint: e.target.value })}
        />
      ) : (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            className="h-8 w-20 text-xs"
            value={entry.intervalHours ?? 3}
            onChange={(e) =>
              onChange(index, { intervalHours: Number(e.target.value) })
            }
          />
          <span className="text-xs text-muted-foreground">hours</span>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="ml-auto h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(index)}
        aria-label="Remove notification"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── config dialog ────────────────────────────────────────────────────────────

interface ConfigDialogProps {
  open: boolean;
  onClose: () => void;
  editing: JobConfiguration | null;
}

function ConfigDialog({ open, onClose, editing }: ConfigDialogProps) {
  const [form, setForm] = useState<DialogForm>(emptyForm);
  const [createConfig, { isLoading: isCreating }] =
    useCreateJobConfigurationMutation();
  const [updateConfig, { isLoading: isUpdating }] =
    useUpdateJobConfigurationMutation();

  React.useEffect(() => {
    setForm(editing ? formFromConfig(editing) : emptyForm());
  }, [editing, open]);

  const isSaving = isCreating || isUpdating;

  const handleProviderToggle = (p: NotificationProvider) => {
    setForm((f) => ({
      ...f,
      provider: f.provider.includes(p)
        ? f.provider.filter((x) => x !== p)
        : [...f.provider, p],
    }));
  };

  const handleAddNotif = () => {
    setForm((f) => ({
      ...f,
      notifications: [...f.notifications, { timePoint: '20:00' }],
    }));
  };

  const handleChangeNotif = (i: number, updated: NotificationConfig) => {
    setForm((f) => {
      const notifications = [...f.notifications];
      notifications[i] = updated;
      return { ...f, notifications };
    });
  };

  const handleRemoveNotif = (i: number) => {
    setForm((f) => ({
      ...f,
      notifications: f.notifications.filter((_, idx) => idx !== i),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: JobConfigurationPayload = {
      ...form,
      threshold: parseFloat(form.threshold) || 0,
    };
    if (editing) {
      await updateConfig({ id: editing._id, ...payload });
    } else {
      await createConfig(payload);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit Configuration' : 'New Configuration'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
          {/* Job Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Job Type</Label>
            <select
              className={selectClass}
              value={form.jobTypeKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, jobTypeKey: e.target.value }))
              }
              disabled={!!editing}
            >
              {JOB_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {jobTypeConfig[k]?.label ?? k}
                </option>
              ))}
            </select>
          </div>

          {/* Threshold */}
          <div className="flex flex-col gap-1.5">
            <Label>Threshold</Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={form.threshold}
              onChange={(e) =>
                setForm((f) => ({ ...f, threshold: e.target.value }))
              }
            />
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <select
              className={selectClass}
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  priority: e.target.value as NotificationPriority,
                }))
              }
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityConfig[p].label}
                </option>
              ))}
            </select>
          </div>

          {/* Providers */}
          <div className="flex flex-col gap-1.5">
            <Label>Providers</Label>
            <div className="flex gap-4">
              {PROVIDERS.map((p) => (
                <label
                  key={p}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={form.provider.includes(p)}
                    onChange={() => handleProviderToggle(p)}
                  />
                  <span className="capitalize">{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Notifications</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleAddNotif}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {form.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notifications configured.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {form.notifications.map((n, i) => (
                  <NotifEntry
                    key={i}
                    entry={n}
                    index={i}
                    onChange={handleChangeNotif}
                    onRemove={handleRemoveNotif}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── delete dialog ────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  target: JobConfiguration | null;
  onClose: () => void;
}

function DeleteDialog({ target, onClose }: DeleteDialogProps) {
  const [deleteConfig, { isLoading }] = useDeleteJobConfigurationMutation();

  const handleConfirm = async () => {
    if (target) await deleteConfig(target._id);
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Configuration</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete the configuration for{' '}
          <span className="font-medium text-foreground">
            {target
              ? (jobTypeConfig[target.jobTypeKey]?.label ?? target.jobTypeKey)
              : ''}
          </span>
          ? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── column visibility menu ───────────────────────────────────────────────────

const columnLabels: Record<string, string> = {
  jobTypeKey: 'Job Type',
  threshold: 'Threshold',
  priority: 'Priority',
  provider: 'Providers',
  notifications: 'Notifications',
};

function ColumnVisibilityMenu({
  table,
}: {
  table: ReturnType<typeof useReactTable<JobConfiguration>>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((c) => c.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(v) => column.toggleVisibility(v)}
            >
              {columnLabels[column.id] ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── pagination bar ───────────────────────────────────────────────────────────

function PaginationBar({
  table,
}: {
  table: ReturnType<typeof useReactTable<JobConfiguration>>;
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? 'No records'
          : `${from}–${to} of ${total} record${total !== 1 ? 's' : ''}`}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            Rows per page
          </span>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring w-20"
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-24 text-center text-sm text-muted-foreground">
            Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  jobTypeKey: string;
  onJobTypeKey: (v: string) => void;
  onReset: () => void;
}

function FilterBar({ jobTypeKey, onJobTypeKey, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Job Type
        </label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={jobTypeKey}
          onChange={(e) => onJobTypeKey(e.target.value)}
        >
          <option value="">All types</option>
          {JOB_TYPE_KEYS.map((k) => (
            <option key={k} value={k}>
              {jobTypeConfig[k]?.label ?? k}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="self-end text-muted-foreground"
      >
        Reset
      </Button>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function JobConfigurationPage() {
  const [jobTypeKey, setJobTypeKey] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobConfiguration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobConfiguration | null>(
    null,
  );

  const queryArg = useMemo(() => jobTypeKey || undefined, [jobTypeKey]);
  const {
    data = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetJobConfigurationsQuery(queryArg);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const handleEdit = (cfg: JobConfiguration) => {
    setEditing(cfg);
    setDialogOpen(true);
  };

  const handleDelete = (cfg: JobConfiguration) => {
    setDeleteTarget(cfg);
  };

  const columns = useMemo(() => buildColumns(handleEdit, handleDelete), []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  const colSpan = table.getVisibleLeafColumns().length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Job Configurations
          </h1>
          <p className="text-muted-foreground">
            Manage thresholds and notification rules for each job type.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={cn('h-4 w-4', isFetching && 'animate-spin')}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      {/* Filters + column toggle */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <FilterBar
          jobTypeKey={jobTypeKey}
          onJobTypeKey={setJobTypeKey}
          onReset={() => setJobTypeKey('')}
        />
        <ColumnVisibilityMenu table={table} />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/40">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left font-medium text-muted-foreground',
                        canSort &&
                          'cursor-pointer select-none hover:text-foreground',
                      )}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <div className="flex items-center">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {canSort && (
                          <SortIcon isSorted={header.column.getIsSorted()} />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-12 text-center text-destructive"
                >
                  Failed to load configurations. Make sure the backend is
                  running.
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No configurations found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && !isError && <PaginationBar table={table} />}

      {/* Dialogs */}
      <ConfigDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />
      <DeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
