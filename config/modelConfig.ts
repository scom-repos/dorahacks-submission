export type EmbeddingService = "openai" | "tensorflow" | "glove" | "miniLM";
export type CompletionService = "openai" | "deepseek";

// -----------------------------
// Embedding Service Configurations
// -----------------------------

export interface EmbeddingServiceConfig {
  textEmbeddingModel: string;
  documentSimilarityThreshold: number;
  metadataSimilarityThreshold: number;
}

export const embeddingServiceConfigs: Record<EmbeddingService, EmbeddingServiceConfig> = {
  openai: {
    textEmbeddingModel: "text-embedding-3-small",
    documentSimilarityThreshold: 0.6,
    metadataSimilarityThreshold: 0.4,
  },
  tensorflow: {
    textEmbeddingModel: "tensorflow-embedding-model",
    documentSimilarityThreshold: 0.3,
    metadataSimilarityThreshold: 0.4,
  },
  glove: {
    textEmbeddingModel: "glove-embedding",
    documentSimilarityThreshold: 0.2,
    metadataSimilarityThreshold: 0.2,
  },
  miniLM: {
    textEmbeddingModel: "all-MiniLM-L6-v2",
    documentSimilarityThreshold: 0.5,
    metadataSimilarityThreshold: 0.7,
  },
};

// -----------------------------
// Completion Service Configurations
// -----------------------------

export interface CompletionServiceConfig {
  chatCompletionModel: string;
}

export const completionServiceConfigs: Record<CompletionService, CompletionServiceConfig> = {
  openai: {
    chatCompletionModel: "gpt-4o"
  },
  deepseek: {
    chatCompletionModel: "deepseek-chat"
  },
};
