import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Helper function to fetch optimization insights
async function getOptimizationInsights(userId: string) {
  try {
    const response = await fetch("http://localhost:5000/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (response.ok) {
      console.log("Optimization insights fetched successfully");
      return await response.json();
    }
  } catch (error) {
    console.log("Could not fetch optimization insights:", error);
  }
  return null;
}

// Helper function to filter optimization insights by category
function filterOptimizationByCategory(optimizationData: any, category: string) {
  if (!optimizationData || !optimizationData.recommendations) return null;

  const filteredRecommendations = optimizationData.recommendations.filter(
    (rec: any) => rec.category.toLowerCase() === category.toLowerCase(),
  );

  return {
    recommendations: filteredRecommendations,
    summary: {
      ...optimizationData.summary,
      total_products: filteredRecommendations.length,
      category_filter: category,
    },
  };
}

// Helper function to get unique categories from optimization data
function getCategoriesFromOptimization(optimizationData: any): string[] {
  if (!optimizationData || !optimizationData.recommendations) return [];

  const categories = new Set<string>(
    optimizationData.recommendations.map((rec: any) => rec.category as string),
  );

  return Array.from(categories).sort();
}

// Helper function to extract category from query
function extractCategory(query: string): string | null {
  const lowerQuery = query.toLowerCase();

  // Common category names and variations
  const categoryPatterns = [
    { pattern: /grocery|groceries/, category: "grocery" },
    { pattern: /electronics|electronic/, category: "electronics" },
    { pattern: /clothing|clothes|apparel/, category: "clothing" },
    { pattern: /furniture|furniture items/, category: "furniture" },
    { pattern: /books|book/, category: "books" },
    { pattern: /health|healthcare|medical/, category: "health" },
    { pattern: /sports|sporting/, category: "sports" },
    { pattern: /toys|toy/, category: "toys" },
  ];

  for (const { pattern, category } of categoryPatterns) {
    if (pattern.test(lowerQuery)) {
      return category;
    }
  }

  // Try to extract anything mentioned as "in [category]" or "[category] category"
  const inCategoryMatch = lowerQuery.match(/in\s+(\w+)\s+category|(\w+)\s+category/);
  if (inCategoryMatch) {
    return inCategoryMatch[1] || inCategoryMatch[2];
  }

  return null;
}

