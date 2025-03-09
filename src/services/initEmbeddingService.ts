import axios from "axios";
import { scrapeGitbook } from "../utils/scrapGitbook";
import { getEmbedding } from "./embeddingService";
import { storeEmbeddingInMilvus, storeMetadataEmbeddingInMilvus, checkIfCidExistsInMilvus } from "./milvusService";

export const processEmbeddings = async (url: string, botId: string): Promise<void> => {
    const pageList = await scrapeGitbook(url);
    for (const page of pageList) {
        const embedding = await getEmbedding(page.text);
        await storeEmbeddingInMilvus("default", page.url, page.text, embedding, true, botId);
    }
}

export const processMetadataEmbeddings = async (
    link: string,
    chatId: string,
    isPublic: boolean,
    botId: string
): Promise<{ message: string; results: any[] }> => {
    // Fetch the IPFS directory JSON.
    const ipfsResponse = await axios.get(link);
    if (ipfsResponse.status !== 200) {
        throw new Error("Failed to fetch IPFS directory JSON.");
    }

    const ipfsData = ipfsResponse.data;

    // Look for the meta.json file in the IPFS directory.
    const metaFile = ipfsData.links.find((item: any) => item.name === "meta.json");
    if (!metaFile) {
        throw new Error("meta.json file not found in the provided IPFS link.");
    }

    // Fetch meta.json file.
    const metaUrl = `${link}/meta.json`;
    const metaResponse = await axios.get(metaUrl);
    if (metaResponse.status !== 200) {
        throw new Error("Failed to fetch meta.json file from the provided IPFS link.");
    }

    const metaData = metaResponse.data;
    const files = metaData.files || [];

    if (!Array.isArray(files)) {
        throw new Error("Invalid format in meta.json: 'files' should be a list.");
    }

    const results = [];

    // Process each file in meta.json.
    for (const file of files) {
        const fileCid = file.cid;
        const description = file.description;

        if (!fileCid || !description) {
            results.push({
                error: "File metadata missing 'cid' or 'description'. Skipping this entry."
            });
            continue;
        }

        const fileName = ipfsData.links.find((item: any) => item.cid === fileCid)?.name;
        if (!fileName) {
            results.push({
                cid: fileCid,
                error: "Image name not found for the given CID. Skipping this entry."
            });
            continue;
        }

        const url = `${link}/${fileName}`;
        const existsInMilvus = await checkIfCidExistsInMilvus(chatId, fileCid);

        if (!existsInMilvus) {
            const embedding = await getEmbedding(description);
            await storeMetadataEmbeddingInMilvus(chatId, fileCid, description, embedding, url, isPublic, botId);
            results.push({
                cid: fileCid,
                description,
                url,
                message: "Embedding generated and stored in Milvus."
            });
        } else {
            results.push({
                cid: fileCid,
                url,
                message: "CID already exists in Milvus. Skipping."
            });
        }
    }

    return {
        message: "IPFS metadata processed successfully.",
        results
    };
};