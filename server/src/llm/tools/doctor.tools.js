import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { searchDoctors, getDoctorById, generateAvailableSlots } from "../../services/doctor.service.js";

const todayInNepal = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
};

const isAvailableTodayQuery = (query = "") =>
    /\b(available|availability|free|slots?)\b/i.test(query)
    && /\b(doctors?|specialists?)\b/i.test(query)
    && /\b(today|now)\b/i.test(query);

const isSpecializationListQuery = (query = "") =>
    /\b(what|which|list|show|available)\b/i.test(query)
    && /\b(speciali[sz]ations?|specialties|specialists?)\b/i.test(query);

const formatDoctor = (doctor, index = null) => {
    const prefix = index === null ? "" : `${index + 1}. `;
    return `${prefix}ID: ${doctor.id}, Name: ${doctor.name}, Specialty: ${doctor.specialization}, Hospital: ${doctor.hospitalName}, Hospital ID: ${doctor.hospitalId || "N/A"}`;
};

const formatAvailableSpecializations = async () => {
    const doctors = await searchDoctors({ q: "" });
    const specializations = [...new Set(
        doctors
            .filter((doctor) => doctor.hospitalId && doctor.hospitalName)
            .flatMap((doctor) => String(doctor.specialization || "")
                .split(/\s*,\s*/)
                .map((item) => item.trim())
                .filter(Boolean))
    )].sort((a, b) => a.localeCompare(b));

    if (!specializations.length) return "No doctor specializations are currently available.";
    return `Available doctor specializations:\n${specializations.map((name, index) => `${index + 1}. ${name}`).join("\n")}`;
};

const formatDoctorsAvailableToday = async () => {
    const today = todayInNepal();
    const doctors = await searchDoctors({ q: "" });
    const unique = [...new Map(
        doctors
            .filter((doctor) => doctor.id && doctor.hospitalId)
            .map((doctor) => [doctor.id, doctor])
    ).values()];

    const available = [];
    for (const doctor of unique.slice(0, 20)) {
        const hospitals = await generateAvailableSlots(doctor.id, today);
        const firstHospital = (hospitals || []).find((hospital) =>
            (hospital.days || []).some((day) =>
                (day.slots || []).some((slot) => slot.status === "available")
            )
        );
        if (!firstHospital) continue;

        const day = firstHospital.days.find((item) =>
            (item.slots || []).some((slot) => slot.status === "available")
        );
        const firstSlot = day.slots.find((slot) => slot.status === "available");
        available.push({
            ...doctor,
            hospitalId: firstHospital.hospitalId || doctor.hospitalId,
            hospitalName: firstHospital.hospitalName || doctor.hospitalName,
            firstSlot: firstSlot?.start_time || "",
            date: today,
        });
        if (available.length >= 5) break;
    }

    if (!available.length) return `No doctors have available slots for today (${today}).`;

    return available.map((doctor, index) =>
        `${index + 1}. ID: ${doctor.id}, Name: ${doctor.name}, Specialty: ${doctor.specialization}, Hospital: ${doctor.hospitalName}, Hospital ID: ${doctor.hospitalId}, Today: ${doctor.firstSlot}`
    ).join("\n");
};

const doctorSearchTool = new DynamicStructuredTool({
    name: "search_doctors",
    description: `
        Search for doctors by name, specialization, hospital, or location.
        Input should be a JSON object with a 'q' key for the query.
        Use this ONLY when you already know the specialty or doctor name to search for.
        Pass only the specialty or name — NOT a symptom description or full sentence.
        Examples: {"q": "Cardiology"}, {"q": "Dermatology"}, {"q": "Prakash"}
        Do NOT pass symptoms like "allergies" or "chest pain" — map those to a specialty first using search_knowledge_base.
    `,
    schema: z.preprocess((val) => {
        let current = val;
        let depth = 0;
        while (typeof current === 'string' && depth < 5) {
            try {
                const parsed = JSON.parse(current);
                if (parsed === current) break;
                current = parsed;
                depth++;
            } catch (e) { break; }
        }
        if (typeof current === 'string') return { q: current };
        if (current && typeof current === 'object') {
            return { q: current.q || current.query || current.specialty || current.specialization || "" };
        }
        return current;
    }, z.object({
        q: z.string().describe("The search query (name, specialty, etc.)"),
    })),
    func: async ({ q }) => {
        try {
            const query = typeof q === 'string' ? q : (q?.q || JSON.stringify(q));
            if (isSpecializationListQuery(query)) {
                return await formatAvailableSpecializations();
            }
            if (isAvailableTodayQuery(query)) {
                return await formatDoctorsAvailableToday();
            }
            const results = (await searchDoctors({ q: query }))
                .filter((doc) => doc.hospitalId && doc.hospitalName);
            if (!results || results.length === 0) return "No doctors found.";
            
            return results.slice(0, 5).map((doc) => formatDoctor(doc)).join("\n");
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
});

const getDoctorDetails = new DynamicStructuredTool({
    name: "get_doctor_details",
    description: "Get details of a doctor by ID. Input: {\"doctor_id\": \"123\"}",
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({
        doctor_id: z.coerce.string().describe("The ID of the doctor"),
    })),
    func: async ({ doctor_id }) => {
        try {
            const result = await getDoctorById(doctor_id);
            const doc = result.doctor;
            return `ID: ${doc.id}, Name: ${doc.name}, Experience: ${doc.experience} yrs, Specialty: ${doc.specialization_name}.`;
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }
});

export const doctorTools = [doctorSearchTool, getDoctorDetails];
