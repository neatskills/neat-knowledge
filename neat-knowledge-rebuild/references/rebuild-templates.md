# Rebuild Templates

Output and frontmatter templates used by `neat-knowledge-rebuild`'s Phase 1 steps.

## Step 5 — Optimization Plan

```
Category Optimization Plan
==========================

CURRENT: {X} → PROPOSED: {Y}

NEW STRUCTURE:
1. web-development (65 docs)
   Frontend frameworks, JavaScript
   From: web-dev (5), frontend (8), development subset (40)

REASONING: {AI reasoning}
MAJOR CHANGES: Merged 4 similar into web-development
REASSIGNMENTS: {count} of {total}
EXAMPLES: react-hooks.md: development → web-development

Apply? [y/n] (default: y)
```

## Step 8 — Pattern Detection Results

```
Pattern Detection Results
=========================

Found 2 consolidation opportunities:

1. PostgreSQL Connection Issues (5 captures)
   Type: solutions → captures/solutions/

2. Microservice Deployment (4 captures)
   Type: workflows → captures/workflows/
   → Can be automated via /writing-skills

Options: c=Consolidate all, r=Review each, s=Skip
```

## Step 9 — Consolidated Capture Frontmatter

```yaml
---
category: captures
type: {type}
title: {title}
tags: {combined}
summary: {generated}
date: {today}
synthesized_from:
  - path: captures/solutions/postgres-timeout.md
    author: alice
    date: 2026-03-15
    summary: "Connection timeout"
team_captures: {count}
contributors: [alice, bob]
procedural: {boolean}
automation_candidate: {if procedural}
---
```

## Step 9 — Consolidation Review

```
Created: captures/solutions/postgresql-connection-management.md
[First 500 chars]

Options: v=View full, y=Approve/delete sources, k=Keep specific, n=Cancel
```

## Step 10 — Capture Cleanup Report

```
Capture Cleanup Report
======================

Total: 45 | Active: 32 | Aging: 8 | Stale: 5

Stale (12+ months):
1. webpack-4-config.md (18mo, tech upgraded)
2. old-api-design.md (14mo, 0 refs)

Options: d=Delete all, r=Review each, k=Keep all, v=View details
```
