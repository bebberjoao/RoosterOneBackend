import { PartialType } from '@nestjs/mapped-types';
import { CreateLogAuditoriaDto } from './create-log-auditoria.dto';

export class UpdateLogAuditoriaDto extends PartialType(CreateLogAuditoriaDto) {}
