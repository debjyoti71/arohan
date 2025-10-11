import React, { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { staffAPI, financeAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, MoreVertical } from 'lucide-react';

export default function Staff() {
  const { hasPermission } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: '',
    qualification: '',
    joinDate: '',
    salary: '',
    contact: ''
  });
  const [editingStaff, setEditingStaff] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStaff();
  }, [pagination.page, searchTerm, selectedRole]);

  const fetchStaff = async () => {
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedRole && { role: selectedRole })
      };
      
      const response = await staffAPI.getAll(params);
      setStaff(response.data.staff);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTransactionLoading(true);
    try {
      const response = await financeAPI.getTransactions({ category: 'salary', type: 'expense', limit: 100 });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await staffAPI.create({
        ...newStaff,
        salary: parseFloat(newStaff.salary),
        joinDate: new Date(newStaff.joinDate)
      });
      
      setShowAddDialog(false);
      setNewStaff({
        name: '',
        role: '',
        qualification: '',
        joinDate: '',
        salary: '',
        contact: ''
      });
      fetchStaff();
    } catch (error) {
      console.error('Error adding staff:', error);
      alert(error.response?.data?.error || 'Error adding staff member');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      try {
        await staffAPI.delete(staffId);
        fetchStaff();
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert(error.response?.data?.error || 'Error deleting staff member');
      }
    }
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    try {
      await staffAPI.update(editingStaff.staffId, {
        ...editingStaff,
        salary: parseFloat(editingStaff.salary),
        joinDate: new Date(editingStaff.joinDate)
      });
      
      setShowEditDialog(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      console.error('Error updating staff:', error);
      alert(error.response?.data?.error || 'Error updating staff member');
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
                  <BreadcrumbPage>Staff</BreadcrumbPage>
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
              <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
              <p className="text-muted-foreground">Manage staff members and their information</p>
            </div>
            {hasPermission('staff', 'create') && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>Enter staff member details to create a new record.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddStaff} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newStaff.name}
                          onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <select
                          id="role"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={newStaff.role}
                          onChange={(e) => setNewStaff(prev => ({ ...prev, role: e.target.value }))}
                          required
                        >
                          <option value="">Select Role</option>

                          <option value="principal">Principal</option>
                          <option value="teacher">Teacher</option>
                          <option value="staff">Staff</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="qualification">Qualification</Label>
                        <Input
                          id="qualification"
                          value={newStaff.qualification}
                          onChange={(e) => setNewStaff(prev => ({ ...prev, qualification: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="joinDate">Join Date</Label>
                        <Input
                          id="joinDate"
                          type="date"
                          value={newStaff.joinDate}
                          onChange={(e) => setNewStaff(prev => ({ ...prev, joinDate: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="salary">Salary</Label>
                        <Input
                          id="salary"
                          type="number"
                          value={newStaff.salary}
                          onChange={(e) => setNewStaff(prev => ({ ...prev, salary: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact">Contact Number</Label>
                        <Input
                          id="contact"
                          value={newStaff.contact}
                          onChange={(e) => setNewStaff(prev => ({ ...prev, contact: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Staff</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Edit Staff Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Staff Member</DialogTitle>
                <DialogDescription>Update staff member details.</DialogDescription>
              </DialogHeader>
              {editingStaff && (
                <form onSubmit={handleEditStaff} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        value={editingStaff.name}
                        onChange={(e) => setEditingStaff(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-role">Role</Label>
                      <select
                        id="edit-role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editingStaff.role}
                        onChange={(e) => setEditingStaff(prev => ({ ...prev, role: e.target.value }))}
                        required
                      >
                        <option value="principal">Principal</option>
                        <option value="teacher">Teacher</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="edit-qualification">Qualification</Label>
                      <Input
                        id="edit-qualification"
                        value={editingStaff.qualification}
                        onChange={(e) => setEditingStaff(prev => ({ ...prev, qualification: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-joinDate">Join Date</Label>
                      <Input
                        id="edit-joinDate"
                        type="date"
                        value={editingStaff.joinDate}
                        onChange={(e) => setEditingStaff(prev => ({ ...prev, joinDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-salary">Salary</Label>
                      <Input
                        id="edit-salary"
                        type="number"
                        value={editingStaff.salary}
                        onChange={(e) => setEditingStaff(prev => ({ ...prev, salary: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-contact">Contact Number</Label>
                      <Input
                        id="edit-contact"
                        value={editingStaff.contact}
                        onChange={(e) => setEditingStaff(prev => ({ ...prev, contact: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update Staff</Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          <Tabs defaultValue="staff" className="w-full" onValueChange={(value) => {
            if (value === 'transactions') {
              fetchTransactions();
            }
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="staff">Staff Management</TabsTrigger>
              <TabsTrigger value="transactions">Transaction History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="staff">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search staff..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <select
                      className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      <option value="principal">Principal</option>
                      <option value="teacher">Teacher</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading staff...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Qualification</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Salary Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((member) => (
                        <TableRow key={member.staffId}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              member.role === 'principal' ? 'bg-purple-100 text-purple-800' :
                              member.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role}
                            </span>
                          </TableCell>
                          <TableCell>{member.qualification}</TableCell>
                          <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                          <TableCell>₹{member.salary.toLocaleString()}</TableCell>
                          <TableCell>{member.contact}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              member.salaryStatus === 'paid' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {member.salaryStatus || 'unpaid'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {hasPermission('staff', 'update') && (
                                  <DropdownMenuItem onClick={() => {
                                    setEditingStaff({
                                      ...member,
                                      joinDate: new Date(member.joinDate).toISOString().split('T')[0]
                                    });
                                    setShowEditDialog(true);
                                  }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {hasPermission('staff', 'delete') && (
                                  <DropdownMenuItem onClick={() => handleDeleteStaff(member.staffId)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} staff members
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                        disabled={pagination.page <= 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm px-3">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.pages}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: pagination.pages }))}
                        disabled={pagination.page >= pagination.pages}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <p className="text-sm text-muted-foreground">View salary distribution history for all staff members</p>
                </CardHeader>
                <CardContent>
                  {transactionLoading ? (
                    <div className="text-center py-8">Loading transactions...</div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>From Account</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.slice((transactionPage - 1) * itemsPerPage, transactionPage * itemsPerPage).map((transaction) => (
                            <TableRow key={transaction.transactionId}>
                              <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                              <TableCell>₹{transaction.amount.toLocaleString()}</TableCell>
                              <TableCell>
                                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                  {transaction.category}
                                </span>
                              </TableCell>
                              <TableCell>{transaction.fromAccount?.name || 'N/A'}</TableCell>
                              <TableCell>{transaction.description}</TableCell>
                            </TableRow>
                          ))}
                          {transactions.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No salary transactions found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      {/* Pagination */}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {Math.min(transactions.length, itemsPerPage)} of {transactions.length} transactions
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setTransactionPage(1)} disabled={transactionPage === 1}>
                            First
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setTransactionPage(prev => prev - 1)} disabled={transactionPage === 1}>
                            Previous
                          </Button>
                          <span className="text-sm px-3">Page {transactionPage} of {Math.ceil(transactions.length / itemsPerPage)}</span>
                          <Button variant="outline" size="sm" onClick={() => setTransactionPage(prev => prev + 1)} disabled={transactionPage >= Math.ceil(transactions.length / itemsPerPage)}>
                            Next
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setTransactionPage(Math.ceil(transactions.length / itemsPerPage))} disabled={transactionPage >= Math.ceil(transactions.length / itemsPerPage)}>
                            Last
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}