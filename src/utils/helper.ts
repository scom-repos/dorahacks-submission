import path from 'path';
import fs from "fs";

import { getBotConfig } from "../utils/botDetail";

export const getFirstTxtFile = (directory: string): string | null => {
    try {
        const files = fs.readdirSync(directory)
            .filter(file => file.endsWith(".txt")) // Filter only .txt files
            .sort(); // Optional: Sort alphabetically to ensure consistency

        if (files.length === 0) {
            throw new Error("No .txt files found in the directory.");
        }

        return path.join(directory, files[0]); // Return the full path of the first .txt file
    } catch (error) {
        console.error("Error reading directory:", error);
        return null;
    }
}

export const filterOutliers = (results: any[]): any[] => {
    if (results.length < 2) return results; // No filtering needed for small datasets

    // Calculate mean similarity
    const mean = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

    // Calculate standard deviation
    const variance =
        results.reduce((sum, r) => sum + Math.pow(r.similarity - mean, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);

    // Compute lower bound (mean - 1 standard deviation)
    const lowerBound = mean - stdDev * 0.5;

    // Filter out items below the lower bound
    return results.filter(r => r.similarity >= lowerBound);
}

export const createSystemPrompt = (intents: any[], botId: string): string => {
    let prompt = "I have the following intentions predefined:\n";

    intents.forEach((intent) => {
        prompt += `- "${intent.name}": ${intent.description}\n`;
        if (intent.details) {
            intent.details.forEach((detail: any) => {
                prompt += `  - "${detail.name}": ${detail.description}\n`;
            });
        }
    });

    prompt += `

    Here is your introduction: **${getBotConfig(botId).BOT_INTRO}**

    First, based on the conversation history and the user's latest input, return a JSON that identifies the correct intention and details by their description.

    IMPORTANT: You must:
    1. Identify the intention with utmost accuracy and avoid any assumptions.
    2. Only select the intention if it fully matches the input and context. If there is uncertainty, return "" as the intention.
    3. Extract the required details for the identified intention. If any detail is not present or unclear, mark it as "".
    4. Ensure that you do not guess or infer information that is not explicitly provided.
    5. Ensure that when identifying the intentions and their details, you must take the description into account instead of just the name.
    6. If any details If any details of the intent are not determined, generate a follow-up question to ask for clarification and return it as 'response'. Otherwise, return the intention JSON and fill in all details.
    7. Return either the "response" or the "intention".
    8. When you are answering the question, do not use markdown format such as ** or ##. Try to use new line to separate different points.

    If an intention is detected and all details are clear, return the response in this format:
    {
        "intention": {
            "name": "xxx",
            "details": { ... }
        },
    }

    If no intention is detected or an intention is detected but the detail is not clear, answer the question or generate a follow-up question using the bot's introduction and personality, and return:
    {
        "response": "xxx"
    }
    `;
    return prompt;
};