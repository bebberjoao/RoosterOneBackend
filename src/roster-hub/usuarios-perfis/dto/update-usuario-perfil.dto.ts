import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioPerfilDto } from './create-usuario-perfil.dto';

export class UpdateUsuarioPerfilDto extends PartialType(CreateUsuarioPerfilDto) {}
