# Satish Pustak Bhandar — Full-Stack E-Commerce & Admin Panel

Complete responsive e-commerce website and Admin Panel for **Satish Pustak Bhandar** (Stationery, Books & Gift Emporium).

## Features
- **Responsive Storefront** (Mobile 2-col grid, swipeable categories, Tablet & Desktop)
- **WhatsApp Ordering** (Floating chat, per-item WhatsApp order, Cart WhatsApp order, Bulk School Booklist upload)
- **Customer Accounts** (Auto-account creation on checkout, Sign In / Sign Up, My Orders, Payment Details, Wishlist, Saved Address)
- **UPI QR Code Checkout & Promo Coupons** (`WELCOME50`, `FESTIVE10`)
- **Order Confirmation Emails** (Configurable Gmail / SMTP in Admin Settings, with instant local receipt preview)
- **Hidden Admin Panel (`/admin`)** — Default login: `admin` / `admin123`
  - Dashboard KPIs & Low Stock Alerts
  - Products & Inventory CRUD with photo uploads
  - Orders Management with **Printable Parcel Slip (Paste on Box)** & **Tax Invoice / Bill**
  - **Customers & Upsell CRM** (Auto-recorded customer directory, CSV Export, Bulk Sale Email Campaigns, WhatsApp Offers)
  - School Booklist Quotes Inbox
  - Promo Coupons & Categories
  - Full Logo, Hero Banner, Contact Details, Google Maps, UPI & SMTP Settings

## Run Locally
```bash
npm install
npm run build
npm start
```
- Storefront: `http://localhost:5050`
- Admin Panel: `http://localhost:5050/admin`

## Deploy Notes
- `netlify.toml` and `public/_redirects` are included for Netlify frontend deploys (`dist/`).
- Because this app includes a Node/Express backend (`server/index.js`) with file uploads and JSON database persistence, deploying on **Railway** or **Render** (using `npm run build` and `npm start`) runs both the frontend and full backend + Admin Panel together out of the box.
