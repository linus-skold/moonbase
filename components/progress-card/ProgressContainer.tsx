import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";

export const ProgressBar = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => {
  const percentage = total === 0 ? 0 : (current / total) * 100;

  return (
    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full bg-muted-blue-400 transition-all duration-300 ease-out"
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  );
};

export const ProgressContainer = ({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) => {
  return (
    <Card className="bg-0 border-none">
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <div className="items-center gap-1 flex">
            <span className="font-medium">{label || "Progress Stage"}</span>
            </div>
            <span className="text-muted-foreground">
              {current} / {total}
            </span>
          </div>
          <ProgressBar current={current} total={total} />
        </div>
      </div>

    </Card>
  );
};
