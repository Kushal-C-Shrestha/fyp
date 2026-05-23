import express from "express";
import { createContact, getAllContacts,getOneContact,replyContact } from "../controllers/contact.controller.js";
import { authenticateUser, authorizeRole } from "../middlewares/auth.middleware.js";

const router=express.Router();

router.post('/',createContact);

const isAdmin = authorizeRole(['admin', 'super_admin', 'main super admin', 'main_super_admin']);

router.get('/', authenticateUser, isAdmin, getAllContacts);
router.get('/:id', authenticateUser, isAdmin, getOneContact);
router.put('/:id', authenticateUser, isAdmin, replyContact);
// router.delete('/:id',deleteContact);

export default router;
