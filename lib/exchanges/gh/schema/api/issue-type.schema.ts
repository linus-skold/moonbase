import { z } from "zod";

/**
 * Issue Type Color enum
 */
const IssueTypeColorSchema = z
  .enum(["gray", "blue", "green", "yellow", "orange", "red", "pink", "purple"])
  .nullable();

/**
 * Issue Type
 * The type of issue
 */
export const IssueTypeSchema = z
  .object({
    id: z.number().int(),
    node_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    color: IssueTypeColorSchema.optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    is_enabled: z.boolean().optional(),
  })
  .nullable();

export type IssueType = z.infer<typeof IssueTypeSchema>;
