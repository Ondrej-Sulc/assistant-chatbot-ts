import { google, sheets_v4 } from "googleapis";
import { JWT } from "google-auth-library";
import { config } from "../config";

class SheetsService {
  private sheets: sheets_v4.Sheets;

  // The constructor initializes the service by authenticating with Google.
  constructor() {
    if (!config.GOOGLE_CREDENTIALS_JSON) {
      throw new Error(
        "GOOGLE_CREDENTIALS_JSON is not defined in the .env file."
      );
    }
    const credentials = JSON.parse(config.GOOGLE_CREDENTIALS_JSON as string);
    const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes,
    });
    this.sheets = google.sheets({ version: "v4", auth });
  }

  /**
   * Reads data from a specified range in a Google Sheet.
   * @param spreadsheetId The ID of the spreadsheet.
   * @param range The A1 notation of the range to retrieve.
   * @returns A 2D array of the data, or null if no data is found.
   */
  public async readSheet(
    spreadsheetId: string,
    range: string
  ): Promise<any[][] | null> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      return response.data.values || null;
    } catch (error) {
      console.error("Error reading from Google Sheets:", error);
      // Re-throw the error to be handled by the calling function
      throw new Error("Failed to read from Google Sheets.");
    }
  }
}
