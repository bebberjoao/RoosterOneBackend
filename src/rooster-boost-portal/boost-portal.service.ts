import {
  BadRequestException,
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

/** A partir de quantos % assistidos o vídeo completa a aula sozinho, sem precisar do botão manual. */
const LIMIAR_CONCLUSAO_PCT = 90;

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

  /**
   * Login com a conta institucional: valida e-mail e senha da tabela de usuários do Hub e obtém (ou cria)
   * a conta do portal vinculada. A resposta de falha é a mesma do login externo, sem revelar se o e-mail
   * existe; a conta do portal desativada pela administração também é recusada.
   */
  async loginInstitucional(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    const valido = usuario && usuario.ativo && (await bcrypt.compare(senha, usuario.senhaHash));
    if (!valido) throw new UnauthorizedException('E-mail ou senha inválidos.');
    const conta = await this.boostService.obterContaInstitucional(usuario);
    if (!conta.ativo) throw new UnauthorizedException('A conta do portal Boost está desativada. Procure a administração.');
    return this.emitirSessao(conta);
  }

  private async emitirSessao(boostUsuario: { id: string; nome: string; email: string; usuarioId?: string | null }) {
    return {
      usuario: { id: boostUsuario.id, nome: boostUsuario.nome, email: boostUsuario.email, institucional: !!boostUsuario.usuarioId },
      accessToken: await this.jwt.signAsync({ sub: boostUsuario.id, email: boostUsuario.email, tipo: 'boost' }),
    };
  }

  // ===================== Catálogo público =====================
  findCatalogo() {
    return this.prisma.cursoBoost.findMany({
      where: { status: 'publicado' },
      orderBy: { criadoEm: 'desc' },
      include: {
        orientadores: { include: { professor: { include: { usuario: { select: { id: true, nome: true } } } } } },
        _count: { select: { matriculas: true, modulos: true } },
      },
    });
  }

  async findCursoPublico(slug: string) {
    const curso = await this.prisma.cursoBoost.findUnique({
      where: { slug },
      include: {
        orientadores: { include: { professor: { include: { usuario: { select: { id: true, nome: true } } } } } },
        modulos: { orderBy: { ordem: 'asc' }, include: { aulas: { orderBy: { ordem: 'asc' }, select: { id: true, titulo: true, tipo: true, duracaoMin: true } } } },
      },
    });
    if (!curso || curso.status !== 'publicado') throw new NotFoundException('Curso não encontrado.');
    return curso;
  }

  /**
   * Conferência pública de certificado, sem login: quem recebe um certificado
   * (empregador, secretaria de outra instituição) precisa conseguir validar o
   * código impresso nele. Até então o código era gerado e único, mas não havia
   * como verificá-lo — o certificado valia só pelo PDF, que qualquer um pode
   * editar.
   *
   * Devolve **o mínimo necessário para conferir**: nome de quem concluiu,
   * curso, carga horária e data de emissão. Nada de e-mail, id de usuário, id
   * de matrícula ou progresso — é um endpoint aberto, e o que trafega aqui é
   * exatamente o que já está impresso no certificado, nada além.
   */
  async verificarCertificado(codigo: string) {
    const certificado = await this.prisma.certificadoBoost.findUnique({
      where: { codigo: codigo.trim().toUpperCase() },
      include: {
        matricula: {
          include: {
            boostUsuario: { select: { nome: true } },
            curso: { select: { titulo: true, cargaHoraria: true } },
          },
        },
      },
    });

    // Mesma resposta para código inexistente e malformado: não confirma nem
    // desmente nada além da existência daquele código exato.
    if (!certificado) throw new NotFoundException('Certificado não encontrado.');

    return {
      valido: true,
      codigo: certificado.codigo,
      aluno: certificado.matricula.boostUsuario.nome,
      curso: certificado.matricula.curso.titulo,
      cargaHoraria: certificado.matricula.curso.cargaHoraria,
      emitidoEm: certificado.emitidoEm,
    };
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
      include: { curso: { include: { orientadores: { include: { professor: { include: { usuario: { select: { id: true, nome: true } } } } } } } }, certificado: true },
    });
  }

  /** Matrícula + curso completo (módulos/aulas/materiais) + progresso do aluno — sempre escopado ao dono. */
  async findMinhaMatricula(matriculaId: string, boostUsuarioId: string) {
    const matricula = await this.prisma.matriculaBoost.findUnique({
      where: { id: matriculaId },
      include: {
        curso: {
          include: {
            orientadores: { include: { professor: { include: { usuario: { select: { id: true, nome: true } } } } } },
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

  /** Mesma checagem de `exigirMatriculaDaAula`, exposta para o controller emitir o token de stream. */
  async exigirMatriculaDaAulaParaStream(aulaId: string, boostUsuarioId: string) {
    await this.exigirMatriculaDaAula(aulaId, boostUsuarioId);
  }

  /** Aula com o vídeo hospedado, para o endpoint de streaming — não exige matrícula de novo (já checada na emissão do token). */
  findAulaParaStream(aulaId: string) {
    return this.boostService.findOneAula(aulaId);
  }

  /** Marca a aula como concluída, recalcula o progresso da matrícula e emite certificado automaticamente ao bater 100%. */
  async concluirAula(aulaId: string, boostUsuarioId: string) {
    const matricula = await this.exigirMatriculaDaAula(aulaId, boostUsuarioId);
    await this.prisma.progressoAula.upsert({
      where: { matriculaId_aulaId: { matriculaId: matricula.id, aulaId } },
      create: { matriculaId: matricula.id, aulaId, concluidoEm: new Date() },
      update: { concluidoEm: new Date() },
    });
    return this.recalcularProgressoEEmitirCertificado(matricula);
  }

  /**
   * Progresso real de vídeo: posição para retomar de onde parou, e o maior
   * percentual já assistido (nunca anda pra trás, mesmo que o aluno volte o
   * vídeo). Ao cruzar o limiar de conclusão, dispara o mesmo caminho de
   * `concluirAula` — recalcular progresso da matrícula e emitir certificado.
   */
  async atualizarProgressoVideo(aulaId: string, boostUsuarioId: string, posicaoSeg: number, percentualAssistido: number) {
    const matricula = await this.exigirMatriculaDaAula(aulaId, boostUsuarioId);

    const existente = await this.prisma.progressoAula.findUnique({
      where: { matriculaId_aulaId: { matriculaId: matricula.id, aulaId } },
    });
    const jaConcluida = !!existente?.concluidoEm;
    const maiorPercentual = Math.max(percentualAssistido, existente?.percentualAssistido ?? 0);
    const completaAgora = !jaConcluida && maiorPercentual >= LIMIAR_CONCLUSAO_PCT;

    await this.prisma.progressoAula.upsert({
      where: { matriculaId_aulaId: { matriculaId: matricula.id, aulaId } },
      create: {
        matriculaId: matricula.id, aulaId, posicaoSeg, percentualAssistido: maiorPercentual,
        ...(completaAgora ? { concluidoEm: new Date() } : {}),
      },
      update: {
        posicaoSeg, percentualAssistido: maiorPercentual,
        ...(completaAgora ? { concluidoEm: new Date() } : {}),
      },
    });

    if (completaAgora) {
      await this.recalcularProgressoEEmitirCertificado(matricula);
    }
    return { posicaoSeg, percentualAssistido: maiorPercentual, concluida: jaConcluida || completaAgora };
  }

  /**
   * Núcleo compartilhado por `concluirAula` e `atualizarProgressoVideo`:
   * recalcula `progressoPct` da matrícula e emite certificado se bateu 100%.
   * A contagem de "concluídas" filtra `concluidoEm: { not: null }`
   * explicitamente — com progresso real de vídeo, uma `ProgressoAula` pode
   * existir (posição salva) sem a aula estar concluída, então a mera
   * existência da linha deixou de significar "concluída".
   */
  private async recalcularProgressoEEmitirCertificado(matricula: { id: string; cursoId: string; status: string }) {
    const totalAulas = await this.prisma.aulaBoost.count({ where: { modulo: { cursoId: matricula.cursoId } } });
    const concluidas = await this.prisma.progressoAula.count({
      where: { matriculaId: matricula.id, concluidoEm: { not: null } },
    });
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

  // ===================== Conversa com o orientador (lado aluno) =====================
  // Uma conversa contínua por (curso, aluno). Vale para qualquer matrícula, inclusive de curso
  // que saiu do ar: tirar do ar não tira o aluno do curso nem da conversa.

  private static readonly INCLUDE_AUTORES = {
    boostUsuario: { select: { id: true, nome: true } },
    professor: { select: { id: true, usuario: { select: { id: true, nome: true } } } },
  } as const;

  private async obterOuCriarConversa(cursoId: string, boostUsuarioId: string) {
    await this.exigirMatriculaDoCurso(cursoId, boostUsuarioId);
    return this.prisma.conversaBoost.upsert({
      where: { cursoId_boostUsuarioId: { cursoId, boostUsuarioId } },
      update: {},
      create: { cursoId, boostUsuarioId, criadoEm: new Date() },
    });
  }

  async obterConversa(cursoId: string, boostUsuarioId: string) {
    const conversa = await this.obterOuCriarConversa(cursoId, boostUsuarioId);
    const [orientadores, mensagens] = await Promise.all([
      this.prisma.cursoOrientadorBoost.findMany({
        where: { cursoId },
        include: { professor: { include: { usuario: { select: { id: true, nome: true } } } } },
      }),
      this.prisma.mensagemBoost.findMany({
        where: { conversaId: conversa.id },
        orderBy: { criadoEm: 'asc' },
        include: BoostPortalService.INCLUDE_AUTORES,
      }),
    ]);
    return {
      conversaId: conversa.id,
      orientadores: orientadores.map((o) => ({ id: o.professor.id, nome: o.professor.usuario.nome })),
      mensagens,
    };
  }

  async createMensagem(cursoId: string, boostUsuarioId: string, mensagem: string) {
    const conversa = await this.obterOuCriarConversa(cursoId, boostUsuarioId);
    const orientadores = await this.prisma.cursoOrientadorBoost.count({ where: { cursoId } });
    if (orientadores === 0) {
      throw new BadRequestException('Este curso ainda não tem orientador para responder. Tente novamente mais tarde.');
    }
    const agora = new Date();
    const criada = await this.prisma.$transaction(async (tx) => {
      const nova = await tx.mensagemBoost.create({
        data: { conversaId: conversa.id, boostUsuarioId, mensagem, criadoEm: agora },
        include: BoostPortalService.INCLUDE_AUTORES,
      });
      await tx.conversaBoost.update({ where: { id: conversa.id }, data: { ultimaMensagemEm: agora } });
      return nova;
    });
    return { conversaId: conversa.id, mensagem: criada };
  }

  /** O aluno abriu a conversa: as respostas dos orientadores passam a contar como lidas. */
  async marcarConversaLida(cursoId: string, boostUsuarioId: string) {
    await this.exigirMatriculaDoCurso(cursoId, boostUsuarioId);
    const r = await this.prisma.mensagemBoost.updateMany({
      where: { conversa: { cursoId, boostUsuarioId }, professorId: { not: null }, lidaEm: null },
      data: { lidaEm: new Date() },
    });
    return { atualizadas: r.count };
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
