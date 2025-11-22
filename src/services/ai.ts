import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

export interface AICompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Get AI completion using Claude
 */
export async function getAICompletion(
  prompt: string,
  options: AICompletionOptions = {}
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      system: options.systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return textContent.text;
  } catch (error) {
    logger.error('AI completion failed:', error);
    throw error;
  }
}

/**
 * Analyze image with vision model
 */
export async function analyzeImage(
  imageData: Buffer,
  prompt: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  try {
    const base64Image = imageData.toString('base64');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return textContent.text;
  } catch (error) {
    logger.error('Image analysis failed:', error);
    throw error;
  }
}

/**
 * Extract structured data from text using AI
 */
export async function extractStructuredData<T>(
  text: string,
  schema: string,
  examples?: string
): Promise<T> {
  const prompt = `
Extract structured data from the following text according to this schema:

${schema}

${examples ? `Examples:\n${examples}\n` : ''}

Text to analyze:
${text}

Return ONLY valid JSON that matches the schema. Do not include any explanation or markdown formatting.
`;

  const response = await getAICompletion(prompt, {
    temperature: 0.3,
    maxTokens: 2048,
  });

  try {
    return JSON.parse(response.trim());
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('Failed to parse JSON response from AI');
  }
}
