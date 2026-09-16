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
import { CreateUsuarioPerfilDto } from './dto/create-usuario-perfil.dto';
import { UpdateUsuarioPerfilDto } from './dto/update-usuario-perfil.dto';
import { UsuariosPerfisService } from './usuarios-perfis.service';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

@ApiTags('Rooster Hub - Usuários e Perfis')
@Controller('usuarios-perfis')
@UseGuards(PermissionGuard)
@RequirePermission('Rooster Hub', 'hub', 'manage')
export class UsuariosPerfisController {
  constructor(private readonly usuariosPerfisService: UsuariosPerfisService) {}

  @Post()
  create(@Body() createUsuarioPerfilDto: CreateUsuarioPerfilDto) {
    return this.usuariosPerfisService.create(createUsuarioPerfilDto);
  }

  @Get()
  findAll() {
    return this.usuariosPerfisService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const vinculo = await this.usuariosPerfisService.findOne(id);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUsuarioPerfilDto: UpdateUsuarioPerfilDto) {
    const vinculo = await this.usuariosPerfisService.update(id, updateUsuarioPerfilDto);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const vinculo = await this.usuariosPerfisService.remove(id);
    if (!vinculo) {
      throw new NotFoundException(`Vínculo com id ${id} não encontrado.`);
    }
    return vinculo;
  }
}
