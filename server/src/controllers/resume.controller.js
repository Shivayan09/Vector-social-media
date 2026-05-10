import { createRequire } from "module";
import { GoogleGenerativeAI } from "@google/generative-ai";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
];

async function generateWithFallback(prompt) {
    for (const modelName of MODELS) {
        try {
            console.log(`⚡ Trying model: ${modelName}`);

            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent(prompt);

            const text = result.response.text();

            if (!text || text.length < 10) {
                throw new Error("Empty response from AI");
            }

            return text;

        } catch (err) {
            const isRateLimit =
                err.status === 429 ||
                err.message?.toLowerCase().includes("quota");

            if (isRateLimit) {
                console.warn(`⚠️ ${modelName} rate limited. Switching...`);
                continue;
            }

            throw err;
        }
    }

    throw new Error("All Gemini models failed (rate limited)");
}

export const analyzeResume = async (req, res) => {
    try {
        console.log("---- REQUEST RECEIVED ----");

        const file = req.file;
        const jobDescription = req.body.jobDescription;

        if (!file) {
            return res.status(400).json({ error: "No resume uploaded" });
        }

        if (!file.buffer) {
            return res.status(400).json({ error: "File buffer missing" });
        }

        if (!jobDescription || jobDescription.trim().length < 10) {
            return res.status(400).json({ error: "Invalid job description" });
        }

        let resumeText = "";
        try {
            const data = await pdf(file.buffer);

            if (!data?.text || data.text.trim().length < 30) {
                return res.status(400).json({
                    error: "PDF has no readable text (scanned or invalid)",
                });
            }

            resumeText = data.text;
        } catch (err) {
            console.error("❌ PDF parsing failed:", err);
            return res.status(500).json({
                error: "PDF parsing failed",
                details: err.message,
            });
        }

        const cleanText = resumeText.replace(/\s+/g, " ").slice(0, 5000);

        const prompt = `
You are an expert resume reviewer.

Analyze the resume against the job description.

Return ONLY valid JSON. No markdown. No explanation.

Format:
{
  "missing_skills": ["..."],
  "weak_areas": ["..."],
  "improved_points": ["..."],
  "ats_score": 0,
  "suggestions": ["..."]
}

Resume:
${cleanText}

Job Description:
${jobDescription}
`;

        let responseText = "";

        try {
            responseText = await generateWithFallback(prompt);
        } catch (err) {
            console.error("❌ Gemini failed:", err);
            return res.status(500).json({
                error: "AI processing failed",
                details: err.message,
            });
        }

        let parsed;
        try {
            let cleaned = responseText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();

            if (!cleaned || cleaned.length < 10) {
                throw new Error("Empty AI response");
            }

            parsed = JSON.parse(cleaned);

        } catch (err) {
            console.warn("⚠️ JSON parse failed:", err.message);

            parsed = {
                error: "AI returned invalid JSON",
                raw: responseText,
            };
        }

        return res.json(parsed);

    } catch (err) {
        console.error("🔥 UNEXPECTED ERROR:", err);

        return res.status(500).json({
            error: err.message,
        });
    }
};
