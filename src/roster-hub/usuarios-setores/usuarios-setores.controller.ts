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
import { CreateUsuarioSetorDto } from './dto/create-usuario-setor.dto';
import { UpdateUsuarioSetorDto } from './dto/update-usuario-setor.dto';
import { UsuariosSetoresService } from './usuarios-setores.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

const MODULO = 'Rooster Hub';
const TELA = '/hub/setores';

@ApiTags('Rooster Hub - Usuários e Setores')
@Controller('usuarios-setores')
@UseGuards(PermissionGuard)
export class UsuariosSetoresController {
  constructor(private readonly usuariosSetoresService: UsuariosSetoresService) {}

  @Post()
  @RequirePermission(MODULO, TELA, 'gerenciar-usuarios')
  create(@Body() createUsuarioSetorDto: CreateUsuarioSetorDto) {
    return this.usuariosSetoresService.create(createUsuarioSetorDto);
  }

  @Get()
  @RequirePermission(MODULO, TELA, 'acessar')
  findAll() {
    return this.usuariosSetoresService.findAll();
  }

  @Get(':id')
  @RequirePermission(MODULO, TELA, 'acessar')
  async findOne(@Param('id') id: string) {
    const vinculo = await this.usuariosSetoresService.findOne(id);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }

  @Patch(':id')
  @RequirePermission(MODULO, TELA, 'gerenciar-usuarios')
  async update(@Param('id') id: string, @Body() updateUsuarioSetorDto: UpdateUsuarioSetorDto) {
    const vinculo = await this.usuariosSetoresService.update(id, updateUsuarioSetorDto);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }

  @Delete(':id')
  @RequirePermission(MODULO, TELA, 'gerenciar-usuarios')
  async remove(@Param('id') id: string) {
    const vinculo = await this.usuariosSetoresService.remove(id);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }
}
