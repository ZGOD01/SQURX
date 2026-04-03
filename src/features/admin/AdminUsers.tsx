import { useAdminStore } from './store';
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Select, Input, Button } from '@/components/ui';
import { PageTransition } from '@/components/motion';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

export function AdminUsers() {
    const { users, toggleUserStatus, updateUserRole } = useAdminStore();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PageTransition className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Identity Management</h1>
                    <p className="text-muted-foreground mt-1">Control access, enforce roles, and moderate the network.</p>
                </div>
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search by name or email..."
                        className="pl-9 h-11 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
                <div className="overflow-x-auto w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role Config</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Authenticaton</TableHead>
                                <TableHead className="text-right">Overrides</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No users matched your query.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id} className="group">
                                        <TableCell>
                                            <div>
                                                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={user.role}
                                                onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                                                className={`h-8 text-xs font-bold ${user.role === 'ADMIN' ? 'bg-destructive/10 text-destructive border-transparent' :
                                                    user.role === 'RECRUITER' ? 'bg-amber-500/10 text-amber-600 border-transparent' :
                                                        'bg-primary/10 text-primary border-transparent'
                                                    }`}
                                                disabled={user.email === 'admin@squrx.com'} // Prevent locking ourselves out
                                            >
                                                <option value="STUDENT">STUDENT</option>
                                                <option value="RECRUITER">RECRUITER</option>
                                                <option value="ADMIN">ADMIN</option>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className={user.status === 'Active' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm' : ''}>
                                                {user.status === 'Suspended' && <XCircle size={12} className="mr-1" />}
                                                {user.status === 'Active' && <CheckCircle size={12} className="mr-1" />}
                                                {user.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-foreground/70">
                                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={user.status === 'Suspended' ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-destructive hover:bg-destructive/10'}
                                                onClick={() => toggleUserStatus(user.id)}
                                                disabled={user.email === 'admin@squrx.com'}
                                            >
                                                {user.status === 'Suspended' ? 'Reactivate' : 'Suspend Node'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </PageTransition>
    );
}
