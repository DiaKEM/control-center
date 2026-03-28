import React, { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ExpandedState,
  type PaginationState,
  type Row,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BatteryMedium,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Columns3,
  Droplet,
  Loader2,
  Moon,
  Play,
  RefreshCw,
  ShieldAlert,
  Sun,
  Trash2,
  Wifi,
  XCircle,
} from 'lucide-react'
import {
  useGetJobExecutionsQuery,
  useTriggerJobsMutation,
  useDeleteJobExecutionMutation,
  useDeleteFilteredJobExecutionsMutation,
  JOB_TYPE_KEYS,
  type ExecutionStatus,
  type JobExecution,
  type JobExecutionFilters,
  type JobTypeKey,
} from '@/features/job-execution/jobExecutionApi'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// ─── constants ───────────────────────────────────────────────────────────────

const STATUSES: ExecutionStatus[] = ['running', 'success', 'skipped', 'failed']
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// ─── job type config ──────────────────────────────────────────────────────────

type JobTypeIcon = React.ElementType<{ className?: string }>

const jobTypeConfig: Record<string, { icon: JobTypeIcon; label: string }> = {
  'pump-age':         { icon: Clock,          label: 'Pump Age' },
  'battery-level':    { icon: BatteryMedium,  label: 'Battery Level' },
  'sensor-age':       { icon: Wifi,           label: 'Sensor Age' },
  'insulin-level':    { icon: Droplet,        label: 'Insulin Level' },
  'pump-occlusion':   { icon: ShieldAlert,    label: 'Pump Occlusion' },
  'nightly-report':   { icon: Moon,           label: 'Nightly Report' },
  'day-report':       { icon: Sun,            label: 'Day Report' },
  'weekly-report':    { icon: CalendarRange,  label: 'Weekly Report' },
  'biweekly-report':  { icon: CalendarRange,  label: '14-Day Report' },
  'monthly-report':   { icon: CalendarRange,  label: '6-Month Report' },
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

function formatDuration(startedAt: string, finishedAt?: string) {
  if (!finishedAt) return '—'
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

// ─── cell components ──────────────────────────────────────────────────────────

const statusConfig: Record<ExecutionStatus, { label: string; className: string }> = {
  success: { label: 'Success', className: 'bg-green-100 text-green-800' },
  failed:  { label: 'Failed',  className: 'bg-red-100 text-red-800' },
  running: { label: 'Running', className: 'bg-blue-100 text-blue-800' },
  skipped: { label: 'Skipped', className: 'bg-gray-100 text-gray-600' },
}

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const cfg = statusConfig[status] ?? statusConfig.skipped
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function JobTypePill({ value }: { value: string }) {
  const cfg = jobTypeConfig[value]
  const Icon = cfg?.icon
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {cfg?.label ?? value}
    </span>
  )
}

function ValueCell({ row }: { row: Row<JobExecution> }) {
  const { jobTypeKey, currentValue } = row.original

  if (jobTypeKey === 'pump-occlusion') {
    if (currentValue === 'true')
      return <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="OK" />
    if (currentValue === 'false')
      return <XCircle className="h-4 w-4 text-red-600" aria-label="Occlusion detected" />
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return <span className="text-sm">{currentValue ?? '—'}</span>
}

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc') return <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
  if (isSorted === 'desc') return <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
  return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/50" />
}

// ─── log level badge ──────────────────────────────────────────────────────────

const logLevelConfig = {
  INFO:    { className: 'bg-blue-100 text-blue-700' },
  WARNING: { className: 'bg-yellow-100 text-yellow-700' },
  ERROR:   { className: 'bg-red-100 text-red-700' },
} as const

type LogLevel = keyof typeof logLevelConfig

function LogLevelBadge({ level }: { level: string }) {
  const cfg = logLevelConfig[level as LogLevel] ?? logLevelConfig.INFO
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', cfg.className)}>
      {level}
    </span>
  )
}

// ─── expanded row ─────────────────────────────────────────────────────────────

