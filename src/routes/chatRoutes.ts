import { Router } from "express";
import { getChatDetail, getResponse } from "../controllers/chatController";
import multer from "multer";

const upload = multer();
const router = Router();

router.post("/get-response", getResponse);
router.get("/chat-detail/:chat_id", getChatDetail);

export default router;