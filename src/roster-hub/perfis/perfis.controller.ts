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
import { CreatePerfilDto } from './dto/create-perfil.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { PerfisService } from './perfis.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

@ApiTags('Rooster Hub - Perfis')
@Controller('perfis')
@UseGuards(PermissionGuard)
@RequirePermission('Rooster Hub', 'hub', 'manage')
export class PerfisController {
  constructor(private readonly perfisService: PerfisService) {}

  @Post()
  create(@Body() createPerfilDto: CreatePerfilDto) {
    return this.perfisService.create(createPerfilDto);
  }

  @Get()
  findAll() {
    return this.perfisService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const perfil = await this.perfisService.findOne(id);
    if (!perfil) {
      throw new NotFoundException(`Perfil com id ${id} não encontrado.`);
    }
    return perfil;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePerfilDto: UpdatePerfilDto) {
    const perfil = await this.perfisService.update(id, updatePerfilDto);
    if (!perfil) {
      throw new NotFoundException(`Perfil com id ${id} não encontrado.`);
    }
    return perfil;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const perfil = await this.perfisService.remove(id);
    if (!perfil) {
      throw new NotFoundException(`Perfil com id ${id} não encontrado.`);
    }
    return perfil;
  }
}
