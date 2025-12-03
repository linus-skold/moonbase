"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConnectCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  dialogTitle: string;
  dialogDescription: string;
  oauthButtonText?: string;
  setupPatComponent: React.ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: (success: boolean) => void;
  }>;
  onInstanceAdded?: () => void;
}

export const ConnectCard = ({
  icon: Icon,
  title,
  description,
  dialogTitle,
  dialogDescription,
  oauthButtonText = "OAuth (Coming soon)",
  setupPatComponent: SetupPat,
  onInstanceAdded,
}: ConnectCardProps) => {
  const [showAlternatives, setShowAlternatives] = React.useState(false);
  const [showPatDialog, setShowPatDialog] = React.useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="hover:cursor-pointer"
            variant="default"
            onClick={() => setShowAlternatives(true)}
          >
            Connect
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showAlternatives} onOpenChange={setShowAlternatives}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
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
              className="w-full justify-start"
              disabled
            >
              <Icon className="mr-2 h-5 w-5" />
              {oauthButtonText}
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
    </>
  );
};
