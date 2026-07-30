import Contact from "../models/contact.model.js";
import { contactSchema } from "../validators/contact.validator.js";
import asyncHandler from "../utils/asyncHandler.js";
const getValidationMessage = (validationResult, fallbackMessage) => {
  const firstIssue = validationResult?.error?.issues?.[0];
  return firstIssue?.message || fallbackMessage;
};

export const submitContact = asyncHandler(async (req, res) => {
    const validation = contactSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: getValidationMessage(validation, "Invalid contact data"),
      });
    }

    const { name, email, subject, message } = validation.data;

    const contact = await Contact.create({
      name,
      email,
      subject,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Message submitted successfully",
      contactId: contact._id,
    });
 
});
