import React, { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { classesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Users, Trash2, Edit, MoreVertical } from 'lucide-react';

export default function Classes() {
  const { hasPermission } = useAuth();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClass, setNewClass] = useState({
    className: '',
    classTeacherId: ''
  });
  const [editingClass, setEditingClass] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll();
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await classesAPI.getAvailableTeachers();
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await classesAPI.create({
        ...newClass,
        classTeacherId: newClass.classTeacherId || null
      });
      
      setShowAddDialog(false);
      setNewClass({
        className: '',
        classTeacherId: ''
      });
      fetchClasses();
      fetchTeachers();
    } catch (error) {
      console.error('Error adding class:', error);
      alert(error.response?.data?.error || 'Error adding class');
    }
  };

  const handleDeleteClass = async (classId) => {
    if (confirm('Are you sure you want to delete this class?')) {
      try {
        await classesAPI.delete(classId);
        fetchClasses();
      } catch (error) {
        console.error('Error deleting class:', error);
        alert(error.response?.data?.error || 'Error deleting class');
      }
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      await classesAPI.update(editingClass.classId, {
        className: editingClass.className,
        classTeacherId: editingClass.classTeacherId || null
      });
      
      setShowEditDialog(false);
      setEditingClass(null);
      fetchClasses();
      fetchTeachers();
    } catch (error) {
      console.error('Error updating class:', error);
      alert(error.response?.data?.error || 'Error updating class');
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Arohan School</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Classes</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <AnimatedThemeToggler className="p-2 rounded-md hover:bg-accent" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
              <p className="text-muted-foreground">Manage classes and assign teachers</p>
            </div>
            {hasPermission('classes', 'create') && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Class
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Class</DialogTitle>
                    <DialogDescription>Create a new class and assign a class teacher.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddClass} className="space-y-4">
                    <div>
                      <Label htmlFor="className">Class Name</Label>
                      <Input
                        id="className"
                        value={newClass.className}
                        onChange={(e) => setNewClass(prev => ({ ...prev, className: e.target.value }))}
                        placeholder="e.g., Class 1, Class 2A"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="classTeacherId">Class Teacher (Optional)</Label>
                      <select
                        id="classTeacherId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newClass.classTeacherId}
                        onChange={(e) => setNewClass(prev => ({ ...prev, classTeacherId: e.target.value }))}
                      >
                        <option value="">Select Teacher</option>
                        {teachers.map(teacher => (
                          <option key={teacher.staffId} value={teacher.staffId}>
                            {teacher.name} ({teacher.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Class</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Edit Class Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Class</DialogTitle>
                <DialogDescription>Update class details and teacher assignment.</DialogDescription>
              </DialogHeader>
              {editingClass && (
                <form onSubmit={handleEditClass} className="space-y-4">
                  <div>
                    <Label htmlFor="edit-className">Class Name</Label>
                    <Input
                      id="edit-className"
                      value={editingClass.className}
                      onChange={(e) => setEditingClass(prev => ({ ...prev, className: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-classTeacherId">Class Teacher</Label>
                    <select
                      id="edit-classTeacherId"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editingClass.classTeacherId}
                      onChange={(e) => setEditingClass(prev => ({ ...prev, classTeacherId: e.target.value }))}
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(teacher => (
                        <option key={teacher.staffId} value={teacher.staffId}>
                          {teacher.name} ({teacher.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update Class</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full text-center py-8">Loading classes...</div>
            ) : (
              classes.map((cls) => (
                <Card key={cls.classId}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">{cls.className}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {hasPermission('classes', 'update') && (
                          <DropdownMenuItem onClick={() => {
                            setEditingClass({
                              classId: cls.classId,
                              className: cls.className,
                              classTeacherId: cls.classTeacher?.staffId || ''
                            });
                            setShowEditDialog(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {hasPermission('classes', 'delete') && (
                          <DropdownMenuItem onClick={() => handleDeleteClass(cls.classId)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {cls._count?.students || 0} students
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Class Teacher:</p>
                        <p className="font-medium">
                          {cls.classTeacher ? cls.classTeacher.name : 'Not assigned'}
                        </p>
                      </div>
                      {cls.classTeacher && (
                        <div>
                          <p className="text-sm text-muted-foreground">Role:</p>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            cls.classTeacher.role === 'principal' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {cls.classTeacher.role}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {!loading && classes.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No classes found. Create your first class to get started.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}