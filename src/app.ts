import express from 'express';
import { json } from 'express';
import { setupDb } from './db/db';
import chatRoutes from "./routes/chatRoutes";
import embeddingRoutes from "./routes/embeddingRoutes";
import { setupMilvusCollection } from "./services/milvusService";
import { setupEmbeddingService } from "./services/embeddingService"
import { setupBots } from "./services/setupBotsService"

const app = express();

app.use(json());
app.use(express.urlencoded({ extended: true }));

async function initializeServer() {
    try {
        // Setup database
        await setupDb();
        console.log("Database initialized.");

        // Setup Milvus collection
        await setupMilvusCollection();
        console.log("Milvus setup completed.");

        // Setup embedding service
        await setupEmbeddingService();
        console.log("Embedding service setup completed.")
        
        // Setup bots
        await setupBots();
        console.log("Bots setup completed.")

        // Setup routes
        app.use("/chat", chatRoutes);
        app.use("/embedding", embeddingRoutes);
        // Start the server
        const PORT = 8000;
        app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

    } catch (error) {
        console.error("Error during server initialization:", error);
        process.exit(1); // Exit the process with failure code
    }
}

// Call the async initialization function
initializeServer();
