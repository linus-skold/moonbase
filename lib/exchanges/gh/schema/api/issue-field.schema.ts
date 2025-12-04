import { z } from "zod";

/**
 * Issue Field Value data type
 */
const IssueFieldDataTypeSchema = z.enum([
  "text",
  "single_select",
  "number",
  "date",
]);

/**
 * Single Select Option for issue fields
 */
const SingleSelectOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  color: z.string(),
});

/**
 * Issue Field Value
 * A value assigned to an issue field
 */
export const IssueFieldValueSchema = z.object({
  issue_field_id: z.number().int(),
  node_id: z.string(),
  data_type: IssueFieldDataTypeSchema,
  value: z.union([z.string(), z.number(), z.number().int()]).nullable(),
  single_select_option: SingleSelectOptionSchema.nullable().optional(),
});

export type IssueFieldValue = z.infer<typeof IssueFieldValueSchema>;

/**
 * Sub-issues Summary
 */
export const SubIssuesSummarySchema = z.object({
  total: z.number().int(),
  completed: z.number().int(),
  percent_completed: z.number().int(),
});

export type SubIssuesSummary = z.infer<typeof SubIssuesSummarySchema>;

/**
 * Issue Dependencies Summary
 */
export const IssueDependenciesSummarySchema = z.object({
  blocked_by: z.number().int(),
  blocking: z.number().int(),
  total_blocked_by: z.number().int(),
  total_blocking: z.number().int(),
});

export type IssueDependenciesSummary = z.infer<
  typeof IssueDependenciesSummarySchema
>;
