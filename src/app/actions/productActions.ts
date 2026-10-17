'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { SaveProductInput, SaveProductResult } from '@/types/seo';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(
  baseText: string,
  excludeProductId?: string
): Promise<string> {
  const baseSlug = slugify(baseText) || 'product';
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeProductId) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

export async function saveProductSeoAction(
  input: SaveProductInput
): Promise<SaveProductResult> {
  try {
    const productName = input.productName?.trim();
    const category = input.category?.trim();
    const keyFeatures = input.keyFeatures?.trim();
    const seoTitle = input.seoTitle?.trim();
    const metaDescription = input.metaDescription?.trim();
    const detailedDescription = input.detailedDescription?.trim();
    const tone = input.tone || 'professional';
    const targetKeywords = (input.targetKeywords || [])
      .map((kw) => kw.trim())
      .filter(Boolean);

    if (
      !productName ||
      !category ||
      !keyFeatures ||
      !seoTitle ||
      !metaDescription ||
      !detailedDescription
    ) {
      return {
        success: false,
        error:
          'All product and SEO fields (Title, Meta Description, Detailed Description) are required before saving.',
      };
    }

    if (metaDescription.length > 160) {
      return {
        success: false,
        error: `Meta Description must be 160 characters or fewer (currently ${metaDescription.length} characters).`,
      };
    }

    const slug = await generateUniqueSlug(seoTitle || productName, input.productId);

    const savedProduct = input.productId
      ? await prisma.product.update({
          where: { id: input.productId },
          data: {
            name: productName,
            slug,
            category,
            keyFeatures,
            tone,
            seoTitle,
            metaDescription,
            detailedDescription,
            targetKeywords,
          },
        })
      : await prisma.product.create({
          data: {
            name: productName,
            slug,
            category,
            keyFeatures,
            tone,
            seoTitle,
            metaDescription,
            detailedDescription,
            targetKeywords,
          },
        });

    revalidatePath('/');
    revalidatePath('/products');
    revalidatePath(`/products/${savedProduct.slug}`);

    return {
      success: true,
      product: {
        id: savedProduct.id,
        slug: savedProduct.slug,
        name: savedProduct.name,
        seoTitle: savedProduct.seoTitle,
        updatedAt: savedProduct.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error('[saveProductSeoAction] Database Error:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: 'A product with a conflicting unique slug already exists.',
        };
      }
      if (error.code === 'P2025') {
        return {
          success: false,
          error: 'The product you are trying to update could not be found.',
        };
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        success: false,
        error:
          'Could not connect to the database. Please verify your DATABASE_URL environment variable.',
      };
    }

    return {
      success: false,
      error:
        'Failed to save product to the database. Please try again shortly.',
    };
  }
}
