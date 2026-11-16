import { Router } from "express";

import {
    chatController,
    getConversationController,
} from "../controllers/chat.controller.js";

const router = Router();

router.post("/chat", chatController);
router.get("/conversations/:conversationId", getConversationController);

export default router;
