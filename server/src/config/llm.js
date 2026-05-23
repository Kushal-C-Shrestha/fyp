import { SimpleChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const LLM_DEBUG = String(process.env.LLM_DEBUG || "false").toLowerCase() === "true";

class ProxiedOllama extends SimpleChatModel {
    constructor(fields) {
        super(fields);
        this.modelName = fields.model ?? "llama2";
        this.baseUrl = fields.baseUrl?.endsWith("/")
            ? fields.baseUrl.slice(0, -1)
            : (fields.baseUrl ?? "http://localhost:11434");
        this.temperature = fields.temperature ?? 0;
    }

    _llmType() {
        return "proxied-ollama";
    }

    _convertMessages(messages) {
        return messages.map((msg) => {
            const type = msg._getType();
            let role;
            if (type === "human") role = "user";
            else if (type === "ai") role = "assistant";
            else if (type === "system") role = "system";
            else throw new Error(`Unsupported message type for ProxiedOllama: ${type}`);

            let content = typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content);

            // Cleanups for small LLMs (Ollama ReAct support)
            if (role === "user") {
                // 1. Remove double Thought: prefixes
                content = content.replace(/Thought:\s*Thought:/gi, "Thought:");

                // 2. If it's the ReAct agent prompt and ends with User message without Thought:, append it.
                if (content.includes("Action: one of") && content.includes("User:")) {
                    const lastUserIdx = content.lastIndexOf("User:");
                    const substringAfterLastUser = content.slice(lastUserIdx);
                    if (!substringAfterLastUser.includes("Thought:")) {
                        content = content.trimEnd() + "\nThought: ";
                    }
                }
            }

            return {
                role,
                content,
            };
        });
    }

    async _call(messages, options, runManager) {
        const ollamaOptions = { temperature: this.temperature };
        if (options?.stop?.length) ollamaOptions.stop = options.stop;

        const converted = this._convertMessages(messages);
        if (LLM_DEBUG) console.log(`\n--- [Ollama Request] Model: ${this.modelName} ---`);
        const lastMsg = converted[converted.length - 1];
        if (LLM_DEBUG) console.log(`Prompt / Scratchpad Content:\n${lastMsg.content}\n----------------------------------`);

        let data;
        let retries = 3;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.post(
                    `${this.baseUrl}/api/chat`,
                    {
                        model: this.modelName,
                        messages: converted,
                        options: ollamaOptions,
                        stream: false,
                    },
                    {
                        timeout: 120000 // 120s timeout - needed for large prompts with chat history
                    }
                );
                data = response.data;
                break;
            } catch (err) {
                console.error(`Ollama Axios Error (Attempt ${i + 1}/${retries}):`, err.message || err);
                if (i === retries - 1) {
                    throw err;
                }
                // Wait 3 seconds before retrying
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }

        let content = data?.message?.content ?? "";

        if (LLM_DEBUG) console.log(`\n+++ [Ollama Response] +++\nRaw Output:\n${content}\n+++++++++++++++++++++++++`);

        // Determine if the message chain contains ReAct instructions
        let hasReactInstruction = false;
        let activeIntent = "APPOINTMENT";
        for (const msg of converted) {
            if (msg.content) {
                if (msg.content.includes("Format:") || msg.content.includes("agent_scratchpad")) {
                    hasReactInstruction = true;
                    if (msg.content.includes("using the knowledge base")) {
                        activeIntent = "NAVIGATION";
                    } else if (msg.content.includes("Map the user's symptoms")) {
                        activeIntent = "SYMPTOM_CHECK";
                    } else if (msg.content.includes("Help the user find a doctor")) {
                        activeIntent = "DOCTOR_SEARCH";
                    } else if (msg.content.includes("booking, viewing, cancelling")) {
                        activeIntent = "APPOINTMENT";
                    }
                }
            }
        }

        // REACT FORMATTING CORRECTOR FOR SMALL LLMS (e.g. llama3.2:3b)
        if (hasReactInstruction && content && !content.includes("Action:") && !content.includes("Final Answer:")) {
            // Try to find a JSON block in the content
            const jsonMatch = content.match(/(\{[\s\S]*?\})/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[1];
                try {
                    const parsed = JSON.parse(jsonStr);
                    let guessedTool = null;
                    const lowercaseContent = content.toLowerCase();

                    if (activeIntent === "NAVIGATION") {
                        guessedTool = "search_knowledge_base";
                    } else if (parsed.q !== undefined) {
                        guessedTool = "search_doctors";
                    } else if (parsed.query !== undefined) {
                        if (lowercaseContent.includes("hospital")) {
                            guessedTool = "search_hospitals";
                        } else {
                            guessedTool = "search_knowledge_base";
                        }
                    } else if (parsed.patient_id !== undefined && parsed.doctor_id !== undefined) {
                        guessedTool = "book_appointment";
                    } else if (parsed.doctor_id !== undefined) {
                        if (lowercaseContent.includes("availability") || lowercaseContent.includes("available") || lowercaseContent.includes("when")) {
                            guessedTool = "get_doctor_availability";
                        } else {
                            guessedTool = "get_doctor_details";
                        }
                    } else if (parsed.hospital_id !== undefined && parsed.patient_id === undefined) {
                        guessedTool = "get_hospital_details";
                    } else if (parsed.appointment_id !== undefined) {
                        if (lowercaseContent.includes("cancel")) {
                            guessedTool = "cancel_appointment";
                        } else if (lowercaseContent.includes("reschedule")) {
                            guessedTool = "reschedule_appointment";
                        } else {
                            guessedTool = "get_appointment";
                        }
                    } else if (parsed.user_id !== undefined) {
                        guessedTool = "list_appointments";
                    }

                    if (guessedTool) {
                        const thoughtText = content.replace(jsonStr, "").replace(/Thought:/i, "").trim();
                        const cleanedThought = thoughtText || `I need to call ${guessedTool} to proceed.`;
                        content = `Thought: ${cleanedThought}\nAction: ${guessedTool}\nAction Input: ${jsonStr}`;
                        if (LLM_DEBUG) console.log(`\n*** [ReAct Format Auto-Correction] Corrected output to: ***\n${content}\n**********************************************\n`);
                    }
                } catch (e) {
                    // Not valid JSON, ignore
                }
            } else {
                // Conversational plain-text fallback: convert to Final Answer so LangChain doesn't fail parsing.
                const thoughtText = `I have the answer.`;
                content = `Thought: ${thoughtText}\nFinal Answer: ${content}`;
                if (LLM_DEBUG) console.log(`\n*** [ReAct Format Auto-Correction] Conversational plain-text. Prefixed with Final Answer. ***\n${content}\n**********************************************\n`);
            }
        }

        // REPETITION PREVENTER FOR SMALL LLMS (e.g. llama3.2:3b)
        if (hasReactInstruction && content) {
            const fullPromptContent = lastMsg.content || "";
            
            // CRITICAL: Only scan the current turn's agent_scratchpad section, NOT the full prompt/history.
            // The scratchpad is the text that comes after the last "User:" line in the prompt.
            // This prevents false positives from previous conversation turns stored in chat_history.
            let promptContent = fullPromptContent;
            const lastUserIdx = fullPromptContent.lastIndexOf("\nUser:");
            if (lastUserIdx !== -1) {
                promptContent = fullPromptContent.slice(lastUserIdx);
            }
            
            content = content.replace(/Action:\s*Use\s+(\w+).*$/gim, "Action: $1");

            if (content.includes("Action:") && content.includes("Action Input:")) {
                const actionMatch = content.match(/Action:\s*(\w+)/i);
                const inputMatch = content.match(/Action Input:\s*({.*?}|\"[^\"]+\"|[^\n\r]+)/i);
                if (actionMatch && inputMatch) {
                    const toolName = actionMatch[1].trim();
                    const toolInput = inputMatch[1].trim();
                    
                    // Escape toolInput for RegExp safety
                    const escapedInput = toolInput.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const scratchpadPattern = new RegExp(`Action:\\s*(?:Use\\s+)?${toolName}[\\s\\S]*?Action Input:\\s*${escapedInput}`, 'i');
                    
                    if (scratchpadPattern.test(promptContent)) {
                        if (LLM_DEBUG) console.log(`\n!!! [Repetition Overriding] Model attempted duplicate call: ${toolName} with ${toolInput} !!!\n`);
                        
                        // Extract the most recent Observation from the scratchpad
                        let fallbackAnswer = "";
                        const obsIdx = promptContent.lastIndexOf("Observation:");
                        if (obsIdx !== -1) {
                            let obsText = promptContent.slice(obsIdx + 12);
                            const nextPrefixIdx = obsText.search(/\n(Thought|Action|User|Human|AI):/i);
                            if (nextPrefixIdx !== -1) {
                                obsText = obsText.slice(0, nextPrefixIdx);
                            }
                            obsText = obsText.trim();
                            fallbackAnswer = obsText;
                        }

                        // Check if the last observation contains availability/slot data
                        const hasAvailabilityData = fallbackAnswer && (
                            (fallbackAnswer.includes("Hospital") && (fallbackAnswer.includes("|") || fallbackAnswer.includes("slot"))) ||
                            fallbackAnswer.includes("No available slots")
                        );

                        // Check if it's a booking confirmation
                        const hasBookingConfirmation = fallbackAnswer && (
                            fallbackAnswer.includes("Appointment booked") || fallbackAnswer.includes("Appointment ID:")
                        );

                        if (activeIntent === "NAVIGATION" && fallbackAnswer) {
                            // Strip any Source file references for clean readability
                            const cleanFallback = fallbackAnswer.replace(/### Source \d+\s*\([^\)]+\)/gi, "").trim();
                            content = `Thought: I have the answer.\nFinal Answer: Based on the e-Swasthya platform guidelines:\n\n${cleanFallback}`;
                        } else if (hasAvailabilityData) {
                            // Availability data: present the slot info directly
                            const docIdMatch = toolInput.match(/"?doctor_id"?\s*:\s*"?(\d+)"?/i);
                            const docIdStr = docIdMatch ? `ID: ${docIdMatch[1]}` : 'the requested doctor';
                            content = `Thought: I have the answer.\nFinal Answer: Here is the availability for Dr. (${docIdStr}):\n\n${fallbackAnswer}\n\nPlease let me know which date and time you would like to book.`;
                        } else if (hasBookingConfirmation) {
                            // Booking already done: just confirm it
                            content = `Thought: I have the answer.\nFinal Answer: ${fallbackAnswer}`;
                        } else if ((activeIntent === "DOCTOR_SEARCH" || activeIntent === "SYMPTOM_CHECK") && !hasAvailabilityData) {
                            // Extract doctor lines from scratchpad for listing
                            const docLines = [];
                            const seenIds = new Set();
                            const lines = promptContent.split("\n");
                            for (const line of lines) {
                                if (line.includes("ID:") && line.includes("Name:") && line.includes("Specialty:")) {
                                    const idMatch = line.match(/ID:\s*(\d+)/i);
                                    const nameMatch = line.match(/Name:\s*([^,\n]+)/i);
                                    
                                    let specialty = "";
                                    const specIdx = line.indexOf("Specialty:");
                                    if (specIdx !== -1) {
                                        const afterSpec = line.slice(specIdx + 10).trim();
                                        const hospIdx = afterSpec.indexOf("Hospital:");
                                        if (hospIdx !== -1) {
                                            const commaIdx = afterSpec.lastIndexOf(",", hospIdx);
                                            specialty = commaIdx !== -1 ? afterSpec.slice(0, commaIdx).trim() : afterSpec.slice(0, hospIdx).trim();
                                        } else {
                                            specialty = afterSpec;
                                        }
                                    }
                                    
                                    let hospital = "Hospital unavailable";
                                    const hospMatch = line.match(/Hospital:\s*([^\n\r]+)/i);
                                    if (hospMatch) {
                                        hospital = hospMatch[1].trim();
                                    }

                                    if (idMatch && nameMatch) {
                                        const id = idMatch[1];
                                        if (!seenIds.has(id)) {
                                            seenIds.add(id);
                                            const name = nameMatch[1].trim();
                                            docLines.push(`${seenIds.size}. **Dr. ${name}** (Specialty: ${specialty} | Hospital: ${hospital} | ID: ${id})`);
                                        }
                                    }
                                }
                            }
                            if (docLines.length > 0) {
                                content = `Thought: I have the answer.\nFinal Answer: I found the following doctors:\n\n${docLines.join("\n")}\n\nPlease specify which doctor you would like to select or check availability for.`;
                            } else if (fallbackAnswer) {
                                content = `Thought: I have the answer.\nFinal Answer: ${fallbackAnswer}`;
                            } else {
                                content = `Thought: I have the answer.\nFinal Answer: I searched the database but could not find any available doctors matching your query. Please try searching for a different specialty or doctor name.`;
                            }
                        } else if (fallbackAnswer) {
                            content = `Thought: I have the answer.\nFinal Answer: ${fallbackAnswer}`;
                        } else {
                            content = `Thought: I have the answer.\nFinal Answer: I searched the database but could not find any available doctors matching your query. Please try a different specialty or doctor name.`;
                        }
                    }
                }
            }
        }

        // Cleanup output for small LLM ReAct formatting issues
        if (content) {
            // Remove literal "one of [tool_name]" which small models copy from prompt instructions
            content = content.replace(/Action:\s*one of\s*\[?(\w+)\]?/gi, "Action: $1");

            // Fix "Action Input:\nAction: tool\nAction Input: {...}" — remove the stray leading "Action Input:" line
            content = content.replace(/^Action Input:\s*\n(Action:)/gm, "$1");

            // Remove any duplicated User prompt lines that the small model generated
            content = content.replace(/^User:\s*.*?\n/gim, "");
            content = content.replace(/^\s*User:\s*.*$/gim, "");
            
            // Ensure any double thoughts are resolved
            content = content.replace(/Thought:\s*Thought:/gi, "Thought:");
            content = content.trim();
        }

        if (LLM_DEBUG) console.log(`Cleaned Output:\n${content}\n=========================\n`);

        await runManager?.handleLLMNewToken(content);
        return content;
    }

    async _generate(messages, options, runManager) {
        const text = await this._call(messages, options, runManager);
        return {
            generations: [{ text, message: new AIMessage(text), generationInfo: {} }],
        };
    }
}

const resolveProvider = () => {
    const configured = String(process.env.LLM_PROVIDER || "auto").trim().toLowerCase();
    if (configured && configured !== "auto") return configured;
    if (process.env.GROQ_API_KEY) return "groq";
    if (process.env.GOOGLE_API_KEY) return "google";
    return "ollama";
};

export const getLLM = () => {
    const provider = resolveProvider();

    if (provider === "groq") {
        if (!process.env.GROQ_API_KEY) {
            throw new Error("LLM_PROVIDER is groq, but GROQ_API_KEY is missing.");
        }

        let model = process.env.GROQ_LLM_MODEL || "llama-3.1-8b-instant";
        if (model === "llama-3.3-70b") {
            model = "llama-3.3-70b-versatile";
        }

        return new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            model: model,
            temperature: 0,
            maxTokens: Number(process.env.LLM_MAX_TOKENS || 512),
            maxRetries: 2,
        });
    }

    if (provider === "google" || provider === "gemini") {
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error("LLM_PROVIDER is google, but GOOGLE_API_KEY is missing.");
        }

        return new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY,
            model: process.env.GOOGLE_LLM_MODEL || "gemini-2.0-flash",
            temperature: 0,
            maxOutputTokens: Number(process.env.LLM_MAX_TOKENS || 512),
            maxRetries: 2,
        });
    }

    if (provider !== "ollama") {
        throw new Error(`Unsupported LLM_PROVIDER "${provider}". Use auto, groq, google, or ollama.`);
    }

    const baseUrl = process.env.OLLAMA_PROXY_URL || "http://localhost:11434";

    return new ProxiedOllama({
        baseUrl,
        model: process.env.OLLAMA_MODEL || "llama3.2:3b",
        temperature: 0,
    });
};
