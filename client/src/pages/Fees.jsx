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
import { Plus, Search, IndianRupee, AlertCircle, Edit, Trash2, MoreVertical, Eye } from 'lucide-react';

export default function Fees() {
  const { hasPermission } = useAuth();
  const [classes, setClasses] = useState([]);
  const [classFeeStructures, setClassFeeStructures] = useState([]);
  const [collectionRecords, setCollectionRecords] = useState([]);
  const [collectionDetails, setCollectionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('structures');

  const [showAddFeeDialog, setShowAddFeeDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [newFee, setNewFee] = useState({
    classId: '',
    name: '',
    amount: '',
    frequency: '',
    description: ''
  });
  const [editingFee, setEditingFee] = useState(null);
  const [showEditFeeDialog, setShowEditFeeDialog] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [collectionPage, setCollectionPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInitialData();
    if (activeTab === 'collections') {
      fetchCollectionRecords();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const classesRes = await classesAPI.getAll();
      setClasses(classesRes.data);
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

  const fetchCollectionRecords = async () => {
    try {
      const response = await feesAPI.getCollectionRecords({ page: collectionPage, limit: itemsPerPage });
      setCollectionRecords(response.data.collections || []);
    } catch (error) {
      console.error('Error fetching collection records:', error);
    }
  };

  const handleViewDetails = async (collectionId) => {
    try {
      const response = await feesAPI.getCollectionDetails(collectionId);
      setCollectionDetails(response.data);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Error fetching collection details:', error);
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

          {/* Collection Details Dialog */}
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Fee Collection Details</DialogTitle>
                <DialogDescription>Breakdown of fees paid in this collection</DialogDescription>
              </DialogHeader>
              {collectionDetails && (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Type</TableHead>
                        <TableHead>Month/Year</TableHead>
                        <TableHead>Amount Due</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Discount Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collectionDetails.details.map((detail, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{detail.feeType}</TableCell>
                          <TableCell>{detail.month}/{detail.year}</TableCell>
                          <TableCell>₹{detail.amountDue.toLocaleString()}</TableCell>
                          <TableCell>₹{detail.amountPaid.toLocaleString()}</TableCell>
                          <TableCell>₹{detail.discount.toLocaleString()}</TableCell>
                          <TableCell>{detail.discountRemarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Due: </span>
                        ₹{collectionDetails.summary.totalDue.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Total Paid: </span>
                        ₹{collectionDetails.summary.totalPaid.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Total Discount: </span>
                        ₹{collectionDetails.summary.totalDiscount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>





          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
            <Button
              variant={activeTab === 'structures' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('structures')}
            >
              Fee Structures
            </Button>
            <Button
              variant={activeTab === 'collections' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('collections')}
            >
              Fee Collections
            </Button>
          </div>

          {activeTab === 'structures' && (
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
                    {classFeeStructures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((structure) => (
                      <TableRow key={structure.classFeeId}>
                        <TableCell className="font-medium">{structure.class?.className || 'N/A'}</TableCell>
                        <TableCell>{structure.feeType?.name || 'N/A'}</TableCell>
                        <TableCell>₹{structure.amount?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {structure.feeType?.frequency?.replace('_', ' ') || 'N/A'}
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
                              {hasPermission('fees', 'update') && structure.feeType && (
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
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {Math.min(classFeeStructures.length, itemsPerPage)} of {classFeeStructures.length} fee structures
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                      First
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <span className="text-sm px-3">Page {currentPage} of {Math.ceil(classFeeStructures.length / itemsPerPage)}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= Math.ceil(classFeeStructures.length / itemsPerPage)}>
                      Next
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.ceil(classFeeStructures.length / itemsPerPage))} disabled={currentPage >= Math.ceil(classFeeStructures.length / itemsPerPage)}>
                      Last
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'collections' && (
            <Card>
              <CardHeader>
                <CardTitle>Fee Collection Records</CardTitle>
                <CardDescription>Payment collections grouped by student and date</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Fee Count</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collectionRecords.map((collection) => (
                      <TableRow key={collection.collectionId}>
                        <TableCell className="font-medium">{collection.student.name}</TableCell>
                        <TableCell>{collection.student.admissionNo}</TableCell>
                        <TableCell>{collection.student.className}</TableCell>
                        <TableCell>{new Date(collection.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell>₹{collection.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>₹{collection.totalDiscount.toLocaleString()}</TableCell>
                        <TableCell>{collection.feeCount} fees</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {collection.paymentMethod}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(collection.collectionId)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </TableCell>
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