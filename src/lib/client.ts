import { treaty } from "@elysiajs/eden";
import type { App } from "../app/api/[[...slugs]]/route";

// use environment variable
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
export const client = treaty<App>(baseUrl).api;
