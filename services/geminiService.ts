
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisPoint, SafetyStatus, Mentor } from "../types";

const BASE_SYSTEM_INSTRUCTION = `
You are MentorMe, an advanced AI personal coach. Your goal is to observe the user (via camera or screen share) and provide real-time, constructive feedback.
You must also strictly monitor for safety.
If you detect ANY violence, self-harm, weapons, or explicit sexual content, you MUST flag the safetyStatus as UNSAFE immediately.
`;

export const analyzeFrame = async (base64Image: string, mentor: Mentor, language: string = 'English', userInstruction: string = ''): Promise<AnalysisPoint> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using Flash for low-latency. 
  const modelId = "gemini-2.5-flash"; 

  const prompt = `
    Analyze this image frame. It is likely a SCREEN SHARE of a user working, coding, or presenting.
    
    PERSONA: ${mentor.context}
    GOALS: ${mentor.goals}
    LANGUAGE: ${language}

    ${userInstruction ? `
    USER VOICE COMMAND: "${userInstruction}"
    (The user is talking back to you. You MUST prioritize answering this specific request or question in your suggestion.)
    ` : ''}

    Task:
    1. READ THE SCREEN. Identify the active application (e.g., VS Code, PowerPoint, Browser).
    2. READ the text/code. What specifically is the user working on? (e.g., "Fixing a React useEffect bug", "Editing Slide 3 Title", "Writing an email to John").
    3. If it's code, look for bugs or best practice issues. If it's design, look for alignment.
    4. Provide a conversational, narrator-style suggestion.

    Output JSON format:
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: BASE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedActivity: { type: Type.STRING, description: "Specific task visible on screen (e.g., 'Debugging main.tsx')" },
            postureScore: { type: Type.INTEGER, description: "Quality score (1-10)" },
            focusScore: { type: Type.INTEGER, description: "Focus/Progress score (1-10)" },
            lightingScore: { type: Type.INTEGER, description: "Clarity score (1-10)" },
            detectedObjects: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestion: { type: Type.STRING, description: `Conversational advice or answer in ${language}` },
            goodPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            safetyStatus: { type: Type.STRING, enum: ["SAFE", "UNSAFE", "UNKNOWN"] }
          },
          required: ["detectedActivity", "postureScore", "focusScore", "suggestion", "safetyStatus"]
        }
      }
    });

    // Robust JSON Parsing
    let jsonText = response.text || "{}";
    // 1. Remove Markdown code blocks
    jsonText = jsonText.replace(/```json\n?|```/g, '').trim();
    
    // 2. Extract JSON object if there is extra text
    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
        jsonText = jsonText.substring(startIndex, endIndex + 1);
    }

    let result;
    try {
        result = JSON.parse(jsonText);
    } catch (e) {
        console.warn("JSON Parse failed, attempting cleanup", jsonText);
        // Fallback for simple errors
        result = {};
    }
    
    return {
      timestamp: Date.now(),
      detectedActivity: result.detectedActivity || "Analyzing screen content...",
      postureScore: result.postureScore || 5,
      focusScore: result.focusScore || 5,
      lightingScore: result.lightingScore || 5,
      detectedObjects: result.detectedObjects || [],
      suggestion: result.suggestion || "I am reading your screen, please wait...",
      goodPoints: result.goodPoints || [],
      improvements: result.improvements || [],
      safetyStatus: result.safetyStatus as SafetyStatus || SafetyStatus.UNKNOWN
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      timestamp: Date.now(),
      detectedActivity: "Connection Error",
      postureScore: 0,
      focusScore: 0,
      lightingScore: 0,
      detectedObjects: [],
      suggestion: "I'm having trouble seeing the screen. Checking connection...",
      goodPoints: [],
      improvements: [],
      safetyStatus: SafetyStatus.UNKNOWN
    };
  }
};

export const generateFinalSummary = async (points: AnalysisPoint[], mentor: Mentor, language: string = 'English'): Promise<{ keyInsights: string[], overallScore: number }> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    
    if (points.length === 0) return { keyInsights: ["No data collected"], overallScore: 0 };

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-2.5-flash";

    // Summarize the time-series data
    const dataSummary = points.map((p, i) => 
        `T+${i*10}s: Activity="${p.detectedActivity || 'Unknown'}", Suggestion="${p.suggestion}"`
    ).join("\n");

    const prompt = `
        Role: ${mentor.context}
        Goals: ${mentor.goals}
        Language: ${language}
        Session Log:
        ${dataSummary}

        Generate a final report:
        1. 3 key actionable insights.
        2. Overall score (0-100).
    `;

    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    keyInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
                    overallScore: { type: Type.INTEGER }
                }
            }
        }
    });

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/```json\n?|```/g, '').trim();
    
    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
        jsonText = jsonText.substring(startIndex, endIndex + 1);
    }

    try {
        return JSON.parse(jsonText);
    } catch (e) {
        return { keyInsights: ["Could not generate summary"], overallScore: 0 };
    }
};
