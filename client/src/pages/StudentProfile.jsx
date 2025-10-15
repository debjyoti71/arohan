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
import { ArrowLeft, User, IndianRupee, Settings, Edit, Trash2, MoreVertical, Camera, Upload } from 'lucide-react';
import { uploadAPI } from '@/lib/api';
import CameraCapture from '@/components/CameraCapture';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [studentImage, setStudentImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

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
        feeTypeId: feeTypeId,
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

  const handleImageCapture = async (file) => {
    setStudentImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!studentImage) return editingStudent.profileImage || '';
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', studentImage);
      const response = await uploadAPI.uploadStudentImage(formData);
      return response.data.imageUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return editingStudent.profileImage || '';
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = editingStudent.profileImage || '';
      if (studentImage) {
        imageUrl = await uploadImage();
      }
      
      const { _id, studentId, class: cls, createdAt, updatedAt, __v, ...updateData } = editingStudent;
      await studentsAPI.update(id, { ...updateData, profileImage: imageUrl });
      setShowEditDialog(false);
      setStudentImage(null);
      setImagePreview('');
      fetchStudentData();
    } catch (error) {
      console.error('Error updating student:', error);
      alert(error.response?.data?.error || 'Error updating student');
    }
  };

  const fetchStudentData = async () => {
    try {
      const studentRes = await studentsAPI.getById(id);
      console.log('Student data:', studentRes.data);
      setStudent(studentRes.data);
      
      const classId = studentRes.data.class?.classId || studentRes.data.classId;
      console.log('Using classId:', classId);
      
      if (classId) {
        const [classFeeRes, studentFeeRes] = await Promise.all([
          feesAPI.getClassStructure(String(classId)),
          studentsAPI.getFeeStructure(id)
        ]);
        console.log('Class fee structure:', classFeeRes.data);
        console.log('Student fee custom:', studentFeeRes.data);
        
        setClassFeeStructure(classFeeRes.data);
        setStudentFeeCustom(studentFeeRes.data);
        
        // Initialize fee customizations
        const customizations = {};
        classFeeRes.data.forEach(fee => {
          const feeTypeId = fee.feeType?.feeTypeId || fee.feeTypeId;
          const custom = studentFeeRes.data.find(c => c.feeTypeId === feeTypeId);
          customizations[feeTypeId] = {
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
          <div className="flex items-center justify-between">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {hasPermission('students', 'update') && (
                  <DropdownMenuItem onClick={() => {
                    setEditingStudent({
                      ...student,
                      classId: student.class?.classId || student.classId,
                      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
                      dateOfAdmission: student.dateOfAdmission ? new Date(student.dateOfAdmission).toISOString().split('T')[0] : ''
                    });
                    setImagePreview(student.profileImage || '');
                    setStudentImage(null);
                    setShowEditDialog(true);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Student
                  </DropdownMenuItem>
                )}
                {hasPermission('students', 'delete') && (
                  <DropdownMenuItem onClick={() => {
                    if (confirm('Are you sure you want to delete this student?')) {
                      studentsAPI.delete(id).then(() => {
                        window.location.href = '/students';
                      }).catch(error => {
                        alert(error.response?.data?.error || 'Error deleting student');
                      });
                    }
                  }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Student
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={student.profileImage || '/default-avatar.png'} 
                    alt={student.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&size=80&background=random`;
                    }}
                  />
                  <div>
                    <h3 className="text-lg font-semibold">{student.name}</h3>
                    <p className="text-sm text-muted-foreground">Admission No: {student.admissionNo}</p>
                  </div>
                </div>
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
                              {classFeeStructure.map((fee) => {
                                const feeTypeId = fee.feeType?.feeTypeId || fee.feeTypeId;
                                const feeName = fee.feeType?.name || fee.name;
                                return (
                                  <TableRow key={feeTypeId}>
                                    <TableCell className="font-medium">{feeName}</TableCell>
                                    <TableCell>₹{fee.amount.toLocaleString()}</TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        value={feeCustomizations[feeTypeId]?.customAmount || fee.amount}
                                        onChange={(e) => handleFeeCustomizationChange(feeTypeId, 'customAmount', e.target.value)}
                                        disabled={!feeCustomizations[feeTypeId]?.isApplicable}
                                        className="w-24"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Checkbox
                                        checked={feeCustomizations[feeTypeId]?.isApplicable ?? true}
                                        onCheckedChange={(checked) => handleFeeCustomizationChange(feeTypeId, 'isApplicable', checked)}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={feeCustomizations[feeTypeId]?.remarks || ''}
                                        onChange={(e) => handleFeeCustomizationChange(feeTypeId, 'remarks', e.target.value)}
                                        placeholder={parseFloat(feeCustomizations[feeTypeId]?.customAmount || fee.amount) !== fee.amount ? "Remarks required" : "Optional remarks"}
                                        required={parseFloat(feeCustomizations[feeTypeId]?.customAmount || fee.amount) !== fee.amount}
                                        className="w-32"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
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
                      const feeTypeId = fee.feeType?.feeTypeId || fee.feeTypeId;
                      const feeName = fee.feeType?.name || fee.name;
                      const feeFrequency = fee.feeType?.frequency || fee.frequency;
                      const custom = studentFeeCustom.find(c => c.feeTypeId === feeTypeId);
                      const isApplicable = custom?.isApplicable ?? true;
                      const amount = custom?.customAmount ?? fee.amount;
                      
                      return (
                        <div key={feeTypeId} className={`flex justify-between items-center p-2 rounded ${!isApplicable ? 'opacity-50' : ''}`}>
                          <div className="flex-1">
                            <p className="font-medium">{feeName}</p>
                            <p className="text-sm text-muted-foreground">{feeFrequency?.replace('_', ' ')}</p>
                            {custom?.remarks && <p className="text-xs text-blue-600 mt-1">{custom.remarks}</p>}
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

          {/* Edit Student Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Student</DialogTitle>
                <DialogDescription>Update student information.</DialogDescription>
              </DialogHeader>
              {editingStudent && (
                <form onSubmit={handleEditStudent} className="space-y-4">
                  {/* Image Upload Section */}
                  <div className="space-y-2">
                    <Label>Student Photo</Label>
                    <div className="flex items-center gap-4">
                      {(imagePreview || editingStudent.profileImage) && (
                        <img 
                          src={imagePreview || editingStudent.profileImage} 
                          alt="Preview" 
                          className="w-20 h-20 rounded-full object-cover border" 
                        />
                      )}
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowCamera(true)}>
                          <Camera className="mr-2 h-4 w-4" />
                          Take Photo
                        </Button>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleImageCapture(file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Button type="button" variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Photo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name">Student Name</Label>
                      <Input
                        id="edit-name"
                        value={editingStudent.name}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-admissionNo">Admission Number</Label>
                      <Input
                        id="edit-admissionNo"
                        value={editingStudent.admissionNo}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, admissionNo: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
                      <Input
                        id="edit-dateOfBirth"
                        type="date"
                        value={editingStudent.dateOfBirth}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-gender">Gender</Label>
                      <select
                        id="edit-gender"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editingStudent.gender || ''}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, gender: e.target.value }))}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="edit-guardianName">Guardian Name</Label>
                      <Input
                        id="edit-guardianName"
                        value={editingStudent.guardianName || ''}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, guardianName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-guardianContact">Guardian Contact</Label>
                      <Input
                        id="edit-guardianContact"
                        value={editingStudent.guardianContact || ''}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, guardianContact: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="edit-address">Address</Label>
                      <Input
                        id="edit-address"
                        value={editingStudent.address || ''}
                        onChange={(e) => setEditingStudent(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploadingImage}>
                      {uploadingImage ? 'Uploading...' : 'Update Student'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Camera Dialog */}
          <Dialog open={showCamera} onOpenChange={setShowCamera}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Take Student Photo</DialogTitle>
                <DialogDescription>
                  Use your camera to take a photo or upload an image file.
                </DialogDescription>
              </DialogHeader>
              <CameraCapture 
                onImageCapture={handleImageCapture}
                onClose={() => setShowCamera(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}