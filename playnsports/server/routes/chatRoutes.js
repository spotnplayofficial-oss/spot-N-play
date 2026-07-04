import express from 'express';
import {
  getOrCreateDirectConversation,
  getOrCreateGroupConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  deleteMessage,
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/direct', protect, getOrCreateDirectConversation);
router.get('/group/:groupId', protect, getOrCreateGroupConversation);
router.get('/conversations', protect, getMyConversations);
router.get('/:conversationId/messages', protect, getMessages);
router.post('/message', protect, sendMessage);
router.delete('/message/:messageId', protect, deleteMessage);

export default router;