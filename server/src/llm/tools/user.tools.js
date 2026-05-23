import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * A helper tool that allows the AI to extract and confirm 
 * the current user's identity from the system context.
 */
export const userInfoTool = new DynamicStructuredTool({
    name: "get_current_user_info",
    description: "Get information about the currently logged-in user (ID, Name, Role). Use this to obtain the patient_id for booking.",
    schema: z.preprocess((val) => {
        if (!val || val === "{}" || val === "\"\"") return {};
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return {}; }
        }
        return val || {};
    }, z.object({}).passthrough()),
    func: async (_, runManager) => {
        // The context is passed through to the agent, we can remind the AI
        // that it already has this info or return a confirmation string.
        return "Please look at the 'Current Context' provided in your system prompt to see the logged-in user's ID and Role.";
    },
});

export const userTools = [userInfoTool];
