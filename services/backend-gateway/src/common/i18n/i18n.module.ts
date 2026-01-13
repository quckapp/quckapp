import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  I18nModule as NestI18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { I18nService } from './i18n.service';
import { LoggerModule } from '../logger/logger.module';

/**
 * I18nModule - Global module for internationalization (i18n) support
 * Design Pattern: Singleton (Global module)
 * Supports multiple languages with fallback to default language
 * Language can be detected from:
 * - Accept-Language header
 * - Custom 'x-lang' header
 * - Query parameter 'lang'
 */
@Global()
@Module({})
export class I18nModule {
  static forRoot(): DynamicModule {
    return {
      module: I18nModule,
      imports: [
        ConfigModule,
        LoggerModule,
        NestI18nModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const defaultLanguage = configService.get('DEFAULT_LANGUAGE') || 'en';
            const fallbackLanguage = configService.get('FALLBACK_LANGUAGE') || 'en';
            const isDevelopment = configService.get('NODE_ENV') === 'development';

            console.log(`[i18n] Default language: ${defaultLanguage}`);

            // Use project root path for locales to work with webpack builds
            const localesPath = isDevelopment
              ? path.join(process.cwd(), 'src', 'common', 'i18n', 'locales')
              : path.join(__dirname, 'locales');

            console.log(`[i18n] Locales path: ${localesPath}`);

            return {
              fallbackLanguage,
              loaderOptions: {
                path: localesPath,
                watch: isDevelopment,
              },
              typesOutputPath: path.join(
                process.cwd(),
                'generated',
                'i18n.generated.ts',
              ),
            };
          },
          resolvers: [
            // Priority order: Query > Header > Accept-Language
            { use: QueryResolver, options: ['lang', 'locale'] },
            { use: HeaderResolver, options: ['x-lang', 'x-locale'] },
            AcceptLanguageResolver,
          ],
        }),
      ],
      providers: [I18nService],
      exports: [NestI18nModule, I18nService],
    };
  }
}
