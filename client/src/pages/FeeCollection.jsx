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
import { Label } from "@/components/ui/label";
import { feesAPI, studentsAPI, financeAPI, classesAPI } from '@/lib/api';
import { Search, CreditCard, Receipt, Percent, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

export default function FeeCollection() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  const [paymentData, setPaymentData] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState(null);
  const [showFeeRecordsDialog, setShowFeeRecordsDialog] = useState(false);
  const [selectedStudentRecords, setSelectedStudentRecords] = useState([]);
  const [showPaymentDetailsDialog, setShowPaymentDetailsDialog] = useState(false);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, selectedClass, selectedStatus]);

  const fetchAccounts = async () => {
    try {
      const response = await financeAPI.getAccounts();
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const params = { limit: 100 };
      if (selectedClass) params.classId = selectedClass;
      if (selectedStatus) params.status = selectedStatus;
      if (searchTerm) params.search = searchTerm;
      
      const studentsRes = await studentsAPI.getAll(params);
      
      // Get fee records for all students to calculate remaining and paid fees
      const studentsWithFees = await Promise.all(
        studentsRes.data.students.map(async (student) => {
          try {
            const summaryRes = await feesAPI.getStudentFeeSummary(student.studentId);
            const summary = summaryRes.data || [];
            
            const remainingFees = summary.reduce((sum, fee) => 
              sum + (fee.remainingAmount || 0), 0
            );
            const paidFees = summary.reduce((sum, fee) => 
              sum + (fee.totalPaid || 0) + (fee.totalDiscount || 0), 0
            );
            
            // Get last payment date from records
            const feeRecordsRes = await feesAPI.getRecords({ 
              studentId: student.studentId, 
              limit: 10 
            });
            const records = feeRecordsRes.data.records || [];
            const lastPayment = records
              .filter(r => r.lastPaymentDate)
              .sort((a, b) => new Date(b.lastPaymentDate) - new Date(a.lastPaymentDate))[0];
            
            return {
              ...student,
              remainingFees,
              paidFees,
              lastPaymentDate: lastPayment?.lastPaymentDate || null
            };
          } catch (error) {
            console.error(`Error fetching records for student ${student.studentId}:`, error);
            return {
              ...student,
              remainingFees: 0,
              paidFees: 0,
              lastPaymentDate: null
            };
          }
        })
      );
      
      setStudents(studentsWithFees);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll();
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };



  const handleStudentSelect = async (student) => {
    const studentKey = `collect-${student.studentId}`;
    setLoadingStates(prev => ({ ...prev, [studentKey]: true }));
    setSelectedStudent(student);
    try {
      const response = await feesAPI.getStudentFeeSummary(student.studentId || student._id);
      setStudentFees(response.data || []);
      
      // Initialize payment data
      const initialPaymentData = {};
      (response.data || []).forEach(fee => {
        initialPaymentData[fee.feeTypeId] = {
          payingAmount: 0,
          discount: 0,
          discountRemarks: '',
          finalAmount: 0
        };
      });
      setPaymentData(initialPaymentData);
      setShowPaymentDialog(true);
    } catch (error) {
      console.error('Error fetching student fees:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [studentKey]: false }));
    }
  };

  const handlePaymentChange = (feeId, field, value) => {
    setPaymentData(prev => {
      const updated = {
        ...prev,
        [feeId]: {
          ...prev[feeId],
          [field]: value
        }
      };
      
      // Recalculate final amount when paying amount or discount changes
      if (field === 'payingAmount' || field === 'discount') {
        const fee = studentFees.find(f => f.feeTypeId === feeId);
        const remainingAmount = fee?.remainingAmount || 0;
        
        let payingAmount = parseFloat(field === 'payingAmount' ? value : updated[feeId].payingAmount || 0);
        let discount = parseFloat(field === 'discount' ? value : updated[feeId].discount || 0);
        
        // Ensure total doesn't exceed remaining amount
        const total = payingAmount + discount;
        if (total > remainingAmount) {
          if (field === 'payingAmount') {
            payingAmount = Math.max(0, remainingAmount - discount);
            updated[feeId].payingAmount = payingAmount;
          } else {
            discount = Math.max(0, remainingAmount - payingAmount);
            updated[feeId].discount = discount;
          }
        }
        
        updated[feeId].finalAmount = payingAmount + discount;
      }
      
      return updated;
    });
  };

  const handlePayment = async () => {
    if (!selectedAccount) {
      toast.warning('Account selection required', {
        description: 'Please select an account to add the payment to before proceeding.'
      });
      return;
    }
    
    setLoadingStates(prev => ({ ...prev, recordPayment: true }));
    try {
      const totalCollected = Object.values(paymentData).reduce((sum, data) => sum + (parseFloat(data.payingAmount) || 0), 0);
      
      let latestPaymentId = null;
      
      // First generate fee records if they don't exist
      const currentDate = new Date();
      await feesAPI.generateFees({ 
        month: currentDate.getMonth() + 1, 
        year: currentDate.getFullYear() 
      });
      
      // Get existing fee records for this student
      const recordsResponse = await feesAPI.getRecords({ 
        studentId: selectedStudent.studentId || selectedStudent._id,
        limit: 50 
      });
      const existingRecords = recordsResponse.data.records || [];
      
      // Process payments using existing payment endpoint
      const paymentsToProcess = [];
      
      for (const [feeTypeId, data] of Object.entries(paymentData)) {
        if (data.finalAmount > 0) {
          // Find fee record for this fee type
          const feeRecord = studentFees.find(f => f.feeTypeId === feeTypeId);
          
          if (feeRecord) {
            const amountPaid = parseFloat(data.payingAmount) || 0;
            const discount = parseFloat(data.discount) || 0;
            const discountRemarks = data.discountRemarks || '';
            
            console.log('Payment data for fee:', feeTypeId, { amountPaid, discount, discountRemarks });
            
            // Validate discount remarks if discount is applied
            if (discount > 0 && (!discountRemarks || discountRemarks.toString().trim() === '')) {
              toast.warning(`Discount remarks required`, {
                description: `Please enter discount remarks for ${feeRecord.feeType || 'fee'} before proceeding with payment.`
              });
              return;
            }
            
            if (amountPaid > 0) {
              paymentsToProcess.push({
                feeRecordId: feeRecord.recordId,
                amountPaid,
                discount,
                discountRemarks,
                paymentMethod: 'cash'
              });
            }
          }
        }
      }
      
      if (paymentsToProcess.length > 0) {
        const paymentResponse = await feesAPI.recordPayment({ payments: paymentsToProcess });
        
        // Join payment IDs into comma-separated string
        latestPaymentId = paymentResponse.data.paymentIds.join(',');
      } else {
        throw new Error('No valid payments to process');
      }
      
      // Add actual collected amount to selected account
      if (totalCollected > 0) {
        await financeAPI.createTransaction({
          type: 'income',
          category: 'fees',
          amount: totalCollected,
          description: `Fee collection from ${selectedStudent.name}`,
          toAccount: selectedAccount,
          transactionDate: new Date().toISOString()
        });
      }
      
      setLastPaymentId(latestPaymentId);
      setShowSuccessDialog(true);
      fetchStudents();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Payment failed', {
        description: error.message || 'An error occurred while recording the payment. Please try again.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, recordPayment: false }));
    }
  };

  const getTotalDue = () => {
    return Object.values(paymentData).reduce((sum, data) => sum + (data.finalAmount || 0), 0);
  };

  const downloadReceipt = async (paymentId, studentName) => {
    setDownloadingReceipt(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const receiptResponse = await fetch(`${API_BASE_URL}/fees/receipt/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!receiptResponse.ok) {
        const errorText = await receiptResponse.text();
        console.error('Receipt generation failed:', errorText);
        throw new Error('Failed to generate receipt');
      }

      const blob = await receiptResponse.blob();
      
      if (blob.size === 0) {
        throw new Error('Received empty PDF');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `receipt-${studentName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Receipt download failed', {
        description: `Unable to download receipt: ${error.message}`
      });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const showFeeRecords = async (student) => {
    const studentKey = `records-${student.studentId}`;
    setLoadingStates(prev => ({ ...prev, [studentKey]: true }));
    try {
      const response = await feesAPI.getRecords({ studentId: student.studentId, limit: 50 });
      setSelectedStudentRecords(response.data.records || []);
      setSelectedStudent(student);
      setShowFeeRecordsDialog(true);
    } catch (error) {
      console.error('Error fetching fee records:', error);
      toast.error('Failed to load fee records', {
        description: 'Unable to fetch fee records for this student. Please try again.'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [studentKey]: false }));
    }
  };

  const showPaymentDetails = (record) => {
    setSelectedPaymentDetails(record);
    setShowPaymentDetailsDialog(true);
  };

  const recalculateAmounts = () => {
    setPaymentData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(feeId => {
        const payingAmount = parseFloat(updated[feeId].payingAmount || 0);
        const discount = parseFloat(updated[feeId].discount || 0);
        updated[feeId].finalAmount = payingAmount + discount; // Total deducted from due
      });
      return updated;
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Arohan School</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Fee Collection</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <AnimatedThemeToggler className="p-2 rounded-md hover:bg-accent" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Fee Collection</h1>
              <p className="text-muted-foreground">Manage fee payments for all students</p>
            </div>
            <Button onClick={async () => {
              try {
                const currentDate = new Date();
                await feesAPI.generateFees({ 
                  month: currentDate.getMonth() + 1, 
                  year: currentDate.getFullYear() 
                });
                toast.success('Fee records generated', {
                  description: 'Fee records have been generated successfully. Data is being refreshed.'
                });
                fetchStudents();
              } catch (error) {
                console.error('Error generating fees:', error);
                toast.error('Fee generation failed', {
                  description: 'An error occurred while generating fee records. Please try again.'
                });
              }
            }}>
              Generate Fee Records
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search students by name, guardian name, or admission number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.classId} value={cls.classId}>
                      {cls.className}
                    </option>
                  ))}
                </select>
                <select
                  className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading students...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Photo</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Admission No</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Guardian</TableHead>
                        <TableHead>Remaining Fees</TableHead>
                        <TableHead>Paid Fees</TableHead>
                        <TableHead>Last Payment Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((student) => (
                        <TableRow key={student.studentId}>
                          <TableCell>
                            <img 
                              src={student.profileImage || '/default-avatar.png'} 
                              alt={student.name}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&size=32&background=random`;
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.admissionNo}</TableCell>
                          <TableCell>{student.class?.className}</TableCell>
                          <TableCell>{student.guardianName}</TableCell>
                          <TableCell className={student.remainingFees > 0 ? 'font-semibold text-red-600' : 'text-green-600'}>
                            ₹{student.remainingFees.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            ₹{student.paidFees.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {student.lastPaymentDate ? new Date(student.lastPaymentDate).toLocaleDateString() : 'No payments'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleStudentSelect(student)}
                                variant={student.remainingFees > 0 ? 'default' : 'outline'}
                                disabled={loadingStates[`collect-${student.studentId}`]}
                              >
                                {loadingStates[`collect-${student.studentId}`] ? (
                                  <Spinner className="mr-2 h-4 w-4" />
                                ) : (
                                  <CreditCard className="mr-2 h-4 w-4" />
                                )}
                                {student.remainingFees > 0 ? 'Collect' : 'Payment'}
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => showFeeRecords(student)}
                                disabled={loadingStates[`records-${student.studentId}`]}
                              >
                                {loadingStates[`records-${student.studentId}`] ? (
                                  <Spinner className="mr-2 h-4 w-4" />
                                ) : (
                                  <Receipt className="mr-2 h-4 w-4" />
                                )}
                                Fee Records
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {Math.min(students.length, itemsPerPage)} of {students.length} students
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                        First
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>
                        Previous
                      </Button>
                      <span className="text-sm px-3">Page {currentPage} of {Math.ceil(students.length / itemsPerPage)}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= Math.ceil(students.length / itemsPerPage)}>
                        Next
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.ceil(students.length / itemsPerPage))} disabled={currentPage >= Math.ceil(students.length / itemsPerPage)}>
                        Last
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Collect Payment - {selectedStudent?.name}</DialogTitle>
              <DialogDescription>
                Record fee payment for {selectedStudent?.admissionNo}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Paying Amount</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Total Deducted</TableHead>
                    <TableHead>Discount Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentFees.map((fee) => (
                    <TableRow key={fee.feeTypeId} className={fee.remainingAmount <= 0 ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{fee.feeType} ({fee.paymentRatio} {fee.frequency})</TableCell>
                      <TableCell>₹{fee.remainingAmount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">₹</span>
                          <Input
                            type="number"
                            value={paymentData[fee.feeTypeId]?.payingAmount || 0}
                            onChange={(e) => handlePaymentChange(fee.feeTypeId, 'payingAmount', e.target.value)}
                            className="w-24"
                            min="0"
                            max={fee.remainingAmount}
                            placeholder="0"
                            disabled={fee.remainingAmount <= 0}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">₹</span>
                          <Input
                            type="number"
                            value={paymentData[fee.feeTypeId]?.discount || 0}
                            onChange={(e) => handlePaymentChange(fee.feeTypeId, 'discount', e.target.value)}
                            className="w-24"
                            min="0"
                            max={fee.remainingAmount}
                            placeholder="0"
                            disabled={fee.remainingAmount <= 0}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{paymentData[fee.feeTypeId]?.finalAmount?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            value={paymentData[fee.feeTypeId]?.discountRemarks || ''}
                            onChange={(e) => handlePaymentChange(fee.feeTypeId, 'discountRemarks', e.target.value)}
                            placeholder={paymentData[fee.feeTypeId]?.discount > 0 ? "Required" : "Optional"}
                            required={paymentData[fee.feeTypeId]?.discount > 0}
                            className={`w-32 ${paymentData[fee.feeTypeId]?.discount > 0 ? 'border-blue-300 bg-blue-50 focus:border-blue-500' : ''}`}
                            disabled={fee.remainingAmount <= 0}
                          />
                          {paymentData[fee.feeTypeId]?.discount > 0 && (
                            <span className="absolute -top-1 -right-3 text-blue-500 text-sm font-bold">*</span>
                          )}
                        </div>
                        {/* {paymentData[fee.feeTypeId]?.discount > 0 && !paymentData[fee.feeTypeId]?.discountRemarks?.trim() && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                            Required
                          </p>
                        )} */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button onClick={recalculateAmounts} variant="outline">
                    Recalculate Total
                  </Button>
                  <Button onClick={async () => {
                    try {
                      await financeAPI.triggerAutoGeneration();
                      alert('Fee generation triggered! Please refresh and try again.');
                    } catch (error) {
                      console.error('Error triggering fee generation:', error);
                    }
                  }} variant="outline">
                    Generate Fees
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label>Add to Account:</Label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map(account => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.name} (₹{account.balance?.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-muted rounded">
                  <span className="text-lg font-semibold">Total Amount to Collect:</span>
                  <span className="text-xl font-bold text-green-600">₹{Object.values(paymentData).reduce((sum, data) => sum + (parseFloat(data.payingAmount) || 0), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 text-sm text-muted-foreground">
                  <span>Total Deducted from Due (Including Discount):</span>
                  <span>₹{getTotalDue().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowPaymentDialog(false);
                setSelectedAccount('');
                setLastPaymentId(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={!selectedAccount || Object.values(paymentData).some(data => 
                  data.discount > 0 && (!data.discountRemarks || !data.discountRemarks.trim())
                ) || loadingStates.recordPayment}
              >
                {loadingStates.recordPayment ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Receipt className="mr-2 h-4 w-4" />
                )}
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={(open) => {
          setShowSuccessDialog(open);
          if (!open) {
            setShowPaymentDialog(false);
            setSelectedStudent(null);
            setStudentFees([]);
            setPaymentData({});
            setSelectedAccount('');
            setLastPaymentId(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment Recorded Successfully!</DialogTitle>
              <DialogDescription>
                The fee payment has been recorded and added to the selected account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowSuccessDialog(false);
                setShowPaymentDialog(false);
              }}>
                Close
              </Button>
              {lastPaymentId && (
                <Button 
                  onClick={() => {
                    downloadReceipt(lastPaymentId, selectedStudent?.name || 'Student');
                    setShowSuccessDialog(false);
                    setShowPaymentDialog(false);
                  }}
                  disabled={downloadingReceipt}
                >
                  {downloadingReceipt ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {downloadingReceipt ? 'Generating...' : 'Print Receipt'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fee Records Dialog */}
        <Dialog open={showFeeRecordsDialog} onOpenChange={setShowFeeRecordsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fee Records - {selectedStudent?.name}</DialogTitle>
              <DialogDescription>
                All payment records for {selectedStudent?.admissionNo}
              </DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStudentRecords.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell>{new Date(record.lastPaymentDate || record.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{record.feeType?.name}</TableCell>
                    <TableCell>₹{((record.totalPaid || 0) + (record.totalDiscount || 0)).toLocaleString()}</TableCell>
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
                      <Button size="sm" variant="outline" onClick={() => showPaymentDetails(record)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFeeRecordsDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Details Dialog */}
        <Dialog open={showPaymentDetailsDialog} onOpenChange={setShowPaymentDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>
            {selectedPaymentDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fee Type</Label>
                    <p className="font-medium">{selectedPaymentDetails.feeType?.name}</p>
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <p className="font-medium">{new Date(selectedPaymentDetails.lastPaymentDate || selectedPaymentDetails.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label>Amount Due</Label>
                    <p className="font-medium">₹{selectedPaymentDetails.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Amount Paid</Label>
                    <p className="font-medium text-green-600">₹{selectedPaymentDetails.totalPaid?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Discount</Label>
                    <p className="font-medium">{selectedPaymentDetails.totalDiscount ? `₹${selectedPaymentDetails.totalDiscount.toLocaleString()}` : 'None'}</p>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <p className="font-medium">{selectedPaymentDetails.paymentMethod || 'Cash'}</p>
                  </div>
                </div>
                {selectedPaymentDetails.totalDiscount > 0 && (
                  <div>
                    <Label>Discount Remarks</Label>
                    <p className="font-medium">{selectedPaymentDetails.discountRemarks || 'N/A'}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDetailsDialog(false)}>
                Close
              </Button>
              {selectedPaymentDetails && selectedPaymentDetails.totalPaid > 0 && (
                <Button 
                  onClick={() => {
                    downloadReceipt(selectedPaymentDetails._id, selectedStudent?.name || 'Student');
                    setShowPaymentDetailsDialog(false);
                  }}
                  disabled={downloadingReceipt}
                >
                  {downloadingReceipt ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {downloadingReceipt ? 'Generating...' : 'Download Receipt'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}