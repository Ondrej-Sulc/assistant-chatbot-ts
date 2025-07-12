import { config } from "../config";

const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export interface NotionQueryDatabaseRequest {
  filter?: object;
  sorts?: object[];
  page_size?: number;
  start_cursor?: string;
}

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  // ...add more as needed
}

export interface NotionQueryDatabaseResponse {
  object: string;
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface NotionUpdatePageRequest {
  properties: Record<string, any>;
}

export interface NotionUpdatePageResponse {
  object: string;
  id: string;
  properties: Record<string, any>;
  // ...add more as needed
}

export interface NotionCreatePageRequest {
  parent: { database_id: string };
  properties: Record<string, any>;
  children?: any[];
  icon?: any;
  cover?: any;
}

export interface NotionCreatePageResponse {
  object: string;
  id: string;
  properties: Record<string, any>;
  // ...add more as needed
}

export class NotionService {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("NOTION_API_KEY is not set in environment.");
    this.apiKey = apiKey;
  }

  async queryDatabase(databaseId: string, query: NotionQueryDatabaseRequest = {}): Promise<NotionQueryDatabaseResponse> {
    const res = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify(query),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Notion API error: ${res.status} ${errorText}`);
    }
    return res.json();
  }

  async updatePage(pageId: string, update: NotionUpdatePageRequest): Promise<NotionUpdatePageResponse> {
    const res = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Notion API error: ${res.status} ${errorText}`);
    }
    return res.json();
  }

  async createPage(create: NotionCreatePageRequest): Promise<NotionCreatePageResponse> {
    const res = await fetch(`${NOTION_API_URL}/pages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify(create),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Notion API error: ${res.status} ${errorText}`);
    }
    return res.json();
  }
}

export const notionService = new NotionService(config.NOTION_API_KEY!); 