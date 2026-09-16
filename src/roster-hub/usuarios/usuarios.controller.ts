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
import { ApiBody } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { UsuariosService } from './usuarios.service';
import { Public } from '../../auth/public.decorator';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('login')
  @Public()
  login(@Body() dto: LoginDto) {
    return this.usuariosService.login(dto.email, dto.senha);
  }
}

/**
 * Controller REST para gerenciamento de usuários do Rooster Hub.
 * Mantém o controller focado apenas em entrada/saída e delega toda regra de negócio para o service.
 */
const MODULO = 'Rooster Hub';
const TELA = '/hub/usuarios';

@ApiTags('Rooster Hub - Usuários')
@Controller('usuarios')
@UseGuards(PermissionGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @RequirePermission(MODULO, TELA, 'criar')
  @ApiBody({
    description: 'Payload para criação de usuário',
    type: CreateUsuarioDto,
    schema: {
      example: {
        nome: 'João Silva',
        email: 'joao.silva@example.com',
        senhaHash: 'SenhaSegura123',
        cpf: '12345678901',
        telefone: '11999999999',
        ativo: true,
      },
    },
  })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @RequirePermission(MODULO, TELA, 'acessar')
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id/acesso')
  @RequirePermission(MODULO, TELA, 'acessar')
  async getAccess(@Param('id') id: string) {
    const access = await this.usuariosService.getAccess(id);
    if (!access) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }
    return access;
  }

  @Get(':id/acesso/verificar')
  @RequirePermission(MODULO, TELA, 'acessar')
  async canAccess(@Param('id') id: string, @Query('moduloId') moduloId: string, @Query('acao') acao?: string) {
    const access = await this.usuariosService.canAccess(id, moduloId, acao);
    if (!access) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }
    return access;
  }

  @Get(':id')
  @RequirePermission(MODULO, TELA, 'acessar')
  async findOne(@Param('id') id: string) {
    const usuario = await this.usuariosService.findOne(id);
    if (!usuario) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }
    return usuario;
  }

  @Patch(':id')
  @RequirePermission(MODULO, TELA, 'editar')
  async update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.usuariosService.update(id, updateUsuarioDto);
    if (!usuario) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }
    return usuario;
  }

  @Delete(':id')
  @RequirePermission(MODULO, TELA, 'excluir')
  async remove(@Param('id') id: string) {
    const usuario = await this.usuariosService.remove(id);
    if (!usuario) {
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }
    return usuario;
  }
}
