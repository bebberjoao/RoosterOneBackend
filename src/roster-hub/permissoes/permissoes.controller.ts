import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreatePermissaoDto } from './dto/create-permissao.dto';
import { UpdatePermissaoDto } from './dto/update-permissao.dto';
import { PermissoesService } from './permissoes.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

const MODULO = 'Rooster Hub';
const TELA = '/hub/acessos';

@ApiTags('Rooster Hub - Permissões')
@Controller('permissoes')
@UseGuards(PermissionGuard)
export class PermissoesController {
  constructor(private readonly permissoesService: PermissoesService) {}

  @Post()
  @RequirePermission(MODULO, TELA, 'gerenciar-permissoes')
  create(@Body() createPermissaoDto: CreatePermissaoDto) {
    return this.permissoesService.create(createPermissaoDto);
  }

  @Get()
  @RequirePermission(MODULO, TELA, 'acessar')
  findAll() {
    return this.permissoesService.findAll();
  }

  @Get(':id')
  @RequirePermission(MODULO, TELA, 'acessar')
  async findOne(@Param('id') id: string) {
    const permissao = await this.permissoesService.findOne(id);
    if (!permissao) {
      throw new NotFoundException(`Permissão com id ${id} não encontrada.`);
    }
    return permissao;
  }

  @Patch(':id')
  @RequirePermission(MODULO, TELA, 'gerenciar-permissoes')
  async update(@Param('id') id: string, @Body() updatePermissaoDto: UpdatePermissaoDto) {
    const permissao = await this.permissoesService.update(id, updatePermissaoDto);
    if (!permissao) {
      throw new NotFoundException(`Permissão com id ${id} não encontrada.`);
    }
    return permissao;
  }

  @Delete(':id')
  @RequirePermission(MODULO, TELA, 'gerenciar-permissoes')
  async remove(@Param('id') id: string) {
    const permissao = await this.permissoesService.remove(id);
    if (!permissao) {
      throw new NotFoundException(`Permissão com id ${id} não encontrada.`);
    }
    return permissao;
  }
}
