/**
 * This file provides a safe way to import the @xenova/transformers module
 * which is an ES Module, from CommonJS code.
 */

/**
 * Dynamically imports the pipeline function from @xenova/transformers
 * @returns The pipeline function
 */
export async function getTransformersPipeline() {
  try {
    const { pipeline } = await import('@xenova/transformers');
    return pipeline;
  } catch (error) {
    console.error('Error importing transformers module:', error);
    throw error;
  }
} 