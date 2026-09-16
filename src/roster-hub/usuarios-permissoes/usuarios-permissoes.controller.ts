import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUsuarioPermissaoDto } from './dto/create-usuario-permissao.dto';
import { UsuariosPermissoesService } from './usuarios-permissoes.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

const MODULO = 'Rooster Hub';
const TELA = '/hub/acessos';

@ApiTags('Rooster Hub - Usuários e Permissões')
@Controller('usuarios-permissoes')
@UseGuards(PermissionGuard)
export class UsuariosPermissoesController {
  constructor(private readonly usuariosPermissoesService: UsuariosPermissoesService) {}

  @Post()
  @RequirePermission(MODULO, TELA, 'conceder')
  create(@Body() createUsuarioPermissaoDto: CreateUsuarioPermissaoDto) {
    return this.usuariosPermissoesService.create(createUsuarioPermissaoDto);
  }

  @Get()
  @RequirePermission(MODULO, TELA, 'acessar')
  findAll() {
    return this.usuariosPermissoesService.findAll();
  }

  @Get(':id')
  @RequirePermission(MODULO, TELA, 'acessar')
  async findOne(@Param('id') id: string) {
    const vinculo = await this.usuariosPermissoesService.findOne(id);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }

  @Delete(':id')
  @RequirePermission(MODULO, TELA, 'revogar')
  async remove(@Param('id') id: string) {
    const vinculo = await this.usuariosPermissoesService.remove(id);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }
}
