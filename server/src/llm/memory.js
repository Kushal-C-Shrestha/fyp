import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";

const sessionMemoryStore = {};
const sessionEntityStore = {};

export const getMemory = (sessionId) => {
    if (!sessionMemoryStore[sessionId]) {
        sessionMemoryStore[sessionId] = new BufferMemory({
            chatHistory: new ChatMessageHistory(),
            memoryKey: "chat_history",
            returnMessages: false,
            inputKey: "input",
            outputKey: "output",
        });
    }
    return sessionMemoryStore[sessionId];
};

export const clearMemory = (sessionId) => {
    delete sessionMemoryStore[sessionId];
    delete sessionEntityStore[sessionId];
};

const normalizeDoctor = (doctor = {}) => ({
    id: String(doctor.id || doctor.doctor_id || "").trim(),
    name: String(doctor.name || "").trim(),
    specialty: String(doctor.specialty || "").trim(),
    hospitalId: String(doctor.hospitalId || doctor.hospital_id || "").trim(),
    hospitalName: String(doctor.hospitalName || doctor.hospital_name || "").trim(),
});

const normalizeAvailability = (availability = {}) => ({
    doctorId: String(availability.doctorId || availability.doctor_id || "").trim(),
    hospitalId: String(availability.hospitalId || availability.hospital_id || "").trim(),
    hospitalName: String(availability.hospitalName || availability.hospital_name || "").trim(),
    summary: String(availability.summary || "").trim(),
});

export const getEntityMemory = (sessionId) => {
    if (!sessionEntityStore[sessionId]) {
        sessionEntityStore[sessionId] = {
            doctors: [],
            availability: [],
        };
    }
    return sessionEntityStore[sessionId];
};

export const mergeEntityMemory = (sessionId, metadata = {}) => {
    const state = getEntityMemory(sessionId);

    for (const rawDoctor of metadata.doctors || []) {
        const doctor = normalizeDoctor(rawDoctor);
        if (!doctor.id || !doctor.name) continue;

        const existingIndex = state.doctors.findIndex((item) =>
            item.id === doctor.id && item.hospitalId === doctor.hospitalId
        );
        if (existingIndex >= 0) {
            state.doctors[existingIndex] = { ...state.doctors[existingIndex], ...doctor };
        } else {
            state.doctors.unshift(doctor);
        }
    }

    for (const rawAvailability of metadata.availability || []) {
        const availability = normalizeAvailability(rawAvailability);
        if (!availability.doctorId || !availability.hospitalId) continue;

        const existingIndex = state.availability.findIndex((item) =>
            item.doctorId === availability.doctorId && item.hospitalId === availability.hospitalId
        );
        if (existingIndex >= 0) {
            state.availability[existingIndex] = { ...state.availability[existingIndex], ...availability };
        } else {
            state.availability.unshift(availability);
        }
    }

    state.doctors = state.doctors.slice(0, 10);
    state.availability = state.availability.slice(0, 10);
    return state;
};

export const buildEntityContext = (sessionId) => {
    const state = getEntityMemory(sessionId);
    const lines = [];

    if (state.doctors.length > 0) {
        lines.push("Known doctors from recent turns:");
        for (const doctor of state.doctors.slice(0, 8)) {
            const hospital = doctor.hospitalId
                ? `, hospital_id=${doctor.hospitalId}${doctor.hospitalName ? ` (${doctor.hospitalName})` : ""}`
                : "";
            lines.push(`- ${doctor.name}: doctor_id=${doctor.id}${hospital}${doctor.specialty ? `, specialty=${doctor.specialty}` : ""}`);
        }
    }

    if (state.availability.length > 0) {
        lines.push("Known availability from recent turns:");
        for (const item of state.availability.slice(0, 8)) {
            lines.push(`- doctor_id=${item.doctorId}, hospital_id=${item.hospitalId}${item.hospitalName ? ` (${item.hospitalName})` : ""}: ${item.summary}`);
        }
    }

    return lines.join("\n");
};

export const compressHistoryMessage = (content = "") => {
    let text = String(content || "").trim();
    if (text.length < 200) return text;

    // 1. Compress doctor availability slots: "Doctor ID: X | Hospital ID: Y | ..."
    if (text.includes("Doctor ID:") && text.includes("Hospital ID:")) {
        const lines = text.split("\n");
        const compressedLines = [];
        for (const line of lines) {
            if (line.includes("Doctor ID:") && line.includes("Hospital ID:")) {
                const match = line.match(/Doctor ID:\s*(\d+).*?\|\s*(.*?)\s*\|/i);
                if (match) {
                    const docId = match[1];
                    const hospName = match[2];
                    compressedLines.push(`[Slots for Doctor ID ${docId} at ${hospName}]`);
                }
            } else {
                compressedLines.push(line);
            }
        }
        // Deduplicate the compressed placeholder lines
        text = [...new Set(compressedLines)].join("\n");
    }

    // 2. Compress lists of doctors: "1. Dr. Name (ID: X) - ..."
    if (text.includes("Dr. ") && text.includes("(ID:")) {
        const lines = text.split("\n");
        const compressedDocs = [];
        const otherLines = [];
        for (const line of lines) {
            if (/\bDr\.\s+[A-Za-z]+.*\(ID:\s*\d+\)/i.test(line)) {
                const match = line.match(/\bDr\.\s*([A-Za-z]+(?:\s+[A-Za-z]+)?).*?\(ID:\s*(\d+)\)/i);
                if (match) {
                    compressedDocs.push(`Dr. ${match[1]} (ID: ${match[2]})`);
                }
            } else {
                otherLines.push(line);
            }
        }
        if (compressedDocs.length > 0) {
            text = `${otherLines.join("\n")}\nDoctors found: ${compressedDocs.join(", ")}`.trim();
        }
    }

    // 3. General truncation for safety if still too long
    if (text.length > 400) {
        text = text.slice(0, 397) + "...";
    }

    return text;
};
