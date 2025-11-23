"use client";
import { GhCard } from "./connect-card";
import { GhManageCard } from "./manage-card";

import { Integration } from "@/components/integration/IntegrationProvider";

import { VscGithub } from "react-icons/vsc";

export default {
  id: "github",
  name: "GitHub",
  description:
    "Add your GitHub account to see repositories, issues, pull requests, and more.",
  alternatives: ["PAT", "OAuth"],
  icon: VscGithub,
  addIntegrationComponent: GhCard,
  manageIntegrationComponent: GhManageCard,
  disabled: false,
} as Integration;
