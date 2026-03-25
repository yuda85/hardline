import { Injectable, inject } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { MealItem } from '../models';

interface AIMealResponse {
  items: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
    unit: string;
  }[];
}

const MEAL_PARSE_PROMPT = `You are a nutrition analysis assistant. Given a text description of food, extract structured nutritional information.

RULES:
- Return ONLY valid JSON, no markdown, no explanation
- Estimate reasonable nutritional values if not explicitly stated
- Split compound meals into individual items
- Use common serving sizes if quantity is unclear
- All numeric values must be numbers (not strings)
- Calories should be total for the stated quantity

Return this exact JSON structure:
{
  "items": [
    {
      "name": "food name",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "quantity": 1,
      "unit": "serving"
    }
  ]
}`;

@Injectable({ providedIn: 'root' })
export class AIService {
  private readonly firebaseApp = inject(FirebaseApp);

  async parseTextToMeal(text: string): Promise<{ items: MealItem[]; confidence: number }> {
    const ai = getAI(this.firebaseApp, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, { model: 'gemini-2.0-flash-lite' });

    const result = await model.generateContent([
      { text: MEAL_PARSE_PROMPT },
      { text: `Food description: ${text}` },
    ]);

    const responseText = result.response.text();
    const parsed = this.extractJSON(responseText);
    const validated = this.validateMealResponse(parsed);

    return {
      items: validated.items,
      confidence: 0.85,
    };
  }

  private extractJSON(text: string): unknown {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // Try extracting from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
      // Try finding JSON object
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      throw new Error('Could not extract JSON from AI response');
    }
  }

  private validateMealResponse(data: unknown): AIMealResponse {
    if (!data || typeof data !== 'object') {
      throw new Error('AI response is not an object');
    }

    const response = data as Record<string, unknown>;
    if (!Array.isArray(response['items']) || response['items'].length === 0) {
      throw new Error('AI response has no items');
    }

    const items = (response['items'] as Record<string, unknown>[]).map(item => ({
      name: String(item['name'] || 'Unknown food'),
      calories: Math.max(0, Number(item['calories']) || 0),
      protein: Math.max(0, Number(item['protein']) || 0),
      carbs: Math.max(0, Number(item['carbs']) || 0),
      fat: Math.max(0, Number(item['fat']) || 0),
      quantity: Math.max(0.1, Number(item['quantity']) || 1),
      unit: String(item['unit'] || 'serving'),
    }));

    return { items };
  }
}
