# 🍳 Recipe Vision Parser

A modern web application that transforms recipe photos into structured, searchable recipe data using AI vision models and optical character recognition.

## ✨ Features

- **📸 Image-to-Recipe Conversion** - Upload single or multiple recipe photos and automatically extract structured recipe data
- **🤖 AI-Powered Parsing** - Uses Google Gemini 2.5 Pro for intelligent recipe extraction
- **📖 OCR Technology** - Leverages OCR.Space for accurate text extraction from images
- **☁️ S3 Integration** - Upload images to AWS S3 for cloud storage
  - Multi-file upload support
  - S3 URI parsing for direct image viewing
  - Automatic file organization (un-processed → processed directories)
- **⚡ Batch Processing** - Process multiple S3 images at once with real-time progress tracking
- **💾 Recipe Management** - Save, browse, and organize parsed recipes
  - Paginated recipe list (24 recipes per page)
  - Compact card grid view optimized for displaying more recipes
  - Select and delete recipes (single or batch deletion)
- **🎯 Structured Data** - Automatically extracts:
  - Recipe title and description
  - Ingredients with quantities and units
  - Step-by-step instructions
  - Cooking times (prep, cook, total)
  - Servings information
  - Tags and allergens
- **🔍 Recipe Details** - View complete recipe information on dedicated detail pages
- **📱 Mobile-Friendly** - Fully responsive design that works beautifully on all devices
  - Dynamic font sizing with CSS clamp
  - Responsive grid layouts
  - Horizontally scrollable navigation
  - Touch-optimized controls
- **🏥 Health Monitoring** - Database health check endpoint and UI
- **🎨 Beautiful UI** - Modern, responsive design with warm aesthetic and elegant interactions

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 16 with React 19, TypeScript
- **Backend**: Thin Next.js App Router API routes with server services
- **Database**: PostgreSQL with Prisma ORM
- **Cloud Storage**: AWS S3
- **AI/ML**: Google Gemini 2.5 Pro API
- **OCR**: OCR.Space API
- **Validation**: Zod schema validation
- **Styling**: Centralized TypeScript style modules

Route handlers under `src/app/api` only parse requests, validate edge inputs, and map responses. Business logic, provider integrations, and database access live under `src/server`, while shared browser/server utilities live under `src/lib` and `src/schemas`.

### Project Structure

```
src/app/
├── (pages)/
│   ├── page.tsx               # Home page
│   ├── upload/
│   │   └── page.tsx           # Upload page - single/multi-file upload to S3
│   ├── recipes/
│   │   ├── page.tsx           # Recipes list page with pagination & deletion
│   │   └── [id]/
│   │       └── page.tsx       # Recipe detail page
│   ├── batch-process/
│   │   └── page.tsx           # Batch processing page for S3 images
│   ├── view-image/
│   │   └── page.tsx           # S3 image viewer with URI parsing
│   └── health/
│       └── page.tsx           # Database health check page
├── api/
│   ├── health/
│   │   └── route.ts           # GET - health check endpoint
│   ├── recipes/
│   │   ├── route.ts           # GET - list recipes (paginated)
│   │   │                      # POST - parse image & save recipe
│   │   │                      # DELETE - batch delete recipes
│   │   └── [id]/
│   │       └── route.ts       # GET - fetch individual recipe
│   │                          # DELETE - delete single recipe
│   ├── upload/
│   │   └── route.ts           # POST - upload images to S3
│   ├── batch-process/
│   │   └── route.ts           # POST - batch process S3 images (streaming)
│   └── view-image/
│       └── route.ts           # GET - retrieve image from S3
├── components/
│   ├── Navbar.tsx             # Navigation bar component
│   └── DatabaseHealthIndicator.tsx  # Database health indicator
├── lib/
│   └── logger.ts              # Shared logging utility
├── models/
│   └── recipe.ts              # TypeScript recipe types
├── schemas/
│   └── recipeSchema.ts        # Shared recipe schemas
├── server/
│   ├── ai/
│   │   ├── gemini.ts          # Gemini client initialization
│   │   ├── ocr.ts             # OCR.Space text extraction
│   │   └── extract.ts         # Recipe extraction from OCR text
│   ├── config/
│   │   └── env.ts             # Server env parsing and caching
│   ├── db/
│   │   ├── prisma.ts          # Prisma database client
│   │   └── db-ready.ts        # Database readiness check
│   ├── service/
│   │   ├── batch-processing-validation.ts
│   │   ├── batch-processing.ts
│   │   ├── recipes-validation.ts
│   │   ├── recipes.ts
│   │   ├── s3-validation.ts
│   │   └── s3.ts
│   ├── shared/
│   │   ├── errors.ts
│   │   ├── http.ts
│   │   └── timeout.ts
├── styles/
│   ├── layout.styles.ts       # Layout styles
│   ├── recipe.styles.ts       # Centralized recipe styles
│   ├── navbar.styles.ts       # Navigation bar styles
│   ├── upload.styles.ts       # Upload page styles
│   ├── homePage.styles.ts     # Home page styles
│   ├── healthPage.styles.ts   # Health page styles
│   ├── healthIndicator.styles.ts  # Health indicator styles
│   ├── view-image.styles.ts   # Image viewer styles
│   └── uploadSuccessPopup.styles.ts  # Upload success popup styles
└── layout.tsx                 # Root layout with Navbar
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
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/recipe_parser"
   MAX_UPLOAD_IMAGE_SIZE_BYTES="1048576"
   GEMINI_API_KEY="your-gemini-api-key"
   GEMINI_MODEL="gemini-2.5-pro"
   GEMINI_TIMEOUT_MS="30000"
   OCRSPACE_API_KEY="your-ocr-space-api-key"
   OCR_TIMEOUT_MS="30000"
   AWS_REGION="us-east-1"
   AWS_ACCESS_KEY_ID="your-aws-access-key"
   AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
   AWS_S3_BUCKET="your-s3-bucket-name"
   S3_UNPROCESSED_PREFIX="images/un-processed/"
   S3_PROCESSED_PREFIX="images/processed/"
   S3_SIGNED_URL_TTL_SECONDS="3600"
   ```

