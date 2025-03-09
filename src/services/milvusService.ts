import { MilvusClient, DataType, FieldType, InsertReq } from "@zilliz/milvus2-sdk-node";
import { config } from "../../config/config";

export const milvusClient = new MilvusClient({
    address: `standalone:19530`,
});

export const collectionNameDocument = "document_embeddings";
export const collectionNameMetadata = "metadata_embeddings";

export const setupMilvusCollection = async () => {

    // setup vector data for document
    const fields: FieldType[] = [
        { name: "id", data_type: DataType.Int64, is_primary_key: true, autoID: true },
        { name: "chat_id", data_type: DataType.VarChar, max_length: 36 },
        { name: "title", data_type: DataType.VarChar, max_length: 255 },
        { name: "content", data_type: DataType.VarChar, max_length: 65535 },
        { name: "is_public", data_type: DataType.Bool },
        { name: "bot_id", data_type: DataType.VarChar, max_length: 36 },
    ];

    if (config.EMBEDDING_SERVICE === "openai") {
        fields.push({ name: "embedding", data_type: DataType.FloatVector, dim: 1536 });
    } else if (config.EMBEDDING_SERVICE === "tensorflow") {
        fields.push({ name: "embedding", data_type: DataType.FloatVector, dim: 512 });
    } else if (config.EMBEDDING_SERVICE === "glove") {
        fields.push({ name: "embedding", data_type: DataType.FloatVector, dim: 50 });
    } else if (config.EMBEDDING_SERVICE === "miniLM") {
        fields.push({ name: "embedding", data_type: DataType.FloatVector, dim: 384 });
    } else {
        throw new Error("Invalid embedding service");
    }

    const collectionExists = await milvusClient.hasCollection({ collection_name: collectionNameDocument });
    if (!collectionExists.value) {
        await milvusClient.createCollection({
            collection_name: collectionNameDocument,
            fields,
        });

        // Create an index for the embedding field
        await milvusClient.createIndex({
            collection_name: collectionNameDocument,
            field_name: "embedding",
            index_type: "IVF_FLAT",
            metric_type: "COSINE",
            params: { nlist: 128 },
        });
    }

    await milvusClient.loadCollection({ collection_name: collectionNameDocument });

    // setup vector data for metadata
    const fieldsMetadata: FieldType[] = [
        { name: "id", data_type: DataType.Int64, is_primary_key: true, autoID: true },
        { name: "chat_id", data_type: DataType.VarChar, max_length: 36 },
        { name: "cid", data_type: DataType.VarChar, max_length: 255 },
        { name: "description", data_type: DataType.VarChar, max_length: 65535 },
        { name: "url", data_type: DataType.VarChar, max_length: 255 },
        { name: "is_public", data_type: DataType.Bool },
        { name: "bot_id", data_type: DataType.VarChar, max_length: 36 },
    ];

    if (config.EMBEDDING_SERVICE === "openai") {
        fieldsMetadata.push({ name: "embedding", data_type: DataType.FloatVector, dim: 1536 });
    } else if (config.EMBEDDING_SERVICE === "tensorflow") {
        fieldsMetadata.push({ name: "embedding", data_type: DataType.FloatVector, dim: 512 });
    } else if (config.EMBEDDING_SERVICE === "glove") {
        fieldsMetadata.push({ name: "embedding", data_type: DataType.FloatVector, dim: 50 });
    } else if (config.EMBEDDING_SERVICE === "miniLM") {
        fieldsMetadata.push({ name: "embedding", data_type: DataType.FloatVector, dim: 384 });
    } else {
        throw new Error("Invalid embedding service");
    }

    const collectionExistsMetadata = await milvusClient.hasCollection({ collection_name: collectionNameMetadata });
    if (!collectionExistsMetadata.value) {
        await milvusClient.createCollection({
            collection_name: collectionNameMetadata,
            fields: fieldsMetadata, // Use fields instead of fieldsMetadata
        });

        // Create an index for the embedding field
        await milvusClient.createIndex({
            collection_name: collectionNameMetadata,
            field_name: "embedding",
            index_type: "IVF_FLAT",
            metric_type: "COSINE",
            params: { nlist: 128 },
        });
    }

    await milvusClient.loadCollection({ collection_name: collectionNameMetadata });

};

