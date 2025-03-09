import { config } from "../../config/config";

export const getBotConfig = (botId?: string) => {
    if (botId) {
        const found = config.BOT.find((bot) => bot.ID === botId);
        if (found) return found;
    }
    // Fallback to the default bot if none provided or found.
    return config.BOT[0];
};