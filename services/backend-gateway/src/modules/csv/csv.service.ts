import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/logger/logger.service';
import { parse, Parser } from 'csv-parse';
import { stringify, Stringifier } from 'csv-stringify';
import { Readable, Transform, PassThrough } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

export interface CsvParseOptions {
  /** Column delimiter (default: ',') */
  delimiter?: string;
  /** Skip first N lines */
  skipLines?: number;
  /** Treat first row as headers */
  headers?: boolean | string[];
  /** Custom column names */
  columns?: string[] | boolean | ((record: any) => string[]);
  /** Skip empty lines */
  skipEmptyLines?: boolean;
  /** Trim whitespace from values */
  trim?: boolean;
  /** Cast values to native types (numbers, booleans) */
  cast?: boolean;
  /** Character encoding */
  encoding?: BufferEncoding;
  /** Quote character */
  quote?: string;
  /** Escape character */
  escape?: string;
  /** Record delimiter (newline) */
  recordDelimiter?: string | string[];
  /** Max records to parse (for preview) */
  maxRecords?: number;
  /** Comment character (lines starting with this are skipped) */
  comment?: string;
}

export interface CsvStringifyOptions {
  /** Column headers */
  headers?: boolean | string[];
  /** Columns to include */
  columns?: string[] | { key: string; header?: string }[];
  /** Column delimiter (default: ',') */
  delimiter?: string;
  /** Quote character */
  quote?: string;
  /** Quote all fields */
  quoted?: boolean;
  /** Record delimiter (newline) */
  recordDelimiter?: string;
  /** Include BOM for Excel compatibility */
  bom?: boolean;
  /** Cast values before stringifying */
  cast?: {
    boolean?: (value: boolean) => string;
    date?: (value: Date) => string;
    number?: (value: number) => string;
    object?: (value: object) => string;
    string?: (value: string) => string;
  };
}

