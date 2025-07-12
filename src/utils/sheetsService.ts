import { google, sheets_v4 } from "googleapis";
import { JWT } from "google-auth-library";
import { config } from "../config";

// Type for Google service account credentials
interface GoogleCredentials {
  client_email: string;
  private_key: string;
  [key: string]: any;
}

class SheetsService {
  private sheets: sheets_v4.Sheets;

  // The constructor initializes the service by authenticating with Google.
  constructor() {
    if (!config.GOOGLE_CREDENTIALS_JSON) {
      throw new Error(
        "GOOGLE_CREDENTIALS_JSON is not defined in the .env file."
      );
    }
    const credentials: GoogleCredentials = JSON.parse(config.GOOGLE_CREDENTIALS_JSON as string);
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

  /**
   * Writes data to a specified range in a Google Sheet.
   * This will overwrite any existing data in the range.
   * @param spreadsheetId The ID of the spreadsheet.
   * @param range The A1 notation of the range to write to.
   * @param values A 2D array of data to write.
   * @returns The number of cells updated.
   */
  public async writeSheet(spreadsheetId: string, range: string, values: any[][]): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });
      return response.data.updatedCells || 0;
    } catch (error) {
      console.error('Error writing to Google Sheets:', error);
      throw new Error('Failed to write to Google Sheets.');
    }
  }

  /**
   * Appends data to a sheet. This is useful for logging.
   * Google Sheets will find the first empty row in the table and add the data there.
   * @param spreadsheetId The ID of the spreadsheet.
   * @param range The A1 notation of the table to append to (e.g., 'Logs!A1').
   * @param values A 2D array of data to append.
   * @returns The number of cells appended.
   */
  public async appendSheet(spreadsheetId: string, range: string, values: any[][]): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
      return response.data.updates?.updatedCells || 0;
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      throw new Error('Failed to append to Google Sheets.');
    }
  }
}

export const sheetsService = new SheetsService();