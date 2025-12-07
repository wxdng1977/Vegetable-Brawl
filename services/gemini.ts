import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Fighter } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-2.5-flash';

// Schema for generating vegetable stats
const vegetableSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The name of the vegetable in Chinese" },
    description: { type: Type.STRING, description: "A short, fierce description of the vegetable warrior in Chinese." },
    emoji: { type: Type.STRING, description: "A single emoji representing this vegetable (e.g. 🥕, 🥦, 🌶️)." },
    hp: { type: Type.INTEGER, description: "Health points (50-200) based on water content/bulk." },
    attack: { type: Type.INTEGER, description: "Attack power (10-50) based on spice, acid, or hardness." },
    defense: { type: Type.INTEGER, description: "Defense (5-30) based on skin thickness or density." },
    speed: { type: Type.INTEGER, description: "Speed (1-20) based on size or ease of digestion." },
    ultimateName: { type: Type.STRING, description: "Name of a special move in Chinese based on nutrients (e.g., '胡萝卜素冲击')." },
    ultimateDesc: { type: Type.STRING, description: "Description of the special move in Chinese." },
    highlight: { type: Type.STRING, description: "Key nutritional fact in Chinese (e.g., '富含铁元素')." },
    imageKeyword: { type: Type.STRING, description: "A simple English keyword to find an image (e.g., 'carrot', 'broccoli')." }
  },
  required: ["name", "description", "emoji", "hp", "attack", "defense", "speed", "ultimateName", "ultimateDesc", "highlight", "imageKeyword"],
};

export const generateFighter = async (vegetableName: string, isPlayer: boolean): Promise<Fighter> => {
  try {
    const prompt = `Create a battle profile for a vegetable warrior based on the input "${vegetableName}". 
    Base the stats (HP, Attack, Defense, Speed) roughly on its real-world nutritional properties (e.g., high fiber = high defense, spicy = high attack).
    
    IMPORTANT: The output fields 'name', 'description', 'ultimateName', 'ultimateDesc', and 'highlight' MUST be in Simplified Chinese (简体中文). 
    The 'imageKeyword' must remain in English for image search.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: vegetableSchema,
        temperature: 0.7,
      },
    });

    const data = JSON.parse(response.text || '{}');

    return {
      id: isPlayer ? 'player' : 'enemy',
      name: data.name,
      description: data.description,
      emoji: data.emoji || '🥬',
      stats: {
        hp: data.hp,
        maxHp: data.hp,
        attack: data.attack,
        defense: data.defense,
        speed: data.speed,
      },
      ultimateMove: {
        name: data.ultimateName,
        description: data.ultimateDesc,
        damageMultiplier: 2.0,
        type: 'attack',
      },
      imageKeyword: data.imageKeyword,
      isPlayer,
      nutritionalHighlight: data.highlight,
      statusEffects: [],
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback if API fails
    return {
      id: isPlayer ? 'player' : 'enemy',
      name: vegetableName,
      description: "一个充满神秘力量的蔬菜。",
      emoji: '🥗',
      stats: { hp: 100, maxHp: 100, attack: 20, defense: 10, speed: 10 },
      ultimateMove: { name: "神秘打击", description: "造成普通伤害。", damageMultiplier: 1.5, type: 'attack' },
      imageKeyword: "vegetable",
      isPlayer,
      nutritionalHighlight: "含有未知成分",
      statusEffects: [],
    };
  }
};

export const getRandomVegetableName = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Return a single string: the name of a random vegetable in Simplified Chinese (e.g., '辣味哈拉帕椒', '钢铁菠菜'). Do not include markdown or quotes.",
    });
    return response.text?.trim() || "野生卷心菜";
  } catch (e) {
    return "愤怒的土豆";
  }
}