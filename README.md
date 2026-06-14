# SmartInventory - AI-Powered Inventory Management System

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.7.1-00D89E?style=for-the-badge&logo=prisma)](https://prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)

## 🚀 Overview

**SmartInventory** is an advanced AI-powered inventory management system designed for modern businesses. Built for the **Hack Revolution 2025** hackathon, it leverages machine learning to predict demand, optimize stock levels, and streamline supplier coordination.

### Key Features

- **ML-Powered Demand Forecasting**: Random Forest, LSTM, GRU, and ensemble models with 85%+ accuracy
- **Real-Time Analytics**: Interactive dashboards with sales trends, category performance, and EDA
- **Smart Optimization**: Automatic reorder points, safety stock calculations, and risk assessment
- **Supplier Integration**: WhatsApp notifications with predicted demand and order quantities
- **Multi-Role Support**: Retailers and suppliers with role-based workflows
- **Advanced ML Training**: Train custom models on your historical data
- **Comprehensive CRUD**: Products, orders, suppliers, and supplier orders management

## 🏗️ Tech Stack

| Category          | Technologies                                                        |
| ----------------- | ------------------------------------------------------------------- |
| **Frontend**      | Next.js 15.5 (App Router), React 19, TypeScript 5.9, Tailwind CSS 4 |
| **Backend**       | Next.js API Routes, Prisma 6.16, PostgreSQL                         |
| **AI/ML**         | Google Generative AI, TensorFlow integration                        |
| **Auth**          | Supabase Auth                                                       |
| **Charts**        | Recharts 3.3                                                        |
| **UI Components** | Radix UI, Lucide React icons                                        |
| **Dev Tools**     | Turbopack, ESLint 9, PostCSS                                        |

## 📊 Database Schema

```prisma
// Core Models
model Product {
  id          String   @id @default(cuid())
  userId      String
  name        String
  price       Decimal
  unitCost    Decimal
  category    String?
  quantity    Int      @default(0)
  orders      Order[]
  suppliers   Supplier[]
}

model Order {
  id           String  @id @default(cuid())
  userId       String
  productId    String
  orderDate    DateTime
  orderQty     Int
  costOfSales  Decimal
  sales        Decimal
  profit       Decimal
  product      Product @relation(fields: [productId], references: [id])
}

model Supplier {
  id           String        @id @default(cuid())
  userId       String
  supplierName String?
  contactNumber String
  productId    String?
  product      Product?
}

model SupplierOrder {
  id             String   @id @default(cuid())
  retailerUserId String
  supplierId     String
  productName    String
  requestedQty   Int
  predictedDemand Float?
  status         String   @default('pending')
  supplier       Supplier @relation(fields: [supplierId], references: [id])
}

model UserProfile {
  id         String @id @default(cuid())
  userId     String @unique
  userType   String @default('retailer') // retailer, supplier
}
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Supabase account (for auth)

### 1. Clone & Install

```bash
git clone <your-repo>
cd 'Inventory Management'
npm install
```

### 2. Environment Setup

```bash
# Copy env template
cp .env.example .env.local

# Update .env.local
DATABASE_URL='postgresql://...'
NEXT_PUBLIC_SUPABASE_URL='...'
NEXT_PUBLIC_SUPABASE_ANON_KEY='...'
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma db push
npx prisma db seed  # Optional: seed sample data
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app!

## 📱 Pages & Features

| Route              | Description               | Key Features                         |
| ------------------ | ------------------------- | ------------------------------------ |
| `/`                | Landing Page              | Hero, features, stats                |
| `/sign-in`         | Authentication            | Supabase auth                        |
| `/select-role`     | Role Selection            | Retailer/Supplier onboarding         |
| `/dashboard`       | Analytics Dashboard       | Sales charts, metrics, recent orders |
| `/inventory`       | Product Management        | CRUD, search, pagination             |
| `/orders`          | Order History             | Sales/profit tracking                |
| `/add-product`     | Product Creation          | Form with validation                 |
| `/chatbot`         | AI Assistant              | Google Generative AI integration     |
| `/train-model`     | ML Model Training         | Multiple algorithms                  |
| `/advanced-ml`     | Model Comparison          | Performance metrics                  |
| `/eda`             | Exploratory Data Analysis | Distributions, trends                |
| `/optimize`        | Inventory Optimization    | Reorder points, safety stock         |
| `/supplier-orders` | Supplier Portal           | Demand predictions                   |

## 🤖 AI/ML Capabilities

1. **Demand Forecasting**: Train on historical orders using RF, GBM, LSTM/GRU
2. **Risk Assessment**: High/Medium/Low stockout probability
3. **Optimization Engine**: EOQ, reorder points, safety stock calculations
4. **Ensemble Methods**: Combine multiple models for best accuracy

## 📱 Mobile-First UI

- Responsive design with Tailwind CSS
- Sidebar navigation
- Dark mode ready
- Loading states & error handling

## 🔗 API Routes

```
POST /api/chatbot          # AI conversations
GET /api/profile           # User profile
POST /api/supplier-orders  # Create supplier orders
GET /api/suppliers/load    # Load suppliers
POST /api/suppliers/save   # Save supplier data
```

## 🛠️ Development Scripts

```bash
npm run dev      # Development server with Turbopack
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint checks
npx prisma studio # Database explorer
```

## 📈 Project Structure

```
├── app/                 # Next.js App Router
│   ├── dashboard/       # Analytics
│   ├── inventory/       # Product management
│   ├── optimize/        # ML optimization
│   ├── train-model/     # Model training
│   └── api/             # API routes
├── components/          # Reusable UI
├── lib/                 # Utilities & Prisma client
├── prisma/              # Database schema & migrations
└── stack/               # Stackframe AI integration
```

## 🎯 Built For Hack Revolution 2025

This project demonstrates:

- ✅ Full-stack Next.js with TypeScript
- ✅ Production-ready Prisma + PostgreSQL
- ✅ Advanced ML integration
- ✅ Real-time analytics & dashboards
- ✅ Multi-tenant architecture (retailer/supplier)
- ✅ WhatsApp supplier notifications
- ✅ Model comparison & ensemble methods

---

<div align='center'>
  <img src='https://img.shields.io/badge/⭐-Star_Us-0369A1?style=for-the-badge&logo=github' alt='Star us'/>
</div>
