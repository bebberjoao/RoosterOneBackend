import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';
import { ModulosService } from './modulos.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

const MODULO = 'Rooster Hub';
const TELA = '/hub/acessos';

@ApiTags('Rooster Hub - Módulos')
@Controller('modulos')
@UseGuards(PermissionGuard)
export class ModulosController {
  constructor(private readonly modulosService: ModulosService) {}

  @Post()
  @RequirePermission(MODULO, TELA, 'gerenciar-permissoes')
  create(@Body() createModuloDto: CreateModuloDto) {
    return this.modulosService.create(createModuloDto);
  }

  @Get()
  @RequirePermission(MODULO, TELA, 'acessar')
  findAll() {
    return this.modulosService.findAll();
  }

  @Get(':id')
  @RequirePermission(MODULO, TELA, 'acessar')
  async findOne(@Param('id') id: string) {
    const modulo = await this.modulosService.findOne(id);
    if (!modulo) {
      throw new NotFoundException(`Módulo com id ${id} não encontrado.`);
    }
    return modulo;
  }

  @Patch(':id')
  @RequirePermission(MODULO, TELA, 'gerenciar-permissoes')
  async update(@Param('id') id: string, @Body() updateModuloDto: UpdateModuloDto) {
    const modulo = await this.modulosService.update(id, updateModuloDto);
    if (!modulo) {
      throw new NotFoundException(`Módulo com id ${id} não encontrado.`);
    }
    return modulo;
  }

  @Delete(':id')
  @RequirePermission(MODULO, TELA, 'gerenciar-permissoes')
  async remove(@Param('id') id: string) {
    const modulo = await this.modulosService.remove(id);
    if (!modulo) {
      throw new NotFoundException(`Módulo com id ${id} não encontrado.`);
    }
    return modulo;
  }
}
