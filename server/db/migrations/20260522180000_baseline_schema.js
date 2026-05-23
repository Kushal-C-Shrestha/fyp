const enumSql = [
    "CREATE TYPE public.\"appointment_status_enum\" AS ENUM ('scheduled', 'completed', 'cancelled');",
    "CREATE TYPE public.\"appointment_type_enum\" AS ENUM ('online', 'physical');",
    "CREATE TYPE public.\"approval_status_enum\" AS ENUM ('pending', 'approved', 'rejected');",
    "CREATE TYPE public.\"auth_token_purpose_enum\" AS ENUM ('registration', 'reset-password');",
    "CREATE TYPE public.\"auth_token_type_enum\" AS ENUM ('otp', 'token');",
    "CREATE TYPE public.\"gender_enum\" AS ENUM ('male', 'female', 'other');",
    "CREATE TYPE public.\"hospital_type_enum\" AS ENUM ('government', 'private', 'community');",
    "CREATE TYPE public.\"notification_type_enum\" AS ENUM ('appointment_reminder', 'general', 'appointment_cancelled', 'appointment_booked', 'appointment_rescheduled');",
    "CREATE TYPE public.\"request_initiator_enum\" AS ENUM ('doctor', 'hospital');",
    "CREATE TYPE public.\"request_owner_enum\" AS ENUM ('doctor_request', 'hospital_request');",
    "CREATE TYPE public.\"role_enum\" AS ENUM ('admin', 'user', 'doctor', 'hospital');",
    "CREATE TYPE public.\"sender_type_enum\" AS ENUM ('user', 'assistant');",
    "CREATE TYPE public.\"status_enum\" AS ENUM ('active', 'inactive');",
    "CREATE TYPE public.\"video_call_status\" AS ENUM ('waiting', 'call-started', 'call-ended');"
];

