import groq from "../config/groq.js";

export const askLLM = async (messages) => {
    try {
        const completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant integrated into the Anavaran CRM application.

Your job is to help users with CRM-related questions.

Rules:
1. Give clear and useful answers.
2. Be professional and concise.
3. Do not invent CRM data.
4. If information is not available, clearly say so.
5. Do not assume information that has not been provided.
6. CRM data will later be provided through tools.
7. When CRM tools become available, use them instead of making up data.`,
                },
                ...messages,
            ],
            temperature: 0.3,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("LLM Error:", error);
        throw new Error("Failed to generate AI response");
    }
};
