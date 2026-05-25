import { Router } from "express";
import {
  getConversationMessages,
  getConversations,
  postSendMessage,
  postStartConversation,
} from "../controllers/message.controller.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();

router.get("/", protect, requireMarketplaceUser, getConversations);
router.get("/:id", protect, requireMarketplaceUser, getConversationMessages);
router.post("/start", protect, requireMarketplaceUser, postStartConversation);
router.post("/:id/send", protect, requireMarketplaceUser, postSendMessage);

export default router;