export interface CsvParseResult<T = Record<string, any>> {
  data: T[];
  rowCount: number;
  headers?: string[];
  errors: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * CsvService - Service for CSV import/export operations
 * Uses csv-parse and csv-stringify for robust CSV handling
 */
@Injectable()
export class CsvService {
  private uploadDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.uploadDir = this.configService.get('UPLOAD_DIRECTORY') || './uploads';
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    const csvDir = path.join(this.uploadDir, 'csv');
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }
  }

  /**
   * Parse CSV string to array of objects
   */
  async parseString<T = Record<string, any>>(
    csvString: string,
    options: CsvParseOptions = {},
  ): Promise<CsvParseResult<T>> {
    return new Promise((resolve, reject) => {
      const records: T[] = [];
      const errors: Array<{ row: number; message: string }> = [];
      let headers: string[] | undefined;
      let rowCount = 0;

      const parser = parse({
        delimiter: options.delimiter || ',',
        from_line: (options.skipLines || 0) + 1,
        columns: options.headers === true ? true : options.columns || options.headers,
        skip_empty_lines: options.skipEmptyLines !== false,
        trim: options.trim !== false,
        cast: options.cast,
        quote: options.quote || '"',
        escape: options.escape || '"',
        record_delimiter: options.recordDelimiter,
        to_line: options.maxRecords ? (options.skipLines || 0) + options.maxRecords + 1 : undefined,
        comment: options.comment,
        relax_column_count: true,
        skip_records_with_error: true,
        on_record: (record, context) => {
          rowCount++;
          if (context.lines === 1 && options.headers === true) {
            headers = Object.keys(record);
          }
          return record;
        },
      });

      parser.on('readable', () => {
        let record: T;
        while ((record = parser.read()) !== null) {
          records.push(record);
        }
      });

      parser.on('skip', (err) => {
        errors.push({
          row: err.lines || rowCount,
          message: err.message,
        });
      });

      parser.on('error', (err) => {
        this.logger.error('CSV parse error', err, 'CsvService');
        reject(err);
      });

      parser.on('end', () => {
        resolve({
          data: records,
          rowCount: records.length,
          headers,
          errors,
        });
      });

      parser.write(csvString);
      parser.end();
    });
  }

  /**
   * Parse CSV file to array of objects
   */
  async parseFile<T = Record<string, any>>(
    filePath: string,
    options: CsvParseOptions = {},
  ): Promise<CsvParseResult<T>> {
    const content = await fs.promises.readFile(filePath, {
      encoding: options.encoding || 'utf-8',
    });
    return this.parseString<T>(content, options);
  }

  /**
   * Parse CSV buffer to array of objects
   */
  async parseBuffer<T = Record<string, any>>(
    buffer: Buffer,
    options: CsvParseOptions = {},
  ): Promise<CsvParseResult<T>> {
    const content = buffer.toString(options.encoding || 'utf-8');
    return this.parseString<T>(content, options);
  }

  /**
   * Create a streaming CSV parser
   * For processing large files without loading everything into memory
   */
  createParseStream(options: CsvParseOptions = {}): Parser {
    return parse({
      delimiter: options.delimiter || ',',
      from_line: (options.skipLines || 0) + 1,
      columns: options.headers === true ? true : options.columns || options.headers,
      skip_empty_lines: options.skipEmptyLines !== false,
      trim: options.trim !== false,
      cast: options.cast,
      quote: options.quote || '"',
      escape: options.escape || '"',
      comment: options.comment,
      relax_column_count: true,
      skip_records_with_error: true,
    });
  }

  /**
   * Convert array of objects to CSV string
   */
  async stringify<T = Record<string, any>>(
    data: T[],
    options: CsvStringifyOptions = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];

      const stringifier = stringify({
        header: options.headers !== false,
        columns: options.columns as any,
        delimiter: options.delimiter || ',',
        quote: options.quote || '"',
        quoted: options.quoted,
        record_delimiter: options.recordDelimiter || '\n',
        bom: options.bom,
        cast: options.cast as any,
      });

      stringifier.on('readable', () => {
        let chunk: string;
        while ((chunk = stringifier.read()) !== null) {
          chunks.push(chunk);
        }
      });

      stringifier.on('error', (err) => {
        this.logger.error('CSV stringify error', err, 'CsvService');
        reject(err);
      });

      stringifier.on('finish', () => {
        resolve(chunks.join(''));
      });

      for (const record of data) {
        stringifier.write(record);
      }
      stringifier.end();
    });
  }

  /**
   * Convert array of objects to CSV buffer
   */
  async stringifyToBuffer<T = Record<string, any>>(
    data: T[],
    options: CsvStringifyOptions = {},
  ): Promise<Buffer> {
    const csvString = await this.stringify(data, options);
    return Buffer.from(csvString, 'utf-8');
  }

  /**
   * Convert array of objects to CSV file
   */
  async stringifyToFile<T = Record<string, any>>(
    data: T[],
    filename: string,
    options: CsvStringifyOptions = {},
  ): Promise<string> {
    const csvString = await this.stringify(data, options);
    const filePath = path.join(this.uploadDir, 'csv', filename);

    await fs.promises.writeFile(filePath, csvString, 'utf-8');
    this.logger.log(`CSV file created: ${filePath}`, 'CsvService');

    return filePath;
  }

  /**
   * Create a streaming CSV stringifier
   * For generating large CSV files without loading everything into memory
   */
  createStringifyStream(options: CsvStringifyOptions = {}): Stringifier {
    return stringify({
      header: options.headers !== false,
      columns: options.columns as any,
      delimiter: options.delimiter || ',',
      quote: options.quote || '"',
      quoted: options.quoted,
      record_delimiter: options.recordDelimiter || '\n',
      bom: options.bom,
      cast: options.cast as any,
    });
  }

  /**
   * Transform JSON stream to CSV stream
   */
  createJsonToCsvTransform(options: CsvStringifyOptions = {}): Transform {
    const stringifier = this.createStringifyStream(options);

    const transform = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        stringifier.write(chunk);
        callback();
      },
      flush(callback) {
        stringifier.end();
        callback();
      },
    });

    stringifier.on('data', (chunk) => transform.push(chunk));
    stringifier.on('error', (err) => transform.destroy(err));

    return transform;
  }

  /**
   * Preview CSV file (parse first N rows)
   */
  async previewFile(
    filePath: string,
    maxRows: number = 10,
    options: CsvParseOptions = {},
  ): Promise<CsvParseResult> {
    return this.parseFile(filePath, {
      ...options,
      maxRecords: maxRows,
    });
  }

  /**
   * Validate CSV structure against expected columns
   */
  async validateStructure(
    csvString: string,
    expectedColumns: string[],
    options: CsvParseOptions = {},
  ): Promise<{
    valid: boolean;
    missingColumns: string[];
    extraColumns: string[];
    actualColumns: string[];
  }> {
    const result = await this.parseString(csvString, {
      ...options,
      headers: true,
      maxRecords: 1,
    });

    const actualColumns = result.headers || [];
    const missingColumns = expectedColumns.filter(
      (col) => !actualColumns.includes(col),
    );
    const extraColumns = actualColumns.filter(
      (col) => !expectedColumns.includes(col),
    );

    return {
      valid: missingColumns.length === 0,
      missingColumns,
      extraColumns,
      actualColumns,
    };
  }

  /**
   * Convert CSV to JSON for API response
   */
  async csvToJson<T = Record<string, any>>(
    csvData: string | Buffer,
    options: CsvParseOptions = {},
  ): Promise<T[]> {
    const content = Buffer.isBuffer(csvData)
      ? csvData.toString(options.encoding || 'utf-8')
      : csvData;

    const result = await this.parseString<T>(content, {
      ...options,
      headers: true,
    });

    return result.data;
  }

  /**
   * Convert JSON to CSV for download
   */
  async jsonToCsv<T = Record<string, any>>(
    jsonData: T[],
    options: CsvStringifyOptions = {},
  ): Promise<string> {
    return this.stringify(jsonData, options);
  }

  /**
   * Export data with formatted headers
   */
  async exportWithHeaders<T extends Record<string, any>>(
    data: T[],
    headerMapping: Record<keyof T, string>,
    options: CsvStringifyOptions = {},
  ): Promise<string> {
    const columns = Object.entries(headerMapping).map(([key, header]) => ({
      key,
      header: header as string,
    }));

    return this.stringify(data, {
      ...options,
      columns,
      headers: true,
    });
  }
}
