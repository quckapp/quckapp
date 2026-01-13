import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/logger/logger.service';
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export interface PdfOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  size?: 'A4' | 'Letter' | 'Legal' | [number, number];
  layout?: 'portrait' | 'landscape';
}

export interface ChatExportData {
  conversationName: string;
  participants: string[];
  messages: Array<{
    sender: string;
    content: string;
    timestamp: Date;
    type: 'text' | 'image' | 'file' | 'audio' | 'video';
  }>;
  exportedAt: Date;
  exportedBy: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  dueDate?: Date;
  from: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  to: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  notes?: string;
  currency?: string;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  generatedBy: string;
  sections: Array<{
    title: string;
    content: string;
    data?: Array<{ label: string; value: string | number }>;
  }>;
  footer?: string;
}

/**
 * PdfService - Service for generating PDF documents
 * Uses pdfkit for PDF generation
 */
@Injectable()
export class PdfService {
  private uploadDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.uploadDir =
      this.configService.get('UPLOAD_DIRECTORY') || './uploads';
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    const pdfDir = path.join(this.uploadDir, 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
  }

  /**
   * Generate a PDF buffer from content
   */
  async generatePdfBuffer(
    contentFn: (doc: PDFKit.PDFDocument) => void,
    options: PdfOptions = {},
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const doc = new PDFDocument({
        size: options.size || 'A4',
        layout: options.layout || 'portrait',
        margins: {
          top: options.margins?.top || 50,
          bottom: options.margins?.bottom || 50,
          left: options.margins?.left || 50,
          right: options.margins?.right || 50,
        },
        info: {
          Title: options.title || 'QuickChat Document',
          Author: options.author || 'QuickChat',
          Subject: options.subject || '',
          Keywords: options.keywords?.join(', ') || '',
          CreationDate: new Date(),
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        contentFn(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate a PDF file and save to disk
   */
  async generatePdfFile(
    filename: string,
    contentFn: (doc: PDFKit.PDFDocument) => void,
    options: PdfOptions = {},
  ): Promise<string> {
    const buffer = await this.generatePdfBuffer(contentFn, options);
    const filePath = path.join(this.uploadDir, 'pdfs', filename);

    await fs.promises.writeFile(filePath, buffer);
    this.logger.log(`PDF generated: ${filePath}`, 'PdfService');

    return filePath;
  }

  /**
   * Generate a chat export PDF
   */
  async generateChatExport(data: ChatExportData): Promise<Buffer> {
    return this.generatePdfBuffer(
      (doc) => {
        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('Chat Export', { align: 'center' });

        doc.moveDown();

        // Conversation info
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(data.conversationName);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Participants: ${data.participants.join(', ')}`);

        doc.text(
          `Exported: ${data.exportedAt.toLocaleString()} by ${data.exportedBy}`,
        );

        doc.moveDown();
        doc
          .strokeColor('#cccccc')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke();

        doc.moveDown();

        // Messages
        for (const message of data.messages) {
          const timestamp = new Date(message.timestamp).toLocaleString();

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#333333')
            .text(`${message.sender}`, { continued: true })
            .font('Helvetica')
            .fillColor('#666666')
            .text(` - ${timestamp}`);

          if (message.type === 'text') {
            doc
              .fontSize(11)
              .font('Helvetica')
              .fillColor('#000000')
              .text(message.content, { indent: 10 });
          } else {
            doc
              .fontSize(11)
              .font('Helvetica-Oblique')
              .fillColor('#888888')
              .text(`[${message.type.toUpperCase()}]`, { indent: 10 });
          }

          doc.moveDown(0.5);
        }

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#999999')
          .text(
            `Generated by QuickChat - ${new Date().toISOString()}`,
            50,
            doc.page.height - 50,
            { align: 'center' },
          );
      },
      {
        title: `Chat Export - ${data.conversationName}`,
        subject: 'Chat conversation export',
        keywords: ['chat', 'export', 'messages'],
      },
    );
  }

  /**
   * Generate an invoice PDF
   */
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    const currency = data.currency || 'USD';

    return this.generatePdfBuffer(
      (doc) => {
        // Header
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .text('INVOICE', { align: 'right' });

        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Invoice #: ${data.invoiceNumber}`, { align: 'right' });

        doc.text(`Date: ${data.date.toLocaleDateString()}`, { align: 'right' });

        if (data.dueDate) {
          doc.text(`Due Date: ${data.dueDate.toLocaleDateString()}`, {
            align: 'right',
          });
        }

        doc.moveDown(2);

        // From/To section
        const startY = doc.y;

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('From:', 50, startY);

        doc
          .fontSize(11)
          .font('Helvetica')
          .text(data.from.name, 50);

        if (data.from.address) doc.text(data.from.address, 50);
        if (data.from.email) doc.text(data.from.email, 50);
        if (data.from.phone) doc.text(data.from.phone, 50);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('To:', 300, startY);

        doc
          .fontSize(11)
          .font('Helvetica')
          .text(data.to.name, 300);

        if (data.to.address) doc.text(data.to.address, 300);
        if (data.to.email) doc.text(data.to.email, 300);
        if (data.to.phone) doc.text(data.to.phone, 300);

        doc.moveDown(3);

        // Table header
        const tableTop = doc.y;
        const colWidths = [250, 60, 80, 80];
        const colX = [50, 300, 360, 440];

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .rect(50, tableTop, 470, 25)
          .fill('#333333');

        doc
          .fillColor('#ffffff')
          .text('Description', colX[0] + 10, tableTop + 7)
          .text('Qty', colX[1] + 10, tableTop + 7)
          .text('Unit Price', colX[2] + 10, tableTop + 7)
          .text('Total', colX[3] + 10, tableTop + 7);

        // Table rows
        let rowY = tableTop + 25;
        doc.fillColor('#000000').font('Helvetica');

        data.items.forEach((item, index) => {
          const bgColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';

          doc.rect(50, rowY, 470, 25).fill(bgColor);

          doc
            .fillColor('#000000')
            .text(item.description, colX[0] + 10, rowY + 7, { width: 240 })
            .text(item.quantity.toString(), colX[1] + 10, rowY + 7)
            .text(`${currency} ${item.unitPrice.toFixed(2)}`, colX[2] + 10, rowY + 7)
            .text(`${currency} ${item.total.toFixed(2)}`, colX[3] + 10, rowY + 7);

          rowY += 25;
        });

        // Totals
        rowY += 20;

        doc
          .font('Helvetica')
          .text('Subtotal:', 360, rowY)
          .text(`${currency} ${data.subtotal.toFixed(2)}`, 440, rowY);

        if (data.tax !== undefined) {
          rowY += 20;
          const taxLabel = data.taxRate
            ? `Tax (${data.taxRate}%):`
            : 'Tax:';
          doc
            .text(taxLabel, 360, rowY)
            .text(`${currency} ${data.tax.toFixed(2)}`, 440, rowY);
        }

        rowY += 25;
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .text('Total:', 360, rowY)
          .text(`${currency} ${data.total.toFixed(2)}`, 440, rowY);

        // Notes
        if (data.notes) {
          doc.moveDown(3);
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Notes:');

          doc.font('Helvetica').text(data.notes);
        }

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#999999')
          .text('Thank you for your business!', 50, doc.page.height - 50, {
            align: 'center',
          });
      },
      {
        title: `Invoice ${data.invoiceNumber}`,
        subject: 'Invoice',
        keywords: ['invoice', 'payment', 'billing'],
      },
    );
  }

  /**
   * Generate a report PDF
   */
  async generateReport(data: ReportData): Promise<Buffer> {
    return this.generatePdfBuffer(
      (doc) => {
        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text(data.title, { align: 'center' });

        if (data.subtitle) {
          doc
            .fontSize(14)
            .font('Helvetica')
            .fillColor('#666666')
            .text(data.subtitle, { align: 'center' });
        }

        doc.moveDown();

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#888888')
          .text(
            `Generated: ${data.generatedAt.toLocaleString()} by ${data.generatedBy}`,
            { align: 'center' },
          );

        doc.moveDown(2);

        // Sections
        for (const section of data.sections) {
          doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#333333')
            .text(section.title);

          doc.moveDown(0.5);

          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#000000')
            .text(section.content);

          if (section.data && section.data.length > 0) {
            doc.moveDown(0.5);

            for (const item of section.data) {
              doc
                .fontSize(10)
                .font('Helvetica-Bold')
                .text(`${item.label}: `, { continued: true })
                .font('Helvetica')
                .text(String(item.value));
            }
          }

          doc.moveDown(1.5);
        }

        // Footer
        const footerText = data.footer || 'Generated by QuickChat';
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#999999')
          .text(footerText, 50, doc.page.height - 50, { align: 'center' });
      },
      {
        title: data.title,
        subject: 'Report',
        keywords: ['report', 'analytics'],
      },
    );
  }

  /**
   * Generate a simple text PDF
   */
  async generateTextPdf(
    content: string,
    title: string = 'Document',
  ): Promise<Buffer> {
    return this.generatePdfBuffer(
      (doc) => {
        doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });

        doc.moveDown(2);

        doc.fontSize(12).font('Helvetica').text(content);
      },
      { title },
    );
  }

  /**
   * Create a readable stream from PDF buffer
   */
  bufferToStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }
}
