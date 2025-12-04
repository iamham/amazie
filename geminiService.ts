import { GoogleGenAI, FunctionDeclaration, Type, Part, Chat } from "@google/genai";
import { Product, SearchParams } from "./types";
import { searchProductsInDB } from "./data";

// Tool Definition
const searchProductsTool: FunctionDeclaration = {
  name: 'searchProducts',
  description: 'Search the product database for items based on keywords, visual descriptions, or categories. Use this when the user asks for recommendations or uploads an image seeking similar products.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'Keywords to search for (e.g., "red dress", "noise cancelling headphones", "wooden lamp").',
      },
      category: {
        type: Type.STRING,
        description: 'The category of the product (e.g., "Clothing", "Electronics", "Home", "Food").',
      },
    },
    required: [],
  },
};

// Tool Definition: Get Recipe
const getRecipeTool: FunctionDeclaration = {
  name: 'getRecipe',
  description: 'Get a food recipe and a list of available ingredients from the store. Use this when a user asks how to cook a dish (e.g., "How do I make Green Curry?").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      dishName: {
        type: Type.STRING,
        description: 'The name of the dish (e.g., "Green Curry", "Pad Thai").',
      },
    },
    required: ['dishName'],
  },
};

let chatSession: Chat | null = null; // Store the chat session instance

export const initializeChat = (apiKey: string) => {
  const ai = new GoogleGenAI({ apiKey });
  
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `
        You are "Amazie", an intelligent shopping assistant for an e-commerce store.
        
        Capabilities:
        1. SEARCH: You can search the product database using the 'searchProducts' tool, If seach for multiple products, call one product at a time.
        2. VISION: You can analyze images uploaded by the user to find similar products.
        3. RECIPES: You can suggest recipes using 'getRecipe'. If a user asks about food or recipes, provide the cooking steps AND recommend ingredients available in our store.
        4. BILINGUAL: You MUST reply in the language the user speaks (Thai or English).
        
        Behavior:
        - When a user uploads an image without text, analyze the image visually (color, style, object type) and call 'searchProducts' with a description.
        - If a user asks for a recipe, call 'getRecipe'. If the specific recipe isn't in the tool response, use your general knowledge to provide a recipe, but still try to search for relevant 'Food' category products using 'searchProducts'.
        - Always present prices in THB (Thai Baht).
        - Be polite, playful, helpful, and concise.
      `,
      tools: [{ functionDeclarations: [searchProductsTool] }],
    },
  });
  return chatSession;
};

export const sendMessageToGemini = async (
  text: string, 
  imageBase64?: string
): Promise<{ text: string; products?: Product[] }> => {
  
  if (!chatSession) {
    throw new Error("Chat session not initialized");
  }

  // Construct message parts
  const parts: Part[] = [];
  
  if (imageBase64) {
    // Strip header if present (data:image/jpeg;base64,...)
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64
      }
    });
  }
  
  if (text) {
    parts.push({ text });
  }

  // If only image is provided, add a prompt to guide the model
  if (!text && imageBase64) {
    parts.push({ text: "Find products in the database that look like this image." });
  }

  try {
    // Send message to Gemini
    // FIX: Use 'message' property instead of 'content'
    let response = await chatSession.sendMessage({
        message: parts
    });

    let productsFound: Product[] = [];
    let finalResponseText = "";

    // Handle Function Calls loop (Gemini might want to call the tool)
    // The SDK's sendMessage handles the turn logic, but we need to execute the function client-side
    // and send the result back.
    
    // Check if the model wants to call a function
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const functionResponses = [];
      
      for (const call of functionCalls) {
        if (call.name === 'searchProducts') {
          const args = call.args as SearchParams;
          console.log("Gemini calling searchProducts with:", args);
          
          // Execute local DB search
          const fullResults = searchProductsInDB(args.query, args.category);
          const results = fullResults.slice(0, 3);
          console.log(results);
          productsFound = results; // Store to return to UI

          // Prepare response for the model
          // We limit the context sent back to the model to avoid token limits, 
          // passing simplified product info.
          const contextResults = results.map(p => ({
            name: p.name,
            sku: p.sku,
            description: p.description
          }));

          functionResponses.push({
            name: call.name,
            id: call.id, // Important: pass back the call ID
            response: { results: contextResults }
          });
        }
      }

      // Send the function execution results back to Gemini to get the final natural language response
      // FIX: Use 'message' property and pass the array of functionResponse parts directly
      const resultResponse = await chatSession.sendMessage({
        message: functionResponses.map(fr => ({
            functionResponse: {
                name: fr.name,
                id: fr.id,
                response: fr.response
            }
        }))
      });
      
      finalResponseText = resultResponse.text || "Here are some products I found.";

    } else {
      // No function call, just text response
      finalResponseText = response.text || "";
    }

    return {
      text: finalResponseText,
      products: productsFound.length > 0 ? productsFound : undefined
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "Sorry, I encountered an error processing your request. Please check your API key or connection.",
    };
  }
};