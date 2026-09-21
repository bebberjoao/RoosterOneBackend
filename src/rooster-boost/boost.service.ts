import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import {
  CreateAulaBoostDto, CreateCursoBoostDto, CreateModuloBoostDto,
  UpdateAulaBoostDto, UpdateCursoBoostDto, UpdateModuloBoostDto,
} from './dto/boost.dto';

@Injectable()
export class BoostService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(titulo: string) {
    return titulo
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      .slice(0, 180);
  }

  // ===================== Curso =====================
  async createCurso(professorId: string, dto: CreateCursoBoostDto) {
    const base = this.slugify(dto.titulo) || randomUUID().slice(0, 8);
    let slug = base;
    let tentativa = 1;
    while (await this.prisma.cursoBoost.findUnique({ where: { slug } })) {
      slug = `${base}-${++tentativa}`;
    }
    try {
      return await this.prisma.cursoBoost.create({
        data: { ...dto, slug, professorId, criadoEm: new Date(), atualizadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'criar curso');
    }
  }

  findCursosDoProfessor(professorId: string) {
    return this.prisma.cursoBoost.findMany({
      where: { professorId },
      orderBy: { criadoEm: 'desc' },
      include: { _count: { select: { matriculas: true, modulos: true } } },
    });
  }

  findAllCursos() {
    return this.prisma.cursoBoost.findMany({
      orderBy: { criadoEm: 'desc' },
      include: {
        professor: { include: { usuario: { select: { id: true, nome: true } } } },
        _count: { select: { matriculas: true, modulos: true } },
      },
    });
  }

  async findOneCurso(id: string) {
    const curso = await this.prisma.cursoBoost.findUnique({
      where: { id },
      include: {
        professor: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
        modulos: { orderBy: { ordem: 'asc' }, include: { aulas: { orderBy: { ordem: 'asc' }, include: { materiais: true } } } },
      },
    });
    if (!curso) throw new NotFoundException(`Curso com id ${id} não encontrado.`);
    return this.serializeCursoAninhado(curso);
  }

  /**
   * `MaterialApoio.tamanho` é BigInt — qualquer resposta que aninhe
   * curso -> módulos -> aulas -> materiais precisa passar por aqui antes do
   * JSON (mesmo padrão de `AnexoTicket`/`DocumentoAcademico`/`AnexoEntrega`).
   */
  serializeCursoAninhado<T extends { modulos?: Array<{ aulas?: Array<{ materiais?: Array<{ tamanho: bigint | null }> }> }> }>(curso: T) {
    if (!curso.modulos) return curso;
    return {
      ...curso,
      modulos: curso.modulos.map((modulo) => ({
        ...modulo,
        aulas: (modulo.aulas ?? []).map((aula) => ({
          ...aula,
          materiais: (aula.materiais ?? []).map((material) => this.serializeMaterial(material)),
        })),
      })),
    };
  }

  async updateCurso(id: string, dto: UpdateCursoBoostDto) {
    await this.findOneCurso(id);
    try {
      return await this.prisma.cursoBoost.update({ where: { id }, data: { ...dto, atualizadoEm: new Date() } });
    } catch (error) {
      this.handleError(error, 'atualizar curso');
    }
  }

  async removeCurso(id: string) {
    await this.findOneCurso(id);
    try {
      return await this.prisma.cursoBoost.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover curso');
    }
  }

  async isCursoDoProfessor(cursoId: string, professorId: string) {
    const curso = await this.prisma.cursoBoost.findUnique({ where: { id: cursoId }, select: { professorId: true } });
    return curso?.professorId === professorId;
  }

  // ===================== Módulo =====================
  async createModulo(cursoId: string, dto: CreateModuloBoostDto) {
    await this.findOneCurso(cursoId);
    try {
      return await this.prisma.moduloBoost.create({ data: { ...dto, cursoId } });
    } catch (error) {
      this.handleError(error, 'criar módulo');
    }
  }

  async updateModulo(id: string, dto: UpdateModuloBoostDto) {
    await this.findOneModulo(id);
    try {
      return await this.prisma.moduloBoost.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleError(error, 'atualizar módulo');
    }
  }

  async findOneModulo(id: string) {
    const modulo = await this.prisma.moduloBoost.findUnique({ where: { id } });
    if (!modulo) throw new NotFoundException(`Módulo com id ${id} não encontrado.`);
    return modulo;
  }

  async removeModulo(id: string) {
    await this.findOneModulo(id);
    try {
      return await this.prisma.moduloBoost.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover módulo');
    }
  }

  /** Curso dono do módulo (para checagem de escopo no controller). */
  async cursoIdDoModulo(moduloId: string) {
    const modulo = await this.prisma.moduloBoost.findUnique({ where: { id: moduloId }, select: { cursoId: true } });
    if (!modulo) throw new NotFoundException(`Módulo com id ${moduloId} não encontrado.`);
    return modulo.cursoId;
  }

  // ===================== Aula =====================
  async createAula(moduloId: string, dto: CreateAulaBoostDto) {
    await this.findOneModulo(moduloId);
    try {
      return await this.prisma.aulaBoost.create({ data: { ...dto, moduloId } });
    } catch (error) {
      this.handleError(error, 'criar aula');
    }
  }

  async findOneAula(id: string) {
    const aula = await this.prisma.aulaBoost.findUnique({ where: { id }, include: { materiais: true } });
    if (!aula) throw new NotFoundException(`Aula com id ${id} não encontrada.`);
    return { ...aula, materiais: aula.materiais.map((material) => this.serializeMaterial(material)) };
  }

  async updateAula(id: string, dto: UpdateAulaBoostDto) {
    await this.findOneAula(id);
    try {
      return await this.prisma.aulaBoost.update({ where: { id }, data: dto });
    } catch (error) {
      this.handleError(error, 'atualizar aula');
    }
  }

  async removeAula(id: string) {
    await this.findOneAula(id);
    try {
      return await this.prisma.aulaBoost.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover aula');
    }
  }

  /** Curso dono da aula, atravessando o módulo (para checagem de escopo no controller). */
  async cursoIdDaAula(aulaId: string) {
    const aula = await this.prisma.aulaBoost.findUnique({ where: { id: aulaId }, select: { modulo: { select: { cursoId: true } } } });
    if (!aula) throw new NotFoundException(`Aula com id ${aulaId} não encontrada.`);
    return aula.modulo.cursoId;
  }

  // ===================== Material de apoio =====================
  async createMaterial(aulaId: string, arquivo: { originalname: string; filename: string; mimetype: string; size: number }) {
    await this.findOneAula(aulaId);
    const material = await this.prisma.materialApoio.create({
      data: { aulaId, nome: arquivo.originalname, caminho: arquivo.filename, tipo: arquivo.mimetype, tamanho: arquivo.size, criadoEm: new Date() },
    });
    return this.serializeMaterial(material);
  }

  async findOneMaterial(id: string) {
    const material = await this.prisma.materialApoio.findUnique({ where: { id } });
    if (!material) throw new NotFoundException(`Material com id ${id} não encontrado.`);
    return material;
  }

  async removeMaterial(id: string) {
    await this.findOneMaterial(id);
    try {
      return await this.prisma.materialApoio.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'remover material');
    }
  }

  /** Curso dono do material, atravessando aula + módulo (para checagem de escopo no controller). */
  async cursoIdDoMaterial(materialId: string) {
    const material = await this.prisma.materialApoio.findUnique({
      where: { id: materialId },
      select: { aula: { select: { modulo: { select: { cursoId: true } } } } },
    });
    if (!material) throw new NotFoundException(`Material com id ${materialId} não encontrado.`);
    return material.aula.modulo.cursoId;
  }

  serializeMaterial<T extends { tamanho: bigint | null }>(material: T) {
    return { ...material, tamanho: material.tamanho === null ? null : Number(material.tamanho) };
  }

  // ===================== Progresso dos alunos (instrutor) =====================
  async findAlunosDoCurso(cursoId: string) {
    await this.findOneCurso(cursoId);
    return this.prisma.matriculaBoost.findMany({
      where: { cursoId },
      orderBy: { matriculadoEm: 'desc' },
      include: { boostUsuario: { select: { id: true, nome: true, email: true } }, certificado: true },
    });
  }

  // ===================== Chat (lado instrutor) =====================
  async findMensagens(cursoId: string) {
    await this.findOneCurso(cursoId);
    return this.prisma.mensagemBoost.findMany({
      where: { cursoId },
      orderBy: { criadoEm: 'asc' },
      include: {
        boostUsuario: { select: { id: true, nome: true } },
        professor: { select: { id: true, usuario: { select: { id: true, nome: true } } } },
      },
    });
  }

  async createMensagemComoProfessor(cursoId: string, professorId: string, mensagem: string) {
    await this.findOneCurso(cursoId);
    return this.prisma.mensagemBoost.create({
      data: { cursoId, professorId, mensagem, criadoEm: new Date() },
      include: { professor: { select: { id: true, usuario: { select: { id: true, nome: true } } } } },
    });
  }

  private handleError(error: unknown, action: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException(`Não foi possível ${action}: já existe um registro com esses dados.`);
      if (error.code === 'P2025') throw new NotFoundException(`Registro relacionado não encontrado ao ${action}.`);
    }
    if (error instanceof BadRequestException) throw error;
    throw new InternalServerErrorException(`Erro inesperado ao ${action}.`);
  }
}
