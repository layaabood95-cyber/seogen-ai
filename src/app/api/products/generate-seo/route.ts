import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type {
  GenerateSeoRequest,
  GeneratedSeoData,
  GenerateSeoErrorResponse,
} from '@/types/seo';

const SYSTEM_PROMPT = `You are a Senior E-commerce Copywriter and Technical SEO Specialist.
Your goal is to generate high-converting, search-engine-optimized product copy based on raw product details.

Follow these strict output rules:
1. "seo_title":
   - Must be catchy, click-worthy, and front-load the primary keyword.
   - Optimal length: 50 to 60 characters (never exceed 70 characters).
2. "meta_description":
   - Must be an engaging summary with a subtle call-to-action and primary keyword.
   - STRICT LIMIT: Maximum 160 characters (aim for 140-158 characters).
3. "detailed_description":
   - Format strictly in clean **Markdown**.
   - Start with a compelling 1-2 paragraph hook focusing on customer benefits and problem-solving.
   - Include a "### Key Features & Benefits" section using bullet points ("- **Feature:** Benefit explanation").
   - Naturally weave relevant search keywords into headings and body text without keyword stuffing.
4. "target_keywords":
   - Provide 4 to 6 high-intent SEO keywords/phrases used in the copy.`;

const SEO_JSON_SCHEMA = {
  name: 'product_seo_generation',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      seo_title: {
        type: 'string',
        description: 'SEO-optimized product title (50-60 characters ideal).',
      },
      meta_description: {
        type: 'string',
        description: 'Engaging meta description strictly under 160 characters.',
      },
      detailed_description: {
        type: 'string',
        description:
          'Well-formatted Markdown product description with paragraphs and bullet points.',
      },
      target_keywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of 4-6 target SEO keywords.',
      },
    },
    required: [
      'seo_title',
      'meta_description',
      'detailed_description',
      'target_keywords',
    ],
    additionalProperties: false,
  },
} as const;

export async function POST(
  request: NextRequest
): Promise<NextResponse<GeneratedSeoData | GenerateSeoErrorResponse>> {
  try {
    const body = (await request.json()) as Partial<GenerateSeoRequest>;

    const productName = body.productName?.trim();
    const category = body.category?.trim();
    const keyFeatures = body.keyFeatures?.trim();
    const tone = body.tone || 'professional';

    if (!productName || !category || !keyFeatures) {
      return NextResponse.json(
        {
          error:
            'Please provide Product Name, Category, and Key Features/Materials before generating.',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            'OpenAI API key is missing. Please configure OPENAI_API_KEY in your environment variables.',
          code: 'UPSTREAM_ERROR',
        },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 15_000, // 15-second explicit timeout
      maxRetries: 1,
    });

    const userPrompt = [
      `Product Name: ${productName}`,
      `Category: ${category}`,
      `Key Features & Materials: ${keyFeatures}`,
      `Brand Tone: ${tone}`,
    ].join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: SEO_JSON_SCHEMA,
      },
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        {
          error: 'The AI returned an empty response. Please try again.',
          code: 'UPSTREAM_ERROR',
        },
        { status: 502 }
      );
    }

    const parsedData = JSON.parse(rawContent) as GeneratedSeoData;

    // Safeguard: enforce strict <= 160 char constraint on meta_description if model slightly overshoots
    if (parsedData.meta_description.length > 160) {
      parsedData.meta_description =
        parsedData.meta_description.slice(0, 157).trimEnd() + '...';
    }

    return NextResponse.json(parsedData, { status: 200 });
  } catch (error: unknown) {
    console.error('[POST /api/products/generate-seo] Error:', error);

    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return NextResponse.json(
        {
          error:
            'The AI request timed out. Please check your connection and try again.',
          code: 'TIMEOUT',
        },
        { status: 504 }
      );
    }

    if (error instanceof OpenAI.APIError) {
      // Insufficient quota / billing error
      if (error.code === 'insufficient_quota' || error.status === 402) {
        return NextResponse.json(
          {
            error:
              'Insufficient OpenAI API credits. Please check your OpenAI billing and quota limits.',
            code: 'QUOTA_EXCEEDED',
          },
          { status: 402 }
        );
      }

      // Rate limit reached
      if (error.status === 429) {
        return NextResponse.json(
          {
            error:
              'Too many AI generation requests right now. Please wait a few seconds and try again.',
            code: 'RATE_LIMIT',
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `AI service error (${error.status || 'unknown'}). Please try again shortly.`,
          code: 'UPSTREAM_ERROR',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error:
          'An unexpected network or server error occurred while generating SEO content.',
        code: 'UPSTREAM_ERROR',
      },
      { status: 500 }
    );
  }
}
