import type { WorkItemKindMapping } from "../../schema/workItemKind.schema";

export default {
  typeNameMap: {},
  labelPatterns: [
    // Bugs and defects (high priority)
    { pattern: /^bug$/i, kind: "bug", priority: 10 },
    { pattern: /^defect$/i, kind: "defect", priority: 10 },
    { pattern: /^regression$/i, kind: "bug", priority: 9 },
    { pattern: /bug:/i, kind: "bug", priority: 8 },

    // Features and enhancements
    { pattern: /^feature$/i, kind: "feature", priority: 10 },
    { pattern: /^enhancement$/i, kind: "enhancement", priority: 10 },
    { pattern: /^epic$/i, kind: "epic", priority: 10 },
    { pattern: /feature:/i, kind: "feature", priority: 8 },
    { pattern: /enhancement:/i, kind: "enhancement", priority: 8 },

    // User stories
    { pattern: /^user[- ]story$/i, kind: "userStory", priority: 10 },
    { pattern: /^story$/i, kind: "userStory", priority: 9 },

    // Documentation
    { pattern: /^documentation$/i, kind: "documentation", priority: 10 },
    { pattern: /^docs$/i, kind: "documentation", priority: 10 },
    { pattern: /documentation:/i, kind: "documentation", priority: 8 },

    // Improvement and refactor
    { pattern: /^improvement$/i, kind: "improvement", priority: 10 },
    { pattern: /^refactor$/i, kind: "refactor", priority: 10 },
    { pattern: /^tech[- ]debt$/i, kind: "techDebt", priority: 10 },
    { pattern: /^technical[- ]debt$/i, kind: "techDebt", priority: 10 },

    // Questions and research
    { pattern: /^question$/i, kind: "question", priority: 10 },
    { pattern: /^research$/i, kind: "research", priority: 10 },
    { pattern: /^spike$/i, kind: "spike", priority: 10 },

    // Tasks
    { pattern: /^task$/i, kind: "task", priority: 10 },
    { pattern: /^chore$/i, kind: "task", priority: 9 },

    // Tests
    { pattern: /^test$/i, kind: "test", priority: 10 },
    { pattern: /^testing$/i, kind: "test", priority: 10 },
  ],
  titlePatterns: [
    // Common title prefixes
    { pattern: /^\[bug\]/i, kind: "bug", priority: 5 },
    { pattern: /^\[feature\]/i, kind: "feature", priority: 5 },
    { pattern: /^\[enhancement\]/i, kind: "enhancement", priority: 5 },
    { pattern: /^\[docs\]/i, kind: "documentation", priority: 5 },
    { pattern: /^\[refactor\]/i, kind: "refactor", priority: 5 },
    { pattern: /^\[task\]/i, kind: "task", priority: 5 },
    { pattern: /^bug:/i, kind: "bug", priority: 5 },
    { pattern: /^feature:/i, kind: "feature", priority: 5 },
    { pattern: /^fix:/i, kind: "bug", priority: 5 },
    { pattern: /^feat:/i, kind: "feature", priority: 5 },
  ],
  defaultKind: "other",
} as WorkItemKindMapping;
