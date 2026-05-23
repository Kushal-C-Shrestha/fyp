import { DynamicStructuredTool } from "@langchain/core/tools";
import { generateAvailableSlots } from '../../services/doctor.service.js'
import { z } from "zod";

const getDoctorAvailabilityTool = new DynamicStructuredTool({
    name: "get_doctor_availability",
    description: `
        Get the availability and available appointment slots of a doctor.
        Use this when the user asks to check when a doctor is available, or asks for the "earliest availability", "availability", or "slots" of a doctor.
        Input should be a JSON object with a 'doctor_id' key.
        Example: {"doctor_id": "13"}
    `,
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({
        doctor_id: z.coerce.string().describe("The ID of the doctor"),
        date: z.string().optional().describe("Optional date (YYYY-MM-DD)"),
    })),
    func: async ({ doctor_id, date }) => {
        try {
            const slots = await generateAvailableSlots(doctor_id, date);
            if (!slots || slots.length === 0) return "No available slots.";

            const fmt = (dateStr) => {
                const d = new Date(dateStr + 'T00:00:00');
                return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            };

            return slots.map((hosp) => {
                const availableDays = hosp.days
                    .filter(d => d.slots.some(s => s.status === 'available'))
                    .slice(0, 3);
                if (!availableDays.length) return `${hosp.hospitalName}: no slots`;

                const sample = availableDays[0].slots.filter(s => s.status === 'available');
                const shiftStart = sample[0]?.start_time ?? '';
                const shiftEnd   = sample[sample.length - 1]?.end_time ?? '';
                const shift      = shiftStart ? ` | ${shiftStart}–${shiftEnd}` : '';
                const dates      = availableDays.map(d => fmt(d.date)).join(', ');

                return `Doctor ID: ${doctor_id} | Hospital ID: ${hosp.hospitalId} | ${hosp.hospitalName} | ${dates}${shift}`;
            }).join('\n');
        } catch (error) {
            return `Error: ${error.message}`;
        }
    }
})

export const availabilityTools = [getDoctorAvailabilityTool];
