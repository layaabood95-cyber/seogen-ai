# SeoGen AI — AI-Powered Product Description & SEO Generator

SeoGen AI is a standalone, full-stack micro-SaaS application engineered for e-commerce merchants and copywriters. It transforms raw product specifications into high-converting, search-engine-optimized marketing copy using Next.js 15 App Router, Tailwind CSS, OpenAI's `gpt-4o-mini` with Structured Outputs, and Prisma ORM backed by Neon Serverless PostgreSQL.

---

## 🌟 Key Features

- **Automated Copy Generation**: Leverages OpenAI `gpt-4o-mini` with strict JSON schema outputs.
- **Strict SEO Standards**:
  - Catchy **SEO Title** optimized for search engines (50–60 characters).
  - Engaging **Meta Description** strictly under the 160-character limit.
  - Comprehensive **Detailed Description** in formatted **Markdown** with bullet points.
  - Curated list of high-intent **Target Keywords**.
- **Live Character Counters**: Real-time feedback and visual warnings if meta descriptions exceed 160 characters.
- **Markdown Editor & Preview Tabs**: Seamlessly toggle between raw Markdown and a rendered JSX preview.
- **Unique URL Slugs**: Auto-generates collision-free slugs upon accepting copy.
- **Database Persistence**: Backed by Prisma ORM (`prisma.product.create` and `prisma.product.update`).
- **Resilient Fallback Engine**: Deterministic fallback ensures the tool remains operational even during API quota limits.

---

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Styling**: Tailwind CSS
- **Database & ORM**: Prisma ORM with Neon Serverless PostgreSQL
- **AI Integration**: OpenAI SDK (`gpt-4o-mini`)
- **Language**: TypeScript

---

## 🛠️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/layaabood95-cyber/seogen-ai.git
cd seogen-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require"
OPENAI_API_KEY="sk-..."
```

### 4. Push Database Schema
```bash
npx prisma db push
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📄 License
MIT License.
