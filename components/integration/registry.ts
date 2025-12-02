import { VscAzureDevops, VscGithub } from "react-icons/vsc";
import { SetupPat as AdoSetupPat } from "./ado/setup-pat";
import { SetupPat as GhSetupPat } from "./gh/setup-pat";
import type { ComponentType } from "react";

export interface IntegrationConfig {
  id: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  dialogTitle: string;
  dialogDescription: string;
  oauthButtonText?: string;
  setupPatComponent: ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete: (success: boolean) => void;
  }>;
}

export const integrations: IntegrationConfig[] = [
  {
    id: "ado",
    icon: VscAzureDevops,
    title: "Azure DevOps",
    description: "Add your Azure DevOps instance to see work items, pull requests, pipeline status and more.",
    dialogTitle: "Add Azure DevOps Instance",
    dialogDescription: "Choose how you want to authenticate with Azure DevOps.",
    oauthButtonText: "OAuth (Requires you to login)",
    setupPatComponent: AdoSetupPat,
  },
  {
    id: "github",
    icon: VscGithub,
    title: "GitHub",
    description: "Add your GitHub account to see repositories, issues, pull requests, and more.",
    dialogTitle: "Add GitHub Instance",
    dialogDescription: "Choose how you want to authenticate with GitHub.",
    oauthButtonText: "OAuth (Coming soon)",
    setupPatComponent: GhSetupPat,
  },
];
