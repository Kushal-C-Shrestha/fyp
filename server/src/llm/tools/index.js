import { doctorTools } from "./doctor.tools.js";
import { availabilityTools } from "./availability.tools.js";
import { appointmentTools } from "./appointment.tools.js";
import { hospitalTools } from "./hospital.tools.js";
import { userTools } from "./user.tools.js";
import { knowledgeTools } from "./knowledge.tools.js";

export const tools = [
    ...availabilityTools, ...doctorTools, ...appointmentTools, ...hospitalTools, ...userTools, ...knowledgeTools
];