4. **Set up the database**

   ```bash
   pnpm prisma migrate dev
   ```

Generate the Prisma client if needed:

```bash
pnpm prisma generate
```

5. **Start the development server**

   ```bash
   pnpm dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:3000`

## 📖 Usage

### Uploading Images to S3

1. **Navigate to Upload Page** - Go to `/upload`
2. **Select Images** - Choose one or multiple recipe photos from your device
3. **Preview** - View thumbnail previews of selected images
4. **Upload to S3** - Click the upload button to store images in S3
5. **Success** - See confirmation with the number of successfully uploaded files

### Parsing a Recipe

1. **Navigate to Home Page** - Go to `/` to access the recipe parsing page
2. **Select Image** - Choose a recipe photo from your device
3. **Preview** - View the image preview before uploading
4. **Upload & Parse** - Click "Upload & Parse" to process the recipe
5. **View Result** - See the extracted recipe with all details

### Batch Processing S3 Images

1. **Navigate to Batch Process** - Go to `/batch-process`
2. **Start Processing** - Click to scan S3 for un-processed images
3. **Watch Progress** - Real-time streaming updates show processing status
4. **Auto-Organization** - Successfully processed images are moved to the processed directory
5. **Review Results** - See success/error counts and details

### Managing Recipes

- **View All Recipes** - Navigate to `/recipes` to browse all saved recipes
- **Pagination** - Use page navigation to browse through recipes (24 per page)
- **Select Recipes** - Check boxes to select individual recipes or use "Select All"
- **Delete Recipes** - Delete single or multiple selected recipes
- **View Recipe Details** - Click any recipe card to view the full recipe page
- **Navigation** - Use "Back to Recipes" button to return from detail pages

### Viewing S3 Images

1. **Navigate to View Image** - Go to `/view-image`
2. **Enter Object Key or S3 URI** - Paste the S3 object key or full S3 URI
3. **Load Image** - Click to retrieve and display the image from S3
4. **View Metadata** - See image URL and object key information

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

List saved recipes with pagination support.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 12, max: 100)

**Response:**

