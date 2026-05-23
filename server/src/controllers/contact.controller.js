import * as contactService from "../services/contact.service.js";

const createContact = async (req, res) => {
    try {
        const userId = req.user?.user_id || null;
        const { name = '', email = '', phone = '', message = '' } = req.body || {};

        const result = await contactService.createContact({ userId, name, email, phone, message });
        return res.status(201).json({
            success: true,
            message: "Contact created successfully",
            contact_id: result.contact_id
        });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getAllContacts = async (req, res) => {
    try {
        const contacts = await contactService.getAllContacts();
        return res.status(200).json({ success: true, contacts });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getOneContact = async (req, res) => {
    try {
        const { id } = req.params;
        const contact = await contactService.getOneContact(id);
        return res.status(200).json({ success: true, contact });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const replyContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;
        const result = await contactService.replyContact(id, reply);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export { createContact, getAllContacts, getOneContact, replyContact };
