import { eq, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { conversations, messages } from "../db/schema.js";

// ========================================
// CREATE CONVERSATION
// ========================================

export const createConversation = async ({
  id,
  userId = null,
  title = null,
}) => {
  await db.insert(conversations).values({
    id,
    userId,
    title,
  });

  return id;
};

// ========================================
// GET CONVERSATION
// ========================================

export const getConversation = async (conversationId) => {
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return result[0] || null;
};

// ========================================
// GET ALL MESSAGES
// ========================================

export const getMessages = async (conversationId) => {
  const result = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.id));

  return result;
};

// ========================================
// SAVE MESSAGE
// ========================================

export const saveMessage = async ({ conversationId, role, content }) => {
  const result = await db.insert(messages).values({
    conversationId,
    role,
    content,
  });

  return {
    id: result[0]?.insertId,
    conversationId,
    role,
    content,
  };
};