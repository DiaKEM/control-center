import { useNavigate, useLocation, Link } from 'react-router-dom'
import { BriefcaseBusiness, ChevronDown, LayoutDashboard, LogOut, Settings, User, Users } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout, selectUsername } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const jobItems = [
  { label: 'Job Configurations', to: '/jobs/configuration' },
  { label: 'Job Executions',     to: '/jobs/execution' },
]

export default function Navbar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const username = useAppSelector(selectUsername)

  const dashboardActive = location.pathname === '/dashboard'
  const jobsActive = location.pathname.startsWith('/jobs')

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-6 px-6">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 select-none hover:opacity-80 transition-opacity">
          <img src="/images/navbar.png" alt="Diakem Notify" className="h-8 w-auto" />
          <span className="text-lg font-bold tracking-tight">
            <span style={{ color: '#2879C0' }}>Dia</span><span style={{ color: '#3D8B3D' }}>KEM</span>
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <button
            onClick={() => navigate('/dashboard')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              dashboardActive
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            Dashboard
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  jobsActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                )}
              >
                <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden />
                Jobs
                <ChevronDown className="h-3 w-3" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {jobItems.map(({ label, to }) => (
                <DropdownMenuItem
                  key={to}
                  className={cn('cursor-pointer', location.pathname === to && 'bg-secondary')}
                  onClick={() => navigate(to)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" aria-hidden />
              <span className="max-w-32 truncate text-sm">{username}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Signed in as</span>
                <span className="truncate font-medium">{username}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/users')}
            >
              <Users className="h-4 w-4" aria-hidden />
              User Management
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/admin')}
            >
              <Settings className="h-4 w-4" aria-hidden />
              Administration
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => dispatch(logout())}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
