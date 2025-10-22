import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { studentsAPI, classesAPI, feesAPI, uploadAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight, Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import CameraCapture from '@/components/CameraCapture';

export default function Students() {
  const { hasPermission } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [newStudent, setNewStudent] = useState({
    name: '',
    admissionNo: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    dateOfAdmission: '',
    email: '',
    aadhar: '',
    classId: '',
    guardianName: '',
    guardianContact: '',
    guardianOccupation: '',
    guardianQualification: '',
    address: '',
    profileImage: ''
  });
  const [selectedClassFees, setSelectedClassFees] = useState([]);
  const [feeCustomizations, setFeeCustomizations] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [studentImage, setStudentImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, selectedClass, selectedStatus]);



  const fetchStudents = async () => {
    try {
      const params = { limit: 100 };
      if (selectedClass) params.classId = selectedClass;
      if (selectedStatus) params.status = selectedStatus;
      if (searchTerm) params.search = searchTerm;
      
      const response = await studentsAPI.getAll(params);
      setStudents(response.data.students);
      setFilteredStudents(response.data.students);
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

  const handleClassChange = async (classId) => {
    setNewStudent(prev => ({ ...prev, classId }));
    
    if (classId) {
      try {
        const response = await feesAPI.getClassStructure(classId);
        setSelectedClassFees(response.data);
        
        // Initialize fee customizations with default values
        const customizations = {};
        response.data.forEach(fee => {
          customizations[fee.feeTypeId] = {
            isApplicable: true,
            customAmount: fee.amount,
            remarks: ''
          };
        });
        setFeeCustomizations(customizations);
      } catch (error) {
        console.error('Error fetching class fees:', error);
      }
    } else {
      setSelectedClassFees([]);
      setFeeCustomizations({});
    }
  };

  const handleFeeCustomizationChange = (feeTypeId, field, value) => {
    setFeeCustomizations(prev => ({
      ...prev,
      [feeTypeId]: {
        ...prev[feeTypeId],
        [field]: value
      }
    }));
  };

  const handleImageCapture = async (file) => {
    setStudentImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!studentImage) return '';
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', studentImage);
      const response = await uploadAPI.uploadStudentImage(formData);
      return response.data.imageUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return '';
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddStudent = async () => {
    setAddingStudent(true);
    try {
      let imageUrl = '';
      if (studentImage) {
        imageUrl = await uploadImage();
      }
      
      const studentData = {
        ...newStudent,
        profileImage: imageUrl
      };
      
      const response = await studentsAPI.create(studentData);
      
      // Update fee structure if customizations exist
      if (Object.keys(feeCustomizations).length > 0) {
        const customizations = Object.entries(feeCustomizations)
          .filter(([feeTypeId, data]) => data.isApplicable !== false)
          .map(([feeTypeId, data]) => ({
            feeTypeId: feeTypeId,
            customAmount: parseFloat(data.customAmount || 0),
            isApplicable: data.isApplicable !== false,
            remarks: data.remarks || ''
          }));
        
        if (customizations.length > 0) {
          await studentsAPI.updateFeeStructure(response.data.studentId, { customizations });
        }
      }
      
      // Generate fee records for current month
      const currentDate = new Date();
      await feesAPI.generateFees({ 
        month: currentDate.getMonth() + 1, 
        year: currentDate.getFullYear() 
      });
      
      setShowAddDialog(false);
      setCurrentStep(1);
      setNewStudent({
        name: '',
        admissionNo: '',
        dateOfBirth: '',
        gender: '',
        bloodGroup: '',
        dateOfAdmission: '',
        email: '',
        aadhar: '',
        classId: '',
        guardianName: '',
        guardianContact: '',
        guardianOccupation: '',
        guardianQualification: '',
        address: '',
        profileImage: ''
      });
      setSelectedClassFees([]);
      setFeeCustomizations({});
      setStudentImage(null);
      setImagePreview('');
      fetchStudents();
    } catch (error) {
      console.error('Error adding student:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to add student', {
        description: error.response?.data?.error || 'An error occurred while adding the student.'
      });
    } finally {
      setAddingStudent(false);
    }
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
                <BreadcrumbPage>Students</BreadcrumbPage>
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

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Students</h1>
              <p className="text-muted-foreground">Manage student records</p>
            </div>
            {hasPermission('students', 'create') && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Student - Step {currentStep} of 3</DialogTitle>
                    <DialogDescription>
                      {currentStep === 1 && "Enter basic student information"}
                      {currentStep === 2 && "Enter guardian and contact details"}
                      {currentStep === 3 && "Customize fee structure"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddStudent} className="space-y-6">
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Student Information</h3>
                        
                        {/* Image Upload Section */}
                        <div className="space-y-2">
                          <Label>Student Photo</Label>
                          <div className="flex items-center gap-4">
                            {imagePreview && (
                              <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border" />
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
                            <Label htmlFor="name">Student Name</Label>
                            <Input
                              id="name"
                              value={newStudent.name}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="admissionNo">Admission Number</Label>
                            <Input
                              id="admissionNo"
                              value={newStudent.admissionNo}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, admissionNo: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                            <Input
                              id="dateOfBirth"
                              type="date"
                              value={newStudent.dateOfBirth}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="gender">Gender</Label>
                            <select
                              id="gender"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={newStudent.gender}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, gender: e.target.value }))}
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="bloodGroup">Blood Group</Label>
                            <select
                              id="bloodGroup"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={newStudent.bloodGroup}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, bloodGroup: e.target.value }))}
                            >
                              <option value="">Select Blood Group (Optional)</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="dateOfAdmission">Date of Admission</Label>
                            <Input
                              id="dateOfAdmission"
                              type="date"
                              value={newStudent.dateOfAdmission}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, dateOfAdmission: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newStudent.email}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="aadhar">Aadhar Number (Optional)</Label>
                            <Input
                              id="aadhar"
                              value={newStudent.aadhar}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, aadhar: e.target.value }))}
                              maxLength={12}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Guardian & Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="classId">Class</Label>
                            <select
                              id="classId"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={newStudent.classId}
                              onChange={(e) => handleClassChange(e.target.value)}
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
                            <Label htmlFor="guardianName">Guardian Name</Label>
                            <Input
                              id="guardianName"
                              value={newStudent.guardianName}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, guardianName: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="guardianContact">Guardian Contact</Label>
                            <Input
                              id="guardianContact"
                              value={newStudent.guardianContact}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, guardianContact: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="guardianOccupation">Guardian Occupation (Optional)</Label>
                            <Input
                              id="guardianOccupation"
                              value={newStudent.guardianOccupation}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, guardianOccupation: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="guardianQualification">Guardian Qualification (Optional)</Label>
                            <Input
                              id="guardianQualification"
                              value={newStudent.guardianQualification || ''}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, guardianQualification: e.target.value }))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                              id="address"
                              value={newStudent.address}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, address: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {currentStep === 3 && selectedClassFees.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Fee Structure Customization</h3>
                        <p className="text-sm text-muted-foreground">
                          Customize fees for this student or use default class fees.
                        </p>
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
                            {selectedClassFees.map((fee) => (
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
                                  <div className="relative">
                                    <Input
                                      value={feeCustomizations[fee.feeTypeId]?.remarks || ''}
                                      onChange={(e) => handleFeeCustomizationChange(fee.feeTypeId, 'remarks', e.target.value)}
                                      placeholder={parseFloat(feeCustomizations[fee.feeTypeId]?.customAmount || fee.amount) !== fee.amount ? "Required" : "Optional"}
                                      required={parseFloat(feeCustomizations[fee.feeTypeId]?.customAmount || fee.amount) !== fee.amount}
                                      className={`w-32 ${parseFloat(feeCustomizations[fee.feeTypeId]?.customAmount || fee.amount) !== fee.amount ? 'border-blue-300 bg-blue-50' : ''}`}
                                    />
                                    {parseFloat(feeCustomizations[fee.feeTypeId]?.customAmount || fee.amount) !== fee.amount && (
                                      <span className="absolute -top-1 -right-1 text-blue-500 text-xs font-bold">*</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    <DialogFooter className="flex justify-between">
                      <div>
                        <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        {currentStep > 1 && (
                          <Button type="button" variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Previous
                          </Button>
                        )}
                        {currentStep < 3 ? (
                          <Button 
                            type="button" 
                            onClick={() => {
                              if (currentStep === 1 && (!newStudent.name || !newStudent.admissionNo)) {
                                toast.warning('Required fields missing', {
                                  description: 'Please fill in student name and admission number to continue.'
                                });
                                return;
                              }
                              if (currentStep === 2 && !newStudent.classId) {
                                toast.warning('Class selection required', {
                                  description: 'Please select a class for the student to continue.'
                                });
                                return;
                              }
                              setCurrentStep(prev => prev + 1);
                            }}
                          >
                            Next
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            type="button" 
                            onClick={handleAddStudent} 
                            disabled={uploadingImage || addingStudent || Object.entries(feeCustomizations).some(([feeTypeId, data]) => {
                              const fee = selectedClassFees.find(f => f.feeTypeId === feeTypeId);
                              return fee && parseFloat(data.customAmount || fee.amount) !== fee.amount && (!data.remarks || !data.remarks.trim());
                            })}
                          >
                            {addingStudent ? (
                              <>
                                <Spinner className="mr-2 h-4 w-4" />
                                Adding Student...
                              </>
                            ) : uploadingImage ? (
                              'Uploading...'
                            ) : (
                              'Add Student'
                            )}
                          </Button>
                        )}
                      </div>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
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

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search students by 'name' or 'guardian name' or 'admission number'..."
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
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((student) => (
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
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/students/${student.studentId}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {Math.min(filteredStudents.length, itemsPerPage)} of {filteredStudents.length} students
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                        First
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}>
                        Previous
                      </Button>
                      <span className="text-sm px-3">Page {currentPage} of {Math.ceil(filteredStudents.length / itemsPerPage)}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= Math.ceil(filteredStudents.length / itemsPerPage)}>
                        Next
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.ceil(filteredStudents.length / itemsPerPage))} disabled={currentPage >= Math.ceil(filteredStudents.length / itemsPerPage)}>
                        Last
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}