function ExpandedRow({ row }: { row: Row<JobExecution> }) {
  const { logs } = row.original
  const colSpan = row.getVisibleCells().length

  return (
    <tr className="bg-muted/20 border-b">
      <td colSpan={colSpan} className="px-6 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Log Messages
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No log messages recorded.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-px whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                  {formatDateTime(log.timestamp)}
                </span>
                <LogLevelBadge level={log.level} />
                <span className="text-foreground">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

// ─── delete dialog ────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  mode: 'single' | 'filtered' | null
  count?: number
  onConfirm: () => Promise<void>
  onClose: () => void
}

function DeleteDialog({ mode, count, onConfirm, onClose }: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try { await onConfirm() } finally { setIsDeleting(false) }
  }

  return (
    <Dialog open={!!mode} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === 'single' ? 'Delete Execution' : 'Delete Filtered Executions'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {mode === 'single'
            ? 'Are you sure you want to delete this execution? This action cannot be undone.'
            : `Are you sure you want to delete all ${count ?? ''} currently filtered executions? This action cannot be undone.`}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── column definitions ───────────────────────────────────────────────────────

const col = createColumnHelper<JobExecution>()

function buildColumns(onDelete: (row: JobExecution) => void) {
  return [
  // Expand toggle
  col.display({
    id: 'expand',
    enableHiding: false,
    enableSorting: false,
    header: () => null,
    cell: ({ row }) =>
      row.original.logs.length > 0 ? (
        <button
          onClick={row.getToggleExpandedHandler()}
          className="flex items-center justify-center rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
        >
          {row.getIsExpanded()
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />}
        </button>
      ) : (
        <span className="block h-4 w-4" />
      ),
  }),
  col.accessor('startedAt', {
    header: 'Started At',
    cell: (info) => <span className="whitespace-nowrap text-sm">{formatDateTime(info.getValue())}</span>,
    sortingFn: 'datetime',
  }),
  col.accessor('jobTypeKey', {
    header: 'Job Type',
    cell: (info) => <JobTypePill value={info.getValue()} />,
  }),
  col.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  col.display({
    id: 'currentValue',
    header: 'Value',
    cell: ({ row }) => <ValueCell row={row} />,
  }),
  col.display({
    id: 'duration',
    header: 'Duration',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{formatDuration(row.original.startedAt, row.original.finishedAt)}</span>
    ),
  }),
  col.accessor('finishedAt', {
    header: 'Finished At',
    cell: (info) => <span className="whitespace-nowrap text-sm">{formatDateTime(info.getValue())}</span>,
    sortingFn: 'datetime',
  }),
  col.display({
    id: 'needsNotification',
    header: 'Notification',
    cell: ({ row }) => {
      const { notificationSentAt } = row.original
      return notificationSentAt
        ? <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Sent" />
        : <XCircle className="h-4 w-4 text-muted-foreground/50" aria-label="Not sent" />
    },
  }),
  col.accessor('notificationSentAt', {
    header: 'Notified At',
    cell: (info) => <span className="whitespace-nowrap text-sm">{formatDateTime(info.getValue())}</span>,
    sortingFn: 'datetime',
  }),
  col.display({
    id: 'actions',
    enableHiding: false,
    enableSorting: false,
    header: () => null,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          aria-label="Delete execution"
          onClick={() => onDelete(row.original)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  }),
  ]
}

const DEFAULT_HIDDEN: VisibilityState = {
  finishedAt: false,
  needsNotification: false,
  notificationSentAt: false,
}

type DeleteMode = 'single' | 'filtered' | null

// ─── filter bar ───────────────────────────────────────────────────────────────

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'

interface FiltersProps {
  jobTypeKey: string
  status: string
  from: string
  to: string
  onJobTypeKey: (v: string) => void
  onStatus: (v: string) => void
  onFrom: (v: string) => void
  onTo: (v: string) => void
  onReset: () => void
}

function FilterBar({ jobTypeKey, status, from, to, onJobTypeKey, onStatus, onFrom, onTo, onReset }: FiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Job Type</label>
        <select className={selectClass} value={jobTypeKey} onChange={(e) => onJobTypeKey(e.target.value)}>
          <option value="">All types</option>
          {JOB_TYPE_KEYS.map((k) => <option key={k} value={k}>{jobTypeConfig[k]?.label ?? k}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <select className={selectClass} value={status} onChange={(e) => onStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <input type="datetime-local" className={selectClass} value={from} onChange={(e) => onFrom(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <input type="datetime-local" className={selectClass} value={to} onChange={(e) => onTo(e.target.value)} />
      </div>
      <Button variant="ghost" size="sm" onClick={onReset} className="self-end text-muted-foreground">
        Reset
      </Button>
    </div>
  )
}

// ─── column visibility menu ───────────────────────────────────────────────────

const columnLabels: Record<string, string> = {
  startedAt: 'Started At',
  jobTypeKey: 'Job Type',
  status: 'Status',
  currentValue: 'Value',
  duration: 'Duration',
  finishedAt: 'Finished At',
  needsNotification: 'Notification',
  notificationSentAt: 'Notified At',
}

function ColumnVisibilityMenu({ table }: { table: ReturnType<typeof useReactTable<JobExecution>> }) {
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
        {table.getAllColumns()
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
  )
}

// ─── pagination bar ───────────────────────────────────────────────────────────

function PaginationBar({ table }: { table: ReturnType<typeof useReactTable<JobExecution>> }) {
  const { pageIndex, pageSize } = table.getState().pagination
  const total = table.getFilteredRowModel().rows.length
  const pageCount = table.getPageCount()
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? 'No records' : `${from}–${to} of ${total} record${total !== 1 ? 's' : ''}`}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Rows per page</span>
          <select
            className={cn(selectClass, 'w-20')}
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="First page">
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-24 text-center text-sm text-muted-foreground">
            Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8"
            onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} aria-label="Last page">
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── trigger panel ────────────────────────────────────────────────────────────

function TriggerPanel({ onTriggered }: { onTriggered: () => void }) {
  const [selected, setSelected] = useState<Set<JobTypeKey>>(new Set(JOB_TYPE_KEYS))
  const [triggerJobs, { isLoading }] = useTriggerJobsMutation()
  const [done, setDone] = useState(false)

  const toggle = (key: JobTypeKey) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const toggleAll = () =>
    setSelected(selected.size === JOB_TYPE_KEYS.length ? new Set() : new Set(JOB_TYPE_KEYS))

  const handleRun = async () => {
    setDone(false)
    await triggerJobs([...selected] as JobTypeKey[])
    setDone(true)
    onTriggered()
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium shrink-0">Manual trigger</span>

        {/* Select-all toggle */}
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline shrink-0"
        >
          {selected.size === JOB_TYPE_KEYS.length ? 'Deselect all' : 'Select all'}
        </button>

        <div className="flex flex-wrap gap-3">
          {JOB_TYPE_KEYS.map((key) => {
            const cfg = jobTypeConfig[key]
            const Icon = cfg?.icon
            const checked = selected.has(key)
            return (
              <label
                key={key}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors select-none',
                  checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggle(key)}
                />
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                {cfg?.label ?? key}
              </label>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-3 shrink-0">
          {done && !isLoading && (
            <span className="text-sm text-green-600">Jobs triggered</span>
          )}
          <Button
            size="sm"
            className="gap-2"
            onClick={handleRun}
            disabled={isLoading || selected.size === 0}
          >
            {isLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</>
              : <><Play className="h-4 w-4" />Run</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function JobExecutionPage() {
  const [jobTypeKey, setJobTypeKey] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filters = useMemo<JobExecutionFilters>(() => ({
    jobTypeKey: jobTypeKey || undefined,
    status: status || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
  }), [jobTypeKey, status, from, to])

  const { data = [], isLoading, isError, refetch, isFetching } = useGetJobExecutionsQuery(filters)

  const [deleteExecution] = useDeleteJobExecutionMutation()
  const [deleteFiltered] = useDeleteFilteredJobExecutionsMutation()

  const [deleteMode, setDeleteMode] = useState<DeleteMode>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobExecution | null>(null)

  const [sorting, setSorting] = useState<SortingState>([{ id: 'startedAt', desc: true }])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_HIDDEN)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 })
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const handleDeleteRow = (row: JobExecution) => {
    setDeleteTarget(row)
    setDeleteMode('single')
  }

  const columns = useMemo(() => buildColumns(handleDeleteRow), [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, pagination, expanded },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) => row.original.logs.length > 0,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    autoResetPageIndex: true,
  })

  const handleReset = () => {
    setJobTypeKey('')
    setStatus('')
    setFrom('')
    setTo('')
  }

  const handleDeleteConfirm = async () => {
    if (deleteMode === 'single' && deleteTarget) {
      await deleteExecution(deleteTarget._id)
    } else if (deleteMode === 'filtered') {
      await deleteFiltered(filters)
    }
    setDeleteMode(null)
    setDeleteTarget(null)
  }

  const colSpan = table.getVisibleLeafColumns().length
  const totalRows = table.getFilteredRowModel().rows.length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Job Executions</h1>
          <p className="text-muted-foreground">View the history and status of past job executions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 shrink-0">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Trigger panel */}
      <TriggerPanel onTriggered={() => refetch()} />

      {/* Filters + column toggle */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <FilterBar
          jobTypeKey={jobTypeKey} status={status} from={from} to={to}
          onJobTypeKey={setJobTypeKey} onStatus={setStatus} onFrom={setFrom} onTo={setTo}
          onReset={handleReset}
        />
        <div className="flex items-center gap-2">
          {!isLoading && !isError && totalRows > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setDeleteMode('filtered')}
            >
              <Trash2 className="h-4 w-4" />
              Delete filtered ({totalRows})
            </Button>
          )}
          <ColumnVisibilityMenu table={table} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/40">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left font-medium text-muted-foreground',
                        canSort && 'cursor-pointer select-none hover:text-foreground'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon isSorted={header.column.getIsSorted()} />}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">Loading…</td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-destructive">
                  Failed to load executions. Make sure the backend is running.
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                  No executions found for the selected filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="border-b transition-colors hover:bg-muted/30">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && <ExpandedRow row={row} />}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && !isError && <PaginationBar table={table} />}

      {/* Delete dialog */}
      <DeleteDialog
        mode={deleteMode}
        count={totalRows}
        onConfirm={handleDeleteConfirm}
        onClose={() => { setDeleteMode(null); setDeleteTarget(null) }}
      />
    </div>
  )
}
