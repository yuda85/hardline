import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { MealItem } from '../models';
import { AIBuilderResponse, AIDaySpec } from '../models/ai-workout.model';

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
  async parseTextToMeal(
    text: string,
  ): Promise<{ items: MealItem[]; confidence: number }> {
    const parsed = await this.callOpenAI(
      MEAL_PARSE_PROMPT,
      `Food description: ${text}`,
      0.2,
      1024,
    );
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

  async generateWorkoutPlan(
    systemPrompt: string,
    userMessage: string,
  ): Promise<AIBuilderResponse> {
    const data = await this.callOpenAI(systemPrompt, userMessage, 0.4, 2048);
    return this.validateBuilderResponse(data);
  }

  async generateDailyWorkout(
    systemPrompt: string,
    userMessage: string,
  ): Promise<AIDaySpec> {
    const data = await this.callOpenAI(systemPrompt, userMessage, 0.3, 1024);
    return this.validateDayResponse(data);
  }

  private async callOpenAI(
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    maxTokens: number,
  ): Promise<unknown> {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${environment.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error?.error?.message ?? `API error: ${response.status}`,
      );
    }

    const result = await response.json();
    const responseText: string | undefined =
      result?.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response from AI');
    }

    return this.extractJSON(responseText);
  }

  private validateBuilderResponse(data: unknown): AIBuilderResponse {
    if (!data || typeof data !== 'object') {
      throw new Error('AI response is not an object');
    }

    const r = data as Record<string, unknown>;
    if (!Array.isArray(r['days']) || r['days'].length === 0) {
      throw new Error('AI response has no days');
    }

    return {
      planName: String(r['planName'] || 'AI Generated Plan'),
      description: String(r['description'] || ''),
      days: (r['days'] as Record<string, unknown>[]).map(day =>
        this.validateDayResponse(day),
      ),
    };
  }

  private validateDayResponse(data: unknown): AIDaySpec {
    if (!data || typeof data !== 'object') {
      throw new Error('AI day response is not an object');
    }

    const d = data as Record<string, unknown>;
    if (
      !Array.isArray(d['exerciseGroups']) ||
      d['exerciseGroups'].length === 0
    ) {
      throw new Error('AI day has no exercise groups');
    }

    return {
      dayNumber: Number(d['dayNumber']) || 1,
      name: String(d['name'] || 'Workout'),
      exerciseGroups: (d['exerciseGroups'] as Record<string, unknown>[]).map(
        g => {
          const exercises = (
            (g['exercises'] as Record<string, unknown>[]) ?? []
          ).map(e => ({
            exerciseId: String(e['exerciseId'] || ''),
            sets: Array.isArray(e['sets'])
              ? (e['sets'] as unknown[]).map(s => Math.max(1, Number(s) || 8))
              : [8, 8, 8],
            ...(e['notes'] ? { notes: String(e['notes']) } : {}),
          }));

          const type = String(g['type'] || 'single');
          return {
            type: type === 'superset' ? ('superset' as const) : ('single' as const),
            exercises,
            restSeconds: Math.max(30, Number(g['restSeconds']) || 90),
          };
        },
      ),
    };
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
