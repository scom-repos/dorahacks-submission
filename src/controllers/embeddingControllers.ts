import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { config } from "../../config/config";
import { embeddingServiceConfigs } from "../../config/modelConfig";
import { filterOutliers } from "../utils/helper";

import { getEmbedding } from "../services/embeddingService";
import { storeEmbeddingInMilvus} from "../services/milvusService";
import { processMetadataEmbeddings } from "../services/initEmbeddingService";
import { milvusClient, collectionNameMetadata } from "../services/milvusService";

export const retrieveMetaData = async (req: Request, res: Response): Promise<void> => {
  try {
      const query: string = req.body.query;
      const chatId: string = req.body.chat_id;
      const botId: string = req.body.bot_id;

      if (!query || !chatId) {
          res.status(400).json({ error: "query and chat_id are required." });
          return;
      }

      const queryEmbedding = await getEmbedding(query);

      const searchParams = { anns_field: "embedding", topk: 10, metric_type: "COSINE", params: JSON.stringify({ nprobe: 10 }) };

      const searchResults = await milvusClient.search({
          collection_name: collectionNameMetadata,
          data: [queryEmbedding],
          anns_field: "embedding",
          search_params: searchParams,
          limit: 10,
          expr: `chat_id == "${chatId}" or (is_public == true and bot_id == "${botId}")`,
          output_fields: ["cid", "url", "description"],
      });

      // Only print score and url from metadata search results
      console.log("Metadata search results (score and url):");
      if (searchResults.results && searchResults.results.length > 0) {
          searchResults.results.forEach(result => {
              console.log(`Score: ${result.score}, URL: ${result.url}`);
          });
      } else {
          console.log("No metadata search results found");
      }

      const results = [];

      const embeddingService = config.EMBEDDING_SERVICE as keyof typeof embeddingServiceConfigs;
      const metadataSimilarityThreshold = embeddingServiceConfigs[embeddingService].metadataSimilarityThreshold;

      for (const result of searchResults.results || []) {
          const similarity = result.score;

          if (similarity >= metadataSimilarityThreshold) {
              const doc = {
                  cid: result.cid,
                  url: result.url,
                  similarity: result.score,
                  description: result.description,
              };
              results.push(doc);
          }
      }

      const uniqueResults = results.filter((item, index, self) =>
          index === self.findIndex(t => t.cid === item.cid)
      );

      const filteredResults = filterOutliers(uniqueResults);

      res.json({
          message: "Top N similar metadata",
          results: filteredResults
      });
  } catch (error) {
      console.error("Error in retrieveMetaData:", error);
      res.status(500).json({ error: "Internal server error." });
  }
};

export const generateEmbeddings = async (req: Request, res: Response): Promise<void> => {
  try {
    const responseData = [];
    const chatId = req.body.chat_id || uuidv4();
    const save = req.body.save?.toLowerCase() === "true";
    const textInput = req.body.text;
    const isPublic = req.body.is_public?.toLowerCase() === "true";
    const botId = req.body.bot_id;

    if (req.files?.length && textInput) {
      res.status(400).json({ error: "Please provide either text or files, but not both." });
      return;
    }

    // Handling text input
    if (textInput) {
      const fileName = "text_input.txt";
      const fileContent = textInput;
      const embedding = await getEmbedding(fileContent);
      if (save) await storeEmbeddingInMilvus(chatId, fileName, fileContent, embedding, isPublic, botId);

      responseData.push({
        file_name: fileName,
        message: save ? "Embedding stored in Milvus!" : "Embedding generated.",
        content: fileContent,
        embedding,
        chat_id: chatId,
      });
    }

    // Handling file input
    else if (req.files) {
      const files = req.files as Express.Multer.File[];
      for (const file of files) {
        const fileName = file.originalname;
        const fileFormat = fileName.split(".").pop();
        if (!["txt", "md"].includes(fileFormat!)) {
          res.status(400).json({ error: `Unsupported file type for ${fileName}.` });
          return;
        }

        const fileContent = file.buffer.toString("utf-8");
        const embedding = await getEmbedding(fileContent);
        if (save) await storeEmbeddingInMilvus(chatId, fileName, fileContent, embedding, isPublic, botId);

        responseData.push({
          file_name: fileName,
          message: save ? "Embedding stored in Milvus!" : "Embedding generated.",
          content: fileContent,
          embedding,
          chat_id: chatId,
        });
      }
    } else {
      res.status(400).json({ error: "No file or text provided." });
      return;
    }

    res.json({
      message: "Embeddings generated successfully.",
      results: responseData,
      chat_id: chatId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

export const generateMetadataEmbeddings = async (req: Request, res: Response): Promise<void> => {
  try {
    const link: string = req.body.link;
    const chatId: string = req.body.chat_id;
    const isPublic: boolean = req.body.is_public?.toLowerCase() === "true";
    const botId: string = req.body.bot_id;

    // Validate the incoming request.
    if (!link) {
      res.status(400).json({ error: "No link provided. Please provide a valid IPFS link." });
      return;
    }

    if (!chatId) {
      res.status(400).json({ error: "No chat_id provided. Please provide a valid chat_id." });
      return;
    }

    // Call the business logic function.
    const result = await processMetadataEmbeddings(link, chatId, isPublic, botId);
    res.json(result);
  } catch (error) {
    console.error("Error in generateMetadataEmbeddings:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};