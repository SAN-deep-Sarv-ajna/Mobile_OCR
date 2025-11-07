
import { GoogleGenAI, Type } from "@google/genai";
import { getApiKey } from '../utils/fileUtils';

export interface Item {
  item: string;
  rate: string;
}

export async function extractContentFromImage(base64Image: string, mimeType: string): Promise<{ items: Item[]; otherText: string; }> {
  // @ts-ignore
  const isAistudioEnv = window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function';
  const apiKey = isAistudioEnv ? process.env.API_KEY : getApiKey();

  if (!apiKey) {
    throw new Error("API key is not available. Please select or enter an API key.");
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    const prompt = `From the image of handwritten text, extract two types of information. 
    1. A list of items and their corresponding rates (in Indian Rupees, ₹). 
    2. Any other text on the page that is not part of the item-rate list.
    
    Structure the output as a single JSON object with two keys:
    - "items": An array of objects, where each object has an "item" key (string) and a "rate" key (string, without currency symbols). If no item-rate list is found, this should be an empty array.
    - "otherText": A single string containing all other text. If no other text is found, this should be an empty string.
    
    For example: {"items": [{"item": "Screen Repair", "rate": "2500"}], "otherText": "Notes for today's tasks."}.
    Return only the raw JSON object.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    items: {
                        type: Type.ARRAY,
                        description: "An array of items and their rates.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                item: { type: Type.STRING, description: "The name of the item or service." },
                                rate: { type: Type.STRING, description: "The price of the item or service in INR, without symbols." }
                            },
                            required: ['item', 'rate']
                        }
                    },
                    otherText: {
                        type: Type.STRING,
                        description: "Any other text found in the image that is not part of the item-rate list."
                    }
                },
                required: ['items', 'otherText']
            }
        }
    });

    const resultText = response.text;
    
    if (!resultText) {
        throw new Error("The API did not return any data. The handwriting might be illegible.");
    }
    
    const result = JSON.parse(resultText);

    if (typeof result !== 'object' || result === null) {
        throw new Error("API returned an unexpected format. Please check the image and try again.");
    }

    return {
        items: result.items || [],
        otherText: result.otherText || ''
    };

  } catch (error) {
    console.error("Error during handwriting conversion:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Failed to process the AI's response. The handwriting might be illegible or in an unexpected format.");
    }
    // Re-throw other errors so the UI can handle them, especially API key errors.
    throw error;
  }
}
