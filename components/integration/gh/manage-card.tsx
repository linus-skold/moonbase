import { GhInstance } from "@/lib/gh/schema/instance.schema";
import { ManageCard } from "../base/manage-card-base";
import { useRouter } from "next/navigation";

type GhManageCardProps = {
  instance: GhInstance;
  onDelete?: () => void;
};

export const GhManageCard = ({ instance, onDelete }: GhManageCardProps) => {
  const router = useRouter();

  const handleManageClick = () => {
    router.push(`/manage/gh?instanceId=${instance.id}`);
  };

  return (
    <ManageCard
      instance={instance} 
      onClick={handleManageClick}
      onDelete={onDelete}
    />
  );
};
