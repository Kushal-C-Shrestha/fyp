import { createReactAgent, AgentExecutor } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";
import { getLLM } from "../config/llm.js";
import { tools } from "./tools/index.js";
import { getMemory, compressHistoryMessage } from "./memory.js";

let unifiedAgentExecutor = null;

const AGENT_PROMPT = PromptTemplate.fromTemplate(`You are the e-Swasthya Assistant, a professional and helpful virtual assistant for the e-Swasthya healthcare and telemedicine platform.

Your task is to assist the user:
1. Greet the user or respond to general small talk warmly and concisely (2–4 sentences) directly without using any tools.
2. Answer general questions about the e-Swasthya platform features, navigation, hospital registration, doctor registration, fees, or how-to guides using the knowledge base.
3. Conduct symptom checks. If the user describes symptoms (e.g., "headache", "chest pain", "fever"), you MUST follow this exact two-step process:
   - Step 1: Call 'search_knowledge_base' with the symptom description to identify the recommended medical specialty (e.g., Cardiology, Neurology).
   - Step 2: Once you have identified the specialty, call 'search_doctors' with that specialty to find available doctors.
   NEVER call 'search_doctors' directly with raw symptoms; always map symptoms to a specialty first.
4. Search for doctors by specialization or name using 'search_doctors'.
5. Check a doctor's availability using 'get_doctor_availability'.
6. Book, list, cancel, or reschedule appointments using 'book_appointment', 'list_appointments', 'cancel_appointment', or 'reschedule_appointment'.

Rules:
- NEVER output 'Action: None'. If you do not need a tool, you MUST go directly to 'Thought: I now know the final answer' followed by 'Final Answer:'.
- Use tools only when necessary.
- If the user is just saying hello, asking a casual question, or saying thank you, you do NOT need to call any tools. Go directly to Final Answer.
- Do NOT repeat a tool call with the exact same arguments if it already appears in Recent History or Agent Scratchpad.
- If 'get_doctor_availability' was already called for a doctor and the slots are in Recent History or Agent Scratchpad, do NOT call it again. Use those slots to help the user book.
- If the user wants to book an appointment and doctor availability has already been shown, ask them for the date and time they want if they haven't provided it, then call 'book_appointment'.
- If the user provides a date, time, doctor ID, and hospital ID, call 'book_appointment' directly.
- If doctor or hospital IDs are present in the user's message or in Recent History, use them directly instead of searching.
- After receiving a useful tool Observation (like a list of doctors, availability slots, or a booking confirmation), present that information clearly and produce your Final Answer immediately. Do not make unnecessary additional tool calls.
- If you cannot help the user or don't have a tool to answer their specific database-related question, politely state so in your Final Answer.

User Context: {context}

Tools:
{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Recent History:
{chat_history}

Question: {input}
Thought:{agent_scratchpad}`);

const buildAgent = async () => {
    const agent = await createReactAgent({
        llm: getLLM(),
        tools: tools,
        prompt: AGENT_PROMPT,
    });

    return new AgentExecutor({
        agent,
        tools: tools,
        verbose: String(process.env.LANGCHAIN_VERBOSE || "false").toLowerCase() === "true",
        maxIterations: 4,
        earlyStoppingMethod: "force",
        handleParsingErrors: (error) => {
            const errText = error?.message || String(error);
            const parseMatch = errText.match(/Could not parse LLM output:\s*([\s\S]+)/i);
            if (parseMatch) {
                const rawText = parseMatch[1].trim();
                const cleaned = rawText
                    .replace(/^Thought:\s*/i, "")
                    .replace(/Action:\s*None[\s\S]*/i, "")
                    .trim();
                if (cleaned.length > 10) {
                    return `I have extracted your answer: ${cleaned}`;
                }
            }
            return "I could not complete that action. Please try rephrasing your request.";
        },
    });
};

