import { Router } from "express";
import { generateEmbeddings, generateMetadataEmbeddings, retrieveMetaData } from "../controllers/embeddingControllers";
import multer from "multer";

const upload = multer();
const router = Router();

router.post("/retrieve-metadata", retrieveMetaData);
router.post("/generate-embeddings", upload.array("file"), generateEmbeddings);
router.post("/generate-metadata-embeddings", generateMetadataEmbeddings);

export default router;