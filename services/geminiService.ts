
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
  
  // Using Flash for low-latency "Edge" simulation
  const modelId = "gemini-2.5-flash"; 

  const prompt = `
    Analyze this image frame (which may be a webcam feed OR a screen share).
    
    CRITICAL INSTRUCTION: Adopt the following persona strictly.
    Role/Context: ${mentor.context}
    Specific Goals: ${mentor.goals}
    Language Requirement: Provide the 'suggestion' and any text output strictly in ${language} language.

    ${userInstruction ? `
    IMPORTANT - USER OVERRIDE INSTRUCTION: 
    The user has just spoken this command: "${userInstruction}".
    You MUST adjust your immediate focus and advice to address this specific request. 
    Ignore previous goals if they conflict with this new instruction.
    ` : ''}

    Based on the ROLE, GOALS, and USER INSTRUCTION above:
    1. Evaluate the primary quality metric relevant to the role (e.g., Posture for health, Code Cleanliness for dev, Food Pacing for eating).
    2. Assess focus or engagement level.
    3. Evaluate environmental factors or screen clarity.
    4. List visible objects or code keywords relevant to the context (Translate to ${language}).
    5. Provide a short, actionable, single-sentence suggestion explicitly derived from the stated GOALS in ${language}.
        - If the user gave an instruction, acknowledge it in the suggestion (e.g., "Understood, checking for...").
        - If the user is doing well, acknowledge the improvement.
    6. Perform a safety check (SAFE or UNSAFE).
    7. Identify "Good Points" (what they are doing right).
    8. Identify "Improvements" (specific things to fix).
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
            postureScore: { type: Type.INTEGER, description: "Primary quality score (1-10) based on context" },
            focusScore: { type: Type.INTEGER, description: "Focus or engagement score (1-10)" },
            lightingScore: { type: Type.INTEGER, description: "Environment/Clarity score (1-10)" },
            detectedObjects: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestion: { type: Type.STRING, description: `Actionable advice based on the specific mentor goals in ${language}` },
            goodPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of positive observations" },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of areas to improve" },
            safetyStatus: { type: Type.STRING, enum: ["SAFE", "UNSAFE", "UNKNOWN"] }
          },
          required: ["postureScore", "focusScore", "lightingScore", "safetyStatus", "suggestion", "goodPoints", "improvements"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      timestamp: Date.now(),
      postureScore: result.postureScore || 5,
      focusScore: result.focusScore || 5,
      lightingScore: result.lightingScore || 5,
      detectedObjects: result.detectedObjects || [],
      suggestion: result.suggestion || "Processing...",
      goodPoints: result.goodPoints || [],
      improvements: result.improvements || [],
      safetyStatus: result.safetyStatus as SafetyStatus || SafetyStatus.UNKNOWN
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Return a neutral fallback
    return {
      timestamp: Date.now(),
      postureScore: 0,
      focusScore: 0,
      lightingScore: 0,
      detectedObjects: [],
      suggestion: "Analysis momentarily unavailable.",
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
        `T+${i*20}s: Score1=${p.postureScore}, Score2=${p.focusScore}, Score3=${p.lightingScore}, Suggestion="${p.suggestion}"`
    ).join("\n");

    const prompt = `
        You are acting as: ${mentor.context}
        Your Goals were: ${mentor.goals}
        Language: ${language}
        
        Here is a time-series log of a user's session:
        ${dataSummary}

        Generate a final mentorship report in ${language}.
        1. Provide 3 specific, actionable key insights to improve their routine/work based on the goals.
        2. Calculate an overall performance score (0-100) based on the metrics.
        
        Keep tone encouraging but professional.
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

    return JSON.parse(response.text || '{"keyInsights": ["Could not generate summary"], "overallScore": 0}');
};