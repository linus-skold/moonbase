import React from 'react';
import { Card } from '@/components/ui/card';
import type { InboxItem } from '@/lib/schema/inbox.schema';
import { GitPullRequest, CheckSquare, Activity, ListTodo } from 'lucide-react';
import { useInstance } from '@/components/inbox/InstanceContext';
const { DateTime } = require('luxon');

interface InboxItemCardProps {
  item: InboxItem;
}

const getItemIcon = (type: InboxItem['type']) => {
  switch (type) {
    case 'pullRequest':
      return <GitPullRequest className="h-4 w-4" />;
    case 'workItem':
      return <CheckSquare className="h-4 w-4" />;
    case 'pipeline':
      return <Activity className="h-4 w-4" />;
    case 'task':
      return <ListTodo className="h-4 w-4" />;
  }
};

const getStatusColor = (
  type: InboxItem['type'], 
  status: string, 
  statusMappings?: Array<{type: string, status: string, color: string}>
) => {
  // First check custom status mappings from instance
  if (statusMappings) {
    const mapping = statusMappings.find(
      m => m.type === type && m.status.toLowerCase() === status.toLowerCase()
    );
    if (mapping && mapping.color && mapping.color.length > 0) {
      return mapping.color;
    }
  }

  console.log('No custom mapping found for', type, status);
  // Fallback to default mappings
  if (type === 'pullRequest') {
    if (status === 'active') return '#22c55e';
    if (status === 'completed') return '#3b82f6';
    if (status === 'abandoned') return '#6b7280';
  }

  if (type === 'pipeline') {
    if (status === 'succeeded') return '#22c55e';
    if (status === 'failed') return '#ef4444';
    if (status === 'inProgress') return '#eab308';
    if (status === 'canceled') return '#6b7280';
  }

  return '#6b7280';
};

const getPriorityColor = (priority?: InboxItem['priority']) => {
  switch (priority) {
    case 'critical':
      return 'text-red-600 dark:text-red-400';
    case 'high':
      return 'text-orange-600 dark:text-orange-400';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'low':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};


// get the current instance of the inbox item and render a card for it
export function InboxItemCard({ item }: InboxItemCardProps) {
  const instance = useInstance();
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block transition-all hover:scale-[1.01]"
    >
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className={`mt-1 flex-shrink-0 ${getPriorityColor(item.priority)}`}>
            {getItemIcon(item.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate flex-1">{item.title}</h3>
              <div
                className={`h-2 w-2 rounded-full flex-shrink-0 `}
                style={{ backgroundColor: getStatusColor(item.type, item.status, instance?.statusMappings) }}
                title={item.status}
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{DateTime.fromISO(item.updatedDate).toRelative()}</span>
              
              {item.repository && (
                <span className="truncate">{item.repository.name}</span>
              )}
              
              {item.assignedTo && (
                <div className="flex items-center gap-1 truncate">
                  {item.assignedTo.imageUrl && !imageError ? (
                    <img
                      src={item.assignedTo.imageUrl}
                      alt={item.assignedTo.displayName}
                      className="h-4 w-4 rounded-full"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-semibold">
                      {getInitials(item.assignedTo.displayName)}
                    </div>
                  )}
                  <span className="truncate">{item.assignedTo.displayName}</span>
                </div>
              )}

              {item.metadata?.workItemType && (
                <span className="px-2 py-0.5 bg-secondary rounded-md">
                  {item.metadata.workItemType}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </a>
  );
}
