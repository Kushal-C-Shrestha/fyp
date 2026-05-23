import pool from "../config/db.js";

const OPTIONAL_LEAVE_REQUEST_COLUMNS = ["leave_type", "start_time", "end_time"];

let leaveRequestColumnSupportPromise = null;

export const getLeaveRequestColumnSupport = async () => {
    if (!leaveRequestColumnSupportPromise) {
        leaveRequestColumnSupportPromise = pool
            .query(
                `
                  SELECT column_name
                  FROM information_schema.columns
                  WHERE table_name = 'leave_requests'
                    AND table_schema = ANY(current_schemas(false))
                    AND column_name = ANY($1::text[])
                `,
                [OPTIONAL_LEAVE_REQUEST_COLUMNS]
            )
            .then(({ rows }) => {
                const availableColumns = new Set(
                    rows.map((row) => String(row?.column_name || "").trim().toLowerCase()).filter(Boolean)
                );

                return {
                    hasLeaveType: availableColumns.has("leave_type"),
                    hasStartTime: availableColumns.has("start_time"),
                    hasEndTime: availableColumns.has("end_time"),
                };
            })
            .catch((error) => {
                leaveRequestColumnSupportPromise = null;
                throw error;
            });
    }

    return leaveRequestColumnSupportPromise;
};
