import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface Item {
  item: string;
  rate: string;
}

export async function extractItemsAndRates(base64Image: string, mimeType: string): Promise<Item[]> {
  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    const prompt = `From the image of handwritten text, extract the names of items and their corresponding rates. The context is a mobile phone business, so items could be phones, accessories, or repair services. The rates are in Indian Rupees (₹). Structure the output as a JSON array of objects. Each object must have an 'item' key (a string for the product/service name) and a 'rate' key (a string for the price). Do not include the currency symbol in the 'rate' value. For example: [{"item": "Screen Repair", "rate": "2500"}]. Return only the raw JSON array.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        item: { type: Type.STRING, description: "The name of the item or service." },
                        rate: { type: Type.STRING, description: "The price of the item or service in INR, without symbols." }
                    },
                    required: ['item', 'rate']
                }
            }
        }
    });

    const resultText = response.text;
    
    if (!resultText) {
        throw new Error("The API did not return any data. The handwriting might be illegible.");
    }
    
    const result = JSON.parse(resultText);

    if (!Array.isArray(result)) {
        throw new Error("API returned an unexpected format. Please check the image and try again.");
    }

    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Failed to process the AI's response. The handwriting might be illegible or in an unexpected format.");
    }
    // Make the error from the AI service more visible to the user for debugging.
    if (error instanceof Error) {
        throw new Error(`AI service error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while converting the image. Please try again.");
  }
}