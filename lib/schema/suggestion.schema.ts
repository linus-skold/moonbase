import { z } from "zod";

export const SuggestionTypeSchema = z.enum([
  "project",
  "org",
  "repo",
  "status",
  "assignee",
  "type",
]);
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;

export const SearchSuggestionSchema = z.object({
  type: SuggestionTypeSchema,
  value: z.string(),
  label: z.string(),
  count: z.number().optional(),
});

export const SearchSuggestionsSchema = z.array(SearchSuggestionSchema);

export type SearchSuggestion = z.infer<typeof SearchSuggestionSchema>;
export type SearchSuggestions = z.infer<typeof SearchSuggestionsSchema>;