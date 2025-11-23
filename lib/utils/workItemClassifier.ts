import { z } from 'zod';
import { WorkItemKind, WorkItemKindMapping, WorkItemKindSchema } from '../schema/workItemKind.schema';

export interface WorkItemClassificationInput {
  typeName?: string;
  labels?: string[];  
  title?: string;
}

export interface WorkItemClassificationResult {
  kind: WorkItemKind;
  confidence: number;
  method: 'typeNameMap' | 'labelPattern' | 'titlePattern' | 'default';
  details?: string;
}

export function createWorkItemClassifier(mapping: WorkItemKindMapping): WorkItemClassifier {
  return new WorkItemClassifier(mapping);
}

export function normalizeLabels(labels: any[]): string[] {
  if (!Array.isArray(labels)) {
    return [];
  }
  
  return labels
    .map(label => {
      if (typeof label === 'string') {
        return label;
      }
      if (label && typeof label === 'object') {
        // Handle GitHub label objects
        return label.name || label.label || '';
      }
      return '';
    })
    .filter(Boolean);
}

const BestMatchSchema = z.object({
  kind: WorkItemKindSchema.default("other"),
  priority: z.number().default(0),
  matchedLabel: z.string().optional(),
});
type BestMatch = z.infer<typeof BestMatchSchema>;


export class WorkItemClassifier {
  private mapping: WorkItemKindMapping;
  
  constructor(mapping: WorkItemKindMapping) {
    this.mapping = mapping;
  }
  
  classify(input: WorkItemClassificationInput): WorkItemClassificationResult {
    const candidates: Array<{
      kind: WorkItemKind;
      score: number;
      method: 'typeNameMap' | 'labelPattern' | 'titlePattern' | 'default';
      details: string;
    }> = [];
    
    console.log("Classifying work item with input:", input);

    // 1. Type name mapping (base score: 100)
    if (input.typeName) {
      const kind = this.classifyByTypeName(input.typeName);
      if (kind) {
        candidates.push({
          kind,
          score: 100,
          method: 'typeNameMap',
          details: `Matched type name: "${input.typeName}"`,
        });
      }
    }
    
    // 2. Label patterns (base score: 85 + priority)
    if (input.labels && input.labels.length > 0) {
      const labelResult = this.classifyByLabels(input.labels);
      if (labelResult && labelResult.kind) {
        candidates.push({
          kind: labelResult.kind,
          score: 85 + (labelResult.priority || 0),
          method: 'labelPattern',
          details: `Matched label: "${labelResult.matchedLabel}"`,
        });
      }
    }
    
    // 3. Title patterns (base score: 60 + priority)
    if (input.title) {
      const titleResult = this.classifyByTitle(input.title);
      if (titleResult && titleResult.kind) {
        candidates.push({
          kind: titleResult.kind,
          score: 60 + (titleResult.priority || 0),
          method: 'titlePattern',
          details: `Matched title pattern`,
        });
      }
    }
    
    // Select the candidate with the highest score
    if (candidates.length > 0) {
      const best = candidates.reduce((prev, current) => 
        current.score > prev.score ? current : prev
      );
      
      return {
        kind: best.kind,
        confidence: Math.min(best.score / 100, 1.0),
        method: best.method,
        details: best.details,
      };
    }
    
    // 4. Return default (low confidence)
    return {
      kind: this.mapping.defaultKind,
      confidence: 0.3,
      method: 'default',
      details: 'No specific pattern matched, using default',
    };
  }
  

  private classifyByTypeName(typeName: string): WorkItemKind | null {
    const normalizedTypeName = typeName.toLowerCase().trim();
    
    // Try exact match first
    if (this.mapping.typeNameMap[normalizedTypeName]) {
      return this.mapping.typeNameMap[normalizedTypeName];
    }
    
    // Try partial match (for flexibility)
    for (const [key, value] of Object.entries(this.mapping.typeNameMap)) {
      if (normalizedTypeName.includes(key) || key.includes(normalizedTypeName)) {
        return value;
      }
    }
    
    return null;
  }
  
  private classifyByLabels(labels: string[]): BestMatch | null {
    let bestMatch: BestMatch | null = null;
    for (const label of labels) {
      for (const { pattern, kind, priority } of this.mapping.labelPatterns) {
        if (pattern.test(label)) {
          if (!bestMatch || priority > bestMatch.priority) {
            bestMatch = { kind, priority, matchedLabel: label };
          }
        }
      }
    }
    return bestMatch;
  }
  
  private classifyByTitle(title: string): BestMatch | null {
    let bestMatch: BestMatch | null = null;
    for (const { pattern, kind, priority } of this.mapping.titlePatterns) {
      if (pattern.test(title)) {
        if (!bestMatch || priority > bestMatch.priority) {
          bestMatch = { kind, priority };
        }
      }
    }
    return bestMatch;
  }
}


