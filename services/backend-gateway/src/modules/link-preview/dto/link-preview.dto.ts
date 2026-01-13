import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetLinkPreviewDto {
  @IsUrl({}, { message: 'Must be a valid URL' })
  @IsNotEmpty()
  url: string;
}

export class BatchLinkPreviewDto {
  @IsArray()
  @IsUrl({}, { each: true, message: 'All items must be valid URLs' })
  @IsNotEmpty({ each: true })
  urls: string[];
}

export class ExtractLinksDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class LinkPreviewResponseDto {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  type?: string;
}

export class ExtractLinksResponseDto {
  urls: string[];
  previews: LinkPreviewResponseDto[];
}