export const storeEmbeddingInMilvus = async (
    chatId: string,
    title: string,
    content: string,
    embedding: number[],
    isPublic: boolean,
    botId: string
) => {
    try {
        // If public content, check for duplicates before inserting
        if (isPublic) {
            // Perform vector similarity search to find potential duplicates
            const searchParams = { anns_field: "embedding", topk: 5, metric_type: "COSINE", params: JSON.stringify({ nprobe: 10 }) };
            const searchResults = await milvusClient.search({
                collection_name: collectionNameDocument,
                data: [embedding],
                anns_field: "embedding",
                search_params: searchParams,
                limit: 5,
                expr: `is_public == true and bot_id == "${botId}"`,
                output_fields: ["title", "content"],
            });

            // Check if we have any highly similar results (similarity > 0.98)
            const similarDocs = (searchResults.results || []).filter((result: { score: number }) => 
                result.score > 0.98 // High similarity threshold
            );

            if (similarDocs.length > 0) {
                console.log(`Similar document already exists in Milvus, skipping insertion for: ${title}`);
                return;
            }
        }

        // No duplicates found or private content, proceed with insertion
        const insertData: InsertReq = {
            collection_name: collectionNameDocument,
            fields_data: [{
                chat_id: chatId,
                title: title,
                content: content,
                embedding: embedding,
                is_public: isPublic,
                bot_id: botId
            }],
        };

        await milvusClient.insert(insertData);
        console.log("Document stored in Milvus: ", title);
    } catch (error) {
        console.error("Error storing document in Milvus:", error);
        throw new Error("Failed to store document in Milvus.");
    }
};

export const storeMetadataEmbeddingInMilvus = async (
    chatId: string,
    cid: string,
    description: string,
    embedding: number[],
    url: string,
    isPublic: boolean,
    botId: string
): Promise<void> => {
    try {
        // If public content, check for duplicates before inserting
        if (isPublic) {
            // Perform vector similarity search to find potential duplicates
            const searchParams = { anns_field: "embedding", topk: 5, metric_type: "COSINE", params: JSON.stringify({ nprobe: 10 }) };
            const searchResults = await milvusClient.search({
                collection_name: collectionNameMetadata,
                data: [embedding],
                anns_field: "embedding",
                search_params: searchParams,
                limit: 5,
                expr: `is_public == true and bot_id == "${botId}"`,
                output_fields: ["cid", "url"],
            });

            // Check if we have any highly similar results (similarity > 0.98)
            const similarDocs = (searchResults.results || []).filter((result: { score: number }) => 
                result.score > 0.98 // High similarity threshold
            );

            if (similarDocs.length > 0) {
                console.log(`Similar metadata already exists in Milvus, skipping insertion for: ${url}`);
                return;
            }
        }

        // No duplicates found or private content, proceed with insertion
        const fieldsData = {
            chat_id: chatId,
            cid: cid,
            description: description,
            embedding: embedding,
            url: url,
            is_public: isPublic,
            bot_id: botId
        };

        await milvusClient.insert({
            collection_name: collectionNameMetadata,
            fields_data: [fieldsData], // Correct format: array of objects
        });

    } catch (error) {
        console.error("Error storing metadata embedding in Milvus:", error);
        throw new Error("Failed to store metadata embedding in Milvus.");
    }
};

export const checkIfCidExistsInMilvus = async (chatId: string, cid: string): Promise<boolean> => {
    try {
      const query = `chat_id == "${chatId}" && cid == "${cid}"`;
  
      const searchResults = await milvusClient.query({
        collection_name: collectionNameMetadata,
        expr: query,
        output_fields: ["chat_id", "cid"],
      });
  
      // Assuming the `searchResults` object contains an array under a `data` or similar field
      return searchResults?.data?.length > 0; // Adjust `data` based on actual Milvus SDK structure
    } catch (error) {
      console.error("Error while checking if CID exists in Milvus:", error);
      return false;
    }
  };