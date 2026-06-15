import {
    tool,
    ToolLoopAgent,
    type InferAgentUIMessage, 
    type UIToolInvocation,
} from "ai"; 
import { z } from "zod"; 
import { ApiRequestError, getCategories, getProducts, getProductById } from "@/lib/api"; 
import { start } from "workflow/api";
import { returnFlow } from "./workflows/return-flow";

export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;
export type ProductDetailsToolInvocation = UIToolInvocation<typeof getProductDetails>;

const getAllCategories = tool({
  description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const categories = await getCategories();
      return {
        count: categories.length,
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          productCount: c.productCount,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, categories: [], error: message };
    }
  },
});

const getProductDetails = tool({
  description: `Get details for a specific product in the Vercel swag store. Use this when the user asks about a specific product, or wants to know more about a product they are interested in.`,
  inputSchema: z.object({
    slug: z.string().describe(`The slug of the product to get details for.`),
  }),
  execute: async ({ slug }) => {
    try {
      const product = await getProductById(slug);
      if (!product) {
        return { error: `No product found with slug "${slug}".` };
      }
      const p = product;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        currency: p.currency,
        category: p.category,
        description: p.description,
        images: p.images,
        tags: p.tags,
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

const searchProducts = tool({
  description: `Search the Vercel swag store product catalog. Use this whenever the user asks about products, what the store sells, or wants recommendations. Optionally narrow results to a single category.`,
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        `Optional free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
      ),
    category: z 
      .string() 
      .optional() 
      .describe( 
        `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`, 
      ), 
  }),
  
  execute: async ({ query, category }) => { 
    try {
      const products = await getProducts({
        search: query,
        category, 
        limit: 10,
      });
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          currency: p.currency,
          category: p.category,
          description: p.description,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, products: [], error: message };
    }
  },
});

const processReturn = tool({
  description: `File a return for one of the user's orders. The user must provide an order ID. Valid order IDs in this demo are 11111, 22222, 33333, 44444, 55555. Returns immediately.`,
  inputSchema: z.object({
    orderId: z
      .string()
      .describe("The order ID the user wants to return."),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the user is returning the order."),
  }),
  execute: async ({ orderId, reason }) => {
    try {
      const run = await start(returnFlow, [orderId, reason]);
      return {
        runId: run.runId,
        message: `Return filed for order ${orderId}.`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

export const shoppingAgent = new ToolLoopAgent({
  model: "openai/gpt-5-nano",
  instructions: `You are a helpful assistant for the Vercel swag store. When the user asks about products, availability, or recommendations, use the searchProducts tool to look up real catalog data before answering.
  When asked about a type or category of product use the getAllCategories tool for getting valid categories before using searchProducts
  When the user asks about a specific product use the getProductDetails tool for getting details. You can find the ID or slug after using searchProducts.
  When the user wants to return an order use the processReturn tool. Ask for the order ID and reason if they haven't given them. Valid demo order IDs are 11111-55555.`, 
  tools: { searchProducts, getAllCategories, getProductDetails, processReturn }, 
});