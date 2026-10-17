'use client';

import React, { useState, useTransition } from 'react';
import { saveProductSeoAction } from '@/app/actions/productActions';
import type {
  GenerateSeoRequest,
  GeneratedSeoData,
  GenerateSeoErrorResponse,
  SaveProductInput,
  SaveProductResult,
} from '@/types/seo';

interface ProductSeoGeneratorFormProps {
  initialData?: Partial<SaveProductInput>;
}

export default function ProductSeoGeneratorForm({
  initialData,
}: ProductSeoGeneratorFormProps) {
  const [form, setForm] = useState<SaveProductInput>({
    productId: initialData?.productId,
    productName: initialData?.productName ?? '',
    category: initialData?.category ?? '',
    keyFeatures: initialData?.keyFeatures ?? '',
    tone: initialData?.tone ?? 'professional',
    seoTitle: initialData?.seoTitle ?? '',
    metaDescription: initialData?.metaDescription ?? '',
    detailedDescription: initialData?.detailedDescription ?? '',
    targetKeywords: initialData?.targetKeywords ?? [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedProduct, setSavedProduct] = useState<
    SaveProductResult['product'] | null
  >(null);

  const [isPendingSave, startSaveTransition] = useTransition();

  const canGenerate =
    form.productName.trim().length > 0 &&
    form.category.trim().length > 0 &&
    form.keyFeatures.trim().length > 0 &&
    !isGenerating &&
    !isPendingSave;

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSavedProduct(null);
  };

  const handleGenerateWithAI = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setSavedProduct(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch('/api/products/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          productName: form.productName,
          category: form.category,
          keyFeatures: form.keyFeatures,
          tone: form.tone,
        } satisfies GenerateSeoRequest),
      });

      const data = await response.json();

      if (!response.ok) {
        const errData = data as GenerateSeoErrorResponse;
        throw new Error(
          errData.error ||
            'Failed to generate SEO content. Please try again shortly.'
        );
      }

      const seoResult = data as GeneratedSeoData;

      // Automatically map structured JSON fields into corresponding form state
      setForm((prev) => ({
        ...prev,
        seoTitle: seoResult.seo_title,
        metaDescription: seoResult.meta_description,
        detailedDescription: seoResult.detailed_description,
        targetKeywords: seoResult.target_keywords || [],
      }));
      setHasGenerated(true);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMessage(
          'Request timed out while waiting for AI response. Please try again.'
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          'Network failure. Please verify your internet connection and try again.'
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  const handleAcceptAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedProduct(null);

    startSaveTransition(async () => {
      const result = await saveProductSeoAction(form);

      if (!result.success || !result.product) {
        setErrorMessage(
          result.error || 'Could not save product to the database.'
        );
        return;
      }

      // Store the returned product ID so subsequent saves update the same record
      setForm((prev) => ({ ...prev, productId: result.product?.id }));
      setSavedProduct(result.product);
    });
  };

  // Lightweight Markdown-to-JSX preview renderer for paragraphs, headings, bold text, and bullet points
  const renderMarkdownPreview = (markdown: string) => {
    if (!markdown.trim()) {
      return (
        <p className="text-sm italic text-slate-400">
          No description content yet. Click &ldquo;Generate with AI&rdquo; or type
          Markdown manually.
        </p>
      );
    }

    return markdown.split('\n\n').map((block, idx) => {
      const trimmed = block.trim();
      if (trimmed.startsWith('### ')) {
        return (
          <h3
            key={idx}
            className="mt-4 mb-2 text-base font-semibold text-slate-900"
          >
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2
            key={idx}
            className="mt-4 mb-2 text-lg font-bold text-slate-900"
          >
            {trimmed.replace('## ', '')}
          </h2>
        );
      }
      if (trimmed.split('\n').every((line) => line.trim().startsWith('- '))) {
        return (
          <ul
            key={idx}
            className="my-2 list-disc space-y-1.5 pl-5 text-slate-700"
          >
            {trimmed.split('\n').map((item, i) => {
              const content = item.trim().replace(/^- /, '');
              const parts = content.split(/\*\*(.*?)\*\*/g);
              return (
                <li key={i} className="text-sm leading-relaxed">
                  {parts.map((part, pIdx) =>
                    pIdx % 2 === 1 ? (
                      <strong
                        key={pIdx}
                        className="font-semibold text-slate-900"
                      >
                        {part}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </li>
              );
            })}
          </ul>
        );
      }

      const parts = trimmed.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={idx} className="my-2 text-sm leading-relaxed text-slate-700">
          {parts.map((part, pIdx) =>
            pIdx % 2 === 1 ? (
              <strong key={pIdx} className="font-semibold text-slate-900">
                {part}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    });
  };

  const metaCharCount = form.metaDescription.length;
  const isMetaOverLimit = metaCharCount > 160;

  return (
    <form
      onSubmit={handleAcceptAndSave}
      className="mx-auto max-w-5xl space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold tracking-wide text-white shadow-xs">
              SeoGen AI
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Product &amp; SEO Generator
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Enter core product attributes below, generate search-optimized copy,
            and persist to PostgreSQL via Prisma.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateWithAI}
          disabled={!canGenerate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isGenerating ? (
            <>
              <svg
                className="h-4 w-4 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span>Generating SEO Copy...</span>
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 2a.75.75 0 01.692.462l1.882 4.527 4.527 1.882a.75.75 0 010 1.384l-4.527 1.882-1.882 4.527a.75.75 0 01-1.384 0L7.426 12.137 2.899 10.255a.75.75 0 010-1.384l4.527-1.882L9.308 2.462A.75.75 0 0110 2z" />
              </svg>
              <span>{hasGenerated ? 'Regenerate with AI' : 'Generate with AI'}</span>
            </>
          )}
        </button>
      </div>

      {/* Section 1: Essential Product Inputs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="productName"
            className="block text-sm font-medium text-slate-700"
          >
            Product Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="productName"
            name="productName"
            type="text"
            required
            placeholder="e.g., Autonomous Customer Support Agent"
            value={form.productName}
            onChange={handleInputChange}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-slate-700"
            >
              Category <span className="text-rose-500">*</span>
            </label>
            <input
              id="category"
              name="category"
              type="text"
              required
              placeholder="e.g., Workflow Automation / AI Software"
              value={form.category}
              onChange={handleInputChange}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="tone"
              className="block text-sm font-medium text-slate-700"
            >
              Copywriting Tone
            </label>
            <select
              id="tone"
              name="tone"
              value={form.tone}
              onChange={handleInputChange}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="professional">Professional &amp; Persuasive</option>
              <option value="luxury">Luxury &amp; Refined</option>
              <option value="playful">Playful &amp; Energetic</option>
              <option value="technical">Technical &amp; Spec-Focused</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="keyFeatures"
            className="block text-sm font-medium text-slate-700"
          >
            Key Features &amp; Materials <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="keyFeatures"
            name="keyFeatures"
            rows={3}
            required
            placeholder="e.g., Handles incoming tickets 24/7, integrates with CRM databases, auto-resolves refund queries, and escalates edge cases."
            value={form.keyFeatures}
            onChange={handleInputChange}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Separate key specs, capabilities, or integrations with commas.
          </p>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold">Action Failed</p>
              <p className="mt-0.5 text-rose-700">{errorMessage}</p>
            </div>
          </div>
          {canGenerate && (
            <button
              type="button"
              onClick={handleGenerateWithAI}
              className="shrink-0 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-200"
            >
              Retry AI
            </button>
          )}
        </div>
      )}

      {/* Section 2: Skeleton Loader OR Editable SEO & Product Description Preview */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              SEO &amp; Marketing Copy Preview
            </h2>
            <p className="text-xs text-slate-500">
              AI-generated fields map directly below. You can review and manually
              fine-tune any field before saving.
            </p>
          </div>
          {hasGenerated && !isGenerating && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              AI Generated
            </span>
          )}
        </div>

        {isGenerating ? (
          /* Skeleton Loader State */
          <div
            aria-busy="true"
            aria-label="Generating SEO content"
            className="space-y-6 animate-pulse"
          >
            <div>
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="mt-2 h-10 w-full rounded-lg bg-slate-200" />
            </div>
            <div>
              <div className="flex justify-between">
                <div className="h-4 w-36 rounded bg-slate-200" />
                <div className="h-4 w-16 rounded bg-slate-200" />
              </div>
              <div className="mt-2 h-16 w-full rounded-lg bg-slate-200" />
            </div>
            <div>
              <div className="h-4 w-48 rounded bg-slate-200" />
              <div className="mt-2 space-y-2.5 rounded-lg border border-slate-200 bg-white p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-200" />
                <div className="h-4 w-5/6 rounded bg-slate-200" />
                <div className="mt-4 h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-3.5 w-2/3 rounded bg-slate-200" />
                <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                <div className="h-3.5 w-1/2 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ) : (
          /* Structured Output & Manual Edit Fields */
          <div className="space-y-5">
            {/* SEO Title */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="seoTitle"
                  className="block text-sm font-medium text-slate-700"
                >
                  SEO Title
                </label>
                <span className="text-xs text-slate-500">
                  {form.seoTitle.length} / 60 chars recommended
                </span>
              </div>
              <input
                id="seoTitle"
                name="seoTitle"
                type="text"
                placeholder="Catchy, keyword-rich title will appear here..."
                value={form.seoTitle}
                onChange={handleInputChange}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="metaDescription"
                  className="block text-sm font-medium text-slate-700"
                >
                  Meta Description
                </label>
                <span
                  className={`text-xs font-medium ${
                    isMetaOverLimit ? 'text-rose-600' : 'text-slate-500'
                  }`}
                >
                  {metaCharCount} / 160 characters
                </span>
              </div>
              <textarea
                id="metaDescription"
                name="metaDescription"
                rows={2}
                placeholder="Concise search engine snippet (under 160 characters)..."
                value={form.metaDescription}
                onChange={handleInputChange}
                className={`mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:outline-none ${
                  isMetaOverLimit
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
            </div>

            {/* Target Keywords Pills */}
            {form.targetKeywords.length > 0 && (
              <div>
                <span className="block text-xs font-medium text-slate-600">
                  Integrated Target Keywords
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {form.targetKeywords.map((kw, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-600/15"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Description (Markdown Editor + Live Preview Tabs) */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="detailedDescription"
                  className="block text-sm font-medium text-slate-700"
                >
                  Detailed Description (Markdown)
                </label>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      activeTab === 'edit'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Edit Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      activeTab === 'preview'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rendered Preview
                  </button>
                </div>
              </div>

              {activeTab === 'edit' ? (
                <textarea
                  id="detailedDescription"
                  name="detailedDescription"
                  rows={9}
                  placeholder="Markdown product description with paragraphs and bullet points..."
                  value={form.detailedDescription}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              ) : (
                <div className="mt-1.5 min-h-[220px] rounded-lg border border-slate-200 bg-white p-4">
                  {renderMarkdownPreview(form.detailedDescription)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row">
        <div>
          {savedProduct && (
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Saved to database!{' '}
                <span className="font-mono text-xs text-slate-500">
                  (slug: /{savedProduct.slug})
                </span>
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={
            isGenerating ||
            isPendingSave ||
            isMetaOverLimit ||
            !form.seoTitle.trim() ||
            !form.metaDescription.trim() ||
            !form.detailedDescription.trim()
          }
          className="w-full rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
        >
          {isPendingSave
            ? 'Saving to Database...'
            : form.productId
              ? 'Accept & Update Product'
              : 'Accept & Save Product'}
        </button>
      </div>
    </form>
  );
}
