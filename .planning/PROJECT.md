# GSD Dashboard

## What This Is

A standalone developer workspace that provides project visibility, AI agent management, and interactive planning — all from a browser. The core app handles project management, document viewing, and the UI shell. AI capabilities (GSD workflows, agent execution) are provided through a plugin system, making the app extensible beyond GSD.

## Core Value

Users can manage development projects and run AI-powered workflows through a visual interface with a plugin architecture that keeps the app useful even without any specific AI framework installed.

## Current Milestone: v2.0 Standalone App + Plugin Architecture

**Goal:** Refactor the existing GSD Dashboard into a standalone app with a plugin system. GSD becomes the first plugin. Complete the remaining v1 features (chat, phase dashboard) as plugin-provided capabilities.

**Target features:**
- Plugin registration system with UI slot injection, event hooks, and data providers
- App shell refactor — extract GSD-specific code behind the plugin boundary
- GSD plugin — re-expose doc viewer, execution, file watcher as plugin features
- Chat interface — real-time conversation with Claude, streaming markdown, session persistence
- Phase dashboard — phase timeline, plan detail, requirement coverage, live status

## Requirements

### Validated

- ✓ Hono backend with REST API + WebSocket — v1.0 Phase 1
- ✓ React + Vite + Tailwind SPA with dark terminal aesthetic — v1.0 Phase 2
- ✓ Multi-project support (register, remove, switch) — v1.0 Phase 2
- ✓ Document viewer with file tree, markdown rendering, syntax highlighting — v1.0 Phase 2
- ✓ Live file watcher with WebSocket push updates — v1.0 Phase 2
- ✓ Agent SDK integration with session continuation — v1.0 Phase 3
- ✓ Phase execution with streaming output + start/stop controls — v1.0 Phase 3

### Active

- [ ] Plugin system — registration API, UI slots, event hooks, data providers
- [ ] App shell restructured as plugin host (routing, layout, project management are app-owned)
- [ ] GSD plugin wrapping existing features (doc viewer, execution, file watcher)
- [ ] Chat interface with real-time streaming (CHAT-01 through CHAT-05 from v1)
- [ ] GSD slash command integration via chat (CHAT-04)
- [ ] Phase dashboard with timeline and status visualization (PHASE-01 through PHASE-04 from v1)
- [ ] Session persistence across browser sessions

### Out of Scope

- Document editing from the UI — CLI/chat creates documents, UI views them
- Mobile support — desktop browser only
- Multi-user / auth — personal tool, single user
- Deployment / hosting — runs locally
- Shipping as part of the GSD npm package — standalone repo at github.com/bradjenn/cc-manager
- Non-Claude agent frameworks — GSD plugin is first; other frameworks are future plugins
- Plugin marketplace / dynamic loading — v2.0 plugins are compile-time, not runtime-loaded

## Context

- v1.0 shipped 3 phases (backend, frontend+docs, agent SDK+streaming). 13/21 requirements completed.
- Phases 4-5 (chat, phase dashboard) were not built — they carry into v2.0 as plugin-provided features
- ARCH-01 captured during v1.0: app should be standalone product, GSD as optional plugin
- Existing codebase: Hono backend (~15 routes), React frontend (shadcn/ui, TanStack Query, Zustand), Claude Agent SDK integration
- Key v1 patterns to preserve: TanStack Query for server state, Zustand for UI state, rAF buffer for streaming, WebSocket for live updates
- Plugin architecture reference: VS Code extensions (contributes UI, commands, events) but much simpler

## Constraints

- **Tech stack**: Same as v1.0 — React + Vite + TypeScript + Tailwind (frontend), Hono + Node.js (backend), Claude Agent SDK
- **Scope**: Plugin system must be simple — compile-time registration, not dynamic loading. Over-engineering the plugin API is the main risk.
- **Location**: Standalone repo at github.com/bradjenn/cc-manager (GSD available as git submodule)
- **Audience**: Personal tool — single user, no auth
- **Migration**: Existing v1 code must be refactored, not rewritten. Plugin boundary is extracted from existing modules.
- **Runtime**: Must continue working with existing .planning/ directory structure

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude Agent SDK over CLI subprocess | Cleaner programmatic control, official API, handles tool use | ✓ Good |
| Hono over Express | Lightweight, modern, fast — fits a personal tool | ✓ Good |
| React + Vite over Next.js | No SSR needed, simpler setup, faster dev | ✓ Good |
| Dark terminal aesthetic | Matches CLI roots, developer-focused tool | ✓ Good |
| TanStack Query + Zustand split | Server state vs UI state separation proved clean | ✓ Good |
| rAF buffer for streaming output | Prevents browser choke on high-frequency events | ✓ Good |
| Compile-time plugin registration | Avoids dynamic loading complexity for a personal tool | — Pending |
| Plugin = UI slots + event hooks + data providers | Covers GSD's needs without over-abstracting | — Pending |

---
*Last updated: 2026-03-01 after v2.0 milestone start*