// Helper function to query database based on user intent
async function queryDatabase(userId: string, query: string) {
  const lowerQuery = query.toLowerCase();

  try {
    // Products queries
    if (lowerQuery.includes("product") || lowerQuery.includes("inventory")) {
      // Check if user is asking for products in a specific category
      const categoryFilter = extractCategory(query);

      if (
        lowerQuery.includes("all") ||
        lowerQuery.includes("list") ||
        lowerQuery.includes("show")
      ) {
        const products = await prisma.product.findMany({
          where: {
            userId,
            // Apply category filter if extracted from query
            ...(categoryFilter && {
              category: {
                equals: categoryFilter,
                mode: "insensitive" as const,
              },
            }),
          },
          take: 50, // Increased to capture all products in category
          orderBy: { createdAt: "desc" },
          include: {
            orders: {
              take: 1,
              orderBy: { orderDate: "desc" },
            },
          },
        });
        return {
          type: "products",
          data: products,
          categoryFilter: categoryFilter || undefined,
        };
      }

      if (lowerQuery.includes("count") || lowerQuery.includes("how many")) {
        const count = await prisma.product.count({ where: { userId } });
        return { type: "count", data: { count, entity: "products" } };
      }

      if (
        lowerQuery.includes("category") ||
        lowerQuery.includes("categories")
      ) {
        const products = await prisma.product.groupBy({
          by: ["category"],
          where: { userId, category: { not: null } },
          _count: true,
        });
        return { type: "categories", data: products };
      }
    }

    // Orders queries
    if (lowerQuery.includes("order") || lowerQuery.includes("sale")) {
      if (lowerQuery.includes("recent") || lowerQuery.includes("latest")) {
        const orders = await prisma.order.findMany({
          where: { userId },
          take: 10,
          orderBy: { orderDate: "desc" },
          include: { product: true },
        });
        return { type: "orders", data: orders };
      }

      if (lowerQuery.includes("total") || lowerQuery.includes("sum")) {
        const stats = await prisma.order.aggregate({
          where: { userId },
          _sum: {
            sales: true,
            profit: true,
            costOfSales: true,
          },
          _count: true,
        });
        return { type: "order_stats", data: stats };
      }

      if (lowerQuery.includes("count") || lowerQuery.includes("how many")) {
        const count = await prisma.order.count({ where: { userId } });
        return { type: "count", data: { count, entity: "orders" } };
      }
    }

    // Profit/Performance queries
    if (lowerQuery.includes("profit") || lowerQuery.includes("performance")) {
      const topProducts = await prisma.order.groupBy({
        by: ["productId"],
        where: { userId },
        _sum: {
          profit: true,
          sales: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            profit: "desc",
          },
        },
        take: 10,
      });

      const productsWithNames = await Promise.all(
        topProducts.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });
          return {
            ...item,
            productName: product?.name,
            category: product?.category,
          };
        }),
      );

      return { type: "top_products", data: productsWithNames };
    }

    // Suppliers queries
    if (lowerQuery.includes("supplier")) {
      const suppliers = await prisma.supplier.findMany({
        where: { userId },
        take: 20,
        include: { product: true },
      });
      return { type: "suppliers", data: suppliers };
    }

    return null;
  } catch (error) {
    console.error("Database query error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Query the database based on user intent
    const dbResult = await queryDatabase(userId, message);

    // Check if user is asking for category-specific optimization data
    const lowerMessage = message.toLowerCase();

    // Get optimization insights only if user asks about optimization/forecasting
    const optimizationKeywords = [
      "optimize",
      "optimization",
      "risk",
      "reorder",
      "safety stock",
      "demand prediction",
      "predicted demand",
      "forecast",
      "forecasting",
      "stock level",
      "inventory level",
      "restocking",
      "replenishment",
      "ml insight",
      "ml recommendation",
      "should order",
      "best seller",
      "worst performer",
      "profitable",
      "profitability",
      "shortage",
      "utilization",
      "supply planning",
    ];

    const shouldFetchOptimization = optimizationKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    let optimizationInsights = shouldFetchOptimization
      ? await getOptimizationInsights(userId)
      : null;

    let categoryFilter: string | null = null;
    let availableCategories: string[] = [];

    if (optimizationInsights) {
      availableCategories = getCategoriesFromOptimization(optimizationInsights);
      console.log("Applying category filter for:", availableCategories);

      // Check if message mentions a specific category
      for (const category of availableCategories) {
        if (lowerMessage.includes(category.toLowerCase())) {
          console.log("Applying category filter for:", category);
          categoryFilter = category;
          optimizationInsights = filterOptimizationByCategory(
            optimizationInsights,
            category,
          );
          break;
        }
      }
    }

    // Build context for Gemini
    const systemContext = `You are an AI assistant for an inventory management system. You have access to a PostgreSQL database via Prisma with the following schema:

      Database Schema:

      1. Product Model:
        - id: String (unique identifier)
        - userId: String (user who owns the product)
        - name: String (product name)
        - category: String (product category, optional)
        - unitCost: Decimal (cost per unit)
        - price: Decimal (selling price per unit)
        - createdAt: DateTime
        - updatedAt: DateTime
        - Relations: orders[], suppliers[]

      2. Order Model:
        - id: String (unique identifier)
        - userId: String
        - productId: String
        - orderDate: DateTime
        - orderQty: Int (quantity ordered)
        - costOfSales: Decimal (total cost)
        - sales: Decimal (total sales revenue)
        - profit: Decimal (sales - cost)
        - year: Int
        - Relations: product

      3. Supplier Model:
        - id: String (unique identifier)
        - userId: String
        - productId: String (optional)
        - category: String (optional, for bulk assignment)
        - contactNumber: String (WhatsApp with country code)
        - supplierName: String (optional)
        - notes: String (optional)
        - Relations: product

      Your Capabilities:
      - Query and analyze inventory data
      - Provide insights on sales and profit trends
      - Identify top-performing products
      - Suggest inventory optimizations
      - Answer questions about products, orders, and suppliers
      - Filter optimization insights by category

      Available Categories: ${
        availableCategories.length > 0
          ? availableCategories.join(", ")
          : "Not available"
      }
      ${categoryFilter ? `\nCurrent Category Filter: ${categoryFilter}` : ""}

      Optimization Insights Available:
      ${
        optimizationInsights
          ? `The system has generated ML-based optimization recommendations including:
      - Demand predictions for products
      - Reorder points and optimal order quantities
      - Risk levels for stockouts
      - Safety stock recommendations
      - Category-wise analysis
      Summary: ${JSON.stringify(optimizationInsights.summary, null, 2)}

      Full optimization data available for ${
        optimizationInsights.recommendations?.length || 0
      } products.`
          : "No optimization data currently available."
      }

      Current Query Result:
      ${
        dbResult
          ? `Query Type: ${dbResult.type}
          Data: ${JSON.stringify(dbResult.data, null, 2)}`
          : "No direct database match for this query."
      }

      CRITICAL FORMATTING INSTRUCTIONS:
      - DO NOT use markdown syntax (no **, ##, -, etc.)
      - DO NOT use asterisks, hashes, or dashes for formatting
      - Use plain text with clear structure
      - For tables, use a special format: Start with [TABLE_START], then provide JSON array of objects, end with [TABLE_END]
      - For charts/visualizations, use format: [CHART_START]type:bar|line|pie[CHART_DATA]JSON data[CHART_END]
      - Use line breaks and indentation for clarity
      - Number lists with 1., 2., 3. instead of bullets
      - For emphasis, use CAPITAL LETTERS instead of bold

      Example table format:
      [TABLE_START]
      [{"Product":"Item A","Sales":"$1000","Profit":"$200"},{"Product":"Item B","Sales":"$1500","Profit":"$300"}]
      [TABLE_END]

      Example chart format:
      [CHART_START]type:bar[CHART_DATA]{"labels":["Jan","Feb","Mar"],"values":[100,200,150]}[CHART_END]

      Instructions:
      - Be conversational and helpful
      - When you have database results, format them using the table/chart formats above
      - Provide actionable insights and recommendations
      - If asked about specific metrics, calculate and explain them
      - Reference the optimization insights when relevant to the query
      - If you don't have specific data, acknowledge it and suggest what the user can ask
      - When showing optimization data, use tables for better readability
      - When showing trends or comparisons, suggest charts

      Important:
      - Always format currency with $ symbol
      - Format dates in a readable way (e.g., Jan 15, 2024)
      - Round decimals to 2 places for currency
      - Be concise but informative
      - Use the special table and chart formats for structured data`;

    // Build conversation history for Gemini
    const conversationText =
      conversationHistory
        ?.filter(
          (msg: Message) =>
            msg.role !== "assistant" ||
            !msg.content.includes("I'm your AI assistant"),
        )
        .slice(-6) // Keep last 6 messages for context
        .map(
          (msg: Message) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
        )
        .join("\n\n") || "";

    const fullPrompt = `${systemContext}

    Previous Conversation:
    ${conversationText}

    Current User Query: ${message}

    Please provide a helpful, accurate response based on the database results and context provided above. If you found database results, present them in a clear, structured format. If discussing optimization, reference the ML insights when relevant.`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const assistantResponse = response.text();

    return NextResponse.json({
      response: assistantResponse,
      dbQueryType: dbResult?.type,
      hasOptimizationData: !!optimizationInsights,
      categoryFilter: categoryFilter,
      availableCategories: availableCategories,
    });
  } catch (error: any) {
    console.error("Chatbot API error:", error);

    // Fallback response
    return NextResponse.json({
      response: `I apologize, but I encountered an error processing your request.

        I can help you with:
        - Product Information: "Show me all products", "How many products do we have?"
        - Sales Analysis: "What are the recent orders?", "Total sales and profit"
        - Performance: "Which products are most profitable?"
        - Suppliers: "List all suppliers"
        - Optimization: "What products need restocking?", "Show risk analysis"

        Please try rephrasing your question, and I'll do my best to assist!

        Error details: ${error.message || "Unknown error"}`,
    });
  }
}
