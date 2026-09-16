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

@ApiTags('Rooster Hub - Sessões')
@Controller('sessoes')
@UseGuards(PermissionGuard)
@RequirePermission('Rooster Hub', 'hub', 'manage')
export class SessoesController {
  constructor(private readonly sessoesService: SessoesService) {}

  @Post()
  create(@Body() createSessaoDto: CreateSessaoDto) {
    return this.sessoesService.create(createSessaoDto);
  }

  @Get()
  findAll() {
    return this.sessoesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const sessao = await this.sessoesService.findOne(id);
    if (!sessao) {
      throw new NotFoundException(`Sessão com id ${id} não encontrada.`);
    }
    return sessao;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateSessaoDto: UpdateSessaoDto) {
    const sessao = await this.sessoesService.update(id, updateSessaoDto);
    if (!sessao) {
      throw new NotFoundException(`Sessão com id ${id} não encontrada.`);
    }
    return sessao;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const sessao = await this.sessoesService.remove(id);
    if (!sessao) {
      throw new NotFoundException(`Sessão com id ${id} não encontrada.`);
    }
    return sessao;
  }
}
