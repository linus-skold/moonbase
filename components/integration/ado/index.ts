'use client';
import { AdoCard } from "./connect-card";
import { AdoManageCard } from "./manage-card";

import { Integration } from "@/components/integration/IntegrationProvider";

import { VscAzureDevops } from "react-icons/vsc";

export default {
  id: "ado",
  name: "Azure DevOps",
  description:
    "Add your Azure DevOps instance to see work items, pull requests, pipeline status and more.",
  alternatives: ["PAT", "OAuth"],
  icon: VscAzureDevops,
  addIntegrationComponent: AdoCard,
  manageIntegrationComponent: AdoManageCard,
} as Integration;
