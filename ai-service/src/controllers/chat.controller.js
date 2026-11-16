import crypto from "crypto";

import {
    createConversation,
    getConversation,
    getMessages,
    saveMessage,
} from "../repositories/chat.repository.js";

import { askLLM } from "../services/llm.service.js";

export const chatController = async (req, res) => {
    try {
        const { conversationId, messages } = req.body;

        if (
            !Array.isArray(messages) ||
            messages.length === 0 ||
            !messages.at(-1)?.content?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid messages array is required",
            });
        }

        const userMessage = messages.at(-1).content.trim();

        let currentConversationId = conversationId;

        if (!currentConversationId) {
            currentConversationId = crypto.randomUUID();
            await createConversation({
                id: currentConversationId,
                title: userMessage.substring(0, 100),
            });
        }

        const conversation = await getConversation(currentConversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        const previousMessages = await getMessages(currentConversationId);

        await saveMessage({
            conversationId: currentConversationId,
            role: "user",
            content: userMessage,
        });

        const llmMessages = [
            ...previousMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            ...messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
        ];

        const aiResponse = await askLLM(llmMessages);

        await saveMessage({
            conversationId: currentConversationId,
            role: "assistant",
            content: aiResponse,
        });

        return res.status(200).json({
            success: true,
            conversationId: currentConversationId,
            response: aiResponse,
        });
    } catch (error) {
        console.error("Chat Controller Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process chat request",
        });
    }
};

export const getConversationController = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const conversation = await getConversation(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        const messages = await getMessages(conversationId);

        return res.status(200).json({
            success: true,
            conversation,
            messages,
        });
    } catch (error) {
        console.error("Get Conversation Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load conversation",
        });
    }
};
