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
import { CreateSessaoDto } from './dto/create-sessao.dto';
import { UpdateSessaoDto } from './dto/update-sessao.dto';
import { SessoesService } from './sessoes.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

const MODULO = 'Rooster Hub';

@ApiTags('Rooster Hub - Sessões')
@Controller('sessoes')
@UseGuards(PermissionGuard)
export class SessoesController {
  constructor(private readonly sessoesService: SessoesService) {}

  @Post()
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  create(@Body() createSessaoDto: CreateSessaoDto) {
    return this.sessoesService.create(createSessaoDto);
  }

  @Get()
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  findAll() {
    return this.sessoesService.findAll();
  }

  @Get(':id')
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  async findOne(@Param('id') id: string) {
    const sessao = await this.sessoesService.findOne(id);
    if (!sessao) {
      throw new NotFoundException(`Sessão com id ${id} não encontrada.`);
    }
    return sessao;
  }

  @Patch(':id')
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  async update(@Param('id') id: string, @Body() updateSessaoDto: UpdateSessaoDto) {
    const sessao = await this.sessoesService.update(id, updateSessaoDto);
    if (!sessao) {
      throw new NotFoundException(`Sessão com id ${id} não encontrada.`);
    }
    return sessao;
  }

  @Delete(':id')
  @RequirePermission(MODULO, '/hub/acessos', 'gerenciar-permissoes')
  async remove(@Param('id') id: string) {
    const sessao = await this.sessoesService.remove(id);
    if (!sessao) {
      throw new NotFoundException(`Sessão com id ${id} não encontrada.`);
    }
    return sessao;
  }
}
