import { Calendar, Home, Inbox, Search, Settings, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { CustomSidebar } from "@/components/sidebar/custom-sidebar";
import { VscGithub } from "react-icons/vsc";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

interface AppSidebarProps {
  integrations?: any[];

};

export function AppSidebar(props?: AppSidebarProps) {
  return (
    <CustomSidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Moonbase</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* <SidebarGroup>
          <SidebarGroupLabel>My Inboxes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {integrations.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}
      </SidebarContent>
      <SidebarFooter>
        <div className="w-full flex justify-end">
          <Button variant="ghost" size="icon" className="rounded-full">
            <VscGithub />
          </Button>
        </div>
      </SidebarFooter>
    </CustomSidebar>
  );
}
