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
import { CreateSetorDto } from './dto/create-setor.dto';
import { UpdateSetorDto } from './dto/update-setor.dto';
import { SetoresService } from './setores.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

const MODULO = 'Rooster Hub';
const TELA = '/hub/setores';

@ApiTags('Rooster Hub - Setores')
@Controller('setores')
@UseGuards(PermissionGuard)
export class SetoresController {
  constructor(private readonly setoresService: SetoresService) {}

  @Post()
  @RequirePermission(MODULO, TELA, 'criar')
  create(@Body() createSetorDto: CreateSetorDto) {
    return this.setoresService.create(createSetorDto);
  }

  @Get()
  @RequirePermission(MODULO, TELA, 'acessar')
  findAll() {
    return this.setoresService.findAll();
  }

  @Get(':id')
  @RequirePermission(MODULO, TELA, 'acessar')
  async findOne(@Param('id') id: string) {
    const setor = await this.setoresService.findOne(id);
    if (!setor) {
      throw new NotFoundException(`Setor com id ${id} não encontrado.`);
    }
    return setor;
  }

  @Patch(':id')
  @RequirePermission(MODULO, TELA, 'editar')
  async update(@Param('id') id: string, @Body() updateSetorDto: UpdateSetorDto) {
    const setor = await this.setoresService.update(id, updateSetorDto);
    if (!setor) {
      throw new NotFoundException(`Setor com id ${id} não encontrado.`);
    }
    return setor;
  }

  @Delete(':id')
  @RequirePermission(MODULO, TELA, 'excluir')
  async remove(@Param('id') id: string) {
    const setor = await this.setoresService.remove(id);
    if (!setor) {
      throw new NotFoundException(`Setor com id ${id} não encontrado.`);
    }
    return setor;
  }
}
