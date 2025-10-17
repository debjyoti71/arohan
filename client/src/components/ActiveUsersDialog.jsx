import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usersAPI } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function ActiveUsersDialog({ open, onOpenChange }) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchActiveUsers();
      const interval = setInterval(fetchActiveUsers, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [open]);

  const fetchActiveUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getActiveUsers();
      setActiveUsers(response.data);
    } catch (error) {
      console.error('Error fetching active users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Active Users ({activeUsers.length})</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8">Loading active users...</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.alias || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'principal' ? 'secondary' : 'default'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(user.loginTime), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.ipAddress}</TableCell>
                  </TableRow>
                ))}
                {activeUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No active users
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}