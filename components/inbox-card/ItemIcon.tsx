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
  Wrench
} from 'lucide-react';
import { InboxItem } from '@/lib/schema/inbox.schema';
import { WorkItemKind } from '@/lib/schema/workItemKind.schema';



const getWorkItemKindIcon = (kind?: WorkItemKind) => {
  switch (kind) {
    case 'bug':
    case 'defect':
      return <Bug className="h-4 w-4" />;
    case 'feature':
      return <Sparkles className="h-4 w-4" />;
    case 'enhancement':
      return <Lightbulb className="h-4 w-4" />;
    case 'epic':
      return <Target className="h-4 w-4" />;
    case 'userStory':
      return <Users className="h-4 w-4" />;
    case 'task':
      return <ListTodo className="h-4 w-4" />;
    case 'subTask':
      return <CheckSquare className="h-4 w-4" />;
    case 'spike':
      return <FlaskConical className="h-4 w-4" />;
    case 'documentation':
      return <BookOpen className="h-4 w-4" />;
    case 'improvement':
      return <Wrench className="h-4 w-4" />;
    case 'refactor':
      return <Code2 className="h-4 w-4" />;
    case 'techDebt':
      return <AlertCircle className="h-4 w-4" />;
    case 'question':
      return <HelpCircle className="h-4 w-4" />;
    case 'research':
      return <FlaskConical className="h-4 w-4" />;
    case 'test':
      return <CheckSquare className="h-4 w-4" />;
    case 'other':
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getItemIcon = (type: InboxItem['type'], workItemKind?: WorkItemKind) => {
  switch (type) {
    case 'pullRequest':
      return <GitPullRequest className="h-4 w-4" />;
    case 'workItem':
      // Use the work item kind icon if available
      return getWorkItemKindIcon(workItemKind);
    case 'pipeline':
      return <Activity className="h-4 w-4" />;
  }
};


// This might have to change in a big way because right now this is really unclear what its supposed to represent
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


interface ItemIconProps {
  type: InboxItem['type'];
  priority?: InboxItem['priority'];
  workItemKind?: WorkItemKind;
}


export const ItemIcon = ({ type, priority, workItemKind }: ItemIconProps) => {
  return (
    <div className={`mt-1 flex-shrink-0 ${getPriorityColor(priority)}`}>
      {getItemIcon(type, workItemKind)}
    </div>
  );
};
