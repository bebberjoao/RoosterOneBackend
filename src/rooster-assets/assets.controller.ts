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
  @RequirePermission(MODULO, 'categoria-patrimonio', 'manage')
  @ApiOperation({ summary: 'Cria uma categoria de patrimônio' })
  @ApiBody({ type: CreateAssetCategoryDto })
  createCategory(@Body() dto: CreateAssetCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Get('patrimonio-categorias')
  @RequirePermission(MODULO, 'categoria-patrimonio', 'view')
  findAllCategories() {
    return this.service.findAllCategories();
  }

  @Get('patrimonio-categorias/:id')
  @RequirePermission(MODULO, 'categoria-patrimonio', 'view')
  findOneCategory(@Param('id') id: string) {
    return this.service.findOneCategory(id);
  }

  @Patch('patrimonio-categorias/:id')
  @RequirePermission(MODULO, 'categoria-patrimonio', 'manage')
  @ApiOperation({ summary: 'Atualiza uma categoria de patrimônio' })
  @ApiBody({ type: UpdateAssetCategoryDto })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateAssetCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('patrimonio-categorias/:id')
  @RequirePermission(MODULO, 'categoria-patrimonio', 'manage')
  removeCategory(@Param('id') id: string) {
    return this.service.removeCategory(id);
  }

  @Post('patrimonio-setores')
  @RequirePermission(MODULO, 'setor-patrimonio', 'manage')
  @ApiOperation({ summary: 'Cria um setor de patrimônio' })
  @ApiBody({ type: CreateAssetSectorDto })
  createSector(@Body() dto: CreateAssetSectorDto) {
    return this.service.createSector(dto);
  }

  @Get('patrimonio-setores')
  @RequirePermission(MODULO, 'setor-patrimonio', 'view')
  findAllSectors() {
    return this.service.findAllSectors();
  }

  @Get('patrimonio-setores/:id')
  @RequirePermission(MODULO, 'setor-patrimonio', 'view')
  findOneSector(@Param('id') id: string) {
    return this.service.findOneSector(id);
  }

  @Patch('patrimonio-setores/:id')
  @RequirePermission(MODULO, 'setor-patrimonio', 'manage')
  @ApiOperation({ summary: 'Atualiza um setor de patrimônio' })
  @ApiBody({ type: UpdateAssetSectorDto })
  updateSector(@Param('id') id: string, @Body() dto: UpdateAssetSectorDto) {
    return this.service.updateSector(id, dto);
  }

  @Delete('patrimonio-setores/:id')
  @RequirePermission(MODULO, 'setor-patrimonio', 'manage')
  removeSector(@Param('id') id: string) {
    return this.service.removeSector(id);
  }

  @Post('patrimonio')
  @RequirePermission(MODULO, 'patrimonio', 'create')
  @ApiOperation({ summary: 'Cadastra um patrimônio' })
  @ApiBody({ type: CreateAssetDto })
  createAsset(@Body() dto: CreateAssetDto) {
    return this.service.createAsset(dto);
  }

  @Get('patrimonio')
  @RequirePermission(MODULO, 'patrimonio', 'view')
  findAllAssets(@Query('categoriaId') categoriaId?: string, @Query('setorId') setorId?: string, @Query('status') status?: string) {
    return this.service.findAllAssets(categoriaId, setorId, status);
  }

  @Get('patrimonio/:id')
  @RequirePermission(MODULO, 'patrimonio', 'view')
  findOneAsset(@Param('id') id: string) {
    return this.service.findOneAsset(id);
  }

  @Patch('patrimonio/:id')
  @RequirePermission(MODULO, 'patrimonio', 'manage')
  @ApiOperation({ summary: 'Atualiza um patrimônio' })
  @ApiBody({ type: UpdateAssetDto })
  updateAsset(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.service.updateAsset(id, dto);
  }

  @Delete('patrimonio/:id')
  @RequirePermission(MODULO, 'patrimonio', 'manage')
  removeAsset(@Param('id') id: string) {
    return this.service.removeAsset(id);
  }

  @Patch('patrimonio/:id/baixa')
  @RequirePermission(MODULO, 'patrimonio', 'baixa')
  @ApiOperation({ summary: 'Dá baixa em um patrimônio' })
  baixaAsset(@Param('id') id: string, @Body() body: { motivo?: string; usuario?: string }) {
    return this.service.baixaAsset(id, body?.motivo, body?.usuario);
  }

  @Post('patrimonio-movimentacoes')
  @RequirePermission(MODULO, 'movimentacao-patrimonio', 'create')
  @ApiOperation({ summary: 'Registra uma movimentação de patrimônio' })
  @ApiBody({ type: CreateAssetMovementDto })
  createMovement(@Body() dto: CreateAssetMovementDto) {
    return this.service.createMovement(dto);
  }

  @Get('patrimonio-movimentacoes')
  @RequirePermission(MODULO, 'movimentacao-patrimonio', 'view')
  findAllMovements(@Query('patrimonioId') patrimonioId?: string) {
    return this.service.findAllMovements(patrimonioId);
  }

  @Get('patrimonio-movimentacoes/:id')
  @RequirePermission(MODULO, 'movimentacao-patrimonio', 'view')
  findOneMovement(@Param('id') id: string) {
    return this.service.findOneMovement(id);
  }

  @Patch('patrimonio-movimentacoes/:id')
  @RequirePermission(MODULO, 'movimentacao-patrimonio', 'manage')
  @ApiOperation({ summary: 'Atualiza uma movimentação de patrimônio' })
  @ApiBody({ type: UpdateAssetMovementDto })
  updateMovement(@Param('id') id: string, @Body() dto: UpdateAssetMovementDto) {
    return this.service.updateMovement(id, dto);
  }

  @Delete('patrimonio-movimentacoes/:id')
  @RequirePermission(MODULO, 'movimentacao-patrimonio', 'manage')
  removeMovement(@Param('id') id: string) {
    return this.service.removeMovement(id);
  }
}
