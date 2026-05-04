import Contact from "../models/contact.model.js";

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate all fields are strings and not empty
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof subject !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !subject.trim() ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required and must be valid",
      });
    }

    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Message submitted successfully",
    });
  } catch (error) {
    const message = error.name === "ValidationError" ? error.message : "Failed to submit message";
    return res.status(400).json({
      success: false,
      message,
    });
  }
};
