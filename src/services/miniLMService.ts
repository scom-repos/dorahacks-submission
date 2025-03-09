import { getTransformersPipeline } from './transformersService';
import { embeddingServiceConfigs } from '../../config/modelConfig';

// Cache the model pipeline to avoid reloading it for each comparison
let miniLMPipeline: any = null;

/**
 * Gets the miniLM embedding pipeline, loading it if necessary
 * @returns The feature extraction pipeline
 */
export async function getMiniLMPipeline() {
  if (!miniLMPipeline) {
    console.log('Loading miniLM embedding model (first time only)...');
    // Get the pipeline function using our safe import service
    const pipeline = await getTransformersPipeline();
    // Use the specific model name from the config
    const miniLMConfig = embeddingServiceConfigs["miniLM"];
    miniLMPipeline = await pipeline('feature-extraction', `Xenova/${miniLMConfig.textEmbeddingModel}`);
    console.log('MiniLM model loaded successfully');
  }
  return miniLMPipeline;
}

/**
 * Generates embedding vector for a text using miniLM
 * @param text The text to encode
 * @returns A numeric vector representing the text
 */
export async function getMiniLMEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getMiniLMPipeline();
    // We use mean pooling and normalize to improve similarity computation
    const result = await extractor(text, { pooling: 'mean', normalize: true });
    // Convert to regular array of numbers
    return Array.from(result.data).map(val => Number(val));
  } catch (error) {
    console.error('Error during miniLM embedding generation:', error);
    throw error;
  }
}
