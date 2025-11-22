"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Integration } from "../IntegrationProvider";

interface ConnectCardBaseProps {
  children: React.ReactNode;
  onClick?: () => void;
  integration: Integration;
  addText?: string;
  disabled?: boolean;
}

export const ConnectCard = (props: ConnectCardBaseProps) => {
  const { children, onClick, integration } = props;
  const Icon = integration.icon;
  return (
    <>
      <Card key={integration.id}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {integration.name}
          </CardTitle>
          <CardDescription>{integration.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="hover:cursor-pointer"
            variant={integration.disabled ? "outline" : "default"}
            disabled={integration.disabled}
            onClick={onClick}
          >
            {props.addText ?? "Connect"}
          </Button>
        </CardContent>
      </Card>

      {children}
    </>
  );
};
