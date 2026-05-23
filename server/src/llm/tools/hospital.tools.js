import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { searchHospitals, getAllHospitals, getHospitalById } from "../../services/hospital.service.js";

const searchHospitalsTool = new DynamicStructuredTool({
    name: "search_hospitals",
    description: `
        Search for hospitals by name, location, type, or department.
        Use this when the user wants to find a hospital or asks about available hospitals.
        Returns a list of hospitals with their IDs, names, addresses, types, departments, and ratings.
    `,
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({
        query: z.string().optional().describe(
            "Search term — hospital name, location, department, or facility name"
        ),
        types: z.array(z.string()).optional().describe(
            "Filter by hospital type: 'government', 'private', or 'community'"
        ),
        departments: z.array(z.string()).optional().describe(
            "Filter by departments the hospital must have, e.g. ['Cardiology', 'Neurology']"
        ),
        sort: z.enum(["name", "year"]).optional().describe(
            "Sort results by name or established year"
        ),
        order: z.enum(["ASC", "DESC"]).optional().describe(
            "Sort order — ASC or DESC. Defaults to ASC."
        ),
    })),
    func: async ({ query, types, departments, sort, order }) => {
        try {
            const results = await searchHospitals({
                query: query ?? "",
                typesArray: types ?? [],
                departmentsArray: departments ?? [],
                facilityIdsArray: [],
                sort: sort ?? "name",
                order: order ?? "ASC",
            });

            if (!results || results.length === 0) {
                return "No hospitals found matching your search. Try a different name or location.";
            }

            return results.slice(0, 5).map(h =>
                `ID: ${h.hospital_id}, Name: ${h.hospital_name}, Type: ${h.hospital_type}, Address: ${h.hospital_address || "N/A"}, Departments: ${h.departments.slice(0, 4).join(", ") || "N/A"}, Rating: ${h.avg_rating} (${h.review_count} reviews)`
            ).join("\n");
        } catch (error) {
            return `Error searching hospitals: ${error.message}`;
        }
    },
});

const getAllHospitalsTool = new DynamicStructuredTool({
    name: "get_all_hospitals",
    description: `
        Get a list of all active hospitals on the platform.
        Use this when the user asks for all hospitals or wants to browse available hospitals without a specific filter.
    `,
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({})),
    func: async () => {
        try {
            const results = await getAllHospitals();

            if (!results || results.length === 0) {
                return "No hospitals are currently listed on the platform.";
            }

            return results.slice(0, 8).map(h =>
                `ID: ${h.hospital_id}, Name: ${h.hospital_name}, Type: ${h.hospital_type}, Address: ${h.hospital_address || "N/A"}, Rating: ${h.avg_rating}`
            ).join("\n");
        } catch (error) {
            return `Error fetching hospitals: ${error.message}`;
        }
    },
});

const getHospitalDetailsTool = new DynamicStructuredTool({
    name: "get_hospital_details",
    description: "Get full details of a specific hospital by its ID, including departments, facilities, contact info, and rating.",
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({
        hospital_id: z.coerce.string().describe("The ID of the hospital"),
    })),
    func: async ({ hospital_id }) => {
        try {
            const h = await getHospitalById(hospital_id);
            return [
                `ID: ${h.hospital_id}, Name: ${h.hospital_name}`,
                `Type: ${h.hospital_type}, Address: ${h.hospital_address || "N/A"}`,
                `Phone: ${h.hospital_primary_phone || "N/A"}, Email: ${h.hospital_primary_email || "N/A"}`,
                `Website: ${h.hospital_website || "N/A"}`,
                `Departments: ${h.departments.join(", ") || "N/A"}`,
                `Facilities: ${h.facilities.join(", ") || "N/A"}`,
                `Rating: ${h.avg_rating} (${h.review_count} reviews)`,
            ].join("\n");
        } catch (error) {
            return `Error fetching hospital details: ${error.message}`;
        }
    },
});

export const hospitalTools = [searchHospitalsTool, getAllHospitalsTool, getHospitalDetailsTool];
