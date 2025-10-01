# Sizzle Reel Generator

An AI-assisted sizzle reel generator for software/app product features built with Next.js and TypeScript.

## Project Overview

This application generates cinematic sizzle reels by combining user-provided product descriptions with AI-generated visual content.

## Long-Term Vision

The complete sizzle reel workflow combines **AI-generated cinematic shots** (human interaction, emotions) with **UI screen recording clips** (showing actual product functionality) to create compelling product videos.

**Complete Flow:**
1. User uploads character image + product description + UI screen recording
2. AI analyzes UI recording → timestamped description of what happens when
3. AI generates storyboard that intelligently mixes:
   - **Cinematic shots**: Human interaction/reactions (AI-generated stills → videos)
   - **UI clips**: Specific moments from screen recording with timestamps
4. AI generates cinematic stills/videos
5. Automated video assembly cuts UI clips at specified timestamps and stitches with cinematic shots
6. Final sizzle reel exports as MP4

## Implementation Phases

### Phase 1: UI Recording Analysis & Enhanced Storyboards (Current Focus)
**Goal**: Storyboards informed by actual UI functionality, intelligently mixing shot types

1. **Video Upload & Analysis API**: Upload UI screen recording, Gemini analyzes and returns timestamped description
2. **Enhanced Storyboard Generation**: Accepts product description + UI analysis, outputs mixed shot types:
   - Cinematic shots with `stillPrompt`/`videoPrompt` for AI generation
   - UI shots with timestamps indicating which clip from recording to use
3. **Type-Aware Image Generation**: Only generate images for cinematic shots
4. **Manual UI Integration**: User manually edits UI clips for now (automation in Phase 2)

### Phase 2: Cinematic Video Generation
**Goal**: Convert AI-generated stills to video clips with motion

5. **Video Generation System**: Convert approved stills to video clips using image-to-video service (research Google Veo, Runway, etc.)
6. **Video Editing UI**: Prompt editing, regeneration, timing controls for video clips

### Phase 3: Automated Assembly
**Goal**: Fully automated sizzle reel creation

7. **Automated UI Clip Extraction**: Extract specific clips from UI recording using timestamps from storyboard
8. **Video Assembly Pipeline**: FFmpeg stitches cinematic videos + UI clips into final sizzle reel
9. **Preview & Export**: Simple preview player and MP4 export

## Tech Stack

- **Frontend**: Next.js 15+ with TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui
- **AI Services**: Google Gemini (storyboard generation, image generation)
- **Video Processing**: FFmpeg for final assembly (Phase 2)

## Design Principles

- Start simple with core AI workflow
- Keep UI barebones but functional
- Focus on product description -> storyboard -> stills workflow first
- Add complexity (video upload/processing) in later phases

## Product Context

The primary use case is for **Free World** - a portal helping formerly incarcerated individuals train for and find work in the trucking industry. This context informs:
- Authentic settings (modest homes, community spaces, truck stops, training facilities)
- Character circumstances and emotional authenticity
- Visual storytelling that respects and dignifies the community

**IMPORTANT**: The Free World context provides setting and authenticity, but storyboards should focus on demonstrating the **specific product feature** described by the user, not the entire user journey or app mission.

## Storyboard Generation Guidelines

### Shot Types
Storyboards contain two types of shots:
- **Cinematic shots**: Human interaction, emotions, reactions (AI-generated from base character image)
  - Includes `stillPrompt` and `videoPrompt` for AI generation
  - No UI screens visible - focus on device handling and emotional reactions
- **UI shots**: Screen recording clips showing actual product functionality
  - Includes `uiDescription` describing what's shown
  - Includes `startTime` and `endTime` timestamps (in seconds) from the UI recording
  - Used to extract specific clips from uploaded screen recording

### Storyboard Generation Strategy
The AI should intelligently decide shot types based on what best showcases the feature:
- Use **cinematic shots** for: setup, emotional reactions, human interaction, impact/benefit moments
- Use **UI shots** for: demonstrating specific functionality, showing feature in action
- Alternate between types to create engaging rhythm and comprehensive feature demonstration

### Cinematic Shot Guidelines
- **Primary Focus**: Showcase the specific product feature's functionality and value through human behavior
- **Context Role**: Use Free World background for authentic settings and character circumstances
- **Narrative Arc**: Setup → Feature in Action → Benefit (not the full user journey)
- **Visual Approach**: Human-device interaction, emotional reactions, environmental storytelling
- **No UI Screens**: Focus on device handling and reactions, not screen contents
- **Character Consistency**: Base image required; avoid appearance descriptions in prompts

## Current Implementation Status

### Completed
- ✅ Next.js + TypeScript setup (#1, #13, #14, #15)
- ✅ Basic storyboard generation API (#3)
- ✅ Still image generation system (#4)
- ✅ Character image requirement and consistency (#22)
- ✅ Human-centered storytelling approach (#24)
- ✅ Free World context integration (#26)
- ✅ Video prompt generation (#28)
- ✅ Feature-focused storyboard prompts (#30)

### In Progress - Phase 1
- 🔄 Video upload and analysis API (#2)
- 🔄 Enhanced storyboard with shot types (cinematic vs UI)
- 🔄 Type-aware image generation

### Planned - Phase 2 & 3
- UI: Upload and storyboard review (#9)
- UI: Still image gallery and editing (#10)
- Character image upload integration (#12)
- Video clip generation system (#5)
- UI: Video generation and timing controls (#11)
- Automated UI clip extraction
- Sizzle reel preview (#6)
- Final video assembly and export (#7)