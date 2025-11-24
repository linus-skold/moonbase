"use client";
import { useState, useEffect } from "react";

import { Home, Settings, ChevronRight } from "lucide-react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { CustomSidebar } from "@/components/sidebar/custom-sidebar";
import { VscGithub, VscAzureDevops } from "react-icons/vsc";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { create } from "@/lib/storage";
import { AdoConfigSchema } from "@/lib/ado/schema/instance.schema";
import { GhConfigSchema } from "@/lib/gh/schema/instance.schema";
import { useNewItems } from "@/components/inbox/NewItemsContext";

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
  const storageAdo = create('ado-config', '1.0', AdoConfigSchema);
  const storageGh = create('gh-config', '1.0', GhConfigSchema);

  const [adoInstances, setAdoInstances] = useState<any[]>([]);
  const [ghInstances, setGhInstances] = useState<any[]>([]);
  const [isAdoOpen, setIsAdoOpen] = useState(true);
  const [isGhOpen, setIsGhOpen] = useState(true);
  
  const { counts } = useNewItems();

  useEffect(() => {
    const adoConfig = storageAdo.load();
    setAdoInstances(adoConfig?.instances || []);
    
    const ghConfig = storageGh.load();
    setGhInstances(ghConfig?.instances || []);
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
                              <a href={`/inbox/${instance.id}`} className="relative pr-8">
                                <span>{instance.name}</span>
                                {counts[instance.id] > 0 && (
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground animate-pulse">
                                    {counts[instance.id]}
                                  </span>
                                )}
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
              
              {ghInstances.length > 0 && (
                <Collapsible
                  open={isGhOpen}
                  onOpenChange={setIsGhOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <VscGithub className="h-4 w-4" />
                        <span>GitHub</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {ghInstances.map((instance) => (
                          <SidebarMenuSubItem key={instance.id}>
                            <SidebarMenuSubButton asChild>
                              <a href={`/inbox/${instance.id}`} className="relative pr-8">
                                <span>{instance.name}</span>
                                {counts[instance.id] > 0 && (
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground animate-pulse">
                                    {counts[instance.id]}
                                  </span>
                                )}
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
