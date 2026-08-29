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

**MAMADO** is a minimal, futuristic productivity and music workspace inspired by the visual language of **Nothing Phone** and **MimoCode**.

It combines task management, music playback, focus sessions, statistics and administration into a single workspace with a strong emphasis on:

- Minimal futuristic UI
- Fast interactions
- Keyboard-first workflows
- Persistent music playback
- Responsive design
- Secure cloud data
- Smooth motion and micro-interactions

---

## ✨ Features

### ◉ Productivity

- Kanban board
- List view
- Quick task creation
- Priorities
- Tags
- Due dates
- Search & filtering
- Completion animations
- Task-linked focus sessions

### ◉ Music

A unified music workspace supporting official free integrations.

#### Spotify

- Official Spotify oEmbed
- Metadata retrieval
- Official embedded player
- No Spotify authentication required for the integration

#### SoundCloud

- Official SoundCloud oEmbed
- Metadata retrieval
- Official SoundCloud widget
- No API key required for the integration

#### Direct Audio

- HTML5 `<audio>` playback
- Custom player controls
- Direct audio URLs

### ◉ Persistent Player

The music player remains available throughout the application.

Includes:

- Queue
- Shuffle
- Repeat
- Favorites
- Recently played
- Mobile full-screen player
- Custom futuristic controls

### ◉ Dashboard

The dashboard provides a quick overview of your workspace:

- Today's tasks
- Priority tasks
- Recent music
- Activity
- Productivity statistics

### ◉ Focus Mode

Built-in Pomodoro-style focus system:

- Focus timer
- Sessions
- Task linking
- Productivity tracking

### ◉ Statistics

Track your productivity with:

- Weekly activity histogram
- Completion rate
- Productivity streak
- Task statistics

### ◉ Command Palette

Press:

```text
Ctrl + K
```

to open the command palette.

Additional keyboard shortcuts:

| Key | Action |
|---|---|
| `N` | New item |
| `/` | Search |
| `?` | Keyboard shortcuts |
| `Esc` | Close / cancel |
| `Ctrl + K` | Command palette |

### ◉ Admin Console

Administrative tools include:

- User management
- Role management
- Categories
- Application settings
- Core configuration management

### ◉ Themes

MAMADO supports multiple visual modes:

- Dark
- Light
- Mono

### ◉ Security

The application uses **Supabase Row Level Security (RLS)**.

Security features include:

- RLS policies on database tables
- First registered account automatically becomes admin
- Admin-only writes for core settings
- Supabase authentication

---

# 🧱 Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI |
| **TypeScript** | Type safety |
| **Vite** | Development & build tooling |
| **Tailwind CSS v4** | Styling |
| **Zustand** | State management |
| **Framer Motion** | Animations |
| **Lucide React** | Icons |
| **React Router v7** | Routing |
| **Supabase** | Authentication, PostgreSQL & RLS |

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
│   │   └── database & domain types
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
git clone <your-repository-url>
cd MAMADO
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create your local environment file:

```bash
cp .env.example .env
```

Then configure:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Never commit your `.env` file or private credentials to GitHub.

## 4. Start the development server

```bash
npm run dev
```

The application will be available at the local Vite development address shown in your terminal.

---

# 🗄️ Database Setup

MAMADO uses **Supabase PostgreSQL** with Row Level Security.

### Step 1 — Create a Supabase project

Create a new Supabase project.

### Step 2 — Run the database schema

Open the **SQL Editor** in Supabase and execute:

```text
supabase/schema.sql
```

The schema contains the required:

- Tables
- RLS policies
- Triggers
- Admin bootstrap logic

### Step 3 — Data API permissions

If newly created tables are not automatically exposed through the Data API, run the `GRANT` section located at the bottom of:

```text
supabase/schema.sql
```

Make sure RLS remains enabled.

### Step 4 — Authentication

In:

```text
Authentication → Settings
```

you can optionally enable email confirmation.

### Step 5 — Create your account

Sign up normally.

The **first registered account is automatically promoted to administrator**.

---

# 🎨 Design System

MAMADO follows a minimal futuristic design language.

### Typography

- `ndot57` — display typography
- `Inter` — primary UI text
- `JetBrains Mono` — metadata and technical information

### Visual Language

The interface uses:

- Dot-grid patterns
- 1px hairlines
- Subtle glow effects
- Minimal surfaces
- High-contrast typography
- Futuristic micro-interactions

The application also respects:

```css
prefers-reduced-motion
```

for users who prefer reduced animation.

### Loading System

A branded loading animation is used throughout the application.

```text
src/components/loader
```

---

# 🎵 Music Integrations

MAMADO intentionally uses official integration methods for supported music services.

### Spotify

Uses:

```text
https://open.spotify.com/oembed
```

for metadata and official embedded playback.

### SoundCloud

Uses:

```text
https://soundcloud.com/oembed
```

for metadata and the official SoundCloud widget.

### Direct Audio

Direct audio URLs are handled through the browser's native:

```html
<audio>
```

element with custom controls.

---

# 🔐 Security

Security is handled primarily through Supabase Authentication and PostgreSQL Row Level Security.

Core principles:

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

Do not expose private Supabase credentials or service-role keys in the frontend.

Only the public/anonymous client key intended for browser use should be exposed through:

```env
VITE_SUPABASE_ANON_KEY
```

---

# 🛠️ Development

Start the development environment:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

# 📌 Roadmap

Potential future improvements:

- [ ] More music providers
- [ ] Advanced productivity analytics
- [ ] More keyboard-driven workflows
- [ ] Expanded customization
- [ ] Additional player features
- [ ] Improved mobile experience
- [ ] More workspace integrations

---

# 🤝 Contributing

Contributions, ideas and improvements are welcome.

A typical workflow:

```bash
git checkout -b feature/my-feature
```

Make your changes, test them locally, then create a pull request.

Please keep the project's visual language and architecture consistent when contributing.

---

# 📄 License

Add your preferred license here before publishing the repository.

🤖 Credits

```text



┌──────────────────────────────────────┐
│          MAMADO — BUILD LOG          │
├──────────────────────────────────────┤
│ Human creativity    → Mamadov        │
│ AI assistance       → Cline          │
│ AI models           → Z.ai           │
│ Documentation       → Internet      │
│ Debugging           → Stack Overflow │
│ Random ideas        → 3 AM           │
│ Sanity               → ???            │
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
