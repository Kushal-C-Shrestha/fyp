import * as specialityService from "../services/speciality.service.js";

const getAllSpecialities = async (req, res) => {
    try {
        const result = await specialityService.getAllSpecialities();
        const specialities = Array.isArray(result?.specialities) ? result.specialities : [];
        return res.status(200).json({ success: true, specialities, specializations: specialities });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, error: error.message });
    }
};

export { getAllSpecialities };
