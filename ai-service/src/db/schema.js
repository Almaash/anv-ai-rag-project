import {
    mysqlTable,
    varchar,
    text,
    timestamp,
    bigint,
    mysqlEnum,
    index,
} from "drizzle-orm/mysql-core";


// ========================================
// CONVERSATIONS TABLE
// ========================================

export const conversations = mysqlTable(
    "conversations",
    {
        id: varchar("id", {
            length: 36,
        }).primaryKey(),

        userId: bigint("user_id", {
            mode: "number",
            unsigned: true,
        }),

        title: varchar("title", {
            length: 255,
        }),

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at")
            .defaultNow()
            .onUpdateNow()
            .notNull(),
    },

    (table) => ({
        userIdIndex: index(
            "conversations_user_id_idx"
        ).on(table.userId),
    })
);


// ========================================
// MESSAGES TABLE
// ========================================

export const messages = mysqlTable(
    "messages",
    {
        id: bigint("id", {
            mode: "number",
            unsigned: true,
        })
            .autoincrement()
            .primaryKey(),

        conversationId: varchar(
            "conversation_id",
            {
                length: 36,
            }
        ).notNull(),

        role: mysqlEnum("role", [
            "user",
            "assistant",
            "system",
        ]).notNull(),

        content: text("content").notNull(),

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),
    },

    (table) => ({
        conversationIdIndex: index(
            "messages_conversation_id_idx"
        ).on(table.conversationId),

        createdAtIndex: index(
            "messages_created_at_idx"
        ).on(table.createdAt),
    })
);