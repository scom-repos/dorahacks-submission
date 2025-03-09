import { processMetadataEmbeddings, processEmbeddings } from "./initEmbeddingService";
import { config } from "../../config/config";

export const setupBots = async (): Promise<void> => {
  const chatId = "default";
  const isPublic = true;

  for (const bot of config.BOT) {
    const ipfsLink = bot.IPFS_INIT_LINK;
    const gitbookLink = bot.GITBOOK_INIT_LINK;
    const botId = bot.ID;

    try {
      if (ipfsLink) {
        await processMetadataEmbeddings(ipfsLink, chatId, isPublic, botId);
        console.log(`Successfully initialized bot "${bot.ID}" with IPFS link`);
      }
      if (gitbookLink) {
        await processEmbeddings(gitbookLink, botId);
        console.log(`Successfully initialized bot "${bot.ID}" with Gitbook link`);
      }
    } catch (error) {
      console.error(`Error initializing bot "${bot.ID}":`, error);
    }
  }
};
