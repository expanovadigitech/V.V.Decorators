# V.V. Decorators — Event Booking CRM

A professional, fully-responsive CRM built with **Next.js 15**, **TypeScript**, and **Tailwind CSS** for managing event bookings at V.V. Decorators.

## ✨ Features
- 📋 Complete booking management (create, edit, delete)
- 💰 Auto-calculated financials (Total Value, Balance)
- 📊 Financial overview dashboard (Revenue, Advances, Outstanding)
- 🔍 Search by client name or phone number
- 🏷️ Filter by Upcoming / This Month / Payment Pending
- 📱 Fully mobile-responsive (works on-site from phone)
- 📤 Export to CSV for ground team sharing
- 🏛️ Frequently used venues dropdown
- 💾 LocalStorage persistence (no backend needed)

## 🚀 Getting Started

```bash
npm install
npm run dev         # Start dev server at http://localhost:3000
npm run build       # Build for production
```

## ☁️ Cloudflare Pages Deployment

1. Push this repository to GitHub
2. Connect to Cloudflare Pages
3. Set **Build command**: `npm run build`
4. Set **Build output directory**: `out`
5. Deploy!

## 🔧 Switching to a Backend

The storage layer is isolated in `src/lib/storage.ts`.  
To connect Supabase or Airtable, replace the functions in that file — no other code changes needed.

## 🎨 Design
- **Primary**: Navy Blue `#001f3f`
- **Accent**: Gold `#D4AF37`
- **Font**: Inter (Google Fonts)
