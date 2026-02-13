import { GoogleGenAI } from "@google/genai";
import { Message, Role, LessonPlan, AnalysisResult, LessonInput } from "../types";
import { SYSTEM_INSTRUCTION, LESSON_PLAN_INSTRUCTION } from "../constants";

// Initialize Gemini Client
const getClient = () => {
  // Access environment variable safely
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    throw new Error("API Key is missing or invalid. Please check your .env.local file.");
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_ID = "gemini-1.5-flash"; // More stable for JSON generation

export const streamResponse = async (
  currentHistory: Message[],
  _newMessage: string,
  _base64Image?: string
): Promise<AsyncGenerator<string, void, unknown>> => {
  const ai = getClient();

  // currentHistory already contains the new user message appended by App.tsx,
  // so we just convert the full history — no need to push again.
  const contents = currentHistory
    .filter(msg => !msg.isError && msg.text.trim() !== '')
    .map((msg) => {
      if (msg.role === Role.USER && msg.image) {
        return {
          role: 'user' as const,
          parts: [
            { text: msg.text },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: msg.image.split(',')[1]
              }
            }
          ]
        };
      }
      return {
        role: (msg.role === Role.USER ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.text }],
      };
    });

  try {
    const responseStream = await ai.models.generateContentStream({
      model: MODEL_ID,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    async function* generator() {
      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    }

    return generator();

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateLessonPlan = async (input: LessonInput): Promise<{ analysis: AnalysisResult, lessonPlan: LessonPlan }> => {
  const ai = getClient();

  const prompt = `
  Hãy soạn giáo án cho chủ đề: "${input.topic}"
  Lớp: ${input.grade}
  Thời lượng: ${input.duration}
  Yêu cầu cần đạt đầu vào: "${input.objectives}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      config: {
        systemInstruction: LESSON_PLAN_INSTRUCTION,
        responseMimeType: 'application/json', // Force JSON output
        temperature: 0.5, // Lower temperature for more structured output
      }
    });

    // Parse the JSON response
    const text = response.text();
    if (!text) throw new Error("No response from AI");

    // Clean up potential markdown formatting if the model adds it despite instructions
    const jsonString = text.replace(/```json\n|\n```/g, "").trim();

    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Lesson Plan Generation Error:", error);
    throw error;
  }
};
