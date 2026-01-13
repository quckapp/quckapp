import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/logger/logger.service';
import * as xml2js from 'xml2js';

export interface XmlParseOptions {
  /** Treat attributes as regular properties */
  mergeAttrs?: boolean;
  /** Attribute name prefix (default: '$') */
  attrPrefix?: string;
  /** Always put child nodes in array */
  explicitArray?: boolean;
  /** Remove root element wrapper */
  explicitRoot?: boolean;
  /** Trim whitespace from text content */
  trim?: boolean;
  /** Normalize whitespace in text content */
  normalize?: boolean;
  /** Parse tag names as lowercase */
  normalizeTags?: boolean;
  /** Parse attribute names as lowercase */
  attrNameProcessors?: ((name: string) => string)[];
  /** Parse tag names */
  tagNameProcessors?: ((name: string) => string)[];
  /** Parse text values */
  valueProcessors?: ((value: string, name: string) => any)[];
  /** Parse attribute values */
  attrValueProcessors?: ((value: string, name: string) => any)[];
  /** Preserve child node order */
  preserveChildrenOrder?: boolean;
  /** Character to use for character data */
  charkey?: string;
  /** Character to use for attributes */
  attrkey?: string;
  /** Ignore attributes */
  ignoreAttrs?: boolean;
}

export interface XmlBuildOptions {
  /** Root element name */
  rootName?: string;
  /** XML declaration */
  xmldec?: {
    version?: string;
    encoding?: string;
    standalone?: boolean;
  };
  /** Pretty print with indentation */
  pretty?: boolean;
  /** Indentation string (default: '  ') */
  indent?: string;
  /** Newline character */
  newline?: string;
  /** Render as CDATA */
  cdata?: boolean;
  /** Character to use for character data */
  charkey?: string;
  /** Character to use for attributes */
  attrkey?: string;
  /** Render empty tags as self-closing */
  allowSurrogateChars?: boolean;
  /** Head before content */
  headless?: boolean;
}

/**
 * XmlService - Service for XML parsing and generation
 * Uses xml2js for bidirectional XML/JSON conversion
 */
