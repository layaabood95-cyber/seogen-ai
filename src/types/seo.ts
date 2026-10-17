export interface GenerateSeoRequest {
  productName: string;
  category: string;
  keyFeatures: string;
  tone?: 'professional' | 'luxury' | 'playful' | 'technical';
}

export interface GeneratedSeoData {
  seo_title: string;
  meta_description: string;
  detailed_description: string;
  target_keywords: string[];
}

export interface GenerateSeoErrorResponse {
  error: string;
  code?: 'VALIDATION_ERROR' | 'QUOTA_EXCEEDED' | 'RATE_LIMIT' | 'TIMEOUT' | 'UPSTREAM_ERROR';
}

export interface SaveProductInput {
  productId?: string;
  productName: string;
  category: string;
  keyFeatures: string;
  tone: NonNullable<GenerateSeoRequest['tone']>;
  seoTitle: string;
  metaDescription: string;
  detailedDescription: string;
  targetKeywords: string[];
}

export interface SaveProductResult {
  success: boolean;
  product?: {
    id: string;
    slug: string;
    name: string;
    seoTitle: string;
    updatedAt: string;
  };
  error?: string;
}
