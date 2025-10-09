import * as React from "react"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  UserCheck,
  IndianRupee,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }) {
  const { user, hasPermission } = useAuth();

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: window.location.pathname === '/dashboard',
    },
    ...(hasPermission('students', 'read') ? [{
      title: "Students",
      url: "/students",
      icon: Users,
      isActive: window.location.pathname.startsWith('/students'),
    }] : []),
    ...(hasPermission('staff', 'read') ? [{
      title: "Staff",
      url: "/staff",
      icon: GraduationCap,
      isActive: window.location.pathname === '/staff',
    }] : []),
    ...(hasPermission('classes', 'read') ? [{
      title: "Classes",
      url: "/classes",
      icon: School,
      isActive: window.location.pathname === '/classes',
    }] : []),
    ...(hasPermission('users', 'read') ? [{
      title: "Users",
      url: "/users",
      icon: UserCheck,
      isActive: window.location.pathname === '/users',
    }] : []),
    ...(hasPermission('fees', 'read') ? [{
      title: "Fees",
      url: "/fees",
      icon: IndianRupee,
      isActive: window.location.pathname === '/fees',
    }] : []),
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <School className="h-8 w-8 text-blue-600" />
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-lg font-semibold">Arohan School</h2>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.staff?.name || user?.username || 'User',
          email: user?.alias || user?.role || 'Role',
          avatar: '/avatars/default.jpg'
        }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}