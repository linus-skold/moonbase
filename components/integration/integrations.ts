
import AdoIntegration from "@/components/integration/ado/index";
import GhIntegration from "@/components/integration/gh/index";

import type { Integration } from "./IntegrationProvider";


export const integrations: Integration[] = [
  AdoIntegration,
  GhIntegration,
];
