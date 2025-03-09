import { OpenAI } from "openai";
import { config } from "../../config/config";
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { getTextEmbedding } from "../services/gloveService";
import { embeddingServiceConfigs } from "../../config/modelConfig";
import { setupTensorflowBackend } from "./tensorflowService";
import { loadGloveEmbeddings } from "./gloveService";
import { getFirstTxtFile } from "../utils/helper"
import { setGloveEmbeddings } from "../utils/gloveStorage";
import path from 'path';
import { getMiniLMEmbedding, getMiniLMPipeline } from './miniLMService';

export const setupEmbeddingService = async (): Promise<void> => {
  // Check embedding service and initialize accordingly
  if (config.EMBEDDING_SERVICE === "tensorflow") {
    // Ensure the backend is set to tensorflow
    await setupTensorflowBackend();
    console.log("TensorFlow backend initialized.");
  } else if (config.EMBEDDING_SERVICE === "glove") {

    // Define the directory path
    const embeddingsDir = path.join(__dirname, "../../pretrain-embeddings");

    // Get the first .txt file dynamically
    const gloveFilePath = getFirstTxtFile(embeddingsDir);

    if (!gloveFilePath) {
      throw new Error("No .txt file found in the pretrain-embeddings directory.");
    }

    // Load the embeddings into memory
    const gloveEmbeddings = await loadGloveEmbeddings(gloveFilePath);

    // Store the embeddings for later use
    setGloveEmbeddings(gloveEmbeddings);

    console.log(`Loaded GloVe embeddings (${Object.keys(gloveEmbeddings).length} words).`);
  } else if (config.EMBEDDING_SERVICE === "miniLM") {
    // Initialize the miniLM embedding pipeline
    await getMiniLMPipeline();
  }
}

export const getEmbedding = async (text: string): Promise<number[]> => {
  try {
    if (config.EMBEDDING_SERVICE === "tensorflow") {

      const model = await use.load();
      const embeddings = await model.embed([text]);
      const embeddingArray = await embeddings.array();
      const embedding = embeddingArray[0];
      return embedding;

    } else if (config.EMBEDDING_SERVICE === "openai") {
      
      const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
      const openaiEmbeddingConfig = embeddingServiceConfigs["openai"];
      const response = await openai.embeddings.create({
        input: [text],
        model: openaiEmbeddingConfig.textEmbeddingModel,
      });
      return response.data[0].embedding;

    } else if (config.EMBEDDING_SERVICE === "glove") {

      return getTextEmbedding(text);

    } else if (config.EMBEDDING_SERVICE === "miniLM") {

      return getMiniLMEmbedding(text);

    } else {
      throw new Error("Invalid embedding service");
    }

  } catch (error) {
    console.error("Error generating embedding:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("An unknown error occurred");
    }
  }
}
