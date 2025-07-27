import { config } from "../config";
import { handleError } from "./errorHandler";
import { NotionPagePropertiesInput } from "../types/notion";

const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export interface NotionQueryDatabaseRequest {
  filter?: object;
  sorts?: object[];
  page_size?: number;
  start_cursor?: string;
}

export interface NotionPage {
  properties: any;
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
  properties: NotionPagePropertiesInput;
}

export interface NotionUpdatePageResponse {
  object: string;
  id: string;
  properties: NotionPagePropertiesInput;
  // ...add more as needed
}

export interface NotionCreatePageRequest {
  parent: { database_id: string };
  properties: NotionPagePropertiesInput;
  children?: any[];
  icon?: any;
  cover?: any;
}

export interface NotionCreatePageResponse {
  object: string;
  id: string;
  properties: NotionPagePropertiesInput;
  // ...add more as needed
}

/**
 * Service for interacting with the Notion API.
 */
export class NotionService {
  private apiKey: string;

  /**
   * Creates an instance of NotionService.
   * @param apiKey - The Notion API key.
   */
  constructor(apiKey: string) {
    if (!apiKey) throw new Error("NOTION_API_KEY is not set in environment.");
    this.apiKey = apiKey;
  }

  async queryDatabase(
    /**
     * Queries a Notion database.
     * @param databaseId - The ID of the database to query.
     * @param query - The query parameters.
     * @returns A promise that resolves to a NotionQueryDatabaseResponse.
     */
    databaseId: string,
    query: NotionQueryDatabaseRequest = {}
  ): Promise<NotionQueryDatabaseResponse> {
    try {
      const res = await fetch(
        `${NOTION_API_URL}/databases/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
          },
          body: JSON.stringify(query),
        }
      );
      if (!res.ok) {
        const errorText = await res.text();
        const { errorId } = handleError(
          new Error(`Notion API error: ${res.status} ${errorText}`),
          {
            location: "notionService:queryDatabase",
            extra: { databaseId, query, status: res.status },
          }
        );
        throw new Error(
          `Failed to query Notion database. (Error ID: ${errorId})`
        );
      }
      return res.json();
    } catch (error) {
      const { errorId } = handleError(error, {
        location: "notionService:queryDatabase",
        extra: { databaseId, query },
      });
      throw new Error(
        `Failed to query Notion database. (Error ID: ${errorId})`
      );
    }
  }

  async updatePage(
    /**
     * Updates a Notion page.
     * @param pageId - The ID of the page to update.
     * @param update - The update parameters.
     * @returns A promise that resolves to a NotionUpdatePageResponse.
     */
    pageId: string,
    update: NotionUpdatePageRequest
  ): Promise<NotionUpdatePageResponse> {
    try {
      const res = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION,
        },
        body: JSON.stringify(update),
      });
      if (!res.ok) {
        const errorText = await res.text();
        const { errorId } = handleError(
          new Error(`Notion API error: ${res.status} ${errorText}`),
          {
            location: "notionService:updatePage",
            extra: { pageId, update, status: res.status },
          }
        );
        throw new Error(`Failed to update Notion page. (Error ID: ${errorId})`);
      }
      return res.json();
    } catch (error) {
      const { errorId } = handleError(error, {
        location: "notionService:updatePage",
        extra: { pageId, update },
      });
      throw new Error(`Failed to update Notion page. (Error ID: ${errorId})`);
    }
  }

  async createPage(
    /**
     * Creates a new Notion page.
     * @param create - The creation parameters.
     * @returns A promise that resolves to a NotionCreatePageResponse.
     */
    create: NotionCreatePageRequest
  ): Promise<NotionCreatePageResponse> {
    try {
      const res = await fetch(`${NOTION_API_URL}/pages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION,
        },
        body: JSON.stringify(create),
      });
      if (!res.ok) {
        const errorText = await res.text();
        const { errorId } = handleError(
          new Error(`Notion API error: ${res.status} ${errorText}`),
          {
            location: "notionService:createPage",
            extra: { create },
          }
        );
        throw new Error(`Failed to create Notion page. (Error ID: ${errorId})`);
      }
      return res.json();
    } catch (error) {
      const { errorId } = handleError(error, {
        location: "notionService:createPage",
        extra: { create },
      });
      throw new Error(`Failed to create Notion page. (Error ID: ${errorId})`);
    }
  }
}

export const notionService = new NotionService(config.NOTION_API_KEY!);
