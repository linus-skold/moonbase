"use client";
import { Calendar, Home, Inbox, Search, Settings, Layers, ChevronRight } from "lucide-react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { CustomSidebar } from "@/components/sidebar/custom-sidebar";
import { VscGithub, VscAzureDevops } from "react-icons/vsc";
import { loadConfig as loadAdoConfig } from "@/lib/ado/storage";
import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const [adoInstances, setAdoInstances] = React.useState<any[]>([]);
  const [isAdoOpen, setIsAdoOpen] = React.useState(true);

  React.useEffect(() => {
    const config = loadAdoConfig();
    setAdoInstances(config?.instances || []);
  }, []);

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

        <SidebarGroup>
          <SidebarGroupLabel>Integrations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adoInstances.length > 0 && (
                <Collapsible
                  open={isAdoOpen}
                  onOpenChange={setIsAdoOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <VscAzureDevops className="h-4 w-4" />
                        <span>Azure DevOps</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {adoInstances.map((instance) => (
                          <SidebarMenuSubItem key={instance.id}>
                            <SidebarMenuSubButton asChild>
                              <a href={`/inbox/ado-${instance.id}`}>
                                <span>{instance.name}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
