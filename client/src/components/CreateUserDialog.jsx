import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usersAPI } from '@/lib/api';

export default function CreateUserDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '',
    alias: '',
    customPermissions: []
  });
  const [predefinedRoles, setPredefinedRoles] = useState({});
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        usersAPI.getPredefinedRoles(),
        usersAPI.getAllPermissions()
      ]);
      setPredefinedRoles(rolesRes.data);
      setAllPermissions(permissionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await usersAPI.create(formData);
      onSuccess();
      onOpenChange(false);
      setFormData({
        username: '',
        password: '',
        role: '',
        alias: '',
        customPermissions: []
      });
    } catch (error) {
      alert(error.response?.data?.error || 'Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (resource, action, checked) => {
    setFormData(prev => {
      const newPermissions = [...prev.customPermissions];
      const existingIndex = newPermissions.findIndex(p => p.resource === resource && p.action === action);
      
      if (checked && existingIndex === -1) {
        newPermissions.push({ resource, action });
      } else if (!checked && existingIndex !== -1) {
        newPermissions.splice(existingIndex, 1);
      }
      
      return { ...prev, customPermissions: newPermissions };
    });
  };

  const isPermissionChecked = (resource, action) => {
    return formData.customPermissions.some(p => p.resource === resource && p.action === action);
  };

  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>
            
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="alias">Alias (Optional)</Label>
            <Input
              id="alias"
              value={formData.alias}
              onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(predefinedRoles).map(([key, role]) => (
                  <SelectItem key={key} value={key}>
                    {role.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Role</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.role === 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle>Custom Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                    <div key={resource} className="space-y-2">
                      <h4 className="font-medium capitalize">{resource}</h4>
                      {permissions.map(perm => (
                        <div key={`${perm.resource}-${perm.action}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${perm.resource}-${perm.action}`}
                            checked={isPermissionChecked(perm.resource, perm.action)}
                            onCheckedChange={(checked) => handlePermissionChange(perm.resource, perm.action, checked)}
                          />
                          <Label htmlFor={`${perm.resource}-${perm.action}`} className="text-sm">
                            {perm.description}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {formData.role && formData.role !== 'custom' && predefinedRoles[formData.role] && (
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(predefinedRoles[formData.role].permissions).map(([resource, actions]) => (
                    <div key={resource} className="space-y-1">
                      <h4 className="font-medium capitalize">{resource}</h4>
                      <div className="text-sm text-muted-foreground">
                        {actions.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}