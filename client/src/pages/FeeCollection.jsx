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
import { feesAPI, studentsAPI, financeAPI } from '@/lib/api';
import { Search, CreditCard, Receipt, Percent } from 'lucide-react';

export default function FeeCollection() {
  const [dueStudents, setDueStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  const [paymentData, setPaymentData] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');

  useEffect(() => {
    fetchDueStudents();
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await financeAPI.getAccounts();
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchDueStudents = async () => {
    try {
      const response = await feesAPI.getDueSummary();
      setDueStudents(response.data);
    } catch (error) {
      console.error('Error fetching due students:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const response = await studentsAPI.getAll({ search: term, limit: 10 });
      setSearchResults(response.data.students);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleStudentSelect = async (student) => {
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
      setSearchResults([]);
      setSearchTerm('');
    } catch (error) {
      console.error('Error fetching student fees:', error);
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
        const payingAmount = parseFloat(field === 'payingAmount' ? value : updated[feeId].payingAmount || 0);
        const discount = parseFloat(field === 'discount' ? value : updated[feeId].discount || 0);
        updated[feeId].finalAmount = payingAmount + discount; // Total deducted from due
      }
      
      return updated;
    });
  };

  const handlePayment = async () => {
    if (!selectedAccount) {
      alert('Please select an account to add the payment to');
      return;
    }
    
    try {
      const totalCollected = Object.values(paymentData).reduce((sum, data) => sum + (parseFloat(data.payingAmount) || 0), 0);
      
      // Process fee payments
      const payments = Object.entries(paymentData).map(([feeTypeId, data]) => ({
        studentId: selectedStudent.studentId || selectedStudent._id,
        feeTypeId,
        amount: data.finalAmount, // Total deducted (paying + discount)
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString()
      }));

      for (const payment of payments) {
        if (payment.amount > 0) {
          await feesAPI.processPaymentWithRatio(payment);
        }
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
      
      setShowPaymentDialog(false);
      setSelectedStudent(null);
      setStudentFees([]);
      setPaymentData({});
      setSelectedAccount('');
      fetchDueStudents();
      
      alert('Payment recorded and added to account successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    }
  };

  const getTotalDue = () => {
    return Object.values(paymentData).reduce((sum, data) => sum + (data.finalAmount || 0), 0);
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
              <p className="text-muted-foreground">Manage fee payments and due amounts</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search student for payment..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  searchStudents(e.target.value);
                }}
                className="pl-10 w-80"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-background border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                  {searchResults.map(student => (
                    <div
                      key={student.studentId}
                      className="p-3 hover:bg-accent cursor-pointer border-b border-border"
                      onClick={() => handleStudentSelect(student)}
                    >
                      <div className="font-medium text-foreground">{student.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.admissionNo} • {student.guardianName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Students with Due Fees</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading due fees...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Guardian Name</TableHead>
                      <TableHead>Guardian Contact</TableHead>
                      <TableHead>Total Due Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueStudents.map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.admissionNo}</TableCell>
                        <TableCell>{student.guardianName}</TableCell>
                        <TableCell>{student.guardianContact}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          ₹{student.totalDue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => handleStudentSelect(student)}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Collect Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                    <TableRow key={fee.feeTypeId}>
                      <TableCell className="font-medium">{fee.feeType} ({fee.paymentRatio})</TableCell>
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
                            placeholder="0"
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
                            placeholder="0"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{paymentData[fee.feeTypeId]?.finalAmount?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={paymentData[fee.feeTypeId]?.discountRemarks || ''}
                          onChange={(e) => handlePaymentChange(fee.feeTypeId, 'discountRemarks', e.target.value)}
                          placeholder={paymentData[fee.feeTypeId]?.discount > 0 ? "Required" : "Optional"}
                          required={paymentData[fee.feeTypeId]?.discount > 0}
                          className="w-32"
                        />
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
              }}>
                Cancel
              </Button>
              <Button onClick={handlePayment} disabled={!selectedAccount}>
                <Receipt className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}