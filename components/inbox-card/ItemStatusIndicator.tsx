import { InboxItem } from "@/lib/schema/inbox.schema";
import { useInstance } from "../inbox/InstanceContext";


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


interface ItemStatusIndicatorProps {
  item: InboxItem;
}

export const ItemStatusIndicator = ({ item }: ItemStatusIndicatorProps) => {
   const instance = useInstance();
   
  return (
    <div
      className={`h-2 w-2 rounded-full flex-shrink-0 `}
      style={{
        backgroundColor: getStatusColor(
          item.type,
          item.status,
          instance?.statusMappings
        ),
      }}
      title={item.status}
    />
  );
};
