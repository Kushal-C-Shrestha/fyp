import { createReactAgent, AgentExecutor } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";
import { getLLM } from "../config/llm.js";
import { tools } from "./tools/index.js";
import { getMemory, compressHistoryMessage, getEntityMemory } from "./memory.js";
import { retrieveRelevantDocs } from "../rag/retriever/retrieveDocs.js";

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
   - If the user message is only a specialization name, such as "cardiology", "dermatology", or "neurology", you MUST call 'search_doctors' with that specialization.
   - If the user asks what specializations, specialties, or specialist doctors are available, you MUST call 'search_doctors' with that full question.
5. Check a doctor's availability using 'get_doctor_availability'.
6. Book, list, cancel, or reschedule appointments using 'book_appointment', 'list_appointments', 'cancel_appointment', or 'reschedule_appointment'.

Rules:
- NEVER output 'Action: None'. If you do not need a tool, you MUST go directly to 'Thought: I now know the final answer' followed by 'Final Answer:'.
- Use tools only when necessary.
- If the user is just saying hello, asking a casual question, or saying thank you, you do NOT need to call any tools. Go directly to Final Answer.
- Never say that a doctor, specialty, or availability was not found unless the relevant tool returned no results.
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

const SPECIALTY_NAMES = [
    "cardiology",
    "dermatology",
    "endocrinology",
    "ent",
    "gastroenterology",
    "general medicine",
    "general surgery",
    "internal medicine",
    "neurology",
    "ophthalmology",
    "orthopedics",
    "pediatrics",
    "pulmonology",
];

const SPECIALTY_ALIASES = new Map([
    ["cardiologist", "Cardiology"],
    ["heart doctor", "Cardiology"],
    ["chest doctor", "Cardiology"],
    ["dermatologist", "Dermatology"],
    ["skin doctor", "Dermatology"],
    ["neurologist", "Neurology"],
    ["brain doctor", "Neurology"],
    ["pediatrician", "Pediatrics"],
    ["child doctor", "Pediatrics"],
    ["eye doctor", "Ophthalmology"],
    ["ophthalmologist", "Ophthalmology"],
    ["orthopedic doctor", "Orthopedics"],
    ["orthopedist", "Orthopedics"],
    ["bone doctor", "Orthopedics"],
    ["ent doctor", "ENT"],
    ["ear doctor", "ENT"],
    ["throat doctor", "ENT"],
    ["gastroenterologist", "Gastroenterology"],
    ["stomach doctor", "Gastroenterology"],
    ["pulmonologist", "Pulmonology"],
    ["lung doctor", "Pulmonology"],
    ["endocrinologist", "Endocrinology"],
    ["diabetes doctor", "Endocrinology"],
    ["thyroid doctor", "Endocrinology"],
    ["surgeon", "General Surgery"],
    ["general physician", "General Medicine"],
    ["general doctor", "General Medicine"],
]);

const getTool = (name) => tools.find((tool) => tool.name === name);

const isSpecialtyOnlyMessage = (message = "") =>
    SPECIALTY_NAMES.includes(String(message || "").trim().toLowerCase());

const specialtyAliasForMessage = (message = "") => {
    const normalized = String(message || "").trim().toLowerCase();
    if (SPECIALTY_ALIASES.has(normalized)) return SPECIALTY_ALIASES.get(normalized);

    for (const [alias, specialty] of SPECIALTY_ALIASES.entries()) {
        if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(normalized)) {
            return specialty;
        }
    }
    return "";
};

const isSpecializationListMessage = (message = "") =>
    /\b(what|which|list|show|available)\b/i.test(message)
    && /\b(speciali[sz]ations?|specialties|specialists?)\b/i.test(message);

