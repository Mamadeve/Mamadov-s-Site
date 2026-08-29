# MAMADO

```text
> project initialized
> architecture designed
> code generated & refined with AI
> human direction: Mamadov
> status: running...
```

<p align="center">
  <strong>A futuristic productivity & music workspace.</strong>
</p>

<p align="center">
  Built with React, TypeScript, Tailwind CSS and Supabase.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
</p>

<p align="center">
  <code>// designed by Mamadov</code>
</p>

---

## ✦ Overview

**MAMADO** is a minimal, futuristic productivity and music workspace.

It brings tasks, music, focus sessions, statistics and administration together in one workspace, with an emphasis on:

* Minimal futuristic UI
* Fast interactions
* Keyboard-first workflows
* Persistent music playback
* Responsive design
* Secure cloud data
* Smooth motion and micro-interactions

---

## ✨ Features

### ◉ Productivity

* Kanban board
* List view
* Quick task creation
* Priorities
* Tags
* Due dates
* Search and filtering
* Completion animations
* Task-linked focus sessions

### ◉ Music

A unified music workspace with support for official free integrations.

#### Spotify

* Official Spotify oEmbed integration
* Metadata retrieval
* Official embedded player
* No Spotify authentication required

#### SoundCloud

* Official SoundCloud oEmbed integration
* Metadata retrieval
* Official SoundCloud widget
* No API key required

#### Direct Audio

* HTML5 `<audio>` playback
* Custom player controls
* Direct audio URLs

### ◉ Persistent Player

The music player stays available throughout the application.

Features include:

* Queue
* Shuffle
* Repeat
* Favorites
* Recently played
* Mobile full-screen player
* Custom futuristic controls

### ◉ Dashboard

A centralized overview of the workspace:

* Today's tasks
* Priority tasks
* Recent music
* Activity
* Productivity statistics

### ◉ Focus Mode

A built-in Pomodoro-style focus system with:

* Focus timer
* Sessions
* Task linking
* Productivity tracking

### ◉ Statistics

Track productivity through:

* Weekly activity histogram
* Completion rate
* Productivity streak
* Task statistics

### ◉ Command Palette

Open the command palette with:

```text
Ctrl + K
```

Keyboard shortcuts:

| Key        | Action          |
| ---------- | --------------- |
| `N`        | New item        |
| `/`        | Search          |
| `?`        | Show shortcuts  |
| `Esc`      | Close / cancel  |
| `Ctrl + K` | Command palette |

### ◉ Admin Console

Administrative features include:

* User management
* Role management
* Categories
* Application settings
* Core configuration

### ◉ Themes

MAMADO includes:

* Dark
* Light
* Mono

### ◉ Security

MAMADO uses **Supabase Row Level Security (RLS)** for database security.

Security features include:

* RLS policies on database tables
* Automatic admin promotion for the first account
* Admin-only writes for core settings
* Supabase authentication

---

# 🧱 Tech Stack

| Technology          | Purpose                            |
| ------------------- | ---------------------------------- |
| **React 18**        | UI                                 |
| **TypeScript**      | Type safety                        |
| **Vite**            | Development and build tooling      |
| **Tailwind CSS v4** | Styling                            |
| **Zustand**         | State management                   |
| **Framer Motion**   | Animations                         |
| **Lucide React**    | Icons                              |
| **React Router v7** | Routing                            |
| **Supabase**        | Authentication, PostgreSQL and RLS |

---

# 📁 Project Structure

```text
MAMADO/
│
├── public/
│   └── fonts/
│
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── player/
│   │   ├── loader/
│   │   ├── tasks/
│   │   ├── music/
│   │   └── activity/
│   │
│   ├── pages/
│   │   └── route-level screens
│   │
│   ├── services/
│   │   ├── data access
│   │   ├── Supabase
│   │   └── music providers
│   │
│   ├── store/
│   │   ├── auth
│   │   ├── ui
│   │   └── player
│   │
│   ├── lib/
│   │   ├── Supabase client
│   │   └── utilities
│   │
│   ├── types/
│   │   └── database and domain types
│   │
│   └── config/
│       └── application constants
│
├── supabase/
│   └── schema.sql
│
├── .env.example
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/Mamadeve/Mamadov-s-Site.git
cd Mamadov-s-Site
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create a local `.env` file based on `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Keep your local `.env` file out of version control.

## 4. Start the development server

```bash
npm run dev
```

The development server will start using the Vite configuration included in the project.

---

# 🗄️ Database Setup

MAMADO uses **Supabase PostgreSQL** with Row Level Security.

The database schema is located at:

```text
supabase/schema.sql
```

Run the schema through the **Supabase SQL Editor** to create the required database structure, policies and triggers.

The schema includes:

* Database tables
* RLS policies
* Triggers
* Admin bootstrap logic

### Authentication

Email confirmation can be enabled through the Supabase authentication settings.

The first registered account is automatically promoted to administrator.

---

# 🎨 Design System

MAMADO follows a minimal futuristic design language inspired by modern monochrome interfaces.

### Typography

* `ndot57` — display typography
* `Inter` — primary interface text
* `JetBrains Mono` — metadata and technical information

### Visual Language

The interface uses:

* Dot-grid patterns
* 1px hairlines
* Subtle glow effects
* Minimal surfaces
* High-contrast typography
* Futuristic micro-interactions

Motion is designed to respect:

```css
prefers-reduced-motion
```

### Loading System

A branded loading animation is used throughout the application.

```text
src/components/loader
```

---

# 🎵 Music Integrations

MAMADO uses official integration methods for supported music services.

### Spotify

Spotify oEmbed is used for metadata and official embedded playback.

```text
https://open.spotify.com/oembed
```

### SoundCloud

SoundCloud oEmbed is used for metadata and the official widget.

```text
https://soundcloud.com/oembed
```

### Direct Audio

Direct audio URLs are played through the browser's native HTML5 audio element:

```html
<audio>
```

---

# 🔐 Security

Authentication and database security are handled through Supabase.

The data flow is built around:

```text
Authentication
      ↓
Supabase
      ↓
PostgreSQL
      ↓
Row Level Security
      ↓
Authorized application data
```

Private credentials and service-role keys must remain outside the frontend.

The browser only uses the public Supabase client configuration:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

# 🛠️ Development

Run the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

# 📌 Roadmap

* [ ] More music providers
* [ ] Advanced productivity analytics
* [ ] More keyboard-driven workflows
* [ ] Expanded customization
* [ ] Additional player features
* [ ] Improved mobile experience
* [ ] More workspace integrations

---

# 🤝 Contributing

Contributions and improvements are welcome.

Create a feature branch:

```bash
git checkout -b feature/my-feature
```

Make your changes, test them locally and submit a pull request.

Keep contributions consistent with the project's architecture and visual language.

---

# 🤖 Credits

```text
┌──────────────────────────────────────┐
│          MAMADO — BUILD LOG          │
├──────────────────────────────────────┤
│ Human creativity    → Mamadov        │
│ AI assistance       → cline router   │
│ AI models           → GLM 5.3        │
│ Documentation       → Internet       │
│ Debugging           → Stack Overflow │
│ Random ideas        → 3 AM           │
│ Sanity              → ???            │
└──────────────────────────────────────┘

> built with AI
> debugged by humans
> powered by curiosity
> shipped anyway (～￣▽￣)～
```

---

<p align="center">
  <strong>MAMADO</strong>
  <br>
  <sub>Productivity • Music • Focus • Simplicity</sub>
</p>

<p align="center">
  <code>designed by Mamadov</code>
</p>