const tables = [
    "appointment_chat",
    "appointment_messages",
    "appointment_records",
    "appointments",
    "assignment_availability",
    "assistant_messages",
    "assistant_sessions",
    "auth_tokens",
    "blog_tag_mappings",
    "blog_tags",
    "blogs",
    "contact_messages",
    "departments",
    "doctor_affiliation_requests",
    "doctor_experience",
    "doctor_hospital_assignments",
    "doctor_qualifications",
    "doctor_request_experience",
    "doctor_request_hospital_schedule",
    "doctor_request_hospitals",
    "doctor_request_qualifications",
    "doctor_request_specializations",
    "doctor_requests",
    "doctor_specializations",
    "doctors",
    "documents_embeddings",
    "facilities",
    "hospital_admin",
    "hospital_departments",
    "hospital_facilities",
    "hospital_request_admin",
    "hospital_request_departments",
    "hospital_request_facilities",
    "hospital_requests",
    "hospitals",
    "leave_requests",
    "medical_records",
    "notifications",
    "reviews",
    "roles",
    "schedule_change_request_availability",
    "schedule_change_requests",
    "specializations",
    "users",
    "verification_documents",
    "video_calls"
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public');
    await knex.raw('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public');

    for (const sql of enumSql) {
        await knex.raw(sql);
    }

    await knex.schema.createTable("appointment_chat", (table) => {
        table.increments("id");
        table.specificType("status", "status_enum").notNullable().defaultTo(knex.raw("'inactive'::status_enum"));
        table.specificType("appointment_id", "integer").notNullable();
        table.unique(["appointment_id"], { indexName: "appointment_chat_appointment_id_unique" });
    });

    await knex.schema.createTable("appointment_messages", (table) => {
        table.increments("id");
        table.specificType("appointment_chat_id", "integer").notNullable();
        table.specificType("sender_id", "integer").notNullable();
        table.specificType("message", "text");
        table.specificType("attachment_url", "character varying(255)");
        table.specificType("is_read", "boolean").notNullable().defaultTo(knex.raw("false"));
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
    });

    await knex.schema.createTable("appointment_records", (table) => {
        table.specificType("appointment_id", "integer").notNullable();
        table.specificType("record_id", "integer").notNullable();
        table.primary(["appointment_id","record_id"], { constraintName: "appointment_records_pkey" });
    });

    await knex.schema.createTable("appointments", (table) => {
        table.increments("id");
        table.specificType("patient_id", "integer").notNullable();
        table.specificType("doctor_id", "integer").notNullable();
        table.specificType("hospital_id", "integer").notNullable();
        table.specificType("appointment_type", "appointment_type_enum").notNullable().defaultTo(knex.raw("'physical'::appointment_type_enum"));
        table.specificType("appointment_date", "date").notNullable();
        table.specificType("appointment_time", "time without time zone").notNullable();
        table.specificType("status", "appointment_status_enum").notNullable().defaultTo(knex.raw("'scheduled'::appointment_status_enum"));
        table.specificType("reason_for_visit", "text");
        table.specificType("notes", "text");
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
    });

    await knex.schema.createTable("assignment_availability", (table) => {
        table.increments("id");
        table.specificType("assignment_id", "integer").notNullable();
        table.specificType("day_of_week", "character varying(255)").notNullable();
        table.specificType("start_time", "time without time zone").notNullable();
        table.specificType("end_time", "time without time zone").notNullable();
        table.specificType("slot_interval_minutes", "integer").notNullable();
        table.unique(["assignment_id","day_of_week","start_time","end_time"], { indexName: "assignment_availability_assignment_id_day_of_week_start_time_en" });
    });

    await knex.schema.createTable("assistant_messages", (table) => {
        table.increments("id");
        table.specificType("assistant_session_id", "integer").notNullable();
        table.specificType("sender_type", "sender_type_enum").notNullable();
        table.specificType("message", "text").notNullable();
        table.specificType("metadata", "jsonb");
        table.specificType("created_at", "timestamp with time zone").defaultTo(knex.raw("CURRENT_TIMESTAMP"));
    });

    await knex.schema.createTable("assistant_sessions", (table) => {
        table.increments("id");
        table.specificType("session_id", "uuid").notNullable();
        table.specificType("user_id", "integer");
        table.specificType("is_expired", "boolean").notNullable().defaultTo(knex.raw("false"));
        table.specificType("expires_at", "timestamp with time zone").notNullable();
        table.specificType("created_at", "timestamp with time zone").defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("last_active_at", "timestamp with time zone").defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.unique(["session_id"], { indexName: "assistant_sessions_session_id_unique" });
    });

    await knex.schema.createTable("auth_tokens", (table) => {
        table.increments("id");
        table.specificType("email", "character varying(255)").notNullable();
        table.specificType("user_id", "integer");
        table.specificType("code", "text").notNullable();
        table.specificType("is_used", "boolean").defaultTo(knex.raw("false"));
        table.specificType("expires_at", "timestamp without time zone").notNullable();
        table.specificType("created_at", "timestamp without time zone").defaultTo(knex.raw("now()"));
        table.specificType("purpose", "auth_token_purpose_enum").notNullable();
        table.specificType("type", "auth_token_type_enum").notNullable();
    });

    await knex.schema.createTable("blog_tag_mappings", (table) => {
        table.specificType("blog_id", "integer").notNullable();
        table.specificType("tag_id", "integer").notNullable();
        table.primary(["blog_id","tag_id"], { constraintName: "blog_tag_mappings_pkey" });
    });

    await knex.schema.createTable("blog_tags", (table) => {
        table.increments("id");
        table.specificType("name", "character varying(255)").notNullable();
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.unique(["name"], { indexName: "blog_tags_name_unique" });
    });

    await knex.schema.createTable("blogs", (table) => {
        table.increments("id");
        table.specificType("title", "character varying(255)").notNullable();
        table.specificType("content_html", "text").notNullable();
        table.specificType("content_json", "jsonb").notNullable();
        table.specificType("author_id", "integer").notNullable();
        table.specificType("cover_image_url", "character varying(255)");
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("deleted_at", "timestamp with time zone");
        table.specificType("published_at", "timestamp with time zone");
        table.specificType("approval_status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
    });

    await knex.schema.createTable("contact_messages", (table) => {
        table.increments("id");
        table.specificType("user_id", "integer");
        table.specificType("name", "character varying(255)").notNullable();
        table.specificType("email", "character varying(255)");
        table.specificType("phone", "character varying(20)");
        table.specificType("content", "text").notNullable();
        table.specificType("reply", "text");
        table.specificType("status", "character varying(50)").defaultTo(knex.raw("'pending'::character varying"));
        table.specificType("replied_at", "timestamp without time zone");
        table.specificType("created_at", "timestamp without time zone").defaultTo(knex.raw("now()"));
        table.specificType("updated_at", "timestamp without time zone").defaultTo(knex.raw("now()"));
    });

    await knex.schema.createTable("departments", (table) => {
        table.increments("id");
        table.specificType("name", "character varying(255)").notNullable();
        table.unique(["name"], { indexName: "departments_name_unique" });
    });

    await knex.schema.createTable("doctor_affiliation_requests", (table) => {
        table.increments("id");
        table.specificType("doctor_id", "integer").notNullable();
        table.specificType("hospital_id", "integer").notNullable();
        table.specificType("request_initiator", "request_initiator_enum").notNullable();
        table.specificType("initiator_id", "integer").notNullable();
        table.specificType("approver_id", "integer");
        table.specificType("status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("request_message", "text");
        table.specificType("consultation_fee", "integer");
        table.specificType("doctor_notes", "text");
        table.specificType("admin_notes", "text");
        table.specificType("hospital_approval_status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
        table.specificType("doctor_approval_status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
        table.specificType("hospital_reviewed_at", "timestamp with time zone");
        table.specificType("doctor_reviewed_at", "timestamp with time zone");
        table.specificType("requested_schedule", "jsonb");
    });

    await knex.schema.createTable("doctor_experience", (table) => {
        table.increments("id");
        table.specificType("doctor_id", "integer").notNullable();
        table.specificType("organization", "character varying(255)").notNullable();
        table.specificType("position", "character varying(255)").notNullable();
        table.specificType("start_date", "date").notNullable();
        table.specificType("end_date", "date");
    });

    await knex.schema.createTable("doctor_hospital_assignments", (table) => {
        table.increments("id");
        table.specificType("doctor_id", "integer").notNullable();
        table.specificType("hospital_id", "integer").notNullable();
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("fee", "numeric(12,2)").defaultTo(knex.raw("0.00"));
        table.unique(["doctor_id","hospital_id"], { indexName: "doctor_hospital_assignments_doctor_id_hospital_id_unique" });
    });

    await knex.schema.createTable("doctor_qualifications", (table) => {
        table.increments("id");
        table.specificType("doctor_id", "integer").notNullable();
        table.specificType("degree_name", "character varying(255)").notNullable();
        table.specificType("institution", "character varying(255)").notNullable();
        table.specificType("graduation_date", "date").notNullable();
    });

    await knex.schema.createTable("doctor_request_experience", (table) => {
        table.increments("id");
        table.specificType("request_id", "integer").notNullable();
        table.specificType("organization", "character varying(255)").notNullable();
        table.specificType("position", "character varying(255)").notNullable();
        table.specificType("start_date", "date").notNullable();
        table.specificType("end_date", "date");
    });

    await knex.schema.createTable("doctor_request_hospital_schedule", (table) => {
        table.increments("id");
        table.specificType("doctor_request_hospital_id", "integer").notNullable();
        table.specificType("day_of_week", "character varying(255)").notNullable();
        table.specificType("start_time", "time without time zone").notNullable();
        table.specificType("end_time", "time without time zone").notNullable();
        table.specificType("slot_interval_minutes", "integer").notNullable().defaultTo(knex.raw("30"));
        table.unique(["doctor_request_hospital_id","day_of_week","start_time"], { indexName: "doctor_request_hospital_schedule_doctor_request_hospital_id_day" });
    });

    await knex.schema.createTable("doctor_request_hospitals", (table) => {
        table.increments("id");
        table.specificType("request_id", "integer").notNullable();
        table.specificType("hospital_id", "integer").notNullable();
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.unique(["request_id","hospital_id"], { indexName: "doctor_request_hospitals_request_id_hospital_id_unique" });
    });

    await knex.schema.createTable("doctor_request_qualifications", (table) => {
        table.increments("id");
        table.specificType("request_id", "integer").notNullable();
        table.specificType("degree_name", "character varying(255)").notNullable();
        table.specificType("institution", "character varying(255)").notNullable();
        table.specificType("graduation_date", "date").notNullable();
    });

    await knex.schema.createTable("doctor_request_specializations", (table) => {
        table.specificType("request_id", "integer").notNullable();
        table.specificType("specialization_id", "integer").notNullable();
        table.primary(["request_id","specialization_id"], { constraintName: "doctor_request_specializations_pkey" });
    });

    await knex.schema.createTable("doctor_requests", (table) => {
        table.increments("id");
        table.specificType("full_name", "character varying(255)").notNullable();
        table.specificType("email", "character varying(255)").notNullable();
        table.specificType("phone", "character varying(255)").notNullable();
        table.specificType("password", "character varying(255)").notNullable();
        table.specificType("date_of_birth", "date").notNullable();
        table.specificType("gender", "gender_enum").notNullable();
        table.specificType("address", "character varying(255)").notNullable();
        table.specificType("profile_picture", "character varying(255)");
        table.specificType("deleted_at", "timestamp with time zone");
        table.specificType("status", "status_enum").notNullable().defaultTo(knex.raw("'active'::status_enum"));
        table.specificType("role", "role_enum").notNullable().defaultTo(knex.raw("'doctor'::role_enum"));
        table.specificType("description", "text").notNullable();
        table.specificType("experience_years", "integer").notNullable();
        table.specificType("license_number", "character varying(255)").notNullable();
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("approval_status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
        table.specificType("request_note", "text");
        table.unique(["email"], { indexName: "doctor_requests_email_unique" });
        table.unique(["license_number"], { indexName: "doctor_requests_license_number_unique" });
        table.unique(["phone"], { indexName: "doctor_requests_phone_unique" });
    });

    await knex.schema.createTable("doctor_specializations", (table) => {
        table.specificType("doctor_id", "integer").notNullable();
        table.specificType("specialization_id", "integer").notNullable();
        table.primary(["doctor_id","specialization_id"], { constraintName: "doctor_specializations_pkey" });
    });

    await knex.schema.createTable("doctors", (table) => {
        table.increments("id");
        table.specificType("description", "text").notNullable();
        table.specificType("experience_years", "integer").notNullable();
        table.specificType("license_number", "character varying(255)").notNullable();
        table.unique(["license_number"], { indexName: "doctors_license_number_unique" });
    });

    await knex.schema.createTable("documents_embeddings", (table) => {
        table.specificType("id", "uuid").notNullable().defaultTo(knex.raw("gen_random_uuid()"));
        table.specificType("content", "text");
        table.specificType("metadata", "jsonb");
        table.specificType("embedding", "vector");
        table.primary(["id"], { constraintName: "documents_embeddings_pkey" });
    });

    await knex.schema.createTable("facilities", (table) => {
        table.increments("id");
        table.specificType("name", "character varying(255)").notNullable();
        table.unique(["name"], { indexName: "facilities_name_unique" });
    });

    await knex.schema.createTable("hospital_admin", (table) => {
        table.specificType("hospital_id", "integer").notNullable();
        table.specificType("user_id", "integer").notNullable();
        table.primary(["hospital_id","user_id"], { constraintName: "hospital_admin_pkey" });
    });

    await knex.schema.createTable("hospital_departments", (table) => {
        table.specificType("hospital_id", "integer").notNullable();
        table.specificType("department_id", "integer").notNullable();
        table.primary(["hospital_id","department_id"], { constraintName: "hospital_departments_pkey" });
    });

    await knex.schema.createTable("hospital_facilities", (table) => {
        table.specificType("hospital_id", "integer").notNullable();
        table.specificType("facility_id", "integer").notNullable();
        table.primary(["hospital_id","facility_id"], { constraintName: "hospital_facilities_pkey" });
    });

    await knex.schema.createTable("hospital_request_admin", (table) => {
        table.specificType("request_id", "integer").notNullable();
        table.specificType("full_name", "character varying(255)").notNullable();
        table.specificType("email", "character varying(255)").notNullable();
        table.specificType("phone", "character varying(255)").notNullable();
        table.specificType("password", "character varying(255)").notNullable();
        table.specificType("date_of_birth", "date").notNullable();
        table.specificType("gender", "gender_enum").notNullable();
        table.specificType("address", "character varying(255)").notNullable();
        table.specificType("profile_picture", "character varying(255)");
        table.specificType("deleted_at", "timestamp with time zone");
        table.specificType("role", "role_enum").notNullable().defaultTo(knex.raw("'hospital'::role_enum"));
        table.primary(["request_id"], { constraintName: "hospital_request_admin_pkey" });
        table.unique(["email"], { indexName: "hospital_request_admin_email_unique" });
        table.unique(["phone"], { indexName: "hospital_request_admin_phone_unique" });
    });

    await knex.schema.createTable("hospital_request_departments", (table) => {
        table.specificType("request_id", "integer").notNullable();
        table.specificType("department_id", "integer").notNullable();
        table.primary(["request_id","department_id"], { constraintName: "hospital_request_departments_pkey" });
    });

    await knex.schema.createTable("hospital_request_facilities", (table) => {
        table.specificType("request_id", "integer").notNullable();
        table.specificType("facility_id", "integer").notNullable();
        table.primary(["request_id","facility_id"], { constraintName: "hospital_request_facilities_pkey" });
    });

    await knex.schema.createTable("hospital_requests", (table) => {
        table.increments("id");
        table.specificType("full_name", "character varying(255)").notNullable();
        table.specificType("description", "text").notNullable();
        table.specificType("registration_number", "character varying(255)").notNullable();
        table.specificType("primary_email", "character varying(255)").notNullable();
        table.specificType("primary_phone", "character varying(255)").notNullable();
        table.specificType("alternate_email", "character varying(255)");
        table.specificType("alternate_phone", "character varying(255)");
        table.specificType("reception_phone", "character varying(255)").notNullable();
        table.specificType("alternate_reception_phone", "character varying(255)");
        table.specificType("website", "character varying(255)");
        table.specificType("hospital_type", "hospital_type_enum").notNullable();
        table.specificType("profile_picture", "character varying(255)");
        table.specificType("deleted_at", "timestamp with time zone");
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("approval_status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
        table.specificType("request_note", "text");
        table.specificType("address", "text");
        table.specificType("map_url", "text");
        table.specificType("established_year", "integer");
        table.specificType("license_authority", "character varying(255)");
        table.specificType("opening_time", "character varying(50)");
        table.specificType("closing_time", "character varying(50)");
        table.specificType("days_open", "jsonb");
        table.specificType("emergency_services", "boolean").defaultTo(knex.raw("false"));
        table.specificType("hospital_type_label", "character varying(255)");
        table.unique(["alternate_email"], { indexName: "hospital_requests_alternate_email_unique" });
        table.unique(["alternate_phone"], { indexName: "hospital_requests_alternate_phone_unique" });
        table.unique(["alternate_reception_phone"], { indexName: "hospital_requests_alternate_reception_phone_unique" });
        table.unique(["primary_email"], { indexName: "hospital_requests_primary_email_unique" });
        table.unique(["primary_phone"], { indexName: "hospital_requests_primary_phone_unique" });
        table.unique(["reception_phone"], { indexName: "hospital_requests_reception_phone_unique" });
        table.unique(["registration_number"], { indexName: "hospital_requests_registration_number_unique" });
    });

    await knex.schema.createTable("hospitals", (table) => {
        table.increments("id");
        table.specificType("full_name", "character varying(255)").notNullable();
        table.specificType("description", "text").notNullable();
        table.specificType("registration_number", "character varying(255)").notNullable();
        table.specificType("primary_email", "character varying(255)").notNullable();
        table.specificType("primary_phone", "character varying(255)").notNullable();
        table.specificType("alternate_email", "character varying(255)");
        table.specificType("alternate_phone", "character varying(255)");
        table.specificType("reception_phone", "character varying(255)").notNullable();
        table.specificType("alternate_reception_phone", "character varying(255)");
        table.specificType("website", "character varying(255)");
        table.specificType("hospital_type", "hospital_type_enum").notNullable();
        table.specificType("profile_picture", "character varying(255)");
        table.specificType("deleted_at", "timestamp with time zone");
        table.specificType("status", "status_enum").notNullable().defaultTo(knex.raw("'active'::status_enum"));
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("address", "text");
        table.specificType("map_url", "text");
        table.specificType("established_year", "integer");
        table.specificType("license_authority", "character varying(255)");
        table.specificType("opening_time", "character varying(50)");
        table.specificType("closing_time", "character varying(50)");
        table.specificType("days_open", "jsonb");
        table.specificType("emergency_services", "boolean").defaultTo(knex.raw("false"));
        table.specificType("hospital_type_label", "character varying(255)");
        table.unique(["alternate_email"], { indexName: "hospitals_alternate_email_unique" });
        table.unique(["alternate_phone"], { indexName: "hospitals_alternate_phone_unique" });
        table.unique(["alternate_reception_phone"], { indexName: "hospitals_alternate_reception_phone_unique" });
        table.unique(["primary_email"], { indexName: "hospitals_primary_email_unique" });
        table.unique(["primary_phone"], { indexName: "hospitals_primary_phone_unique" });
        table.unique(["reception_phone"], { indexName: "hospitals_reception_phone_unique" });
        table.unique(["registration_number"], { indexName: "hospitals_registration_number_unique" });
    });

    await knex.schema.createTable("leave_requests", (table) => {
        table.increments("id");
        table.specificType("assignment_id", "integer").notNullable();
        table.specificType("start_date", "date").notNullable();
        table.specificType("end_date", "date").notNullable();
        table.specificType("status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
        table.specificType("approver_id", "integer");
        table.specificType("reason", "text");
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("leave_type", "character varying(255)").notNullable().defaultTo(knex.raw("'full_day'::character varying"));
        table.specificType("start_time", "time without time zone");
        table.specificType("end_time", "time without time zone");
        table.specificType("reviewed_at", "timestamp with time zone");
    });

    await knex.schema.createTable("medical_records", (table) => {
        table.increments("id");
        table.specificType("user_id", "integer").notNullable();
        table.specificType("name", "character varying(255)").notNullable();
        table.specificType("url", "character varying(255)").notNullable();
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.unique(["user_id","name"], { indexName: "medical_records_user_id_name_unique" });
    });

    await knex.schema.createTable("notifications", (table) => {
        table.increments("id");
        table.specificType("user_id", "integer").notNullable();
        table.specificType("type", "notification_type_enum").notNullable();
        table.specificType("title", "character varying(255)").notNullable();
        table.specificType("message", "text").notNullable();
        table.specificType("is_read", "boolean").notNullable().defaultTo(knex.raw("false"));
        table.specificType("created_at", "timestamp with time zone").defaultTo(knex.raw("CURRENT_TIMESTAMP"));
    });

    await knex.schema.createTable("reviews", (table) => {
        table.increments("id");
        table.specificType("patient_id", "integer").notNullable();
        table.specificType("doctor_id", "integer");
        table.specificType("hospital_id", "integer");
        table.specificType("rating", "integer").notNullable();
        table.specificType("comment", "text");
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
    });

    await knex.schema.createTable("roles", (table) => {
        table.increments("id");
        table.specificType("role", "role_enum").notNullable().defaultTo(knex.raw("'user'::role_enum"));
        table.unique(["role"], { indexName: "roles_role_unique" });
    });

    await knex.schema.createTable("schedule_change_request_availability", (table) => {
        table.increments("id");
        table.specificType("schedule_change_request_id", "integer").notNullable();
        table.specificType("day_of_week", "character varying(255)").notNullable();
        table.specificType("start_time", "time without time zone").notNullable();
        table.specificType("end_time", "time without time zone").notNullable();
        table.specificType("slot_interval_minutes", "integer").notNullable();
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.unique(["schedule_change_request_id","day_of_week","start_time","end_time"], { indexName: "scr_availability_unique_slot" });
    });

    await knex.schema.createTable("schedule_change_requests", (table) => {
        table.increments("id");
        table.specificType("assignment_id", "integer").notNullable();
        table.specificType("approver_id", "integer");
        table.specificType("effective_from", "date").notNullable();
        table.specificType("status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
        table.specificType("reason", "text");
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("reviewed_at", "timestamp with time zone");
    });

    await knex.schema.createTable("specializations", (table) => {
        table.increments("id");
        table.specificType("name", "character varying(255)").notNullable();
        table.unique(["name"], { indexName: "specializations_name_unique" });
    });

    await knex.schema.createTable("users", (table) => {
        table.increments("id");
        table.specificType("full_name", "character varying(255)").notNullable();
        table.specificType("email", "character varying(255)").notNullable();
        table.specificType("phone", "character varying(255)").notNullable();
        table.specificType("password", "character varying(255)").notNullable();
        table.specificType("date_of_birth", "date").notNullable();
        table.specificType("gender", "gender_enum").notNullable();
        table.specificType("address", "character varying(255)").notNullable();
        table.specificType("profile_picture", "character varying(255)");
        table.specificType("deleted_at", "timestamp with time zone");
        table.specificType("status", "status_enum").notNullable().defaultTo(knex.raw("'active'::status_enum"));
        table.specificType("role", "role_enum").notNullable().defaultTo(knex.raw("'user'::role_enum"));
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("public_key", "text");
        table.specificType("encrypted_private_key", "text");
        table.unique(["email"], { indexName: "users_email_unique" });
        table.unique(["phone"], { indexName: "users_phone_unique" });
    });

    await knex.schema.createTable("verification_documents", (table) => {
        table.increments("id");
        table.specificType("request_type", "request_owner_enum").notNullable();
        table.specificType("doctor_request_id", "integer");
        table.specificType("hospital_request_id", "integer");
        table.specificType("user_id", "integer");
        table.specificType("document_type", "character varying(255)").notNullable();
        table.specificType("document_url", "character varying(255)").notNullable();
        table.specificType("file_name", "character varying(255)").notNullable();
        table.specificType("file_size", "character varying(255)").notNullable();
        table.specificType("mime_type", "character varying(255)").notNullable();
        table.specificType("status", "approval_status_enum").notNullable().defaultTo(knex.raw("'pending'::approval_status_enum"));
        table.specificType("created_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
        table.specificType("updated_at", "timestamp with time zone").notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP"));
    });

    await knex.schema.createTable("video_calls", (table) => {
        table.specificType("id", "uuid").notNullable().defaultTo(knex.raw("gen_random_uuid()"));
        table.specificType("appointment_id", "integer").notNullable();
        table.specificType("status", "video_call_status").notNullable().defaultTo(knex.raw("'waiting'::video_call_status"));
        table.specificType("started_at", "timestamp with time zone");
        table.specificType("ended_at", "timestamp with time zone");
        table.specificType("created_at", "timestamp with time zone").defaultTo(knex.raw("now()"));
        table.specificType("updated_at", "timestamp with time zone").defaultTo(knex.raw("now()"));
        table.primary(["id"], { constraintName: "video_calls_pkey" });
        table.unique(["appointment_id"], { indexName: "video_calls_appointment_id_key" });
    });

    await knex.schema.alterTable("appointment_chat", (table) => {
        table.foreign(["appointment_id"], "appointment_chat_appointment_id_foreign").references(["id"]).inTable("appointments").onDelete("SET NULL");
    });

    await knex.schema.alterTable("appointment_messages", (table) => {
        table.foreign(["appointment_chat_id"], "appointment_messages_appointment_chat_id_foreign").references(["id"]).inTable("appointment_chat").onDelete("SET NULL");
        table.foreign(["sender_id"], "appointment_messages_sender_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("appointment_records", (table) => {
        table.foreign(["appointment_id"], "appointment_records_appointment_id_foreign").references(["id"]).inTable("appointments").onDelete("SET NULL");
        table.foreign(["record_id"], "appointment_records_record_id_foreign").references(["id"]).inTable("medical_records").onDelete("SET NULL");
    });

    await knex.schema.alterTable("appointments", (table) => {
        table.foreign(["doctor_id"], "appointments_doctor_id_foreign").references(["id"]).inTable("doctors").onDelete("SET NULL");
        table.foreign(["hospital_id"], "appointments_hospital_id_foreign").references(["id"]).inTable("hospitals").onDelete("SET NULL");
        table.foreign(["patient_id"], "appointments_patient_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("assignment_availability", (table) => {
        table.foreign(["assignment_id"], "assignment_availability_assignment_id_foreign").references(["id"]).inTable("doctor_hospital_assignments").onDelete("CASCADE");
    });

    await knex.schema.alterTable("assistant_messages", (table) => {
        table.foreign(["assistant_session_id"], "assistant_messages_assistant_session_id_foreign").references(["id"]).inTable("assistant_sessions").onDelete("SET NULL");
    });

    await knex.schema.alterTable("assistant_sessions", (table) => {
        table.foreign(["user_id"], "assistant_sessions_user_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("blog_tag_mappings", (table) => {
        table.foreign(["blog_id"], "blog_tag_mappings_blog_id_foreign").references(["id"]).inTable("blogs").onDelete("SET NULL");
        table.foreign(["tag_id"], "blog_tag_mappings_tag_id_foreign").references(["id"]).inTable("blog_tags").onDelete("SET NULL");
    });

    await knex.schema.alterTable("blogs", (table) => {
        table.foreign(["author_id"], "blogs_author_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctor_affiliation_requests", (table) => {
        table.foreign(["approver_id"], "doctor_affiliation_requests_approver_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
        table.foreign(["doctor_id"], "doctor_affiliation_requests_doctor_id_foreign").references(["id"]).inTable("doctors").onDelete("SET NULL");
        table.foreign(["hospital_id"], "doctor_affiliation_requests_hospital_id_foreign").references(["id"]).inTable("hospitals").onDelete("SET NULL");
        table.foreign(["initiator_id"], "doctor_affiliation_requests_initiator_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctor_experience", (table) => {
        table.foreign(["doctor_id"], "doctor_experience_doctor_id_foreign").references(["id"]).inTable("doctors").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctor_hospital_assignments", (table) => {
        table.foreign(["doctor_id"], "doctor_hospital_assignments_doctor_id_foreign").references(["id"]).inTable("doctors").onDelete("SET NULL");
        table.foreign(["hospital_id"], "doctor_hospital_assignments_hospital_id_foreign").references(["id"]).inTable("hospitals").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctor_qualifications", (table) => {
        table.foreign(["doctor_id"], "doctor_qualifications_doctor_id_foreign").references(["id"]).inTable("doctors").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctor_request_experience", (table) => {
        table.foreign(["request_id"], "doctor_request_experience_request_id_foreign").references(["id"]).inTable("doctor_requests").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctor_request_hospital_schedule", (table) => {
        table.foreign(["doctor_request_hospital_id"], "doctor_request_hospital_schedule_doctor_request_hospital_id_for").references(["id"]).inTable("doctor_request_hospitals").onDelete("CASCADE");
    });

    await knex.schema.alterTable("doctor_request_hospitals", (table) => {
        table.foreign(["hospital_id"], "doctor_request_hospitals_hospital_id_foreign").references(["id"]).inTable("hospitals").onDelete("CASCADE");
        table.foreign(["request_id"], "doctor_request_hospitals_request_id_foreign").references(["id"]).inTable("doctor_requests").onDelete("CASCADE");
    });

    await knex.schema.alterTable("doctor_request_qualifications", (table) => {
        table.foreign(["request_id"], "doctor_request_qualifications_request_id_foreign").references(["id"]).inTable("doctor_requests").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctor_request_specializations", (table) => {
        table.foreign(["request_id"], "doctor_request_specializations_request_id_foreign").references(["id"]).inTable("doctor_requests").onDelete("SET NULL");
        table.foreign(["specialization_id"], "doctor_request_specializations_specialization_id_foreign").references(["id"]).inTable("specializations").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctor_specializations", (table) => {
        table.foreign(["doctor_id"], "doctor_specializations_doctor_id_foreign").references(["id"]).inTable("doctors").onDelete("SET NULL");
        table.foreign(["specialization_id"], "doctor_specializations_specialization_id_foreign").references(["id"]).inTable("specializations").onDelete("SET NULL");
    });

    await knex.schema.alterTable("doctors", (table) => {
        table.foreign(["id"], "doctors_id_foreign").references(["id"]).inTable("users").onDelete("CASCADE");
    });

    await knex.schema.alterTable("hospital_admin", (table) => {
        table.foreign(["hospital_id"], "hospital_admin_hospital_id_foreign").references(["id"]).inTable("hospitals").onDelete("SET NULL");
        table.foreign(["user_id"], "hospital_admin_user_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("hospital_departments", (table) => {
        table.foreign(["department_id"], "hospital_departments_department_id_foreign").references(["id"]).inTable("departments").onDelete("SET NULL");
        table.foreign(["hospital_id"], "hospital_departments_hospital_id_foreign").references(["id"]).inTable("hospitals").onDelete("SET NULL");
    });

    await knex.schema.alterTable("hospital_facilities", (table) => {
        table.foreign(["facility_id"], "hospital_facilities_facility_id_foreign").references(["id"]).inTable("facilities").onDelete("SET NULL");
        table.foreign(["hospital_id"], "hospital_facilities_hospital_id_foreign").references(["id"]).inTable("hospitals").onDelete("SET NULL");
    });

    await knex.schema.alterTable("hospital_request_admin", (table) => {
        table.foreign(["request_id"], "hospital_request_admin_request_id_foreign").references(["id"]).inTable("hospital_requests").onDelete("SET NULL");
    });

    await knex.schema.alterTable("hospital_request_departments", (table) => {
        table.foreign(["department_id"], "hospital_request_departments_department_id_foreign").references(["id"]).inTable("departments").onDelete("SET NULL");
        table.foreign(["request_id"], "hospital_request_departments_request_id_foreign").references(["id"]).inTable("hospital_requests").onDelete("SET NULL");
    });

    await knex.schema.alterTable("hospital_request_facilities", (table) => {
        table.foreign(["facility_id"], "hospital_request_facilities_facility_id_foreign").references(["id"]).inTable("facilities").onDelete("SET NULL");
        table.foreign(["request_id"], "hospital_request_facilities_request_id_foreign").references(["id"]).inTable("hospital_requests").onDelete("SET NULL");
    });

    await knex.schema.alterTable("leave_requests", (table) => {
        table.foreign(["approver_id"], "leave_requests_approver_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
        table.foreign(["assignment_id"], "leave_requests_assignment_id_foreign").references(["id"]).inTable("doctor_hospital_assignments").onDelete("CASCADE");
    });

    await knex.schema.alterTable("medical_records", (table) => {
        table.foreign(["user_id"], "medical_records_user_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("notifications", (table) => {
        table.foreign(["user_id"], "notifications_user_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("reviews", (table) => {
        table.foreign(["doctor_id"], "reviews_doctor_id_foreign").references(["id"]).inTable("doctors").onDelete("SET NULL");
        table.foreign(["hospital_id"], "reviews_hospital_id_foreign").references(["id"]).inTable("hospitals").onDelete("SET NULL");
        table.foreign(["patient_id"], "reviews_patient_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("schedule_change_request_availability", (table) => {
        table.foreign(["schedule_change_request_id"], "scr_availability_request_fk").references(["id"]).inTable("schedule_change_requests").onDelete("CASCADE");
    });

    await knex.schema.alterTable("schedule_change_requests", (table) => {
        table.foreign(["approver_id"], "schedule_change_requests_approver_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
        table.foreign(["assignment_id"], "schedule_change_requests_assignment_id_foreign").references(["id"]).inTable("doctor_hospital_assignments").onDelete("CASCADE");
    });

    await knex.schema.alterTable("verification_documents", (table) => {
        table.foreign(["doctor_request_id"], "verification_documents_doctor_request_id_foreign").references(["id"]).inTable("doctor_requests").onDelete("SET NULL");
        table.foreign(["hospital_request_id"], "verification_documents_hospital_request_id_foreign").references(["id"]).inTable("hospital_requests").onDelete("SET NULL");
        table.foreign(["user_id"], "verification_documents_user_id_foreign").references(["id"]).inTable("users").onDelete("SET NULL");
    });

    await knex.schema.alterTable("video_calls", (table) => {
        table.foreign(["appointment_id"], "video_calls_appointment_id_fkey").references(["id"]).inTable("appointments").onDelete("CASCADE");
    });

}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    for (const tableName of [...tables].reverse()) {
        await knex.schema.dropTableIfExists(tableName);
    }

    for (const sql of [...enumSql].reverse()) {
        const match = sql.match(/CREATE TYPE public\."?([^"\s]+)"?/);
        if (match) await knex.raw(`DROP TYPE IF EXISTS public.${match[1]} CASCADE`);
    }
}
