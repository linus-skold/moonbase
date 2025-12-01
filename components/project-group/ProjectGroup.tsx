import React from "react";

import type { InboxItem } from "@/lib/schema/inbox.schema";
import { ChevronDown, Mail, MailOpen, MoreVertical } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { VscAzureDevops, VscGitCommit, VscGithub } from "react-icons/vsc";
import { Badge } from "@/components/ui/badge";
import { Card } from "../ui/card";
import { ItemStatusIndicator } from "../inbox-card/ItemStatusIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";


const getInstanceIcon = (instanceType: string) => {
  switch (instanceType) {
    case "ado":
      return VscAzureDevops;
    case "gh":
      return VscGithub;
    default:
      return VscGitCommit; // Fallback icon
  }
};

const integrationColor: Record<string, string> = {
  ado: "text-blue-600",
};

type ProjectCardComponentProps = {
  group: {
    projectName: string;
    instanceName: string;
  };
  instanceType?: string;
  children?: React.ReactNode;
  className?: string;
};

export const ProjectCardComponent = ({
  group,
  instanceType,
  children,
}: ProjectCardComponentProps) => {
  const [expanded, setExpanded] = React.useState(false);

  const IntegrationIcon = getInstanceIcon(instanceType || "");

  const childCount = React.Children.count(children);
  const hasNew = React.Children.toArray(children).some((child) => {
    if (React.isValidElement(child)) {
      const item = (child?.props as any)?.item as InboxItem | undefined;
      return item?.isNew;
    }
    return false;
  });

  return (
    <Card className={hasNew ? "border-blue-500/90" : ""}>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="w-full px-4 flex items-center gap-2 transition-colors">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
              {hasNew && <ItemStatusIndicator className="bg-blue-500" />}
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${
                  expanded ? "" : "-rotate-90"
                }`}
              />
              <IntegrationIcon
                className={`w-4 h-4 flex-shrink-0 ${
                  integrationColor[instanceType || ""] || ""
                }`}
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate flex items-center gap-2">
                  {group.projectName}
                </h2>

                <p className="text-xs text-muted-foreground">
                  {group.instanceName}
                </p>
              </div>
            </CollapsibleTrigger>

            <Badge className="font-semibold bg-blue-500/90 text-sidebar-accent-foreground">
              {childCount}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical size="icon" className="rounded-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                { hasNew ? (
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  Mark All as Read
                </DropdownMenuItem>
                ) : (
                <DropdownMenuItem>
                  <MailOpen className="mr-2 h-4 w-4" />
                  Mark All as Unread
                </DropdownMenuItem>
                )}

              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CollapsibleContent>
            <Separator className="my-6" />
            <div className="px-4 space-y-2">
              {children}
            </div>
          </CollapsibleContent>
        </Collapsible>
    </Card>
  );
};
