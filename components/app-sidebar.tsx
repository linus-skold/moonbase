"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

import { Home, Settings, ChevronRight, Sidebar, MoreVertical, RefreshCw, Trash2 } from "lucide-react";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomSidebar } from "@/components/sidebar/custom-sidebar";
import { VscGithub, VscAzureDevops } from "react-icons/vsc";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

import { integrationStorage } from "@/lib/utils/integration-storage";
import { useBroker } from "@/lib/broker";

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
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const broker = useBroker();
  const { state } = useSidebar();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for updates to refresh badge counts and instances
  useEffect(() => {
    const handleUpdate = () => {
      setUpdateTrigger(prev => prev + 1);
    };

    // Listen for custom events from mark as read/unread actions
    window.addEventListener('inbox-items-updated', handleUpdate);
    
    // Listen for instance changes (when integrations are added/removed)
    window.addEventListener('instances-updated', handleUpdate);
    
    // Also update on page visibility change (when user comes back to tab)
    document.addEventListener('visibilitychange', handleUpdate);

    return () => {
      window.removeEventListener('inbox-items-updated', handleUpdate);
      window.removeEventListener('instances-updated', handleUpdate);
      document.removeEventListener('visibilitychange', handleUpdate);
    };
  }, []);

  // Load instances - no memoization so they update when instances change
  const instances = mounted ? broker.getInstances() : [];
  const adoInstances = instances.filter(i => i.instanceType === 'ado');
  const ghInstances = instances.filter(i => i.instanceType === 'gh');

  const handleTriggerPolling = () => {
    toast.info("Triggering polling check...");
    window.dispatchEvent(new CustomEvent('trigger-manual-poll'));
  };

  const handleClearUnreadState = () => {
    try {
      // Clear unread state for all instances
      instances.forEach(instance => {
        localStorage.removeItem(`unread-state-${instance.id}`);
      });
      window.dispatchEvent(new CustomEvent('inbox-items-updated'));
      toast.success("Cleared all unread states");
    } catch (error) {
      console.error("Error clearing unread state:", error);
      toast.error("Failed to clear unread state");
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <CustomSidebar>
      {/* Trigger inside sidebar when expanded */}
      {state === "expanded" && (
        <div className="flex items-center justify-between p-2 border-b">
          <SidebarGroupLabel>Moonbase</SidebarGroupLabel>
          <div className="flex items-center gap-1">
            {isDevelopment && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Developer Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleTriggerPolling}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <span>Trigger Polling Now</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClearUnreadState}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Clear Unread State</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <SidebarTrigger />
          </div>
        </div>
      )}
      
      {/* Free-floating trigger when collapsed */}
      {state === "collapsed" && (
        <div className="fixed left-0 top-[calc(var(--banner-height,0px)+0.5rem)] z-20 ml-2">
          <SidebarTrigger />
        </div>
      )}
      
      <SidebarContent>
        <SidebarGroup>
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
                        {adoInstances.map((instance) => {
                          // Force recalculation when updateTrigger changes
                          const unreadCount = updateTrigger >= 0 ? (broker.getExchange(instance.id)?.getUnreadCount() || 0) : 0;
                          return (
                            <SidebarMenuSubItem key={instance.id} className="relative">
                              <div className="flex items-center justify-between w-full">
                                <SidebarMenuSubButton asChild className="flex-1">
                                  <Link href={`/inbox/${instance.id}`}>
                                    <span>{instance.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                                {unreadCount > 0 && (
                                  <span className="ml-auto mr-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-blue-500 px-1 text-xs font-medium text-white tabular-nums">
                                    {unreadCount}
                                  </span>
                                )}
                              </div>
                            </SidebarMenuSubItem>
                          );
                        })}
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
                        {ghInstances.map((instance) => {
                          // Force recalculation when updateTrigger changes
                          const unreadCount = updateTrigger >= 0 ? (broker.getExchange(instance.id)?.getUnreadCount() || 0) : 0;
                          return (
                            <SidebarMenuSubItem key={instance.id} className="relative">
                              <div className="flex items-center justify-between w-full">
                                <SidebarMenuSubButton asChild className="flex-1">
                                  <Link href={`/inbox/${instance.id}`}>
                                    <span>{instance.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                                {unreadCount > 0 && (
                                  <span className="ml-auto mr-2 flex h-5 min-w-5 items-center justify-center rounded-md bg-blue-500 px-1 text-xs font-medium text-white tabular-nums">
                                    {unreadCount}
                                  </span>
                                )}
                              </div>
                            </SidebarMenuSubItem>
                          );
                        })}
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
