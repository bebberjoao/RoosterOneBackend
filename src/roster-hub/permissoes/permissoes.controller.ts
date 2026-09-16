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

@ApiTags('Rooster Hub - Permissões')
@Controller('permissoes')
@UseGuards(PermissionGuard)
@RequirePermission('Rooster Hub', 'hub', 'manage')
export class PermissoesController {
  constructor(private readonly permissoesService: PermissoesService) {}

  @Post()
  create(@Body() createPermissaoDto: CreatePermissaoDto) {
    return this.permissoesService.create(createPermissaoDto);
  }

  @Get()
  findAll() {
    return this.permissoesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const permissao = await this.permissoesService.findOne(id);
    if (!permissao) {
      throw new NotFoundException(`Permissão com id ${id} não encontrada.`);
    }
    return permissao;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePermissaoDto: UpdatePermissaoDto) {
    const permissao = await this.permissoesService.update(id, updatePermissaoDto);
    if (!permissao) {
      throw new NotFoundException(`Permissão com id ${id} não encontrada.`);
    }
    return permissao;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const permissao = await this.permissoesService.remove(id);
    if (!permissao) {
      throw new NotFoundException(`Permissão com id ${id} não encontrada.`);
    }
    return permissao;
  }
}
