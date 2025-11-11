
import { GoogleGenAI, Type } from "@google/genai";

export interface Item {
  item: string;
  rate: string;
}

export async function extractContentFromImage(
  base64Image: string, 
  mimeType: string,
  apiKey?: string
): Promise<{ items: Item[]; headerText: string; footerText: string; }> {
  
  const key = apiKey || process.env.API_KEY;
  
  if (!key) {
    throw new Error("API Key is missing. Please set it in the settings.");
  }

  const ai = new GoogleGenAI({ apiKey: key });

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    const prompt = `From the image of handwritten text, extract three distinct types of information based on their position relative to the main list.
1.  **Header Text**: Any text written *above* the main item-rate list.
2.  **Item List**: A list of items and their corresponding rates (in Indian Rupees, ₹).
3.  **Footer Text**: Any text written *below* the main item-rate list.

CRITICAL: For both "headerText" and "footerText", you MUST preserve the original line breaks from the handwriting. Use the newline character '\\n' to separate distinct lines.

Structure the output as a single JSON object with three keys:
- "headerText": A single string containing all text found above the list. If none, this must be an empty string.
- "items": An array of objects, where each object has an "item" key (string) and a "rate" key (string, without currency symbols). If no item-rate list is found, this must be an empty array.
- "footerText": A single string containing all text found below the list. If none, this must be an empty string.

For example, if the note has "Crown Rates" at the top, a list of items, and "Min Qty 10" at the bottom, the output should be:
{"headerText": "Crown Rates", "items": [{"item": "...", "rate": "..."}], "footerText": "Min Qty 10\\nFolder only Rate"}.
Return only the raw JSON object.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    headerText: {
                        type: Type.STRING,
                        description: "Any text found above the item-rate list. Line breaks must be preserved with '\\n'."
                    },
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
                    footerText: {
                        type: Type.STRING,
                        description: "Any text found below the item-rate list. Line breaks must be preserved with '\\n'."
                    }
                },
                required: ['headerText', 'items', 'footerText']
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
        headerText: result.headerText || '',
        footerText: result.footerText || '',
    };

  } catch (error) {
    console.error("Error during handwriting conversion:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Failed to process the AI's response. The handwriting might be illegible or in an unexpected format.");
    }
    // Re-throw other errors so the UI can handle them
    throw error;
  }
}