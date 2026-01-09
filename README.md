# 🍳 Recipe Vision Parser

A modern web application that transforms recipe photos into structured, searchable recipe data using AI vision models and optical character recognition.

## ✨ Features

- **📸 Image-to-Recipe Conversion** - Upload recipe photos and automatically extract structured recipe data
- **🤖 AI-Powered Parsing** - Uses Google Gemini 2.5 Pro for intelligent recipe extraction
- **📖 OCR Technology** - Leverages OCR.Space for accurate text extraction from images
- **💾 Recipe Management** - Save, browse, and organize parsed recipes
- **🎯 Structured Data** - Automatically extracts:
  - Recipe title and description
  - Ingredients with quantities and units
  - Step-by-step instructions
  - Cooking times (prep, cook, total)
  - Servings information
  - Tags and allergens
- **🔍 Recipe Details** - View complete recipe information on dedicated detail pages
- **🎨 Beautiful UI** - Modern, responsive design with warm aesthetic

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 16 with React 19, TypeScript
- **Backend**: Next.js API routes (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **AI/ML**: Google Gemini 2.5 Pro API
- **OCR**: OCR.Space API
- **Validation**: Zod schema validation
- **Styling**: Inline CSS with centralized style management

### Project Structure

```
src/app/
├── lib/
│   ├── ai/
│   │   ├── gemini.ts          # Gemini client initialization
│   │   ├── ocr.ts             # OCR.Space text extraction
│   │   └── extract.ts         # Recipe extraction from OCR text
│   ├── db/
│   │   └── prisma.ts          # Prisma database client
│   ├── schema.ts              # Zod validation schemas
│   └── logger.ts              # Logging utility
├── api/
│   ├── recipe/
│   │   └── route.ts           # POST endpoint - parse image & save recipe
│   └── recipes/
│       ├── route.ts           # GET endpoint - list all recipes
│       └── [id]/
│           └── route.ts       # GET endpoint - fetch individual recipe
├── recipes/
│   ├── page.tsx               # Recipes list page
│   └── [id]/
│       └── page.tsx           # Recipe detail page
├── types/
│   └── recipe.ts              # TypeScript types and interfaces
├── styles/
│   ├── layout.styles.ts       # Layout styles
│   └── recipe.styles.ts       # Centralized recipe styles
├── utils/
│   └── logger.ts              # Logger functionality
├── components/                # Shared React components (reserved)
├── page.tsx                   # Home page - recipe upload
└── layout.tsx                 # Root layout
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- API Keys:
  - Google Gemini API key
  - OCR.Space API key (optional - has free tier)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd gemini-2-5-recipe-vision-parser
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/recipe_parser"
   GEMINI_API_KEY="your-gemini-api-key"
   GEMINI_MODEL="gemini-2.5-pro"
   OCRSPACE_API_KEY="your-ocr-space-api-key"
   ```

4. **Set up the database**

   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:3000`

## 📖 Usage

### Parsing a Recipe

1. **Navigate to Home Page** - Go to `/` to access the recipe upload page
2. **Select Image** - Choose a recipe photo from your device
3. **Preview** - View the image preview before uploading
4. **Upload & Parse** - Click "Upload & Parse" to process the recipe
5. **View Result** - See the extracted recipe with all details

### Managing Recipes

- **View All Recipes** - Click "View Recipes" to browse all saved recipes
- **View Recipe Details** - Click any recipe card to view the full recipe page
- **Back Navigation** - Use "Back to Recipes" or "Parse Recipe" buttons to navigate

## 🔌 API Endpoints

### POST `/api/recipes`

Upload an image and parse it as a recipe.

**Request:**

- Body: `multipart/form-data` with `image` file

**Response:**

```json
{
  "id": "recipe_id",
  "recipe": {
    "title": "Chocolate Chip Cookies",
    "description": "Classic homemade cookies",
    "servings": 24,
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 12,
    "totalTimeMinutes": 27,
    "ingredients": [
      {
        "name": "Butter",
        "quantity": 1,
        "unit": "cup",
        "notes": "softened"
      }
    ],
    "steps": ["Mix ingredients...", "Bake..."],
    "tags": ["dessert", "baking"],
    "allergens": ["wheat", "dairy"]
  }
}
```

### GET `/api/recipes`

List all saved recipes.

**Response:**

```json
{
  "recipes": [
    {
      "id": "recipe_id",
      "title": "Chocolate Chip Cookies",
      "createdAt": "2026-01-08T12:00:00Z"
    }
  ]
}
```

### GET `/api/recipes/:id`

Fetch a specific recipe by ID.

**Response:**

```json
{
  "recipe": {
    "title": "Chocolate Chip Cookies",
    ...
  }
}
```

## 📝 Recipe Schema

The application uses Zod for schema validation. See `src/app/lib/schema.ts` for the complete schema definition.

**Key Fields:**

- `title` (required): Recipe name
- `description` (optional): Recipe description
- `ingredients` (required): Array of ingredient objects
- `steps` (required): Array of instruction strings
- `servings` (optional): Number of servings
- `prepTimeMinutes` (optional): Preparation time
- `cookTimeMinutes` (optional): Cooking time
- `totalTimeMinutes` (optional): Total time
- `tags` (optional): Array of category tags
- `allergens` (optional): Array of allergen warnings

## 🗄️ Database Schema

```prisma
model Recipe {
  id        String   @id @default(cuid())
  title     String
  json      Json           # Stores complete recipe data
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 🎨 Styling

All styles are centralized in `src/app/styles/recipe.styles.ts` for consistency and maintainability. The application uses:

- **Color Palette**: Warm pastels (tans, beiges, warm browns)
- **Typography**: Playfair Display (headings) and Lora (body)
- **Responsive Design**: Grid-based layouts
- **Inline Styles**: Type-safe CSS with React's CSSProperties

## 🔐 Environment Configuration

| Variable           | Description                          | Required |
| ------------------ | ------------------------------------ | -------- |
| `DATABASE_URL`     | PostgreSQL connection string         | Yes      |
| `GEMINI_API_KEY`   | Google Gemini API key                | Yes      |
| `GEMINI_MODEL`     | Model ID (default: `gemini-2.5-pro`) | No       |
| `OCRSPACE_API_KEY` | OCR.Space API key                    | No       |

## 🐛 Troubleshooting

### Missing Recipes

- Ensure PostgreSQL is running and `DATABASE_URL` is correct
- Run `npx prisma migrate dev` to set up the database

### Parse Failures

- Check that image is a clear, legible recipe
- Verify API keys are valid and have sufficient quota
- Check browser console for detailed error messages

### Styling Issues

- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run build`

## 📦 Dependencies

| Package       | Version | Purpose               |
| ------------- | ------- | --------------------- |
| next          | 16.1.1  | React framework       |
| react         | 19.2.3  | UI library            |
| @google/genai | ^1.35.0 | Gemini API client     |
| prisma        | ^7.2.0  | ORM for database      |
| zod           | ^4.3.5  | Schema validation     |
| dotenv        | ^17.2.3 | Environment variables |

## 🛠️ Development Scripts

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/)
- [OCR.Space API](https://ocr.space/ocrapi)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Zod Documentation](https://zod.dev/)

## 📄 License

This project is private and proprietary.

## 👥 Contributing

Internal project. For questions or issues, contact the development team.

---

**Last Updated:** January 8, 2026  
**Version:** 0.1.0
