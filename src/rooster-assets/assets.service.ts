import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto';
import { CreateAssetMovementDto } from './dto/create-asset-movement.dto';
import { CreateAssetSectorDto } from './dto/create-asset-sector.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto';
import { UpdateAssetMovementDto } from './dto/update-asset-movement.dto';
import { UpdateAssetSectorDto } from './dto/update-asset-sector.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(dto: CreateAssetCategoryDto) {
    const data: Prisma.PatrimonioCategoriaCreateInput = {
      nome: dto.nome,
      descricao: dto.descricao,
      tom: dto.tom,
      sistema: dto.sistema ?? false,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    } as any;

    try {
      return await this.prisma.patrimonioCategoria.create({ data });
    } catch (error) {
      this.handleError(error, 'criar categoria de patrimônio');
    }
  }

  async findAllCategories() {
    return this.prisma.patrimonioCategoria.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOneCategory(id: string) {
    const category = await this.prisma.patrimonioCategoria.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoria com id ${id} não encontrada.`);
    }
    return category;
  }

  async updateCategory(id: string, dto: UpdateAssetCategoryDto) {
    await this.findOneCategory(id);

    try {
      return await this.prisma.patrimonioCategoria.update({
        where: { id },
        data: { ...dto, atualizadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'atualizar categoria de patrimônio');
    }
  }

  async removeCategory(id: string) {
    await this.findOneCategory(id);

    try {
      return await this.prisma.patrimonioCategoria.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover categoria de patrimônio');
    }
  }

  async createSector(dto: CreateAssetSectorDto) {
    const data: Prisma.PatrimonioSetorCreateInput = {
      nome: dto.nome,
      descricao: dto.descricao,
      responsavel: dto.responsavel,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    } as any;

    try {
      return await this.prisma.patrimonioSetor.create({ data });
    } catch (error) {
      this.handleError(error, 'criar setor de patrimônio');
    }
  }

  async findAllSectors() {
    return this.prisma.patrimonioSetor.findMany({
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOneSector(id: string) {
    const setor = await this.prisma.patrimonioSetor.findUnique({ where: { id } });
    if (!setor) {
      throw new NotFoundException(`Setor com id ${id} não encontrado.`);
    }
    return setor;
  }

  async updateSector(id: string, dto: UpdateAssetSectorDto) {
    await this.findOneSector(id);

    try {
      return await this.prisma.patrimonioSetor.update({
        where: { id },
        data: { ...dto, atualizadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'atualizar setor de patrimônio');
    }
  }

  async removeSector(id: string) {
    await this.findOneSector(id);

    try {
      return await this.prisma.patrimonioSetor.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover setor de patrimônio');
    }
  }

  async createAsset(dto: CreateAssetDto) {
    if (!dto.categoriaId) {
      throw new InternalServerErrorException('Categoria do patrimônio é obrigatória.');
    }

    const data: Prisma.PatrimonioCreateInput = {
      nome: dto.nome,
      tag: dto.tag,
      categoria: { connect: { id: dto.categoriaId } },
      marca: dto.marca,
      modelo: dto.modelo,
      serial: dto.serial,
      localizacaoId: dto.localizacaoId,
      localizacao: dto.localizacao,
      ...(dto.setorId ? { setorRef: { connect: { id: dto.setorId } } } : {}),
      setor: dto.setor,
      responsavelUserId: dto.responsavelUserId,
      responsavel: dto.responsavel,
      status: dto.status ?? 'disponivel',
      condicao: dto.condicao ?? 'bom',
      adquiridoEm: dto.adquiridoEm ? new Date(dto.adquiridoEm) : undefined,
      valor: dto.valor,
      observacoes: dto.observacoes,
      foto: dto.foto,
      chamadoManutencaoId: dto.chamadoManutencaoId,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    } as any;

    try {
      return await this.prisma.patrimonio.create({
        data,
        include: { categoria: true, setorRef: true },
      });
    } catch (error) {
      this.handleError(error, 'criar patrimônio');
    }
  }

  async findAllAssets(categoriaId?: string, setorId?: string, status?: string) {
    return this.prisma.patrimonio.findMany({
      where: {
        ...(categoriaId ? { categoriaId } : {}),
        ...(setorId ? { setorId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { criadoEm: 'desc' },
      include: { categoria: true, setorRef: true },
    });
  }

  async findOneAsset(id: string) {
    const item = await this.prisma.patrimonio.findUnique({
      where: { id },
      include: { categoria: true, setorRef: true, movimentacoes: true },
    });

    if (!item) {
      throw new NotFoundException(`Patrimônio com id ${id} não encontrado.`);
    }

    return item;
  }

  async updateAsset(id: string, dto: UpdateAssetDto) {
    await this.findOneAsset(id);

    // Monta o update campo a campo para não vazar chaves que não são colunas
    // (categoriaId + relação categoria juntas quebram o Prisma).
    const data: Record<string, unknown> = { atualizadoEm: new Date() };
    const camposDiretos = [
      'nome', 'tag', 'marca', 'modelo', 'serial', 'localizacaoId', 'localizacao',
      'setorId', 'setor', 'responsavelUserId', 'responsavel', 'status', 'condicao',
      'observacoes', 'foto', 'chamadoManutencaoId', 'categoriaId',
    ] as const;
    for (const campo of camposDiretos) {
      if (dto[campo] !== undefined) data[campo] = dto[campo];
    }
    if (dto.adquiridoEm !== undefined) data.adquiridoEm = new Date(dto.adquiridoEm);
    if (dto.valor !== undefined) data.valor = dto.valor;

    try {
      return await this.prisma.patrimonio.update({
        where: { id },
        data: data as Prisma.PatrimonioUpdateInput,
        include: { categoria: true, setorRef: true },
      });
    } catch (error) {
      this.handleError(error, 'atualizar patrimônio');
    }
  }

  async removeAsset(id: string) {
    await this.findOneAsset(id);

    try {
      return await this.prisma.patrimonio.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover patrimônio');
    }
  }

  /**
   * Registra uma movimentação e atualiza o patrimônio na mesma transação:
   * a movimentação e o novo estado do item nunca ficam fora de sincronia.
   */
  async createMovement(dto: CreateAssetMovementDto) {
    const asset = await this.prisma.patrimonio.findUnique({ where: { id: dto.patrimonioId } });
    if (!asset) {
      throw new NotFoundException(`Patrimônio com id ${dto.patrimonioId} não encontrado.`);
    }
    if (asset.status === 'baixado') {
      throw new BadRequestException('Patrimônio baixado não pode ser movimentado.');
    }

    const exigeDestino = ['setor', 'sala', 'emprestimo'].includes(dto.tipo);
    if (exigeDestino && !dto.destino?.trim()) {
      throw new BadRequestException(`Informe o destino para uma movimentação do tipo "${dto.tipo}".`);
    }

    // Origem = estado atual do item, conforme o que a movimentação altera.
    const origem =
      dto.origem ??
      (dto.tipo === 'setor'
        ? asset.setor
        : dto.tipo === 'emprestimo' || dto.tipo === 'devolucao'
          ? asset.responsavel
          : asset.localizacao) ??
      undefined;

    const patch: Record<string, unknown> = { atualizadoEm: new Date() };
    if (dto.tipo === 'sala') patch.localizacao = dto.destino;
    else if (dto.tipo === 'setor') patch.setor = dto.destino;
    else if (dto.tipo === 'emprestimo') {
      patch.status = 'emprestado';
      patch.responsavel = dto.destino;
    } else if (dto.tipo === 'devolucao') {
      patch.status = 'disponivel';
      patch.responsavel = null;
    } else if (dto.tipo === 'manutencao') {
      patch.status = 'manutencao';
    }

    try {
      const [movimentacao, patrimonio] = await this.prisma.$transaction([
        this.prisma.patrimonioMovimento.create({
          data: {
            patrimonio: { connect: { id: dto.patrimonioId } },
            tipo: dto.tipo,
            origem,
            destino: dto.destino,
            usuario: dto.usuario,
            observacoes: dto.observacoes,
            criadoEm: new Date(),
          },
        }),
        this.prisma.patrimonio.update({
          where: { id: dto.patrimonioId },
          data: patch as Prisma.PatrimonioUpdateInput,
          include: { categoria: true, setorRef: true },
        }),
      ]);
      return { movimentacao, patrimonio };
    } catch (error) {
      this.handleError(error, 'registrar movimentação de patrimônio');
    }
  }

  /** Dá baixa no patrimônio (status "baixado") e registra a baixa no histórico. */
  async baixaAsset(id: string, motivo?: string, usuario?: string) {
    const asset = await this.prisma.patrimonio.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Patrimônio com id ${id} não encontrado.`);
    }
    if (asset.status === 'baixado') {
      throw new BadRequestException('Este patrimônio já está baixado.');
    }

    try {
      const [movimentacao, patrimonio] = await this.prisma.$transaction([
        this.prisma.patrimonioMovimento.create({
          data: {
            patrimonio: { connect: { id } },
            tipo: 'baixa',
            origem: asset.localizacao ?? asset.setor ?? undefined,
            destino: 'Baixa de patrimônio',
            usuario: usuario?.trim() || 'sistema',
            observacoes: motivo,
            criadoEm: new Date(),
          },
        }),
        this.prisma.patrimonio.update({
          where: { id },
          data: { status: 'baixado', atualizadoEm: new Date() },
          include: { categoria: true, setorRef: true },
        }),
      ]);
      return { movimentacao, patrimonio };
    } catch (error) {
      this.handleError(error, 'dar baixa no patrimônio');
    }
  }

  async findAllMovements(patrimonioId?: string) {
    return this.prisma.patrimonioMovimento.findMany({
      where: patrimonioId ? { patrimonioId } : undefined,
      orderBy: { criadoEm: 'desc' },
      include: { patrimonio: true },
    });
  }

  async findOneMovement(id: string) {
    const item = await this.prisma.patrimonioMovimento.findUnique({
      where: { id },
      include: { patrimonio: true },
    });

    if (!item) {
      throw new NotFoundException(`Movimentação com id ${id} não encontrada.`);
    }

    return item;
  }

  async updateMovement(id: string, dto: UpdateAssetMovementDto) {
    await this.findOneMovement(id);

    const data: Prisma.PatrimonioMovimentoUpdateInput = {
      ...dto,
      ...(dto.patrimonioId ? { patrimonio: { connect: { id: dto.patrimonioId } } } : {}),
    };

    try {
      return await this.prisma.patrimonioMovimento.update({ where: { id }, data, include: { patrimonio: true } });
    } catch (error) {
      this.handleError(error, 'atualizar movimentação de patrimônio');
    }
  }

  async removeMovement(id: string) {
    await this.findOneMovement(id);

    try {
      return await this.prisma.patrimonioMovimento.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover movimentação de patrimônio');
    }
  }

  private handleError(error: unknown, action: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const alvo = (error.meta?.target as string[] | undefined)?.join(', ');
        throw new ConflictException(
          `Não foi possível ${action}: já existe um registro com ${alvo ?? 'esse valor único'}.`,
        );
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`Registro não encontrado ao ${action}.`);
      }
    }
    if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ConflictException) {
      throw error;
    }

    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
