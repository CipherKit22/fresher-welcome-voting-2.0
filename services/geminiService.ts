
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

let genAI: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

// Safe access to process.env for browser environments
const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';
  } catch {
    return '';
  }
};

const getGenAI = (): GoogleGenAI => {
  if (!genAI) {
    const key = getApiKey();
    if (!key) {
      console.warn("API_KEY not found. AI features will be disabled.");
    }
    genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
};

export const initializeChat = async () => {
  const ai = getGenAI();
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are a helpful and energetic assistant for a University Fresher Welcome Voting ceremony. 
      Your goal is to help students understand the voting rules.
      
      Rules:
      1. Students must log in with their Year, Major, Roll Number, and a Class Passcode (a fruit name).
      2. Each student can vote only once.
      3. There are 4 titles: King, Queen, Prince, Princess.
      4. Candidates for King/Prince are male. Candidates for Queen/Princess are female.
      5. If a candidate is selected for King, they cannot be selected for Prince (and vice versa). Same for Queen/Princess.
      6. All 4 votes must be cast to submit.
      
      Be brief, friendly, and use emojis. If asked about candidates, you can invent fun, positive facts about them based on their Major.`,
    },
  });
};

export const sendMessageToAssistant = async (message: string): Promise<AsyncIterable<string>> => {
  if (!chatSession) {
    await initializeChat();
  }
  
  if (!chatSession) {
     throw new Error("Failed to initialize chat session");
  }

  try {
    const result = await chatSession.sendMessageStream({ message });
    
    // Create a generator to yield strings from the response chunks
    async function* textGenerator() {
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          yield c.text;
        }
      }
    }
    return textGenerator();

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const getCandidateVibe = async (name: string, major: string): Promise<string> => {
  // Check if API Key exists before making call
  const key = getApiKey();
  if (!key) return "Ready to lead with passion! 🚀";

  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Give me a short, 1-sentence "vibe check" or fun fact for a student candidate named ${name} from ${major} major running for King/Queen. Make it cool and related to their major. No quotes.`,
    });
    return response.text || "This candidate is mysterious and full of surprises! ✨";
  } catch (e) {
    console.error(e);
    return "Ready to lead with passion! 🚀";
  }
};
