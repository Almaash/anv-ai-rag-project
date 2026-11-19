
import groq from "../config/groq.js";
import { aiTools } from "./ai-tools.js";
import { executeTool } from "./tool.service.js";

const SYSTEM_PROMPT = `
You are the AI assistant for Anavaran CRM.

GENERAL RULES:
- Never invent CRM data, counts, amounts or statuses.
- Always use Laravel tools for CRM-related questions.
- Use API summary and pagination totals for aggregate questions.
- Never calculate totals from only the current page.
- If an API fails or does not return requested information, explain that clearly.

BRANCH RULES:
- If a branch name is mentioned, call getBranches first.
- Match the exact branch name and use its branch code as branch_id.
- Never use a database ID instead of a branch code.

CRM TOOLS:
- getDashboard: overall business summary.
- getBranchSummary: branch-wise summary.
- getInvestments, getSales, getPurchases, getBookings, getPayments: respective reports.
- getCustomers: CRM customer list. Use data.pagination.total for total customer count.
- Use corresponding detail tools when a specific CRM record is requested.

LOAN TOOLS:
- getLoanCustomers: loan customer report.
- getLoanCustomerDetail: one loan customer's profile.
- getLoanCustomerHistory: one customer's history.
- getLoanCaf, getLoanPd, getLoanCam: respective application reports.
- getLoanCafDetail, getLoanPdDetail, getLoanCamDetail: individual records.
- getLoanDisbursements: disbursement report.
- getLoanDisbursementDetail: individual disbursement.
- getLoanLoans: loan report.
- getLoanDetail: individual loan.
- getLoanEmiSchedule: EMI schedule for a loan.
- getLoanEmis: EMI report.
- getLoanEmiCollections: EMI collection report.
- getLoanEmiPayment: payment details for one EMI.
- getLoanAgents: loan agent report.

TOOL PARAMETERS:
- Select the correct tool for the requested operation: list, detail or history.
- Pass only parameters defined in that tool's schema.
- Never pass null or additional properties.
- Use empty strings for optional string filters.
- Use page 1 and per_page 25 unless the user requests otherwise.
- Customer history accepts only customer_unique_id.
- Customer detail accepts only customer_unique_id.
- CAF detail accepts only caf_id.
- PD detail accepts only pd_id.
- CAM detail accepts only cam_id.
- Disbursement detail accepts only disbursement_id.
- Loan detail and EMI schedule accept only loan_id.
- EMI payment detail accepts only emi_id.
- Never send EMI-specific filters to loan, CAF, PD or CAM reports.

DATA RULES:
- Tool responses may contain only a sample of records.
- Use summary and pagination fields for totals.
- Never claim that a sample contains all records.
- Do not assume missing fields or values.

Give concise, professional answers based only on returned API data.
`;

/**
 * Reduce large Laravel API responses before sending them to Groq.
 * This affects only the AI context, not the original Laravel response.
 */
const compactToolResult = (value, depth = 0) => {
    if (depth > 5) {
        return "[Nested data omitted]";
    }

    if (Array.isArray(value)) {
        return value.slice(0, 5).map((item) =>
            compactToolResult(item, depth + 1)
        );
    }

    if (value && typeof value === "object") {
        const result = {};

        for (const [key, item] of Object.entries(value)) {
            result[key] = compactToolResult(item, depth + 1);
        }

        return result;
    }

    if (typeof value === "string" && value.length > 500) {
        return value.slice(0, 500) + "...[truncated]";
    }

    return value;
};

/**
 * Safely convert tool results to JSON.
 */
const serializeToolResult = (result) => {
    try {
        return JSON.stringify(compactToolResult(result));
    } catch (error) {
        console.error("Tool result serialization error:", error);

        return JSON.stringify({
            success: false,
            message: "Unable to process the API response.",
        });
    }
};

/**
 * Main LLM function.
 */
export const askLLM = async (messages) => {
    try {
        // Keep only recent conversation history.
        const recentMessages = messages.slice(-8);

        const conversationMessages = [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            ...recentMessages,
        ];

        const MAX_TOOL_ROUNDS = 5;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            console.log(`Groq request - Round ${round + 1}`);

            // Log approximate request size for debugging.
            console.log("Groq request stats:", {
                round: round + 1,
                messages: conversationMessages.length,
                toolCount: aiTools.length,
                contentCharacters: conversationMessages.reduce(
                    (total, message) =>
                        total + (message.content?.length || 0),
                    0
                ),
            });

            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: conversationMessages,
                tools: aiTools,
                tool_choice: "auto",
                temperature: 0.3,
            });

            const assistantMessage = completion.choices[0].message;

            // If the model returns a normal answer, finish.
            if (!assistantMessage.tool_calls?.length) {
                return (
                    assistantMessage.content ||
                    "I couldn't generate a response."
                );
            }

            // Add assistant tool calls to conversation history.
            conversationMessages.push({
                role: "assistant",
                content: assistantMessage.content || null,
                tool_calls: assistantMessage.tool_calls,
            });

            // Execute requested Laravel tools.
            for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;

                try {
                    const args = JSON.parse(
                        toolCall.function.arguments || "{}"
                    );

                    console.log(`Executing tool: ${toolName}`, args);

                    const result = await executeTool(toolName, args);

                    conversationMessages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: serializeToolResult(result),
                    });

                    console.log(`Tool completed: ${toolName}`);
                } catch (error) {
                    console.error(
                        `Tool execution failed (${toolName}):`,
                        error.message
                    );

                    conversationMessages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({
                            success: false,
                            message:
                                error.message ||
                                "Tool execution failed.",
                        }),
                    });
                }
            }
        }

        return "I couldn't complete your request within the allowed tool-call limit. Please try a more specific question.";
    } catch (error) {
        console.error("LLM Service Error:", error);

        const errorMessage =
            error.error?.error?.message ||
            error.message ||
            "";

        if (
            error.status === 413 ||
            errorMessage.toLowerCase().includes("tokens per minute")
        ) {
            throw new Error(
                "The report is too large to process right now. Please try a more specific query."
            );
        }

        throw new Error(
            "Failed to process the request. Please try again later."
        );
    }
};
