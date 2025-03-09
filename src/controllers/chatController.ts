import fs from 'fs/promises';
import path from 'path';
import { Request, Response } from "express";

import { Message } from "../db/db";
import { config } from "../../config/config";
import { embeddingServiceConfigs } from "../../config/modelConfig";

import { getEmbedding } from "../services/embeddingService";
import { milvusClient, collectionNameDocument, collectionNameMetadata } from "../services/milvusService";
import { augmentQueryWithDocuments } from "../services/ragService";
import { generateResponse } from "../services/responseService";

import { createSystemPrompt } from "../utils/helper";
import { getBotConfig } from '../utils/botDetail';


export const getResponse = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    console.log('=== API Request Started ===');
    
    try {
        const query = req.body.query;
        const chatId = req.body.chat_id;
        const botId = req.body.bot_id;
        let streamMode = req.body.stream === true;
        streamMode = true;

        console.log(`[${Date.now() - startTime}ms] Request parameters processed`);

        if (!chatId) {
            res.status(400).json({ error: "chat_id is required." });
            return;
        }

        // Load intent schema
        const loadIntentsStart = Date.now();
        const filePath = path.join(__dirname, `../../config/intentSchema/${getBotConfig(botId).SCHEMA_PATH}`);
        let intents: any[] = [];

        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const intentsData = JSON.parse(data);
            intents = intentsData.intents || [];
            console.log(`[${Date.now() - startTime}ms] Intent schema loaded (took ${Date.now() - loadIntentsStart}ms)`);
        } catch (error) {
            console.error(`Error loading intent schema for bot ${botId}:`, error);
            res.status(404).json({ error: `Intent schema not found for bot ${botId}` });
            return;
        }

        const systemPrompt = createSystemPrompt(intents, botId);
        console.log(`[${Date.now() - startTime}ms] System prompt created`);

        // Generate embedding
        const embeddingStart = Date.now();
        const queryEmbedding = await getEmbedding(query);
        console.log(`[${Date.now() - startTime}ms] Query embedding generated (took ${Date.now() - embeddingStart}ms)`);

        // Vector search
        const searchStart = Date.now();
        const searchParams = { anns_field: "embedding", topk: 10, metric_type: "COSINE", params: JSON.stringify({ nprobe: 10 }) };
        const searchResults = await milvusClient.search({
            collection_name: collectionNameDocument,
            data: [queryEmbedding],
            anns_field: "embedding",
            search_params: searchParams,
            limit: 10,
            expr: `chat_id == "${chatId}" or (is_public == true and bot_id == "${botId}")`,
            output_fields: ["title", "content", "chat_id"],
        });
        console.log(`[${Date.now() - startTime}ms] Vector search completed (took ${Date.now() - searchStart}ms)`);

        // Process search results
        if (searchResults.results && searchResults.results.length > 0) {
            searchResults.results.forEach(result => {
                console.log(`Score: ${result.score}, Title: ${result.title}`);
            });
        } else {
            console.log("No search results found");
        }

        // Filter documents
        const filterStart = Date.now();
        const highSimilarityDocs: [number, { title: string; content: string; chat_id: string }][] = [];
        const embeddingService = config.EMBEDDING_SERVICE as keyof typeof embeddingServiceConfigs;
        const documentSimilarityThreshold = embeddingServiceConfigs[embeddingService].documentSimilarityThreshold;

        for (const result of searchResults.results || []) {
            const similarity = result.score;
            if (similarity >= documentSimilarityThreshold) {
                const doc = {
                    title: result.title,
                    content: result.content,
                    chat_id: result.chat_id,
                };
                highSimilarityDocs.push([similarity, doc]);
            }
        }
        console.log(`[${Date.now() - startTime}ms] Documents filtered (took ${Date.now() - filterStart}ms)`);

        // Get chat history
        const historyStart = Date.now();
        const chatHistory = await Message.findAll({
            where: { chat_id: chatId },
            order: [["timestamp", "ASC"]],
        });
        console.log(`[${Date.now() - startTime}ms] Chat history retrieved (took ${Date.now() - historyStart}ms)`);

        if (streamMode) {
            console.log(`[${Date.now() - startTime}ms] Starting stream mode`);
            
            // Set headers
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': '*'
            });
            res.socket?.setTimeout(0);
            
            const sendSSE = (type: string, data: any) => {
                res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
            };

            let responseStream;
            
            try {
                // Generate response
                const responseStart = Date.now();
                if (highSimilarityDocs.length > 0) {
                    const { augmentedQuery, docReferences: refs } = augmentQueryWithDocuments(query, highSimilarityDocs.slice(0, 3));
                    console.log(`[${Date.now() - startTime}ms] Query augmented with references`);
                    responseStream = await generateResponse(systemPrompt, chatHistory.map((msg: any) => msg.get()), augmentedQuery, true);
                    sendSSE('references', { references: refs });
                } else {
                    responseStream = await generateResponse(systemPrompt, chatHistory.map((msg: any) => msg.get()), query, true);
                    sendSSE('references', { references: [] });
                }
                console.log(`[${Date.now() - startTime}ms] Initial response generated (took ${Date.now() - responseStart}ms)`);

                // Store user message
                const storeStart = Date.now();
                await Message.create({
                    chat_id: chatId,
                    role: "user",
                    type: "message",
                    title: null,
                    message: query,
                });
                console.log(`[${Date.now() - startTime}ms] User message stored (took ${Date.now() - storeStart}ms)`);

                let completeResponse = "";
                
                // Process stream
                const streamStart = Date.now();
                if (typeof responseStream === 'string') {
                    console.log(`[${Date.now() - startTime}ms] Received string response instead of stream`);
                    completeResponse = responseStream;
                    sendSSE('content', { content: responseStream });
                } else {
                    try {
                        console.log(`[${Date.now() - startTime}ms] Starting stream processing`);
                        for await (const chunk of responseStream) {
                            const content = chunk.choices?.[0]?.delta?.content || '';
                            if (content) {
                                completeResponse += content;
                                sendSSE('content', { content });
                            }
                        }
                        console.log(`[${Date.now() - startTime}ms] Stream processing completed (took ${Date.now() - streamStart}ms)`);
                    } catch (streamError) {
                        console.error(`[${Date.now() - startTime}ms] Stream error:`, streamError);
                        sendSSE('error', { message: "Error processing stream" });
                    }
                }

                // Store AI response
                const aiStoreStart = Date.now();
                await Message.create({
                    chat_id: chatId,
                    role: "ai",
                    type: "message",
                    title: null,
                    message: completeResponse,
                });
                console.log(`[${Date.now() - startTime}ms] AI response stored (took ${Date.now() - aiStoreStart}ms)`);

                sendSSE('done', {});
                res.end();
                console.log(`[${Date.now() - startTime}ms] === API Request Completed ===`);
            } catch (error) {
                console.error(`[${Date.now() - startTime}ms] Stream processing error:`, error);
                sendSSE('error', { message: "Internal server error" });
                res.end();
            }
        } else {
            // Non-streaming mode timing
            console.log(`[${Date.now() - startTime}ms] Starting non-stream mode`);
            const nonStreamStart = Date.now();
            // ... rest of non-streaming code ...
        }
    } catch (error) {
        console.error(`[${Date.now() - startTime}ms] Fatal error:`, error);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const getChatDetail = async (req: Request, res: Response): Promise<void> => {
    try {
        const chatId = req.params.chat_id;

        // Retrieve all chat records with the given chat_id
        const chatHistory = await Message.findAll({
            where: { chat_id: chatId },
            order: [["timestamp", "ASC"]],
        });

        if (chatHistory.length > 0) {

            // Prepare chat history data
            const chatData = chatHistory.map((chat: any) => {
                if (chat.getDataValue("type") === "file") {
                    return {
                        role: chat.getDataValue("role"),
                        type: "file",
                        title: chat.getDataValue("title"),
                        timestamp: chat.getDataValue("timestamp"),
                    };
                } else {
                    return {
                        role: chat.getDataValue("role"),
                        type: "message",
                        message: chat.getDataValue("message"),
                        timestamp: chat.getDataValue("timestamp"),
                    };
                }
            });

            res.json({
                chat_id: chatId,
                // system_prompt: systemPrompt,
                chat_history: chatData,
            });
        } else {
            res.status(404).json({ error: "No chat history found for the given chat_id." });
        }
    } catch (error) {
        console.error("Error in getChatDetail:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}

