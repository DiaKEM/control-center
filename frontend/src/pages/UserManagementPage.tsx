import { useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  type User,
  type UserRole,
} from '@/features/users/usersApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(iso),
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        role === 'admin'
          ? 'bg-purple-100 text-purple-800'
          : 'bg-blue-100 text-blue-800',
      )}
    >
      {role}
    </span>
  );
}

// ─── error helper ─────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return fallback;
}

// ─── role checkboxes ──────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = ['admin', 'user'];

function RoleCheckboxes({
  value,
  onChange,
}: {
  value: UserRole[];
  onChange: (v: UserRole[]) => void;
}) {
  const toggle = (role: UserRole) =>
    onChange(
      value.includes(role) ? value.filter((r) => r !== role) : [...value, role],
    );

  return (
    <div className="flex gap-4">
      {ALL_ROLES.map((role) => (
        <label
          key={role}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={value.includes(role)}
            onChange={() => toggle(role)}
          />
          {role}
        </label>
      ))}
    </div>
  );
}

// ─── create dialog ────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function CreateUserDialog({ open, onOpenChange }: CreateDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<UserRole[]>(['user']);
  const [createUser, { isLoading, error }] = useCreateUserMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({ username, password, roles }).unwrap();
      setUsername('');
      setPassword('');
      setRoles(['user']);
      onOpenChange(false);
    } catch {
      // error shown via RTK state
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>Add a new user to the system.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-username">Username</Label>
            <Input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Roles</Label>
            <RoleCheckboxes value={roles} onChange={setRoles} />
          </div>
          {error && (
            <p className="text-sm text-destructive">
              {extractErrorMessage(error, 'Failed to create user.')}
            </p>
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || roles.length === 0}>
              {isLoading ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── edit dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  user: User | null;
  onOpenChange: (v: boolean) => void;
}

function EditUserDialog({ user, onOpenChange }: EditDialogProps) {
  const [roles, setRoles] = useState<UserRole[]>(user?.roles ?? ['user']);
  const [password, setPassword] = useState('');
  const [updateUser, { isLoading, error }] = useUpdateUserMutation();

  // Sync roles when user prop changes
  const currentRoles = user?.roles ?? ['user'];
  if (
    user &&
    JSON.stringify(roles) !== JSON.stringify(currentRoles) &&
    !isLoading &&
    password === '' &&
    roles === currentRoles
  ) {
    setRoles(currentRoles);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await updateUser({
        id: user._id,
        roles,
        ...(password ? { password } : {}),
      }).unwrap();
      setPassword('');
      onOpenChange(false);
    } catch {
      // error shown via RTK state
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update roles or password for <strong>{user?.username}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Username</Label>
            <Input
              value={user?.username ?? ''}
              disabled
              className="opacity-60"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Roles</Label>
            <RoleCheckboxes value={roles} onChange={setRoles} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-password">
              New Password{' '}
              <span className="text-xs text-muted-foreground">
                (leave blank to keep current)
              </span>
            </Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">
              {extractErrorMessage(error, 'Failed to update user.')}
            </p>
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || roles.length === 0}>
              {isLoading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── delete dialog ────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  user: User | null;
  onOpenChange: (v: boolean) => void;
}

function DeleteUserDialog({ user, onOpenChange }: DeleteDialogProps) {
  const [deleteUser, { isLoading, error }] = useDeleteUserMutation();

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteUser(user._id).unwrap();
      onOpenChange(false);
    } catch {
      // error shown via RTK state
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{user?.username}</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive">
            {extractErrorMessage(error, 'Failed to delete user.')}
          </p>
        )}
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { data: users = [], isLoading, isError } = useGetUsersQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users and their roles.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Username
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Roles
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-destructive"
                >
                  Failed to load users.
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 opacity-30" />
                    <p>No users yet. Create one to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user._id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <RoleBadge key={r} role={r} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditUser(user)}
                        aria-label={`Edit ${user.username}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteUser(user)}
                        aria-label={`Delete ${user.username}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {users.length} user{users.length !== 1 ? 's' : ''}
      </p>

      {/* Dialogs */}
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog
        user={editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      />
      <DeleteUserDialog
        user={deleteUser}
        onOpenChange={(open) => {
          if (!open) setDeleteUser(null);
        }}
      />
    </div>
  );
}