// Strip vector-DB source citation markers that sometimes leak into output
const stripSourceMarkers = (text = "") =>
    String(text || "").replace(/### Source \d+\s*\([^)]+\)/gi, "").trim();

const extractToolMetadata = (toolOutputs = []) => {
    const metadata = {
        doctors: [],
        availability: [],
    };

    const addDoctor = (doctor) => {
        if (!doctor.id || !doctor.name) return;
        const key = `${doctor.id}:${doctor.hospitalId || ""}`;
        if (metadata.doctors.some((item) => `${item.id}:${item.hospitalId || ""}` === key)) return;
        metadata.doctors.push(doctor);
    };

    const addAvailability = (availability) => {
        if (!availability.doctorId || !availability.hospitalId) return;
        const key = `${availability.doctorId}:${availability.hospitalId}`;
        if (metadata.availability.some((item) => `${item.doctorId}:${item.hospitalId}` === key)) return;
        metadata.availability.push(availability);
    };

    for (const item of toolOutputs) {
        const output = String(item.output || "");
        if (item.tool === "search_doctors") {
            for (const line of output.split(/\r?\n/)) {
                const match = line.match(/(?:^|\b)ID:\s*(\d+),\s*Name:\s*([^,]+),\s*Specialty:\s*([^,]+),\s*Hospital:\s*([^,]+),\s*Hospital ID:\s*(\d+|N\/A)/i);
                if (!match) continue;
                addDoctor({
                    id: match[1],
                    name: match[2].trim(),
                    specialty: match[3].trim(),
                    hospitalName: match[4].trim(),
                    hospitalId: match[5] === "N/A" ? "" : match[5],
                });
            }
        }

        if (item.tool === "get_doctor_availability") {
            for (const line of output.split(/\r?\n/)) {
                const match = line.match(/Doctor ID:\s*(\d+)\s*\|\s*Hospital ID:\s*(\d+)\s*\|\s*([^|]+)\|\s*(.+)$/i);
                if (!match) continue;
                addAvailability({
                    doctorId: match[1],
                    hospitalId: match[2],
                    hospitalName: match[3].trim(),
                    summary: match[4].trim(),
                });
            }
        }
    }

    return metadata;
};

// If the agent hit max iterations or leaked ReAct format, extract the last useful text
const postProcessAgentOutput = (output, stepsText = "") => {
    const answer = String(output || "").trim();

    if (answer === "Agent stopped due to max iterations.") {
        const thoughtMatches = [...stepsText.matchAll(/Thought:\s*([\s\S]*?)(?=\n(?:Action:|Observation:|Thought:)|$)/gi)];
        if (thoughtMatches.length > 0) {
            const lastThought = thoughtMatches[thoughtMatches.length - 1][1].trim()
                .replace(/Action:\s*None[\s\S]*/i, "")
                .trim();
            if (lastThought.length > 20 && !lastThought.toLowerCase().includes("i need to use a tool")) {
                return stripSourceMarkers(lastThought);
            }
        }

        // Fallback: try to surface the last observation
        const idx = stepsText.lastIndexOf("Observation:");
        if (idx !== -1) {
            const lastObs = stepsText.slice(idx + "Observation:".length).trim();
            if (lastObs && !lastObs.toLowerCase().includes("error")) {
                return stripSourceMarkers(lastObs);
            }
        }
        return "I wasn't able to complete that request. Please try rephrasing or give me more details.";
    }

    // If ReAct format leaked into the output, extract the Final Answer line
    if (/(^|\n)(Thought:|Action:|Observation:)/i.test(answer)) {
        const finalMatch = answer.match(/Final Answer:\s*([\s\S]+)$/i);
        if (finalMatch) return stripSourceMarkers(finalMatch[1].trim());
        return stripSourceMarkers(answer);
    }

    return stripSourceMarkers(answer);
};

export const runAgent = async (sessionId, userMessage, context = "N/A", onProgress = null) => {
    if (!unifiedAgentExecutor) {
        unifiedAgentExecutor = await buildAgent();
    }

    const executor = unifiedAgentExecutor;
    const memory = getMemory(sessionId);
    const { chat_history } = await memory.loadMemoryVariables({});
    const recentHistory = Array.isArray(chat_history)
        ? chat_history.slice(-6).map((message) => {
            const role = message._getType?.() === "human" ? "Human" : "AI";
            return `${role}: ${compressHistoryMessage(message.content)}`;
        }).join("\n")
        : String(chat_history || "").split(/\r?\n/).slice(-12).map(compressHistoryMessage).join("\n");

    let stepsText = "";
    let currentToolName = null;
    const toolOutputs = [];

    const result = await executor.invoke(
        {
            input: userMessage,
            context,
            chat_history: recentHistory,
        },
        {
            callbacks: [
                {
                    handleAgentAction: async (action) => {
                        currentToolName = action.tool || null;
                        if (onProgress ) {
                            await onProgress(stepsText);
                        }
                    },
                    handleToolEnd: async (output) => {
                        toolOutputs.push({ tool: currentToolName, output });
                        stepsText += `Observation: ${output}\n\n`;
                        if (onProgress) {
                            await onProgress(stepsText);
                        }
                    }
                }
            ]
        }
    );

    return {
        message: postProcessAgentOutput(
            result.output ?? "I wasn't able to get a response. Please try again.",
            stepsText,
        ),
        metadata: extractToolMetadata(toolOutputs),
    };
};