const symptomMessageNeedsMapping = (message = "") =>
    /\b(chest pains?|chest discomfort|palpitations|high blood pressure|irregular heartbeat|swelling in legs|headaches?|migraine|dizziness|numbness|tingling|rash|itching|acne|eczema|cough|wheezing|asthma|stomach|acidity|heartburn|joint pain|back pain|ear pain|sore throat|eye pain|blurry vision|vision loss|thyroid|diabetes|blood sugar|weight gain|weight loss|child fever|baby fever|poor feeding|growth concern|lump|hernia|abscess|wound|anxiety|panic attacks?|sleep problems?|fever|chills)\b/i.test(message);

const specialtyArticle = (specialty = "") =>
    /^[aeiou]/i.test(String(specialty).trim()) ? "an" : "a";

const isGreetingMessage = (message = "") =>
    /^(hi|hello|hey|namaste|good morning|good afternoon|good evening|yo|sup)[!.?\s]*$/i.test(
        String(message || "").trim()
    );

const isThanksMessage = (message = "") =>
    /^(thanks|thank you|thank u|thx|okay thanks|ok thanks)[!.?\s]*$/i.test(
        String(message || "").trim()
    );

const isDoctorRegistrationQuestion = (message = "") =>
    /\b(register|registration|sign up|signup|apply|join|become)\b/i.test(message)
    && /\b(doctor|dr|physician)\b/i.test(message);

const isHospitalRegistrationQuestion = (message = "") =>
    /\b(register|registration|sign up|signup|apply|join|list)\b/i.test(message)
    && /\b(hospital|clinic)\b/i.test(message);

const isAvailabilityQuestion = (message = "") =>
    /\b(available|availability|free|slots?|schedule|timings?|time|when)\b/i.test(message);

const findRememberedDoctorMention = (sessionId, message = "") => {
    const normalizedMessage = String(message || "").toLowerCase();
    const rememberedDoctors = getEntityMemory(sessionId).doctors || [];

    return rememberedDoctors.find((doctor) => {
        const nameParts = String(doctor.name || "")
            .toLowerCase()
            .split(/\s+/)
            .filter((part) => part.length >= 3);

        if (!doctor.id || nameParts.length === 0) return false;

        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        return normalizedMessage.includes(firstName)
            || normalizedMessage.includes(lastName)
            || nameParts.every((part) => normalizedMessage.includes(part));
    });
};

const withTimeout = (promise, timeoutMs) =>
    Promise.race([
        promise,
        new Promise((_, reject) => {
            const timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
            timer.unref?.();
        }),
    ]);

