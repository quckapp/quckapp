import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService as NestI18nService } from 'nestjs-i18n';
import { LoggerService } from '../logger/logger.service';

/**
 * I18nService - Service for handling internationalization
 * Provides methods to translate strings with optional interpolation
 */
@Injectable()
export class I18nService {
  constructor(
    private readonly i18n: NestI18nService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Translate a key to the current request's language
   * @param key - Translation key (e.g., 'common.welcome')
   * @param args - Optional interpolation arguments
   * @returns Translated string
   */
  translate(key: string, args?: Record<string, any>): string {
    const i18n = I18nContext.current();
    const lang = i18n?.lang || 'en';

    try {
      return this.i18n.translate(key, { lang, args });
    } catch (error) {
      this.logger.warn(`Translation key not found: ${key}`, 'I18nService');
      return key;
    }
  }

  /**
   * Translate a key to a specific language
   * @param key - Translation key
   * @param lang - Target language code
   * @param args - Optional interpolation arguments
   * @returns Translated string
   */
  translateToLang(
    key: string,
    lang: string,
    args?: Record<string, any>,
  ): string {
    try {
      return this.i18n.translate(key, { lang, args });
    } catch (error) {
      this.logger.warn(
        `Translation key not found: ${key} for lang: ${lang}`,
        'I18nService',
      );
      return key;
    }
  }

  /**
   * Get the current request's language
   * @returns Current language code
   */
  getCurrentLanguage(): string {
    const i18n = I18nContext.current();
    return i18n?.lang || 'en';
  }

  /**
   * Get all supported languages
   * @returns Array of supported language codes
   */
  getSupportedLanguages(): string[] {
    return this.i18n.getSupportedLanguages();
  }

  /**
   * Check if a language is supported
   * @param lang - Language code to check
   * @returns True if supported
   */
  isLanguageSupported(lang: string): boolean {
    return this.getSupportedLanguages().includes(lang);
  }

  /**
   * Translate common error messages
   */
  translateError(
    errorKey: string,
    args?: Record<string, any>,
  ): string {
    return this.translate(`errors.${errorKey}`, args);
  }

  /**
   * Translate validation messages
   */
  translateValidation(
    validationKey: string,
    args?: Record<string, any>,
  ): string {
    return this.translate(`validation.${validationKey}`, args);
  }
}
