import { PartialType } from '@nestjs/mapped-types';
import { CreatePerfilPermissaoDto } from './create-perfil-permissao.dto';

export class UpdatePerfilPermissaoDto extends PartialType(CreatePerfilPermissaoDto) {}
