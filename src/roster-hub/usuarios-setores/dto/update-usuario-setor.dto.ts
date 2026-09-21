import { PartialType } from '@nestjs/swagger';
import { CreateUsuarioSetorDto } from './create-usuario-setor.dto';

export class UpdateUsuarioSetorDto extends PartialType(CreateUsuarioSetorDto) {}
