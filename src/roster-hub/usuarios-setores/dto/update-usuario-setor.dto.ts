import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioSetorDto } from './create-usuario-setor.dto';

export class UpdateUsuarioSetorDto extends PartialType(CreateUsuarioSetorDto) {}
