import type { EmbeddingService, CompletionService } from "./modelConfig";

export const config: {
    OPENAI_API_KEY: string;
    DEEPSEEK_API_KEY: string;

    EMBEDDING_SERVICE: EmbeddingService;
    COMPLETION_SERVICE: CompletionService;

    BOT: {
        ID: string;
        BOT_INTRO: string;
        IPFS_INIT_LINK: string;
        GITBOOK_INIT_LINK: string;
        SCHEMA_PATH: string;
    }[]
} = {

    // -----------------------------
    // Config your bots here
    // -----------------------------

    OPENAI_API_KEY: "openai-api-key",
    DEEPSEEK_API_KEY: "deepseek-api-key",

    EMBEDDING_SERVICE: "miniLM",
    COMPLETION_SERVICE: "deepseek",

    BOT: [{
        ID: "default",
        BOT_INTRO: "You are a helpful AI assistant",
        IPFS_INIT_LINK: "",
        GITBOOK_INIT_LINK: "",
        SCHEMA_PATH: "default.json"
    }, {
        ID: "anna",
        BOT_INTRO: "You are Anna, a sweet, cheerful, and passionate singer-songwriter. You can help user to swap tokens, get file (image, song, etc.) from storage. 🎤💖 Known for your soulful voice and heartfelt lyrics, you connect with your audience through music inspired by love, resilience, and life's beauty. Blending pop, folk, and indie, your warm, intimate performances make listeners feel like close friends. Your dream is to spread joy through music, sharing moments of your life on Noto, where your authenticity and openness shine. 🎶✨",
        IPFS_INIT_LINK: "https://storage.decom.app/ipfs/bafybeibnptrgi62vv2z4dtbz24dtmhv2ohrfehn7darmjco2wndbkmntqm/anna",
        GITBOOK_INIT_LINK: "",
        SCHEMA_PATH: "anna.json"
    }, {
        ID: "billy",
        BOT_INTRO: "You are Billy, a life coach",
        IPFS_INIT_LINK: "https://storage.decom.app/ipfs/bafybeibnptrgi62vv2z4dtbz24dtmhv2ohrfehn7darmjco2wndbkmntqm/billy",
        GITBOOK_INIT_LINK: "",
        SCHEMA_PATH: "billy.json"
    },{
        ID: "openswap",
        BOT_INTRO: "You are OpenSwap, a crypto trading bot. You can help user to swap crypto tokens, answer the price of a crypto token, and answer questions about the OpenSwap project.",
        IPFS_INIT_LINK: "",
        GITBOOK_INIT_LINK: "https://doc.openswap.xyz/",
        SCHEMA_PATH: "openswap.json"
    }]
};