# Sizzle Reel Generator

An AI-assisted sizzle reel generator for software/app product features built with Next.js and TypeScript.

## Project Overview

This application generates cinematic sizzle reels by combining user-provided product descriptions with AI-generated visual content.

## Pipeline

### Phase 1: Core AI Workflow (Current Focus)
1. **Input**: User provides text description of product feature
2. **Storyboard Generation**: Gemini creates a screenplay/storyboard with shot lists and prompts for stills
3. **Still Generation**: Gemini generates landscape stills for each shot
4. **Review & Edit**: User can review and regenerate individual stills

### Phase 2: Advanced Features (Future)
5. **Character Integration**: User uploads character image for consistent character across stills
6. **Video Upload**: User uploads screen recording of product feature
7. **Video Analysis**: Gemini analyzes the screen recording for timing and integration
8. **Video Generation**: Convert stills to video clips (research image-to-video options like Google Veo)
9. **Preview**: Simple preview of complete sizzle reel
10. **Assembly**: FFmpeg stitches everything into final MP4

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

Storyboard prompts should:
- **Primary Focus**: Showcase the specific product feature's functionality and value
- **Context Role**: Use Free World background for authentic settings and character circumstances
- **Narrative Arc**: Setup → Feature in Action → Benefit (not the full user journey)
- **Visual Approach**: Human-device interaction, emotional reactions, environmental storytelling
- **No UI Screens**: Focus on device handling and reactions, not screen contents
- **Character Consistency**: Base image required; avoid appearance descriptions in prompts

## Implementation Order (Updated)

Work on GitHub issues in this sequence:

**Phase 1: Core Workflow**
1. **#3** - Storyboard Generation API (product description -> storyboard)
2. **#4** - Still Image Generation System (storyboard -> stills)
3. **#9** - UI: Upload and Storyboard Review Interface (simplified for text input)
4. **#10** - UI: Still Image Gallery and Editing

**Phase 2: Advanced Features (Later)**
5. **#12** - Character Image Upload and Integration
6. **#2** - Video Upload and Processing API
7. **#5** - Video Clip Generation System
8. **#11** - UI: Video Generation and Timing Controls
9. **#6** - Sizzle Reel Preview System
10. **#7** - Final Video Assembly and Export

## GitHub Issues

Created 14 issues total:
- Completed setup issues #13, #14, #15
- Core workflow issues: #3, #4, #9, #10
- Advanced features: #2, #5, #6, #7, #11, #12