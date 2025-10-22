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

import { financeAPI, staffAPI, feesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Wallet, TrendingUp, TrendingDown, ArrowRightLeft, MoreVertical, Edit, Trash2 } from 'lucide-react';

export default function Finance() {
  const { hasPermission } = useAuth();
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('income');
  const [transactionPages, setTransactionPages] = useState({
    income: 1,
    expense: 1,
    transfer: 1
  });
  const [categoryFilters, setCategoryFilters] = useState({
    income: 'all',
    expense: 'all',
    transfer: 'all'
  });
  const recordsPerPage = 10;
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'bank',
    balance: '',
    bankDetails: {
      accountNumber: '',
      bankName: '',
      ifscCode: ''
    }
  });
  
  const [newTransaction, setNewTransaction] = useState({
    type: 'income',
    category: 'fees',
    amount: '',
    description: '',
    fromAccount: '',
    toAccount: '',
    staffId: '',
    transactionDate: new Date().toISOString().split('T')[0]
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, accountsRes, transactionsRes, feeRecordsRes] = await Promise.all([
        financeAPI.getSummary(),
        financeAPI.getAccounts(),
        financeAPI.getTransactions({ limit: 100 }),
        feesAPI.getRecords({ limit: 100 })
      ]);
      
      // Fetch staff separately to avoid breaking other calls
      try {
        const staffRes = await staffAPI.getAll({ limit: 100 });
        setStaff(staffRes.data.staff || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
        setStaff([]);
      }
      
      setSummary(summaryRes.data);
      setAccounts(accountsRes.data);
      setTransactions(transactionsRes.data.transactions || []);
      setFeePayments(feeRecordsRes.data.records || []);
      
      // Combine all transactions
      const combinedTransactions = [
        ...transactionsRes.data.transactions.map(t => ({ ...t, source: 'transaction' })),
        ...feeRecordsRes.data.records
          .filter(r => r.amountPaid > 0)
          .map(r => ({
            transactionId: r._id,
            type: 'income',
            category: 'fees',
            amount: r.amountPaid,
            description: `Fee payment - ${r.feeType?.name || 'Fee'} - ${r.student?.name || 'Student'}`,
            transactionDate: r.lastPaymentDate || r.createdAt,
            source: 'fee_payment'
          }))
      ].sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
      
      setAllTransactions(combinedTransactions);
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      const accountData = {
        ...newAccount,
        balance: parseFloat(newAccount.balance) || 0
      };
      await financeAPI.createAccount(accountData);
      setShowAccountDialog(false);
      setNewAccount({
        name: '',
        type: 'bank',
        balance: '',
        bankDetails: { accountNumber: '', bankName: '', ifscCode: '' }
      });
      fetchData();
    } catch (error) {
      console.error('Error adding account:', error);
      alert(error.response?.data?.error || 'Error adding account');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await financeAPI.deleteAccount(accountId);
        fetchData();
      } catch (error) {
        console.error('Error deleting account:', error);
        alert(error.response?.data?.error || 'Error deleting account');
      }
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      await financeAPI.createTransaction({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      });
      setShowTransactionDialog(false);
      setNewTransaction({
        type: 'income',
        category: 'fees',
        amount: '',
        description: '',
        fromAccount: '',
        toAccount: '',
        transactionDate: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert(error.response?.data?.error || 'Error adding transaction');
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Loading finance data...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

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
                <BreadcrumbPage>Finance</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-3">
            <a 
              href="https://biswajit-chatterjee.dev/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Crafted with precision and passion by Biswajit Chatterjee
            </a>
            <AnimatedThemeToggler className="p-2 rounded-md hover:bg-accent" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Financial Management</h1>
              <p className="text-muted-foreground">Track income, expenses, and account balances</p>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{summary.totalBalance.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{summary.bankBalance.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{summary.cashBalance.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₹{summary.monthlyIncome.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Transactions</CardTitle>
                    {hasPermission('finance', 'create') && (
                      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Transaction
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Transaction</DialogTitle>
                            <DialogDescription>Record a new financial transaction.</DialogDescription>
                          </DialogHeader>
                          <Tabs value={newTransaction.type} onValueChange={(value) => {
                            const defaultCategories = {
                              income: 'fees',
                              expense: 'salary',
                              transfer: 'transfer'
                            };
                            setNewTransaction(prev => ({ 
                              ...prev, 
                              type: value,
                              category: defaultCategories[value],
                              fromAccount: '',
                              toAccount: ''
                            }));
                          }}>
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                              <TabsTrigger value="income">Income</TabsTrigger>
                              <TabsTrigger value="expense">Expense</TabsTrigger>
                              <TabsTrigger value="transfer">Transfer</TabsTrigger>
                            </TabsList>
                            
                            <form onSubmit={handleAddTransaction} className="space-y-4">
                              <TabsContent value="income">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                      id="category"
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={newTransaction.category}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value }))}
                                      required
                                    >
                                      <option value="fees">Fees</option>
                                      <option value="donation">Donation</option>
                                      <option value="investment">Investment</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  <div>
                                    <Label htmlFor="amount">Amount</Label>
                                    <Input
                                      id="amount"
                                      type="number"
                                      value={newTransaction.amount}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="transactionDate">Date</Label>
                                    <Input
                                      id="transactionDate"
                                      type="date"
                                      value={newTransaction.transactionDate}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, transactionDate: e.target.value }))}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="toAccount">To Account</Label>
                                    <select
                                      id="toAccount"
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={newTransaction.toAccount}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, toAccount: e.target.value }))}
                                      required
                                    >
                                      <option value="">Select account</option>
                                      {accounts.map(account => (
                                        <option key={account.accountId} value={account.accountId}>
                                          {account.name} (₹{account.balance.toLocaleString()})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-2">
                                    <Label htmlFor="description">Description {newTransaction.category === 'other' && <span className="text-red-500">*</span>}</Label>
                                    <Input
                                      id="description"
                                      value={newTransaction.description}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                                      required={newTransaction.category === 'other'}
                                    />
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="expense">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                      id="category"
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={newTransaction.category}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, category: e.target.value, staffId: '', amount: '' }))}
                                      required
                                    >
                                      <option value="salary">Salary</option>
                                      <option value="maintenance">Maintenance</option>
                                      <option value="supplies">Supplies</option>
                                      <option value="utilities">Utilities</option>
                                      <option value="transport">Transport</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  {newTransaction.category === 'salary' && (
                                    <div>
                                      <Label htmlFor="staffId">Staff Member</Label>
                                      <select
                                        id="staffId"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={newTransaction.staffId}
                                        onChange={(e) => {
                                          const selectedStaff = staff.find(s => s.staffId === e.target.value);
                                          setNewTransaction(prev => ({ 
                                            ...prev, 
                                            staffId: e.target.value,
                                            amount: selectedStaff ? selectedStaff.salary.toString() : ''
                                          }));
                                        }}
                                        required
                                      >
                                        <option value="">Select staff member</option>
                                        {staff.map(member => (
                                          <option key={member.staffId} value={member.staffId}>
                                            {member.name} - ₹{member.salary.toLocaleString()}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  <div>
                                    <Label htmlFor="amount">Amount</Label>
                                    <Input
                                      id="amount"
                                      type="number"
                                      value={newTransaction.amount}
                                      onChange={(e) => {
                                        if (newTransaction.category === 'salary' && newTransaction.staffId) {
                                          const selectedStaff = staff.find(s => s.staffId === newTransaction.staffId);
                                          const staffSalary = selectedStaff ? selectedStaff.salary : 0;
                                          const enteredAmount = parseFloat(e.target.value) || 0;
                                          if (enteredAmount % staffSalary !== 0) {
                                            return;
                                          }
                                        }
                                        setNewTransaction(prev => ({ ...prev, amount: e.target.value }));
                                      }}
                                      required
                                    />
                                    {newTransaction.category === 'salary' && newTransaction.staffId && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Amount must be multiple of staff salary
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <Label htmlFor="transactionDate">Date</Label>
                                    <Input
                                      id="transactionDate"
                                      type="date"
                                      value={newTransaction.transactionDate}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, transactionDate: e.target.value }))}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="fromAccount">From Account</Label>
                                    <select
                                      id="fromAccount"
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={newTransaction.fromAccount}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, fromAccount: e.target.value }))}
                                      required
                                    >
                                      <option value="">Select account</option>
                                      {accounts.map(account => (
                                        <option key={account.accountId} value={account.accountId}>
                                          {account.name} (₹{account.balance.toLocaleString()})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-2">
                                    <Label htmlFor="description">Description {newTransaction.category === 'other' && <span className="text-red-500">*</span>}</Label>
                                    <Input
                                      id="description"
                                      value={newTransaction.description}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                                      required={newTransaction.category === 'other'}
                                    />
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="transfer">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="amount">Amount</Label>
                                    <Input
                                      id="amount"
                                      type="number"
                                      value={newTransaction.amount}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, amount: e.target.value }))}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="transactionDate">Date</Label>
                                    <Input
                                      id="transactionDate"
                                      type="date"
                                      value={newTransaction.transactionDate}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, transactionDate: e.target.value }))}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="fromAccount">From Account</Label>
                                    <select
                                      id="fromAccount"
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={newTransaction.fromAccount}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, fromAccount: e.target.value }))}
                                      required
                                    >
                                      <option value="">Select account</option>
                                      {accounts.map(account => (
                                        <option key={account.accountId} value={account.accountId}>
                                          {account.name} (₹{account.balance.toLocaleString()})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <Label htmlFor="toAccount">To Account</Label>
                                    <select
                                      id="toAccount"
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      value={newTransaction.toAccount}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, toAccount: e.target.value }))}
                                      required
                                    >
                                      <option value="">Select account</option>
                                      {accounts.filter(account => account.accountId !== newTransaction.fromAccount).map(account => (
                                        <option key={account.accountId} value={account.accountId}>
                                          {account.name} (₹{account.balance.toLocaleString()})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                      id="description"
                                      value={newTransaction.description}
                                      onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                  </div>
                                </div>
                              </TabsContent>
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setShowTransactionDialog(false)}>
                                  Cancel
                                </Button>
                                <Button type="submit">Add Transaction</Button>
                              </DialogFooter>
                            </form>
                          </Tabs>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="income" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Income
                      </TabsTrigger>
                      <TabsTrigger value="expense" className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Expense
                      </TabsTrigger>
                      <TabsTrigger value="transfer" className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Transfer
                      </TabsTrigger>
                    </TabsList>
                    
                    {['income', 'expense', 'transfer'].map(type => {
                      let filteredTransactions = allTransactions.filter(t => t.type === type);
                      
                      // Apply category filter
                      if (categoryFilters[type] !== 'all') {
                        filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilters[type]);
                      }
                      
                      const currentPage = transactionPages[type];
                      const totalPages = Math.ceil(filteredTransactions.length / recordsPerPage);
                      const startIndex = (currentPage - 1) * recordsPerPage;
                      const displayTransactions = filteredTransactions.slice(startIndex, startIndex + recordsPerPage);
                      
                      return (
                        <TabsContent key={type} value={type} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold capitalize">{type} Transactions</h3>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Category:</span>
                                <select
                                  className="flex h-8 w-32 rounded-md border border-input bg-background px-2 py-1 text-xs"
                                  value={categoryFilters[type]}
                                  onChange={(e) => {
                                    setCategoryFilters(prev => ({ ...prev, [type]: e.target.value }));
                                    setTransactionPages(prev => ({ ...prev, [type]: 1 }));
                                  }}
                                >
                                  <option value="all">All Categories</option>
                                  {type === 'income' && (
                                    <>
                                      <option value="fees">Fees</option>
                                      <option value="donation">Donation</option>
                                      <option value="investment">Investment</option>
                                      <option value="other">Other</option>
                                    </>
                                  )}
                                  {type === 'expense' && (
                                    <>
                                      <option value="salary">Salary</option>
                                      <option value="maintenance">Maintenance</option>
                                      <option value="supplies">Supplies</option>
                                      <option value="utilities">Utilities</option>
                                      <option value="transport">Transport</option>
                                      <option value="other">Other</option>
                                    </>
                                  )}
                                  {type === 'transfer' && (
                                    <option value="transfer">Transfer</option>
                                  )}
                                </select>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                Total: {filteredTransactions.length} transactions
                              </span>
                            </div>
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                {type === 'transfer' && (
                                  <>
                                    <TableHead>From Account</TableHead>
                                    <TableHead>To Account</TableHead>
                                  </>
                                )}
                                <TableHead>Amount</TableHead>
                                <TableHead>Source</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {displayTransactions.map((transaction, index) => (
                                <TableRow key={`${transaction.transactionId}-${index}`}>
                                  <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      transaction.category === 'fees' ? 'bg-blue-100 text-blue-800' :
                                      transaction.category === 'salary' ? 'bg-purple-100 text-purple-800' :
                                      transaction.category === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {transaction.category}
                                    </span>
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                                  {type === 'transfer' && (
                                    <>
                                      <TableCell>{transaction.fromAccount?.name || 'N/A'}</TableCell>
                                      <TableCell>{transaction.toAccount?.name || 'N/A'}</TableCell>
                                    </>
                                  )}
                                  <TableCell className={
                                    transaction.type === 'income' ? 'text-green-600 font-semibold' :
                                    transaction.type === 'expense' ? 'text-red-600 font-semibold' : 'font-semibold'
                                  }>
                                    {transaction.type === 'expense' ? '-' : ''}₹{transaction.amount.toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      transaction.source === 'fee_payment' ? 'bg-green-100 text-green-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {transaction.source === 'fee_payment' ? 'Fee Payment' : 'Manual Entry'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {displayTransactions.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={type === 'transfer' ? 7 : 5} className="text-center text-muted-foreground py-8">
                                    No {type} transactions found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                          
                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm text-muted-foreground">
                                Showing {startIndex + 1} to {Math.min(startIndex + recordsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                              </p>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setTransactionPages(prev => ({ ...prev, [type]: 1 }))}
                                  disabled={currentPage === 1}
                                >
                                  First
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setTransactionPages(prev => ({ ...prev, [type]: prev[type] - 1 }))}
                                  disabled={currentPage === 1}
                                >
                                  Previous
                                </Button>
                                <span className="text-sm px-3">
                                  Page {currentPage} of {totalPages}
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setTransactionPages(prev => ({ ...prev, [type]: prev[type] + 1 }))}
                                  disabled={currentPage >= totalPages}
                                >
                                  Next
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setTransactionPages(prev => ({ ...prev, [type]: totalPages }))}
                                  disabled={currentPage >= totalPages}
                                >
                                  Last
                                </Button>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="accounts">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Accounts</CardTitle>
                    {hasPermission('finance', 'create') && (
                      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Account</DialogTitle>
                            <DialogDescription>Create a new bank or cash account.</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddAccount} className="space-y-4">
                            <div>
                              <Label htmlFor="name">Account Name</Label>
                              <Input
                                id="name"
                                value={newAccount.name}
                                onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="type">Account Type</Label>
                              <select
                                id="type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={newAccount.type}
                                onChange={(e) => setNewAccount(prev => ({ ...prev, type: e.target.value }))}
                                required
                              >
                                <option value="bank">Bank Account</option>
                                <option value="cash">Cash Account</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="balance">Initial Balance</Label>
                              <Input
                                id="balance"
                                type="number"
                                value={newAccount.balance}
                                onChange={(e) => setNewAccount(prev => ({ ...prev, balance: e.target.value }))}
                                required
                              />
                            </div>
                            {newAccount.type === 'bank' && (
                              <>
                                <div>
                                  <Label htmlFor="bankName">Bank Name</Label>
                                  <Input
                                    id="bankName"
                                    value={newAccount.bankDetails.bankName}
                                    onChange={(e) => setNewAccount(prev => ({
                                      ...prev,
                                      bankDetails: { ...prev.bankDetails, bankName: e.target.value }
                                    }))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="accountNumber">Account Number</Label>
                                  <Input
                                    id="accountNumber"
                                    value={newAccount.bankDetails.accountNumber}
                                    onChange={(e) => setNewAccount(prev => ({
                                      ...prev,
                                      bankDetails: { ...prev.bankDetails, accountNumber: e.target.value }
                                    }))}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="ifscCode">IFSC Code</Label>
                                  <Input
                                    id="ifscCode"
                                    value={newAccount.bankDetails.ifscCode}
                                    onChange={(e) => setNewAccount(prev => ({
                                      ...prev,
                                      bankDetails: { ...prev.bankDetails, ifscCode: e.target.value }
                                    }))}
                                  />
                                </div>
                              </>
                            )}
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setShowAccountDialog(false)}>
                                Cancel
                              </Button>
                              <Button type="submit">Add Account</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {accounts.map((account) => (
                      <Card key={account.accountId}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{account.name}</CardTitle>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteAccount(account.accountId)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Type:</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                account.type === 'bank' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {account.type}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Balance:</span>
                              <span className="font-semibold">₹{account.balance.toLocaleString()}</span>
                            </div>
                            {account.type === 'bank' && account.bankDetails?.bankName && (
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Bank:</span>
                                <span className="text-sm">{account.bankDetails.bankName}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}