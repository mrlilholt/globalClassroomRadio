# Kernel
Project: Global Classroom Radio

The Kernel defines the system architecture and the official task board.

This file is the Single Source of Truth.

---

## System Architecture

Frontend: React Web App

Modules:

Station Discovery
Station Filtering
Audio Player
Station Whitelist
Classroom Mode

Data Source:

Radio Browser API

Storage:

LocalStorage (MVP)

---

## Core System Components

StationService

Handles API calls to Radio Browser.

FilterEngine

Applies safe tag filtering.

WhitelistManager

Stores teacher-approved stations.

PlayerController

Handles streaming playback.

ClassroomMode

Restricts playback to approved stations.

---

## Task Board

T1 — Initialize Project
Goal:
Create base React project structure.

Acceptance Criteria:
- project builds
- Netlify compatible
- base layout renders

Owner:
ARCH / FE

Status:
TODO

---

T2 — Integrate Radio Browser API

Goal:
Fetch global radio station data.

Acceptance Criteria:
- API requests working
- station data displayed
- country + language fields present

Owner:
DATA

Status:
TODO

---

T3 — Implement Station Filters

Goal:
Allow filtering by:

country  
language  
tags

Acceptance Criteria:
- UI filter controls
- results update dynamically

Owner:
FE / UI

Status:
TODO

---

T4 — Implement Kid-Safe Filtering

Goal:
Limit stations to safe tags.

Safe Tag List:

kids  
children  
family  
education  
classical  
folk  
lullabies

Acceptance Criteria:
- safe filter toggle
- only safe stations shown when active

Owner:
SAFE

Status:
TODO

---

T5 — Implement Station Player

Goal:
Allow preview of radio stations.

Acceptance Criteria:
- HTML5 audio streaming
- start / stop controls
- only one station playing at a time

Owner:
FE

Status:
TODO

---

T6 — Implement Station Whitelist

Goal:
Allow teachers to save safe stations.

Acceptance Criteria:
- save button
- saved list view
- persistence via LocalStorage

Owner:
FE

Status:
TODO

---

T7 — Classroom Mode

Goal:
Restrict playback to approved stations.

Acceptance Criteria:
- toggle classroom mode
- discovery disabled
- only whitelist playable

Owner:
SAFE / FE

Status:
TODO

---

T8 — UI Refinement

Goal:
Create simple clean interface.

Acceptance Criteria:
- filter controls
- station list
- player interface
- saved station view

Owner:
UI

Status:
TODO

---

T9 — MVP Testing

Goal:
Verify system stability.

Acceptance Criteria:
- multiple station playback tested
- filtering works
- whitelist persists

Owner:
QA

Status:
TODO

---

## Gates

G1 — Architecture Stable

G2 — API Integration Complete

G3 — Classroom Mode Working

G4 — MVP Ready