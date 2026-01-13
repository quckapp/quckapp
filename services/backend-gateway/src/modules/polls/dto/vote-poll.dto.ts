import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class VotePollDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Must select at least one option' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  optionIds: string[];
}
