export let gloveEmbeddings: Record<string, number[]> | null = null;

/**
 * Updates the global gloveEmbeddings variable.
 * @param embeddings The loaded embeddings to store.
 */
export function setGloveEmbeddings(embeddings: Record<string, number[]>) {
    gloveEmbeddings = embeddings;
}
