import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto';
import { CreateAssetMovementDto } from './dto/create-asset-movement.dto';
import { CreateAssetSectorDto } from './dto/create-asset-sector.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { FindAssetMovementsQueryDto, FindAssetsQueryDto } from './dto/find-assets-query.dto';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto';
import { UpdateAssetMovementDto } from './dto/update-asset-movement.dto';
import { UpdateAssetSectorDto } from './dto/update-asset-sector.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetsService } from './assets.service';

const MODULO = 'Rooster Assets';

@ApiTags('Rooster Assets')
@Controller()
@UseGuards(PermissionGuard)
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Post('patrimonio-categorias')
  @RequirePermission(MODULO, '/assets/inventory', 'gerenciar-categorias')
  @ApiOperation({ summary: 'Cria uma categoria de patrimônio' })
  @ApiBody({ type: CreateAssetCategoryDto })
  createCategory(@Body() dto: CreateAssetCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Get('patrimonio-categorias')
  @RequirePermission(MODULO, '/assets', 'acessar')
  findAllCategories() {
    return this.service.findAllCategories();
  }

  @Get('patrimonio-categorias/:id')
  @RequirePermission(MODULO, '/assets', 'acessar')
  findOneCategory(@Param('id') id: string) {
    return this.service.findOneCategory(id);
  }

  @Patch('patrimonio-categorias/:id')
  @RequirePermission(MODULO, '/assets/inventory', 'gerenciar-categorias')
  @ApiOperation({ summary: 'Atualiza uma categoria de patrimônio' })
  @ApiBody({ type: UpdateAssetCategoryDto })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateAssetCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('patrimonio-categorias/:id')
  @RequirePermission(MODULO, '/assets/inventory', 'gerenciar-categorias')
  removeCategory(@Param('id') id: string) {
    return this.service.removeCategory(id);
  }

  @Post('patrimonio-setores')
  @RequirePermission(MODULO, '/assets/inventory', 'gerenciar-categorias')
  @ApiOperation({ summary: 'Cria um setor de patrimônio' })
  @ApiBody({ type: CreateAssetSectorDto })
  createSector(@Body() dto: CreateAssetSectorDto) {
    return this.service.createSector(dto);
  }

  @Get('patrimonio-setores')
  @RequirePermission(MODULO, '/assets', 'acessar')
  findAllSectors() {
    return this.service.findAllSectors();
  }

  @Get('patrimonio-setores/:id')
  @RequirePermission(MODULO, '/assets', 'acessar')
  findOneSector(@Param('id') id: string) {
    return this.service.findOneSector(id);
  }

  @Patch('patrimonio-setores/:id')
  @RequirePermission(MODULO, '/assets/inventory', 'gerenciar-categorias')
  @ApiOperation({ summary: 'Atualiza um setor de patrimônio' })
  @ApiBody({ type: UpdateAssetSectorDto })
  updateSector(@Param('id') id: string, @Body() dto: UpdateAssetSectorDto) {
    return this.service.updateSector(id, dto);
  }

  @Delete('patrimonio-setores/:id')
  @RequirePermission(MODULO, '/assets/inventory', 'gerenciar-categorias')
  removeSector(@Param('id') id: string) {
    return this.service.removeSector(id);
  }

  @Post('patrimonio')
  @RequirePermission(MODULO, '/assets/inventory', 'criar')
  @ApiOperation({ summary: 'Cadastra um patrimônio' })
  @ApiBody({ type: CreateAssetDto })
  createAsset(@Body() dto: CreateAssetDto) {
    return this.service.createAsset(dto);
  }

  @Get('patrimonio')
  @RequirePermission(MODULO, '/assets', 'acessar')
  findAllAssets(@Query() query: FindAssetsQueryDto) {
    return this.service.findAllAssets(query.categoriaId, query.setorId, query.status, query);
  }

  @Get('patrimonio/:id')
  @RequirePermission(MODULO, '/assets', 'acessar')
  findOneAsset(@Param('id') id: string) {
    return this.service.findOneAsset(id);
  }

  @Patch('patrimonio/:id')
  @RequirePermission(MODULO, '/assets/inventory', 'editar')
  @ApiOperation({ summary: 'Atualiza um patrimônio' })
  @ApiBody({ type: UpdateAssetDto })
  updateAsset(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.service.updateAsset(id, dto);
  }

  @Delete('patrimonio/:id')
  @RequirePermission(MODULO, '/assets/inventory', 'excluir')
  removeAsset(@Param('id') id: string) {
    return this.service.removeAsset(id);
  }

  @Patch('patrimonio/:id/baixa')
  @RequirePermission(MODULO, '/assets/inventory', 'editar')
  @ApiOperation({ summary: 'Dá baixa em um patrimônio' })
  baixaAsset(@Param('id') id: string, @Body() body: { motivo?: string; usuario?: string }) {
    return this.service.baixaAsset(id, body?.motivo, body?.usuario);
  }

  @Post('patrimonio-movimentacoes')
  @RequirePermission(MODULO, '/assets/inventory', 'movimentar')
  @ApiOperation({ summary: 'Registra uma movimentação de patrimônio' })
  @ApiBody({ type: CreateAssetMovementDto })
  createMovement(@Body() dto: CreateAssetMovementDto) {
    return this.service.createMovement(dto);
  }

  @Get('patrimonio-movimentacoes')
  @RequirePermission(MODULO, '/assets', 'acessar')
  findAllMovements(@Query() query: FindAssetMovementsQueryDto) {
    return this.service.findAllMovements(query.patrimonioId, query);
  }

  @Get('patrimonio-emprestimos-atrasados')
  @RequirePermission(MODULO, '/assets', 'acessar')
  @ApiOperation({ summary: 'Lista empréstimos com prazo de devolução vencido e ainda não devolvidos' })
  findEmprestimosAtrasados() {
    return this.service.findEmprestimosAtrasados();
  }

  @Patch('patrimonio-movimentacoes/:id/devolver')
  @RequirePermission(MODULO, '/assets/inventory', 'movimentar')
  @ApiOperation({ summary: 'Marca um empréstimo como devolvido e libera o patrimônio' })
  devolverEmprestimo(@Param('id') id: string, @Body('usuario') usuario: string) {
    return this.service.devolverEmprestimo(id, usuario?.trim() || 'sistema');
  }

  @Get('patrimonio-movimentacoes/:id')
  @RequirePermission(MODULO, '/assets', 'acessar')
  findOneMovement(@Param('id') id: string) {
    return this.service.findOneMovement(id);
  }

  @Patch('patrimonio-movimentacoes/:id')
  @RequirePermission(MODULO, '/assets/inventory', 'movimentar')
  @ApiOperation({ summary: 'Atualiza uma movimentação de patrimônio' })
  @ApiBody({ type: UpdateAssetMovementDto })
  updateMovement(@Param('id') id: string, @Body() dto: UpdateAssetMovementDto) {
    return this.service.updateMovement(id, dto);
  }

  @Delete('patrimonio-movimentacoes/:id')
  @RequirePermission(MODULO, '/assets/inventory', 'movimentar')
  removeMovement(@Param('id') id: string) {
    return this.service.removeMovement(id);
  }
}
