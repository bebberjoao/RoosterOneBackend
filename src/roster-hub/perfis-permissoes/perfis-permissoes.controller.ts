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
import { CreatePerfilPermissaoDto } from './dto/create-perfil-permissao.dto';
import { UpdatePerfilPermissaoDto } from './dto/update-perfil-permissao.dto';
import { PerfisPermissoesService } from './perfis-permissoes.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

@ApiTags('Rooster Hub - Perfis e Permissões')
@Controller('perfis-permissoes')
@UseGuards(PermissionGuard)
@RequirePermission('Rooster Hub', 'hub', 'manage')
export class PerfisPermissoesController {
  constructor(private readonly perfisPermissoesService: PerfisPermissoesService) {}

  @Post()
  create(@Body() createPerfilPermissaoDto: CreatePerfilPermissaoDto) {
    return this.perfisPermissoesService.create(createPerfilPermissaoDto);
  }

  @Get()
  findAll() {
    return this.perfisPermissoesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const vinculo = await this.perfisPermissoesService.findOne(id);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePerfilPermissaoDto: UpdatePerfilPermissaoDto) {
    const vinculo = await this.perfisPermissoesService.update(id, updatePerfilPermissaoDto);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const vinculo = await this.perfisPermissoesService.remove(id);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }
}