@Injectable()
export class XmlService {
  private defaultParser: xml2js.Parser;
  private defaultBuilder: xml2js.Builder;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.defaultParser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      trim: true,
    });

    this.defaultBuilder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ', newline: '\n' },
    });
  }

  /**
   * Parse XML string to JavaScript object
   */
  async parse<T = any>(
    xml: string,
    options: XmlParseOptions = {},
  ): Promise<T> {
    const parser = new xml2js.Parser({
      explicitArray: options.explicitArray ?? false,
      mergeAttrs: options.mergeAttrs ?? true,
      trim: options.trim ?? true,
      normalize: options.normalize,
      normalizeTags: options.normalizeTags,
      explicitRoot: options.explicitRoot ?? true,
      attrNameProcessors: options.attrNameProcessors,
      tagNameProcessors: options.tagNameProcessors,
      valueProcessors: options.valueProcessors,
      attrValueProcessors: options.attrValueProcessors,
      preserveChildrenOrder: options.preserveChildrenOrder,
      charkey: options.charkey || '_',
      attrkey: options.attrkey || '$',
      ignoreAttrs: options.ignoreAttrs,
    });

    try {
      const result = await parser.parseStringPromise(xml);
      return result as T;
    } catch (error) {
      this.logger.error('XML parse error', error, 'XmlService');
      throw new Error(`Failed to parse XML: ${error.message}`);
    }
  }

  /**
   * Parse XML buffer to JavaScript object
   */
  async parseBuffer<T = any>(
    buffer: Buffer,
    options: XmlParseOptions = {},
  ): Promise<T> {
    const xml = buffer.toString('utf-8');
    return this.parse<T>(xml, options);
  }

  /**
   * Build XML string from JavaScript object
   */
  build(obj: any, options: XmlBuildOptions = {}): string {
    const builder = new xml2js.Builder({
      rootName: options.rootName || 'root',
      xmldec: options.xmldec ? {
        version: options.xmldec.version || '1.0',
        encoding: options.xmldec.encoding || 'UTF-8',
        standalone: options.xmldec.standalone,
      } : { version: '1.0', encoding: 'UTF-8' },
      renderOpts: {
        pretty: options.pretty ?? true,
        indent: options.indent ?? '  ',
        newline: options.newline ?? '\n',
      },
      cdata: options.cdata,
      charkey: options.charkey || '_',
      attrkey: options.attrkey || '$',
      headless: options.headless,
      allowSurrogateChars: options.allowSurrogateChars,
    });

    try {
      return builder.buildObject(obj);
    } catch (error) {
      this.logger.error('XML build error', error, 'XmlService');
      throw new Error(`Failed to build XML: ${error.message}`);
    }
  }

  /**
   * Build XML buffer from JavaScript object
   */
  buildBuffer(obj: any, options: XmlBuildOptions = {}): Buffer {
    const xml = this.build(obj, options);
    return Buffer.from(xml, 'utf-8');
  }

  /**
   * Convert JSON to XML
   */
  jsonToXml(
    json: string | object,
    rootName: string = 'root',
    options: XmlBuildOptions = {},
  ): string {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return this.build(obj, { ...options, rootName });
  }

  /**
   * Convert XML to JSON
   */
  async xmlToJson(
    xml: string,
    options: XmlParseOptions = {},
  ): Promise<string> {
    const obj = await this.parse(xml, options);
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Validate XML structure (basic validation)
   */
  async validate(xml: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      await this.defaultParser.parseStringPromise(xml);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract specific element from XML
   */
  async extractElement<T = any>(
    xml: string,
    elementPath: string,
    options: XmlParseOptions = {},
  ): Promise<T | null> {
    const obj = await this.parse(xml, options);
    const paths = elementPath.split('.');

    let current: any = obj;
    for (const path of paths) {
      if (current && typeof current === 'object' && path in current) {
        current = current[path];
      } else {
        return null;
      }
    }

    return current as T;
  }

  /**
   * Transform XML using a transformer function
   */
  async transform<T = any>(
    xml: string,
    transformer: (obj: any) => T,
    options: XmlParseOptions = {},
  ): Promise<T> {
    const obj = await this.parse(xml, options);
    return transformer(obj);
  }

  /**
   * Create SOAP envelope wrapper
   */
  createSoapEnvelope(
    body: object,
    header?: object,
    options: {
      namespace?: string;
      prefix?: string;
    } = {},
  ): string {
    const ns = options.namespace || 'http://schemas.xmlsoap.org/soap/envelope/';
    const prefix = options.prefix || 'soap';

    const envelope: any = {
      [`${prefix}:Envelope`]: {
        $: {
          [`xmlns:${prefix}`]: ns,
        },
      },
    };

    if (header) {
      envelope[`${prefix}:Envelope`][`${prefix}:Header`] = header;
    }

    envelope[`${prefix}:Envelope`][`${prefix}:Body`] = body;

    return this.build(envelope, { headless: false, rootName: undefined } as any);
  }

  /**
   * Parse SOAP envelope and extract body
   */
  async parseSoapEnvelope<T = any>(xml: string): Promise<{
    header?: any;
    body: T;
  }> {
    const obj = await this.parse(xml, { explicitArray: false });

    // Find envelope regardless of prefix
    const envelopeKey = Object.keys(obj).find((key) =>
      key.toLowerCase().includes('envelope'),
    );

    if (!envelopeKey) {
      throw new Error('Invalid SOAP envelope: No Envelope element found');
    }

    const envelope = obj[envelopeKey];

    // Find body
    const bodyKey = Object.keys(envelope).find((key) =>
      key.toLowerCase().includes('body'),
    );

    if (!bodyKey) {
      throw new Error('Invalid SOAP envelope: No Body element found');
    }

    // Find header (optional)
    const headerKey = Object.keys(envelope).find((key) =>
      key.toLowerCase().includes('header'),
    );

    return {
      header: headerKey ? envelope[headerKey] : undefined,
      body: envelope[bodyKey] as T,
    };
  }

  /**
   * Format XML with proper indentation
   */
  async formatXml(xml: string): Promise<string> {
    const obj = await this.parse(xml);
    return this.build(obj, { pretty: true, indent: '  ' });
  }

  /**
   * Minify XML (remove whitespace)
   */
  async minifyXml(xml: string): Promise<string> {
    const obj = await this.parse(xml);
    return this.build(obj, { pretty: false });
  }
}
