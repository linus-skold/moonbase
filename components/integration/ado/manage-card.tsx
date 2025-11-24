import { type AdoInstance } from "@/lib/ado/schema/instance.schema";
import { ManageCard } from "../base/manage-card-base";
import { useRouter } from "next/navigation";

type AdoManageCardProps = {
  instance: AdoInstance;
  onDelete?: () => void;
};


export const AdoManageCard = ({instance, onDelete} : AdoManageCardProps) => {
  const router = useRouter();

  const handleManageClick = () => {
    router.push(`/manage/ado?instanceId=${instance.id}`);
  };

  return (
    <ManageCard
      instance={instance} 
      onClick={handleManageClick}
      onDelete={onDelete}>
      </ManageCard>
  );
};