```json
{
  "recipes": [
    {
      "id": "recipe_id",
      "title": "Chocolate Chip Cookies",
      "createdAt": "2026-01-08T12:00:00Z",
      "json": {
        /* full recipe data */
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 150,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### DELETE `/api/recipes`

Batch delete multiple recipes.

**Request:**

```json
{
  "ids": ["recipe_id_1", "recipe_id_2"]
}
```

**Response:**

```json
{
  "success": true,
  "deleted": 2,
  "message": "Deleted 2 recipe(s)"
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

### DELETE `/api/recipes/:id`

Delete a single recipe by ID.

**Response:**

```json
{
  "success": true,
  "message": "Recipe deleted"
}
```

### POST `/api/upload`

Upload images to AWS S3.

**Request:**

- Body: `multipart/form-data` with `image` file(s)

**Response:**

```json
{
  "url": "https://bucket.s3.region.amazonaws.com/un-processed/filename.jpg",
  "key": "un-processed/filename.jpg"
}
```

### GET `/api/view-image`

Retrieve an image from S3.

**Query Parameters:**

- `key`: S3 object key

**Response:**

- Image file (binary data)

### POST `/api/batch-process`

Process multiple S3 images with streaming progress updates.

**Response:**

- Server-Sent Events stream with JSON objects:

```json
{ "type": "start", "total": 5 }
{ "type": "processing", "current": 1, "total": 5, "key": "image1.jpg" }
{ "type": "success", "recipeId": "abc123", "title": "Recipe Name" }
{ "type": "error", "error": "Failed to parse" }
{ "type": "complete", "successCount": 4, "errorCount": 1 }
```

### GET `/api/health`

Check database health status.

**Response:**

```json
{
  "status": "ok",
  "database": "connected"
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

All styles are centralized in `src/app/styles/` for consistency and maintainability. The application uses:

- **Color Palette**: Warm pastels (tans, beiges, warm browns)
- **Typography**: Playfair Display (headings) and Lora (body)
- **Responsive Design**:
  - CSS `clamp()` for fluid, responsive sizing
  - Dynamic grid layouts with `auto-fit` and `minmax()`
  - Mobile-first approach with breakpoint-free design
  - Horizontal scrolling navigation for mobile
- **Inline Styles**: Type-safe CSS with React's CSSProperties
- **Modular Organization**: Separate style files per page/component

## 🔐 Environment Configuration

| Variable                      | Description                                                                  | Required |
| ----------------------------- | ---------------------------------------------------------------------------- | -------- |
| `DATABASE_URL`                | PostgreSQL connection string                                                 | Yes      |
| `MAX_UPLOAD_IMAGE_SIZE_BYTES` | Max upload size in bytes (default: `1048576`)                                | No       |
| `GEMINI_API_KEY`              | Google Gemini API key                                                        | Yes      |
| `GEMINI_MODEL`                | Model ID (default: `gemini-2.5-pro`)                                         | No       |
| `GEMINI_TIMEOUT_MS`           | Gemini timeout in milliseconds (default: `30000`)                            | No       |
| `OCRSPACE_API_KEY`            | OCR.Space API key                                                            | Yes      |
| `OCR_TIMEOUT_MS`              | OCR timeout in milliseconds (default: `30000`)                               | No       |
| `AWS_REGION`                  | AWS region (e.g., `us-east-1`)                                               | Yes      |
| `AWS_ACCESS_KEY_ID`           | AWS access key                                                               | Yes      |
| `AWS_SECRET_ACCESS_KEY`       | AWS secret access key                                                        | Yes      |
| `AWS_S3_BUCKET`               | S3 bucket name for image storage                                             | Yes      |
| `S3_UNPROCESSED_PREFIX`       | Prefix used for newly uploaded images (default: `images/un-processed/`)      | No       |
| `S3_PROCESSED_PREFIX`         | Prefix used after successful batch processing (default: `images/processed/`) | No       |
| `S3_SIGNED_URL_TTL_SECONDS`   | Signed image URL lifetime in seconds (default: `3600`)                       | No       |

## 🐛 Troubleshooting

### Missing Recipes

- Ensure PostgreSQL is running and `DATABASE_URL` is correct
- Run `pnpm prisma migrate dev` to set up the database

### Parse Failures

- Check that image is a clear, legible recipe
- Verify API keys are valid and have sufficient quota
- Check browser console for detailed error messages

### Styling Issues

- Clear Next.js cache: `rm -rf .next`
- Rebuild: `pnpm build`

## 📦 Dependencies

| Package            | Version | Purpose               |
| ------------------ | ------- | --------------------- |
| next               | 16.1.1  | React framework       |
| react              | 19.2.3  | UI library            |
| @google/genai      | ^1.35.0 | Gemini API client     |
| @aws-sdk/client-s3 | ^3.x    | AWS S3 client         |
| prisma             | ^7.2.0  | ORM for database      |
| zod                | ^4.3.5  | Schema validation     |
| dotenv             | ^17.2.3 | Environment variables |

## 🛠️ Development Scripts

```bash
pnpm dev         # Start development server (http://localhost:3000)
pnpm build       # Build for production
pnpm start       # Start production server
pnpm lint        # Run ESLint
pnpm typecheck   # Run the TypeScript compiler
pnpm test        # Run the Vitest suite
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

**Last Updated:** January 10, 2026  
**Version:** 1.0.0
