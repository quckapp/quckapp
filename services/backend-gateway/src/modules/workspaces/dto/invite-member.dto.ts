import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsEnum, IsArray, IsString, MaxLength } from 'class-validator';
import { WorkspaceRole } from '../schemas/workspace-member.schema';

export class InviteMemberDto {
  @ApiProperty({ description: 'Email address to invite', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;

  @ApiPropertyOptional({ description: 'Custom invitation message' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class BulkInviteMembersDto {
  @ApiProperty({ description: 'Email addresses to invite', type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiPropertyOptional({ enum: WorkspaceRole, default: WorkspaceRole.MEMBER })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: WorkspaceRole })
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
