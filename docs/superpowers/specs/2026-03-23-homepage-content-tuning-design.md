---
name: homepage-content-tuning-design
description: Design for tightening topic thumbnails, rebalancing featured pick image width, and softening the discovery title on the homepage.
type: project
---

# Homepage Content Tuning Design

Date: 2026-03-23
Project: xiuji-industrial-heritage-map

## Goal

Make three focused homepage refinements:

1. `专题精选` should only show real site photos in its thumbnail strip.
2. `工业遗产 · 精选推荐` should give the image about one-third of the width on desktop so the building is easier to read as a whole.
3. The jumpy discovery wording should be replaced with a shorter exploration-toned title: `本次发现`.

## Scope

This design intentionally limits work to the confirmed edits only:

- topic thumbnail selection logic and rendering behavior
- featured pick desktop card layout proportions
- one title string change

No broader homepage rewrite, no content model redesign, and no mobile layout overhaul.

## Existing Context

- `components/topic-section.tsx` currently gathers matched sites, takes the first three image results, and renders them directly.
- `components/featured-pick-section.tsx` renders the featured recommendation card and relies on CSS classes for the visual split between photo and copy.
- The requested title copy is part of the homepage content layer and should be adjusted without changing the surrounding interaction pattern.

## Design

### 1. Topic thumbnails use only real photos

For each topic card, keep the existing match logic but filter thumbnail candidates before rendering:

- derive thumbnail candidates from matched/curated sites as today
- convert each site to its primary image
- exclude images that resolve to the default/fallback placeholder
- take up to three remaining images
- if fewer than three real images remain, render only the available count

This preserves the current topic logic while removing misleading placeholder thumbnails.

### 2. Featured recommendation card becomes 1/3 image, 2/3 text on desktop

On large screens, rebalance the featured card so the photo occupies roughly one third of the card width and the text area occupies the remaining two thirds.

Behavior:

- desktop: image ~33%, content ~67%
- tablet/mobile: keep the existing compact responsive behavior
- image still fills its own panel cleanly, but no longer stretches so wide that the building composition becomes hard to read

This is a layout-only change, not a content or interaction change.

### 3. Discovery title becomes `本次发现`

Replace the currently too-jumpy exploration label with `本次发现`.

Reasoning:

- keeps an exploration tone
- shorter and calmer
- better matches the homepage’s current editorial voice

## Components Affected

- `components/topic-section.tsx`
- `components/featured-pick-section.tsx`
- possibly `app/globals.css` if the featured card ratio is controlled there
- the file that currently contains the `这次挖到了` copy

## Data Flow Impact

- No schema changes
- No routing changes
- No filtering changes beyond thumbnail display selection
- No API or build pipeline changes

## Error Handling

- If a topic has zero real photos, the thumbnail row should simply be omitted
- If a topic has one or two real photos, render just those images without inserting placeholders
- Featured card layout remains safe because the image source behavior is unchanged; only its width allocation changes

## Testing

Manual verification should cover:

1. Homepage loads successfully.
2. `专题精选` cards never show fallback placeholder thumbnails.
3. Topics with fewer than three real images show fewer tiles rather than fake/fallback ones.
4. `工业遗产 · 精选推荐` shows an image panel near one third width on desktop.
5. Mobile/tablet layout remains readable and does not inherit the desktop ratio incorrectly.
6. The target title now reads `本次发现`.

## Out of Scope

- replacing poor-quality but real photos
- changing featured recommendation rotation logic
- redesigning topic cards
- reworking homepage copy beyond the one confirmed label change
