import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
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

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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
  async parseTextToMeal(text: string): Promise<{ items: MealItem[]; confidence: number }> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${environment.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MEAL_PARSE_PROMPT },
          { role: 'user', content: `Food description: ${text}` },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error?.error?.message ?? `API error: ${response.status}`,
      );
    }

    const data = await response.json();
    const responseText: string | undefined = data?.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response from AI');
    }

    const parsed = this.extractJSON(responseText);
    const validated = this.validateMealResponse(parsed);

    return {
      items: validated.items,
      confidence: 0.9,
    };
  }

  private extractJSON(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }
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
