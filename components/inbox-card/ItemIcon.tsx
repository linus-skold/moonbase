import { 
  GitPullRequest, 
  CheckSquare, 
  Activity, 
  ListTodo, 
  Bug, 
  Lightbulb, 
  FileText, 
  Target, 
  Users, 
  Sparkles,
  AlertCircle,
  Code2,
  BookOpen,
  HelpCircle,
  FlaskConical,
  Wrench,
  Circle
} from 'lucide-react';
import { TypedItem } from '@/lib/schema/item.schema';
import { WorkItemKind } from '@/lib/schema/workItemKind.schema';



const getWorkItemKindIcon = (kind?: WorkItemKind) => {
  switch (kind) {
    case 'bug':
    case 'defect':
      return <Bug className="h-4 w-4 text-red-500" />;
    case 'feature':
      return <Sparkles className="h-4 w-4 text-blue-500" />;
    case 'enhancement':
      return <Lightbulb className="h-4 w-4 text-blue-500" />;
    case 'epic':
      return <Target className="h-4 w-4 text-orange-500" />;
    case 'userStory':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'task':
      return <ListTodo className="h-4 w-4 text-yellow-500" />;
    case 'subTask':
      return <CheckSquare className="h-4 w-4 text-yellow-500" />;
    case 'spike':
      return <FlaskConical className="h-4 w-4 text-blue-500" />;
    case 'documentation':
      return <BookOpen className="h-4 w-4 text-cyan-500" />;
    case 'improvement':
      return <Wrench className="h-4 w-4 text-blue-500" />;
    case 'refactor':
      return <Code2 className="h-4 w-4 text-blue-500" />;
    case 'techDebt':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'question':
      return <HelpCircle className="h-4 w-4 text-cyan-500" />;
    case 'research':
      return <FlaskConical className="h-4 w-4 text-blue-500" />;
    case 'test':
      return <CheckSquare className="h-4 w-4 text-green-500" />;
    case 'other':
    default:
      return <Circle className="h-4 w-4 text-indigo-500" />;
  }
};

const getItemIcon = (type: TypedItem["type"], workItemKind?: WorkItemKind) => {
  switch (type) {
    case 'pullRequest':
      return <GitPullRequest className="h-4 w-4 text-purple-500" />;
    case 'workItem':
      // Use the work item kind icon if available
      return getWorkItemKindIcon(workItemKind);
    case 'pipeline':
      return <Activity className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

interface ItemIconProps {
  item: TypedItem;
}

export const ItemIcon = ({ item }: ItemIconProps) => {
  const workItemKind = item.type === 'workItem' ? item.workItemKind : undefined;
  
  return (
    <div className="mt-1 flex-shrink-0">
      {getItemIcon(item.type, workItemKind)}
    </div>
  );
};
