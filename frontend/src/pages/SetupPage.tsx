import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'
import { setupApi, useInstallMutation } from '@/features/setup/setupApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SetupPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [install, { isLoading, error }] = useInstallMutation()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.')
      return
    }

    try {
      const result = await install({ username, password }).unwrap()
      dispatch(setCredentials({ token: result.access_token, username: result.user.username }))
      dispatch(setupApi.util.updateQueryData('getSetupStatus', undefined, () => ({ installed: true })))
      navigate('/admin')
    } catch {
      // error handled via RTK Query state
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <img src="/images/logo.png" alt="Diakem Notify" className="h-44 w-auto" />
        <h1 className="text-center text-2xl font-bold tracking-tight leading-tight">
          <span style={{ color: '#2879C0' }}>Dia</span><span style={{ color: '#3D8B3D' }}>KEM</span>
          <br />
          <span>Control Center</span>
        </h1>
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              Create your administrator account to get started.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Choose a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
              {error && !validationError && (
                <p className="text-sm text-destructive">
                  Setup failed. Please try again.
                </p>
              )}
            </CardContent>
            <CardFooter className="mt-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Setting up...' : 'Create account'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
