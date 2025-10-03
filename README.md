# Sizzle Reel Generator

An AI-assisted sizzle reel generator for software/app product features. Transform your product demos into cinematic sizzle reels with AI.

## Tech Stack

- **Frontend**: Next.js 15+ with TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui
- **AI Services**:
  - Google Gemini (video analysis, storyboard, image generation, video generation)
  - ElevenLabs (voiceover narration)
- **Video Processing**: FFmpeg (planned)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google AI API key (for Gemini) - Get one at [Google AI Studio](https://aistudio.google.com/app/apikey)
- ElevenLabs API key (for narration) - Get one at [ElevenLabs](https://elevenlabs.io/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/jpalmieri/product_sizzle_reel_generator.git
   cd product_sizzle_reel_generator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your API keys:
   ```
   GOOGLE_AI_API_KEY=your_google_ai_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

### Code Quality

This project uses:

- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Run all checks before committing:

```bash
npm run lint && npm run type-check && npm run format:check
```

## Project Structure

```
src/
├── app/                 # Next.js App Router
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── layout/         # Layout components
├── lib/                # Utility functions
└── types/              # TypeScript type definitions
```

## Implementation Roadmap

See `CLAUDE.md` for detailed implementation order and GitHub issues.
