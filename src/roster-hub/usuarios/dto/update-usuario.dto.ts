import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';

/**
 * DTO para atualização parcial de usuários.
 */
export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {}
