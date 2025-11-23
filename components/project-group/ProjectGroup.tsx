import type { GroupedInboxItems } from "@/lib/schema/inbox.schema";
import { ChevronDown } from "lucide-react";
import React from "react";
import { InboxItemCard } from "@/components/InboxItemCard";
import { InstanceProvider } from "@/components/inbox/InstanceContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { VscAzureDevops, VscGitCommit, VscGithub } from "react-icons/vsc";

const getInstanceIcon = (instanceType: string) => {
  switch (instanceType) {
    case 'ado':
      return VscAzureDevops;
    case 'gh':
      return VscGithub;
    default:
      return VscGitCommit; // Fallback icon
  }
};

const integrationColor: Record<string, string> = {
  ado: 'text-blue-600',
};


interface ProjectCardComponentProps {
  group: GroupedInboxItems[string];
  instanceType?: string;
}

export const ProjectCardComponent = ({group, instanceType }: ProjectCardComponentProps) => {
  const [expanded, setExpanded] = React.useState(false);

  const IntegrationIcon = getInstanceIcon(instanceType || '');

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="">
      <CollapsibleTrigger className="w-full px-4 flex items-center gap-2 transition-colors text-left group">
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${expanded ? '' : '-rotate-90'}`} />
        <IntegrationIcon className={`w-4 h-4 flex-shrink-0 ${integrationColor[instanceType || ''] || ''}`} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{group.project.name}</h2>
          <p className="text-xs text-muted-foreground">{group.instance.name}</p>
        </div>
        <span className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium">
          {group.items.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Separator className="my-6" />
        <div className="p-4 space-y-2">
          <InstanceProvider instance={group.instance}>
            {group.items.map((item) => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </InstanceProvider>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
