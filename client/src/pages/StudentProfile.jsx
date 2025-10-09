import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { studentsAPI, feesAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, IndianRupee, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export default function StudentProfile() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [student, setStudent] = useState(null);
  const [classFeeStructure, setClassFeeStructure] = useState([]);
  const [studentFeeCustom, setStudentFeeCustom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [feeCustomizations, setFeeCustomizations] = useState({});

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleFeeCustomizationChange = (feeTypeId, field, value) => {
    setFeeCustomizations(prev => ({
      ...prev,
      [feeTypeId]: {
        ...prev[feeTypeId],
        [field]: value
      }
    }));
  };

  const handleSaveFeeStructure = async () => {
    try {
      const customizations = Object.entries(feeCustomizations).map(([feeTypeId, data]) => ({
        feeTypeId: parseInt(feeTypeId),
        ...data,
        customAmount: parseFloat(data.customAmount)
      }));
      
      await studentsAPI.updateFeeStructure(id, { customizations });
      setShowFeeDialog(false);
      fetchStudentData();
    } catch (error) {
      console.error('Error saving fee structure:', error);
      alert(error.response?.data?.error || 'Error saving fee structure');
    }
  };

  const fetchStudentData = async () => {
    try {
      const studentRes = await studentsAPI.getById(id);
      setStudent(studentRes.data);
      
      if (studentRes.data.classId) {
        const [classFeeRes, studentFeeRes] = await Promise.all([
          feesAPI.getClassStructure(studentRes.data.classId),
          studentsAPI.getFeeStructure(id)
        ]);
        setClassFeeStructure(classFeeRes.data);
        setStudentFeeCustom(studentFeeRes.data);
        
        // Initialize fee customizations
        const customizations = {};
        classFeeRes.data.forEach(fee => {
          const custom = studentFeeRes.data.find(c => c.feeTypeId === fee.feeTypeId);
          customizations[fee.feeTypeId] = {
            isApplicable: custom?.isApplicable ?? true,
            customAmount: custom?.customAmount ?? fee.amount,
            remarks: custom?.remarks ?? ''
          };
        });
        setFeeCustomizations(customizations);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Loading student profile...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!student) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Student not found</div>
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
                <BreadcrumbLink href="/students">Students</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{student.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <AnimatedThemeToggler className="p-2 rounded-md hover:bg-accent" />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/students">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Students
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{student.name}</h1>
              <p className="text-muted-foreground">Admission No: {student.admissionNo}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{student.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Class</p>
                    <p className="font-medium">{student.class?.className}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Guardian Name</p>
                    <p className="font-medium">{student.guardianName || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">{student.guardianContact || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5" />
                    Fee Structure
                  </div>
                  {hasPermission('fees', 'update') && (
                    <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Customize
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Customize Fee Structure for {student.name}</DialogTitle>
                          <DialogDescription>
                            Modify fee amounts or disable specific fees for this student.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fee Type</TableHead>
                                <TableHead>Default Amount</TableHead>
                                <TableHead>Custom Amount</TableHead>
                                <TableHead>Applicable</TableHead>
                                <TableHead>Remarks</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {classFeeStructure.map((fee) => (
                                <TableRow key={fee.feeTypeId}>
                                  <TableCell className="font-medium">{fee.feeType.name}</TableCell>
                                  <TableCell>₹{fee.amount.toLocaleString()}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      value={feeCustomizations[fee.feeTypeId]?.customAmount || fee.amount}
                                      onChange={(e) => handleFeeCustomizationChange(fee.feeTypeId, 'customAmount', e.target.value)}
                                      disabled={!feeCustomizations[fee.feeTypeId]?.isApplicable}
                                      className="w-24"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Checkbox
                                      checked={feeCustomizations[fee.feeTypeId]?.isApplicable ?? true}
                                      onCheckedChange={(checked) => handleFeeCustomizationChange(fee.feeTypeId, 'isApplicable', checked)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={feeCustomizations[fee.feeTypeId]?.remarks || ''}
                                      onChange={(e) => handleFeeCustomizationChange(fee.feeTypeId, 'remarks', e.target.value)}
                                      placeholder="Optional remarks"
                                      className="w-32"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowFeeDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveFeeStructure}>Save Changes</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {classFeeStructure.length > 0 ? (
                  <div className="space-y-3">
                    {classFeeStructure.map((fee) => {
                      const custom = studentFeeCustom.find(c => c.feeTypeId === fee.feeTypeId);
                      const isApplicable = custom?.isApplicable ?? true;
                      const amount = custom?.customAmount ?? fee.amount;
                      
                      return (
                        <div key={fee.feeTypeId} className={`flex justify-between items-center p-2 rounded ${!isApplicable ? 'opacity-50' : ''}`}>
                          <div>
                            <p className="font-medium">{fee.feeType.name}</p>
                            <p className="text-sm text-muted-foreground">{fee.feeType.frequency.replace('_', ' ')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₹{amount.toLocaleString()}</p>
                            {!isApplicable && <p className="text-xs text-red-600">Not applicable</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No fee structure defined for this class.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}