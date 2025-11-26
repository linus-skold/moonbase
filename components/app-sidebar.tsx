"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

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
  SidebarMenuBadge,
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
}

export function AppSidebar(props?: AppSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const [isAdoOpen, setIsAdoOpen] = useState(true);
  const [isGhOpen, setIsGhOpen] = useState(true);

  const { counts } = useNewItems();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load instances only once when mounted, memoize to prevent re-renders
  const adoInstances = useMemo(() => {
    if (!mounted) return [];
    const storageAdo = create("ado-config", "1.0", AdoConfigSchema);
    const adoConfig = storageAdo.load();
    return adoConfig?.instances || [];
  }, [mounted]);

  const ghInstances = useMemo(() => {
    if (!mounted) return [];
    const storageGh = create("gh-config", "1.0", GhConfigSchema);
    const ghConfig = storageGh.load();
    return ghConfig?.instances || [];
  }, [mounted]);

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
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
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
                              <Link
                                href={`/inbox/${instance.id}`}
                                className="relative pr-8"
                              >
                                <span>{instance.name}</span>
                                {counts[instance.id] > 0 && (
                                  <SidebarMenuBadge>
                                    {counts[instance.id]}
                                  </SidebarMenuBadge>
                                )}
                              </Link>
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
                              <Link
                                href={`/inbox/${instance.id}`}
                                className="relative pr-8"
                              >
                                <span>{instance.name}</span>
                                {counts[instance.id] > 0 && (
                                  <SidebarMenuBadge>
                                    {counts[instance.id]}
                                  </SidebarMenuBadge>
                                )}
                              </Link>
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
