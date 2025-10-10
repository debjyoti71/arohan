import React, { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { feesAPI, classesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, IndianRupee, AlertCircle, Calendar, Edit, Trash2, MoreVertical } from 'lucide-react';

export default function Fees() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('class-fees');
  const [classes, setClasses] = useState([]);
  const [classFeeStructures, setClassFeeStructures] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [dueSummary, setDueSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAddFeeDialog, setShowAddFeeDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const [newFee, setNewFee] = useState({
    classId: '',
    name: '',
    amount: '',
    frequency: '',
    description: ''
  });
  const [editingFee, setEditingFee] = useState(null);
  const [showEditFeeDialog, setShowEditFeeDialog] = useState(false);
  const [generateData, setGenerateData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    classIds: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [classesRes, dueSummaryRes] = await Promise.all([
        classesAPI.getAll(),
        feesAPI.getDueSummary()
      ]);
      
      setClasses(classesRes.data);
      setDueSummary(dueSummaryRes.data);
      fetchClassFeeStructures();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassFeeStructures = async () => {
    try {
      const response = await feesAPI.getClassFeeStructure();
      setClassFeeStructures(response.data);
    } catch (error) {
      console.error('Error fetching class fee structures:', error);
    }
  };

  const fetchFeeRecords = async () => {
    try {
      const response = await feesAPI.getRecords({ limit: 50 });
      setFeeRecords(response.data.feeRecords);
    } catch (error) {
      console.error('Error fetching fee records:', error);
    }
  };



  const handleAddFee = async (e) => {
    e.preventDefault();
    try {
      // Create fee type
      const feeTypeResponse = await feesAPI.createType({
        name: newFee.name,
        frequency: newFee.frequency,
        defaultAmount: parseFloat(newFee.amount),
        description: newFee.description
      });
      
      // Create class fee structure
      await feesAPI.createClassFeeStructure({
        classId: newFee.classId,
        feeTypeId: feeTypeResponse.data.feeTypeId,
        amount: parseFloat(newFee.amount)
      });
      
      setShowAddFeeDialog(false);
      setNewFee({
        classId: '',
        name: '',
        amount: '',
        frequency: '',
        description: ''
      });
      fetchInitialData();
    } catch (error) {
      console.error('Error adding fee:', error);
      alert(error.response?.data?.error || 'Error adding fee');
    }
  };

  const handleGenerateFees = async (e) => {
    e.preventDefault();
    try {
      const response = await feesAPI.generateFees(generateData);
      alert(response.data.message);
      setShowGenerateDialog(false);
      fetchInitialData();
    } catch (error) {
      console.error('Error generating fees:', error);
      alert(error.response?.data?.error || 'Error generating fees');
    }
  };

  const toggleClassSelection = (classId) => {
    setGenerateData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId]
    }));
  };



  const handleDeleteClassFeeStructure = async (classFeeId) => {
    if (confirm('Are you sure you want to remove this fee from the class?')) {
      try {
        await feesAPI.deleteClassFeeStructure(classFeeId);
        fetchClassFeeStructures();
      } catch (error) {
        console.error('Error deleting class fee structure:', error);
        alert(error.response?.data?.error || 'Error deleting class fee structure');
      }
    }
  };

  const handleEditFee = async (e) => {
    e.preventDefault();
    try {
      await feesAPI.updateType(editingFee.feeTypeId, {
        name: editingFee.name,
        frequency: editingFee.frequency,
        defaultAmount: parseFloat(editingFee.amount),
        description: editingFee.description
      });
      
      setShowEditFeeDialog(false);
      setEditingFee(null);
      fetchInitialData();
    } catch (error) {
      console.error('Error updating fee:', error);
      alert(error.response?.data?.error || 'Error updating fee');
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Loading fees data...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

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
                  <BreadcrumbPage>Fees</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="px-4">
            <AnimatedThemeToggler className="p-2 rounded-md hover:bg-accent" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
              <p className="text-muted-foreground">Manage fee types, structures, and payments</p>
            </div>
            <div className="flex gap-2">
              {hasPermission('fees', 'create') && (
                <>

                  
                  <Dialog open={showAddFeeDialog} onOpenChange={setShowAddFeeDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Fee
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Fee</DialogTitle>
                        <DialogDescription>Create a new fee for a class with all details.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddFee} className="space-y-4">
                        <div>
                          <Label htmlFor="classId">Class</Label>
                          <select
                            id="classId"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={newFee.classId}
                            onChange={(e) => setNewFee(prev => ({ ...prev, classId: e.target.value }))}
                            required
                          >
                            <option value="">Select Class</option>
                            {classes.map(cls => (
                              <option key={cls.classId} value={cls.classId}>
                                {cls.className}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="name">Fee Name</Label>
                          <Input
                            id="name"
                            value={newFee.name}
                            onChange={(e) => setNewFee(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Tuition Fee, Transport Fee"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={newFee.amount}
                            onChange={(e) => setNewFee(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="frequency">Frequency</Label>
                          <select
                            id="frequency"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={newFee.frequency}
                            onChange={(e) => setNewFee(prev => ({ ...prev, frequency: e.target.value }))}
                            required
                          >
                            <option value="">Select Frequency</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="biannual">Biannual</option>
                            <option value="yearly">Yearly</option>
                            <option value="one_time">One Time</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Input
                            id="description"
                            value={newFee.description}
                            onChange={(e) => setNewFee(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Optional description"
                          />
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowAddFeeDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Add Fee</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Calendar className="mr-2 h-4 w-4" />
                        Generate Fees
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate Monthly Fees</DialogTitle>
                        <DialogDescription>Generate fee records for selected classes and month.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleGenerateFees} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="month">Month</Label>
                            <select
                              id="month"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={generateData.month}
                              onChange={(e) => setGenerateData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                            >
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="year">Year</Label>
                            <Input
                              id="year"
                              type="number"
                              value={generateData.year}
                              onChange={(e) => setGenerateData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Select Classes (leave empty for all classes)</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {classes.map(cls => (
                              <label key={cls.classId} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={generateData.classIds.includes(cls.classId)}
                                  onChange={() => toggleClassSelection(cls.classId)}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm">{cls.className}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowGenerateDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Generate Fees</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Fee Dialog */}
                  <Dialog open={showEditFeeDialog} onOpenChange={setShowEditFeeDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Fee</DialogTitle>
                        <DialogDescription>Update fee details.</DialogDescription>
                      </DialogHeader>
                      {editingFee && (
                        <form onSubmit={handleEditFee} className="space-y-4">
                          <div>
                            <Label htmlFor="edit-name">Fee Name</Label>
                            <Input
                              id="edit-name"
                              value={editingFee.name}
                              onChange={(e) => setEditingFee(prev => ({ ...prev, name: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-amount">Amount</Label>
                            <Input
                              id="edit-amount"
                              type="number"
                              value={editingFee.amount}
                              onChange={(e) => setEditingFee(prev => ({ ...prev, amount: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-frequency">Frequency</Label>
                            <select
                              id="edit-frequency"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={editingFee.frequency}
                              onChange={(e) => setEditingFee(prev => ({ ...prev, frequency: e.target.value }))}
                              required
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="biannual">Biannual</option>
                              <option value="yearly">Yearly</option>
                              <option value="one_time">One Time</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                              id="edit-description"
                              value={editingFee.description}
                              onChange={(e) => setEditingFee(prev => ({ ...prev, description: e.target.value }))}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditFeeDialog(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">Update Fee</Button>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>

                </>
              )}
            </div>
          </div>

          {/* Outstanding Fees Alert */}
          {dueSummary && dueSummary.summary.totalOutstanding > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-800">Outstanding Fees Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700">
                  ₹{dueSummary.summary.totalOutstanding.toLocaleString()} in outstanding fees from {dueSummary.summary.recordCount} records need attention.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setActiveTab('class-fees');
                fetchClassFeeStructures();
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'class-fees' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Class Fees
            </button>
            <button
              onClick={() => {
                setActiveTab('records');
                fetchFeeRecords();
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'records' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Payment Records
            </button>
            <button
              onClick={() => setActiveTab('due')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'due' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
              }`}
            >
              Due Fees
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'class-fees' && (
            <Card>
              <CardHeader>
                <CardTitle>Class Fee Structures</CardTitle>
                <CardDescription>Fee assignments for each class</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classFeeStructures.map((structure) => (
                      <TableRow key={structure.classFeeId}>
                        <TableCell className="font-medium">{structure.class.className}</TableCell>
                        <TableCell>{structure.feeType.name}</TableCell>
                        <TableCell>₹{structure.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {structure.feeType.frequency.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            structure.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {structure.active ? 'Active' : 'Inactive'}
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
                              {hasPermission('fees', 'update') && (
                                <DropdownMenuItem onClick={() => {
                                  setEditingFee({
                                    feeTypeId: structure.feeType.feeTypeId,
                                    name: structure.feeType.name,
                                    frequency: structure.feeType.frequency,
                                    amount: structure.amount,
                                    description: structure.feeType.description || ''
                                  });
                                  setShowEditFeeDialog(true);
                                }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {hasPermission('fees', 'delete') && (
                                <DropdownMenuItem onClick={() => handleDeleteClassFeeStructure(structure.classFeeId)}>
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
              </CardContent>
            </Card>
          )}

          {activeTab === 'records' && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Payment Records</CardTitle>
                <CardDescription>Latest fee payments received</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount Due</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeRecords.map((record) => (
                      <TableRow key={record.feeRecordId}>
                        <TableCell className="font-medium">{record.student.name}</TableCell>
                        <TableCell>{record.feeType.name}</TableCell>
                        <TableCell>{record.month}</TableCell>
                        <TableCell>₹{record.amountDue.toLocaleString()}</TableCell>
                        <TableCell>₹{record.amountPaid.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            record.status === 'paid' ? 'bg-green-100 text-green-800' :
                            record.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {record.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeTab === 'due' && dueSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Outstanding Fees</CardTitle>
                <CardDescription>Students with unpaid or partially paid fees</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Due Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueSummary.dueFees.map((record) => (
                      <TableRow key={record.feeRecordId}>
                        <TableCell className="font-medium">{record.student.name}</TableCell>
                        <TableCell>{record.student.class.className}</TableCell>
                        <TableCell>{record.feeType.name}</TableCell>
                        <TableCell>{record.month}</TableCell>
                        <TableCell>₹{record.amountDue.toLocaleString()}</TableCell>
                        <TableCell>₹{record.amountPaid.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          ₹{(record.amountDue - record.amountPaid).toLocaleString()}
                        </TableCell>
                        <TableCell>{new Date(record.dueDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}