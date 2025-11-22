import { BasePipeline, PipelineContext, EnrichedItem, Entities } from '../types';
import { getAICompletion, extractStructuredData } from '../services/ai';

/**
 * Base pipeline class with common functionality
 */
export abstract class AbstractPipeline implements BasePipeline {
  abstract name: string;
  abstract process(context: PipelineContext): Promise<EnrichedItem>;

  /**
   * Extract entities from text using AI
   */
  protected async extractEntities(text: string): Promise<Entities> {
    const schema = `
{
  "people": ["string"],
  "orgs": ["string"],
  "products": ["string"],
  "tech": ["string"]
}
`;

    try {
      return await extractStructuredData<Entities>(text, schema);
    } catch {
      return {
        people: [],
        orgs: [],
        products: [],
        tech: [],
      };
    }
  }

  /**
   * Generate tags from text using AI
   */
  protected async generateTags(text: string, maxTags = 10): Promise<string[]> {
    const prompt = `
Analyze the following text and generate ${maxTags} relevant tags/keywords that capture the main topics, themes, and concepts.

Return ONLY a JSON array of strings, like: ["tag1", "tag2", "tag3"]

Text:
${text.substring(0, 3000)}
`;

    try {
      const tags = await extractStructuredData<string[]>(text, '["string"]');
      return tags.slice(0, maxTags);
    } catch {
      return [];
    }
  }

  /**
   * Generate title from text using AI
   */
  protected async generateTitle(text: string, maxLength = 80): Promise<string> {
    const prompt = `
Generate a concise, descriptive title (max ${maxLength} characters) for the following content.

Return ONLY the title text, no quotes or formatting.

Content:
${text.substring(0, 1000)}
`;

    const title = await getAICompletion(prompt, {
      temperature: 0.5,
      maxTokens: 100,
    });

    return title.trim().substring(0, maxLength);
  }

  /**
   * Generate summary and key points using AI
   */
  protected async generateSummaryAndKeyPoints(text: string): Promise<{
    summary: string;
    keyPoints: string[];
  }> {
    const schema = `
{
  "summary": "string (2-3 sentences)",
  "keyPoints": ["string"] (3-7 bullet points)
}
`;

    try {
      return await extractStructuredData<{ summary: string; keyPoints: string[] }>(
        text,
        schema
      );
    } catch {
      return {
        summary: text.substring(0, 300),
        keyPoints: [],
      };
    }
  }

  /**
   * Classify content intent/topic using AI
   */
  protected async classifyIntent(text: string): Promise<string> {
    const prompt = `
Classify the intent or main topic of this content in 2-4 words.

Examples: "Technical Article", "Product Idea", "Meeting Notes", "Code Snippet", "Question"

Content:
${text.substring(0, 500)}

Return ONLY the classification, no explanation.
`;

    const intent = await getAICompletion(prompt, {
      temperature: 0.3,
      maxTokens: 50,
    });

    return intent.trim();
  }
}