const getRagSourcesForAnswer = async (query) => {
    try {
        const { contextText } = await withTimeout(
            retrieveRelevantDocs(query, { k: 4, maxChars: 3200, maxCharsPerDoc: 900 }),
            4000,
        );
        const sources = [...new Set(
            [...String(contextText || "").matchAll(/### Source \d+\s*\(([^)]+)\)/g)]
                .map((match) => match[1])
        )];
        return sources.length > 0 ? `\n\nSource: ${sources.join(", ")}` : "";
    } catch {
        return "";
    }
};

const doctorRegistrationAnswer = async () => {
    const sourceNote = await getRagSourcesForAnswer(
        "doctor registration verification requirements medical license professional credentials verification documents approval process"
    );
    return `To register as a doctor on e-Swasthya, go to /register/doctor and submit your doctor verification request.

You will need:
1. Basic details: name, email, phone, date of birth, gender, and professional bio.
2. Professional details: medical license number, experience years, specialization, and consultation fee.
3. Verification documents: medical council registration certificate and citizenship or government-issued ID.
4. Optional credibility documents: academic certificates, experience letters, or specialization/fellowship certificates.

After submission, an admin reviews your request. If approved, your doctor profile becomes visible and eligible for appointment bookings.${sourceNote}`;
};

const hospitalRegistrationAnswer = async () => {
    const sourceNote = await getRagSourcesForAnswer(
        "hospital clinic registration verification requirements registration certificate operating license administrator details approval process"
    );
    return `To register a hospital or clinic on e-Swasthya, go to /register/hospital and submit the verification request.

You will need:
1. Hospital details: official name, type, description, address, and contact information.
2. Legal details: registration number and operating license or authority details.
3. Admin details: the hospital administrator's name, email, phone, date of birth, and gender.
4. Verification documents: registration certificate, license/permission to operate, and authorized representative ID.

After submission, an admin reviews the request. If approved, the hospital can be listed and manage doctors/bookings.${sourceNote}`;
};

const tryDeterministicToolResponse = async (sessionId, userMessage) => {
    const searchDoctors = getTool("search_doctors");
    if (!searchDoctors) return null;

    if (isGreetingMessage(userMessage)) {
        return {
            message: "Hello, welcome to e-Swasthya! I can help you find doctors, check availability, book appointments, or explain platform registration.",
            metadata: {},
        };
    }

    if (isThanksMessage(userMessage)) {
        return {
            message: "You're welcome. I’m here if you need help with doctors, hospitals, or appointments.",
            metadata: {},
        };
    }

    if (isAvailabilityQuestion(userMessage)) {
        const mentionedDoctor = findRememberedDoctorMention(sessionId, userMessage);
        const availabilityTool = getTool("get_doctor_availability");
        if (mentionedDoctor && availabilityTool) {
            const output = await availabilityTool.invoke({ doctor_id: mentionedDoctor.id });
            return {
                message: `Here is ${mentionedDoctor.name}'s availability:\n\n${stripSourceMarkers(output)}`,
                metadata: extractToolMetadata([{ tool: "get_doctor_availability", output }]),
            };
        }
    }

    if (isDoctorRegistrationQuestion(userMessage)) {
        return { message: await doctorRegistrationAnswer(), metadata: {} };
    }

    if (isHospitalRegistrationQuestion(userMessage)) {
        return { message: await hospitalRegistrationAnswer(), metadata: {} };
    }

    const aliasedSpecialty = specialtyAliasForMessage(userMessage);

    if (isSpecialtyOnlyMessage(userMessage) || aliasedSpecialty || isSpecializationListMessage(userMessage)) {
        const output = await searchDoctors.invoke({ q: aliasedSpecialty || userMessage });
        return {
            message: stripSourceMarkers(output),
            metadata: extractToolMetadata([{ tool: "search_doctors", output }]),
        };
    }

    if (!symptomMessageNeedsMapping(userMessage)) return null;

    const searchKnowledgeBase = getTool("search_knowledge_base");
    if (!searchKnowledgeBase) return null;

    const mappingOutput = await searchKnowledgeBase.invoke({ query: userMessage });
    const specialtyMatch = String(mappingOutput || "").match(/Recommended Specialty:\s*([A-Za-z ]+)/i);
    const specialty = specialtyMatch?.[1]?.trim();
    if (!specialty) return null;

    let doctorOutput = await searchDoctors.invoke({ q: specialty });
    let doctorSpecialty = specialty;
    if (/^No doctors found\.?$/i.test(String(doctorOutput || "").trim())) {
        doctorSpecialty = "General Medicine";
        doctorOutput = await searchDoctors.invoke({ q: doctorSpecialty });
    }
    const metadata = extractToolMetadata([{ tool: "search_doctors", output: doctorOutput }]);
    const emergencyNote = String(mappingOutput || "").includes("Important:")
        ? `\n\n${String(mappingOutput).split("Important:")[1].trim()}`
        : "";

    return {
        message: stripSourceMarkers(
            doctorSpecialty === specialty
                ? `Based on your symptoms, you should consult ${specialtyArticle(specialty)} ${specialty} specialist.${emergencyNote}\n\n${doctorOutput}\n\nWould you like to check availability or book an appointment with one of these doctors?`
                : `Based on your symptoms, ${specialty} may be relevant, but I could not find available ${specialty} doctors right now. A General Medicine doctor is a good first step and can refer you if needed.${emergencyNote}\n\n${doctorOutput}\n\nWould you like to check availability or book an appointment with one of these doctors?`
        ),
        metadata,
    };
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
    // const deterministicResult = await tryDeterministicToolResponse(sessionId, userMessage);
    // if (deterministicResult) {
    //     return deterministicResult;
    // }

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
