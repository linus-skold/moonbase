import { z } from "zod";

export const WorkItemKindSchema = z.enum([
  // Issues and defects
  "bug",
  "defect",

  // Features and enhancements
  "feature",
  "enhancement",
  "epic",
  "userStory",

  // Tasks and work
  "task",
  "subTask",
  "spike",

  // Documentation and improvement
  "documentation",
  "improvement",
  "refactor",
  "techDebt",

  // Other categories
  "question",
  "research",
  "test",

  // Fallback
  "other",
]);

export type WorkItemKind = z.infer<typeof WorkItemKindSchema>;

export const WorkItemKindMappingSchema = z.object({
  typeNameMap: z.record(z.string(), WorkItemKindSchema).default({}),
  labelPatterns: z
    .array(
      z.object({
        pattern: z.instanceof(RegExp),
        kind: WorkItemKindSchema,
        priority: z.number(),
      })
    )
    .default([]),
  titlePatterns: z
    .array(
      z.object({
        pattern: z.instanceof(RegExp),
        kind: WorkItemKindSchema,
        priority: z.number(),
      })
    )
    .default([]),
  defaultKind: WorkItemKindSchema.default("other"),
});

export type WorkItemKindMapping = z.infer<typeof WorkItemKindMappingSchema>;



export const createWorkItemKindMapping = (
  overrides: Partial<WorkItemKindMapping> = {}
): WorkItemKindMapping => WorkItemKindMappingSchema.parse(overrides);
