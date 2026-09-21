import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { CertificadoBoostService } from '../rooster-boost/certificado-boost.service';
import { BoostService } from '../rooster-boost/boost.service';
import { CadastroBoostDto } from './dto/boost-portal.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class BoostPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly boostService: BoostService,
    private readonly certificadoService: CertificadoBoostService,
  ) {}

  // ===================== Autenticação =====================
  async cadastro(dto: CadastroBoostDto) {
    const existente = await this.prisma.boostUsuario.findUnique({ where: { email: dto.email } });
    if (existente) throw new ConflictException('Já existe uma conta com este e-mail no Rooster Boost.');

    const boostUsuario = await this.prisma.boostUsuario.create({
      data: { nome: dto.nome, email: dto.email, senhaHash: await bcrypt.hash(dto.senha, SALT_ROUNDS), criadoEm: new Date() },
    });
    return this.emitirSessao(boostUsuario);
  }

  async login(email: string, senha: string) {
    const boostUsuario = await this.prisma.boostUsuario.findUnique({ where: { email } });
    const valido = boostUsuario && boostUsuario.ativo && (await bcrypt.compare(senha, boostUsuario.senhaHash));
    if (!valido) throw new UnauthorizedException('E-mail ou senha inválidos.');
    return this.emitirSessao(boostUsuario);
  }

  private async emitirSessao(boostUsuario: { id: string; nome: string; email: string }) {
    return {
      usuario: { id: boostUsuario.id, nome: boostUsuario.nome, email: boostUsuario.email },
      accessToken: await this.jwt.signAsync({ sub: boostUsuario.id, email: boostUsuario.email, tipo: 'boost' }),
    };
  }

  // ===================== Catálogo público =====================
  findCatalogo() {
    return this.prisma.cursoBoost.findMany({
      where: { status: 'publicado' },
      orderBy: { criadoEm: 'desc' },
      include: {
        professor: { include: { usuario: { select: { id: true, nome: true } } } },
        _count: { select: { matriculas: true, modulos: true } },
      },
    });
  }

  async findCursoPublico(slug: string) {
    const curso = await this.prisma.cursoBoost.findUnique({
      where: { slug },
      include: {
        professor: { include: { usuario: { select: { id: true, nome: true } } } },
        modulos: { orderBy: { ordem: 'asc' }, include: { aulas: { orderBy: { ordem: 'asc' }, select: { id: true, titulo: true, tipo: true, duracaoMin: true } } } },
      },
    });
    if (!curso || curso.status !== 'publicado') throw new NotFoundException('Curso não encontrado.');
    return curso;
  }

  // ===================== Matrícula =====================
  async matricular(boostUsuarioId: string, cursoId: string) {
    const curso = await this.prisma.cursoBoost.findUnique({ where: { id: cursoId } });
    if (!curso || curso.status !== 'publicado') throw new NotFoundException('Curso não encontrado.');

    const existente = await this.prisma.matriculaBoost.findUnique({
      where: { boostUsuarioId_cursoId: { boostUsuarioId, cursoId } },
    });
    if (existente) return existente;

    return this.prisma.matriculaBoost.create({
      data: { boostUsuarioId, cursoId, status: 'ativa', matriculadoEm: new Date() },
    });
  }

  findMinhasMatriculas(boostUsuarioId: string) {
    return this.prisma.matriculaBoost.findMany({
      where: { boostUsuarioId },
      orderBy: { matriculadoEm: 'desc' },
      include: { curso: { include: { professor: { include: { usuario: { select: { id: true, nome: true } } } } } }, certificado: true },
    });
  }

  /** Matrícula + curso completo (módulos/aulas/materiais) + progresso do aluno — sempre escopado ao dono. */
  async findMinhaMatricula(matriculaId: string, boostUsuarioId: string) {
    const matricula = await this.prisma.matriculaBoost.findUnique({
      where: { id: matriculaId },
      include: {
        curso: {
          include: {
            professor: { include: { usuario: { select: { id: true, nome: true } } } },
            modulos: { orderBy: { ordem: 'asc' }, include: { aulas: { orderBy: { ordem: 'asc' }, include: { materiais: true } } } },
          },
        },
        progresso: true,
        certificado: true,
      },
    });
    if (!matricula || matricula.boostUsuarioId !== boostUsuarioId) throw new NotFoundException('Matrícula não encontrada.');
    return { ...matricula, curso: this.boostService.serializeCursoAninhado(matricula.curso) };
  }

  private async exigirMatriculaDaAula(aulaId: string, boostUsuarioId: string) {
    const aula = await this.prisma.aulaBoost.findUnique({ where: { id: aulaId }, select: { modulo: { select: { cursoId: true } } } });
    if (!aula) throw new NotFoundException(`Aula com id ${aulaId} não encontrada.`);
    const matricula = await this.prisma.matriculaBoost.findUnique({
      where: { boostUsuarioId_cursoId: { boostUsuarioId, cursoId: aula.modulo.cursoId } },
    });
    if (!matricula) throw new ForbiddenException('Você não está matriculado no curso desta aula.');
    return matricula;
  }

  /** Marca a aula como concluída, recalcula o progresso da matrícula e emite certificado automaticamente ao bater 100%. */
  async concluirAula(aulaId: string, boostUsuarioId: string) {
    const matricula = await this.exigirMatriculaDaAula(aulaId, boostUsuarioId);

    await this.prisma.progressoAula.upsert({
      where: { matriculaId_aulaId: { matriculaId: matricula.id, aulaId } },
      create: { matriculaId: matricula.id, aulaId, concluidoEm: new Date() },
      update: { concluidoEm: new Date() },
    });

    const totalAulas = await this.prisma.aulaBoost.count({ where: { modulo: { cursoId: matricula.cursoId } } });
    const concluidas = await this.prisma.progressoAula.count({ where: { matriculaId: matricula.id } });
    const progressoPct = totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0;
    const completou = progressoPct >= 100 && matricula.status !== 'concluida';

    const atualizada = await this.prisma.matriculaBoost.update({
      where: { id: matricula.id },
      data: {
        progressoPct,
        ...(completou ? { status: 'concluida', concluidoEm: new Date() } : {}),
      },
    });

    if (completou) {
      const curso = await this.prisma.cursoBoost.findUnique({ where: { id: matricula.cursoId }, select: { emiteCertificado: true } });
      if (curso?.emiteCertificado) await this.certificadoService.emitir(matricula.id);
    }

    return atualizada;
  }

  // ===================== Chat (lado aluno) =====================
  async findMensagens(cursoId: string, boostUsuarioId: string) {
    await this.exigirMatriculaDoCurso(cursoId, boostUsuarioId);
    return this.prisma.mensagemBoost.findMany({
      where: { cursoId },
      orderBy: { criadoEm: 'asc' },
      include: {
        boostUsuario: { select: { id: true, nome: true } },
        professor: { select: { id: true, usuario: { select: { id: true, nome: true } } } },
      },
    });
  }

  async createMensagem(cursoId: string, boostUsuarioId: string, mensagem: string) {
    await this.exigirMatriculaDoCurso(cursoId, boostUsuarioId);
    return this.prisma.mensagemBoost.create({
      data: { cursoId, boostUsuarioId, mensagem, criadoEm: new Date() },
      include: { boostUsuario: { select: { id: true, nome: true } } },
    });
  }

  private async exigirMatriculaDoCurso(cursoId: string, boostUsuarioId: string) {
    const matricula = await this.prisma.matriculaBoost.findUnique({
      where: { boostUsuarioId_cursoId: { boostUsuarioId, cursoId } },
    });
    if (!matricula) throw new ForbiddenException('Você não está matriculado neste curso.');
  }

  /** Material de apoio para download pelo aluno — só se ele estiver matriculado no curso da aula. */
  async findMaterialParaDownload(materialId: string, boostUsuarioId: string) {
    const material = await this.prisma.materialApoio.findUnique({
      where: { id: materialId },
      select: { id: true, nome: true, caminho: true, aula: { select: { modulo: { select: { cursoId: true } } } } },
    });
    if (!material) throw new NotFoundException(`Material com id ${materialId} não encontrado.`);
    await this.exigirMatriculaDoCurso(material.aula.modulo.cursoId, boostUsuarioId);
    return material;
  }

  // ===================== Certificado =====================
  async findCertificadoParaDownload(id: string, boostUsuarioId: string) {
    const certificado = await this.prisma.certificadoBoost.findUnique({
      where: { id },
      include: { matricula: true },
    });
    if (!certificado || certificado.matricula.boostUsuarioId !== boostUsuarioId) {
      throw new NotFoundException('Certificado não encontrado.');
    }
    return certificado;
  }
}
