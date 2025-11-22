import { VscAzureDevops as Icon } from "react-icons/vsc";
import { Button } from "@/components/ui/button";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ConnectCard } from "../base/connect-card-base";

import { SetupPat } from "./setup-pat";

export function AdoCard({ integration, onInstanceAdded }: { integration: any; onInstanceAdded?: () => void }) {
  const [showAlternatives, setShowAlternatives] = React.useState(false);
  const [showPatDialog, setShowPatDialog] = React.useState(false);
  return (
    <ConnectCard
      integration={integration}
      onClick={() => setShowAlternatives(true)}
    >
      <Dialog open={showAlternatives} onOpenChange={setShowAlternatives}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Azure DevOps Instance</DialogTitle>
            <DialogDescription>
              Choose how you want to authenticate with Azure DevOps.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="w-full justify-start hover:cursor-pointer"
              onClick={() => {
                setShowAlternatives(false);
                setShowPatDialog(true);
              }}
            >
              <Icon className="mr-2 h-5 w-5" />
              Personal Access Token (PAT)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start hover:cursor-pointer"
              disabled
            >
              <Icon className="mr-2 h-5 w-5" />
              OAuth (Requires you to login)
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      <SetupPat 
        open={showPatDialog} 
        onOpenChange={setShowPatDialog}
        onComplete={(success) => {
          if (success && onInstanceAdded) {
            onInstanceAdded();
          }
        }}
      />
       
    </ConnectCard>
  );
}
