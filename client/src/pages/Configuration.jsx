import React, { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { configAPI, classesAPI } from '@/lib/api';
import { Settings, ArrowUp, FileText, AlertTriangle, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function Configuration() {
  const [feesConfig, setFeesConfig] = useState(null);
  const [salaryConfig, setSalaryConfig] = useState(null);
  const [yearProgressionConfig, setYearProgressionConfig] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const [feesRes, salaryRes, yearProgressionRes, classesRes] = await Promise.all([
        configAPI.getFeesConfig(),
        configAPI.getSalaryConfig(),
        configAPI.getYearProgressionConfig(),
        classesAPI.getAll()
      ]);
      setFeesConfig(feesRes.data);
      setSalaryConfig(salaryRes.data);
      setYearProgressionConfig(yearProgressionRes.data);
      setClasses(classesRes.data || []);
    } catch (error) {
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const saveFeesConfig = async () => {
    setSaving(true);
    try {
      await configAPI.updateFeesConfig(feesConfig);
      toast.success('Fees configuration updated successfully');
    } catch (error) {
      toast.error('Failed to update fees configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveSalaryConfig = async () => {
    setSaving(true);
    try {
      await configAPI.updateSalaryConfig(salaryConfig);
      toast.success('Salary configuration updated successfully');
    } catch (error) {
      toast.error('Failed to update salary configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveYearProgressionConfig = async () => {
    setSaving(true);
    try {
      await configAPI.updateYearProgressionConfig(yearProgressionConfig);
      toast.success('Year progression configuration updated successfully');
    } catch (error) {
      toast.error('Failed to update year progression configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateProgressionMapping = (currentClass, nextClass) => {
    setYearProgressionConfig({
      ...yearProgressionConfig,
      progressionMap: {
        ...yearProgressionConfig.progressionMap,
        [currentClass]: nextClass === 'graduation' ? null : nextClass
      }
    });
  };

  const handleYearPromotion = async () => {
    console.log('=== CLIENT: Starting year promotion ===');
    setPromoting(true);
    try {
      const result = await configAPI.promoteYear();
      console.log('=== CLIENT: API Response ===', result.data);
      const { promotedStudents, graduatedStudents, outstandingFeesExported, sheetsExported } = result.data;
      
      let message = `Year promotion completed!\n`;
      message += `• ${promotedStudents} students promoted\n`;
      message += `• ${graduatedStudents} students graduated\n`;
      message += `• ${outstandingFeesExported} outstanding fee records processed`;
      
      if (sheetsExported) {
        message += `\n• Data exported to Google Sheets`;
      }
      
      console.log('=== CLIENT: Success message ===', message);
      toast.success(message);
      setShowPromotionDialog(false);
    } catch (error) {
      console.error('=== CLIENT: Error ===', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to promote year: ' + (error.response?.data?.message || error.message));
    } finally {
      console.log('=== CLIENT: Year promotion finished ===');
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg">Loading configuration...</div>
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
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Arohan School
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Configuration</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3 px-4">
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
          {/* Year Promotion Section */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <ArrowUp className="h-5 w-5" />
                Year Promotion
              </CardTitle>
              <CardDescription className="text-blue-700">
                Promote all students to the next class and export outstanding fees to Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showPromotionDialog} onOpenChange={setShowPromotionDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Start Year Promotion
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Confirm Year Promotion
                    </DialogTitle>
                    <DialogDescription>
                      This action will:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Export all outstanding fees to Google Sheets</li>
                        <li>Promote all active students to the next class</li>
                        <li>Update fee structures according to new classes</li>
                        <li>This action cannot be undone</li>
                      </ul>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPromotionDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleYearPromotion} 
                      disabled={promoting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {promoting ? 'Processing...' : 'Confirm Promotion'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Configuration Tabs */}
          <Tabs defaultValue="fees" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="fees">Fees Configuration</TabsTrigger>
              <TabsTrigger value="salary">Salary Configuration</TabsTrigger>
              <TabsTrigger value="year-progression">Year Progression</TabsTrigger>
            </TabsList>
            
            <TabsContent value="fees" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Fees Configuration
                  </CardTitle>
                  <CardDescription>
                    Modify fees settings and academic year configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startMonth">Academic Year Start Month</Label>
                      <Input
                        id="startMonth"
                        type="number"
                        min="1"
                        max="12"
                        value={feesConfig?.academicYear?.startMonth || 4}
                        onChange={(e) => setFeesConfig({
                          ...feesConfig,
                          academicYear: {
                            ...feesConfig.academicYear,
                            startMonth: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endMonth">Academic Year End Month</Label>
                      <Input
                        id="endMonth"
                        type="number"
                        min="1"
                        max="12"
                        value={feesConfig?.academicYear?.endMonth || 3}
                        onChange={(e) => setFeesConfig({
                          ...feesConfig,
                          academicYear: {
                            ...feesConfig.academicYear,
                            endMonth: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
                      <Input
                        id="gracePeriod"
                        type="number"
                        min="0"
                        value={feesConfig?.gracePeriod?.days || 10}
                        onChange={(e) => setFeesConfig({
                          ...feesConfig,
                          gracePeriod: {
                            ...feesConfig.gracePeriod,
                            days: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueDayOfMonth">Due Day of Month</Label>
                      <Input
                        id="dueDayOfMonth"
                        type="number"
                        min="1"
                        max="31"
                        value={feesConfig?.frequencies?.monthly?.dueDayOfMonth || 5}
                        onChange={(e) => setFeesConfig({
                          ...feesConfig,
                          frequencies: {
                            ...feesConfig.frequencies,
                            monthly: {
                              ...feesConfig.frequencies.monthly,
                              dueDayOfMonth: parseInt(e.target.value)
                            }
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={saveFeesConfig} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Fees Configuration'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="salary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Salary Configuration
                  </CardTitle>
                  <CardDescription>
                    Modify salary processing settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="salaryResetDay">Salary Reset Day</Label>
                    <Input
                      id="salaryResetDay"
                      type="number"
                      min="1"
                      max="31"
                      value={salaryConfig?.salaryResetDay || 1}
                      onChange={(e) => setSalaryConfig({
                        ...salaryConfig,
                        salaryResetDay: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  
                  <Button onClick={saveSalaryConfig} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Salary Configuration'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="year-progression" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Year Progression Configuration
                  </CardTitle>
                  <CardDescription>
                    Set the order of classes for student promotion
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progression Mapping */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Class Order Configuration</h4>
                    <div className="space-y-3">
                      {classes.map((cls) => {
                        const nextClass = yearProgressionConfig?.progressionMap?.[cls.className];
                        return (
                          <div key={cls._id} className="flex items-center gap-4 p-3 border rounded-lg">
                            <div className="flex-1">
                              <Label className="font-medium">{cls.className}</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">promotes to</span>
                              <Select
                                value={nextClass === null ? 'graduation' : nextClass || ''}
                                onValueChange={(value) => updateProgressionMapping(cls.className, value)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select next class" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="graduation">🎓 Graduation</SelectItem>
                                  {classes
                                    .filter(c => c.className !== cls.className)
                                    .map(c => (
                                      <SelectItem key={c._id} value={c.className}>
                                        {c.className}
                                      </SelectItem>
                                    ))
                                  }
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  

                  
                  <Button onClick={saveYearProgressionConfig} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Class Order'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}