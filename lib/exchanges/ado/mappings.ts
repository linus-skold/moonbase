import type { WorkItemKindMapping } from "../../schema/workItemKind.schema";

export default {
  typeNameMap: {
    // Bug/Defect types
    bug: "bug",
    defect: "defect",
    impediment: "bug",

    // Feature types
    epic: "epic",
    feature: "feature",
    "user story": "userStory",
    "product backlog item": "userStory",

    // Task types
    task: "task",
    "sub-task": "subTask",
    spike: "spike",

    // Test types
    "test case": "test",
    "test plan": "test",
    "test suite": "test",

    // Other types
    issue: "other",
    requirement: "userStory",
    "change request": "enhancement",
    risk: "other",
    review: "other",
  },
  labelPatterns: [],
  titlePatterns: [],
  defaultKind: "task",
} as WorkItemKindMapping;
