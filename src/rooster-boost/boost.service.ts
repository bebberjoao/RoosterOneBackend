import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID, randomBytes } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../roster-hub/shared/prisma.service';
import { PaginacaoQueryDto, montarPagina, pediuPaginacao, prismaSkipTake } from '../common/pagination';
import { PASTAS } from '../common/storage.config';
import { AuditoriaService } from '../roster-hub/shared/auditoria.service';
import {
  ConfigurarCertificadoDto, CreateAulaBoostDto, CreateCursoBoostDto, CreateModuloBoostDto,
  UpdateAulaBoostDto, UpdateCursoBoostDto, UpdateModuloBoostDto,
} from './dto/boost.dto';
import { traduzirErroPrisma } from '../common/prisma-erro';

const SALT_ROUNDS = 10;

@Injectable()
export class BoostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private slugify(titulo: string) {
    return titulo
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      .slice(0, 180);
  }

  // ===================== Curso =====================
  async createCurso(dto: CreateCursoBoostDto) {
    const base = this.slugify(dto.titulo) || randomUUID().slice(0, 8);
    let slug = base;
    let tentativa = 1;
    while (await this.prisma.cursoBoost.findUnique({ where: { slug } })) {
      slug = `${base}-${++tentativa}`;
    }
    try {
      return await this.prisma.cursoBoost.create({
        data: { ...dto, slug, criadoEm: new Date(), atualizadoEm: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'criar curso');
    }
  }

  findAllCursos() {
    return this.prisma.cursoBoost.findMany({
      orderBy: { criadoEm: 'desc' },
      include: {
        orientadores: { include: { professor: { include: { usuario: { select: { id: true, nome: true } } } } } },
        _count: { select: { matriculas: true, modulos: true } },
      },
    });
  }

  async findOneCurso(id: string) {
    const curso = await this.prisma.cursoBoost.findUnique({
      where: { id },
      include: {
        orientadores: { include: { professor: { include: { usuario: { select: { id: true, nome: true, email: true } } } } } },
        modulos: { orderBy: { ordem: 'asc' }, include: { aulas: { orderBy: { ordem: 'asc' }, include: { materiais: true } } } },
      },
    });
    if (!curso) throw new NotFoundException(`Curso com id ${id} não encontrado.`);
    return this.serializeCursoAninhado(curso);
  }

  /**
   * `MaterialApoio.tamanho` e `AulaBoost.videoTamanho` são BigInt — qualquer
   * resposta que aninhe curso -> módulos -> aulas -> materiais precisa passar
   * por aqui antes do JSON (mesmo padrão de `AnexoTicket`/`DocumentoAcademico`/`AnexoEntrega`).
   */
  serializeCursoAninhado<
    T extends { modulos?: Array<{ aulas?: Array<{ videoTamanho: bigint | null; materiais?: Array<{ tamanho: bigint | null }> }> }> },
  >(curso: T) {
    if (!curso.modulos) return curso;
    return {
      ...curso,
      modulos: curso.modulos.map((modulo) => ({
        ...modulo,
        aulas: (modulo.aulas ?? []).map((aula) => ({
          ...this.serializeAula(aula),
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

  /** Liga/desliga o certificado e ajusta o texto/carga horária — ação `certificado`, separada da edição do curso. */
  async configurarCertificado(id: string, dto: ConfigurarCertificadoDto) {
    await this.findOneCurso(id);
    const data: Prisma.CursoBoostUpdateInput = { atualizadoEm: new Date() };
    if (dto.emiteCertificado !== undefined) data.emiteCertificado = dto.emiteCertificado;
    if (dto.certificadoTexto !== undefined) data.certificadoTexto = dto.certificadoTexto.trim() || null;
    if (dto.cargaHoraria !== undefined) data.cargaHoraria = dto.cargaHoraria;
    try {
      return await this.prisma.cursoBoost.update({ where: { id }, data });
    } catch (error) {
      this.handleError(error, 'configurar certificado');
    }
  }

  // ===================== Orientadores =====================
  findOrientadores(cursoId: string) {
    return this.prisma.cursoOrientadorBoost.findMany({
      where: { cursoId },
      orderBy: { criadoEm: 'asc' },
      include: { professor: { include: { usuario: { select: { id: true, nome: true, email: true } } } } },
    });
  }

  /** Substitui a lista de orientadores do curso (só cria/remove o que mudou). */
  async definirOrientadores(cursoId: string, professorIds: string[]) {
    await this.findOneCurso(cursoId);
    const encontrados = await this.prisma.professor.findMany({ where: { id: { in: professorIds } }, select: { id: true } });
    if (encontrados.length !== professorIds.length) {
      throw new BadRequestException('Um ou mais professores informados não existem.');
    }
    const atuais = await this.prisma.cursoOrientadorBoost.findMany({ where: { cursoId }, select: { professorId: true } });
    const atuaisIds = atuais.map((o) => o.professorId);
    const remover = atuaisIds.filter((id) => !professorIds.includes(id));
    const criar = professorIds.filter((id) => !atuaisIds.includes(id));
    if (remover.length) await this.prisma.cursoOrientadorBoost.deleteMany({ where: { cursoId, professorId: { in: remover } } });
    for (const professorId of criar) {
      await this.prisma.cursoOrientadorBoost.create({ data: { cursoId, professorId, criadoEm: new Date() } });
    }
    return this.findOrientadores(cursoId);
  }

  async professorOrientaCurso(professorId: string, cursoId: string) {
    return Boolean(await this.prisma.cursoOrientadorBoost.findUnique({ where: { cursoId_professorId: { cursoId, professorId } } }));
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
      const aula = await this.prisma.aulaBoost.create({ data: { ...dto, moduloId } });
      return this.serializeAula(aula);
    } catch (error) {
      this.handleError(error, 'criar aula');
    }
  }

  async findOneAula(id: string) {
    const aula = await this.prisma.aulaBoost.findUnique({ where: { id }, include: { materiais: true } });
    if (!aula) throw new NotFoundException(`Aula com id ${id} não encontrada.`);
    return { ...this.serializeAula(aula), materiais: aula.materiais.map((material) => this.serializeMaterial(material)) };
  }

  async updateAula(id: string, dto: UpdateAulaBoostDto) {
    await this.findOneAula(id);
    try {
      const aula = await this.prisma.aulaBoost.update({ where: { id }, data: dto });
      return this.serializeAula(aula);
    } catch (error) {
      this.handleError(error, 'atualizar aula');
    }
  }

  async removeAula(id: string) {
    const aulaAtual = await this.findOneAulaBruta(id);
    if (aulaAtual.videoArquivo) this.apagarArquivoVideo(aulaAtual.videoArquivo);
    try {
      const aula = await this.prisma.aulaBoost.delete({ where: { id } });
      return this.serializeAula(aula);
    } catch (error) {
      this.handleError(error, 'remover aula');
    }
  }

  /** `videoTamanho` é BigInt — toda resposta que devolve a aula crua precisa passar por aqui antes do JSON. */
  serializeAula<T extends { videoTamanho: bigint | null }>(aula: T) {
    return { ...aula, videoTamanho: aula.videoTamanho === null ? null : Number(aula.videoTamanho) };
  }

  /** Curso dono da aula, atravessando o módulo (para checagem de escopo no controller). */
  async cursoIdDaAula(aulaId: string) {
    const aula = await this.prisma.aulaBoost.findUnique({ where: { id: aulaId }, select: { modulo: { select: { cursoId: true } } } });
    if (!aula) throw new NotFoundException(`Aula com id ${aulaId} não encontrada.`);
    return aula.modulo.cursoId;
  }

  // ===================== Vídeo hospedado =====================
  /**
   * Grava o vídeo hospedado da aula. Se já havia um (instrutor substituindo o
   * arquivo), apaga o antigo primeiro — diferente de `removeMaterial`, que
   * não limpa o arquivo do disco, vídeo precisa disso: até 2GB por arquivo,
   * deixar órfão a cada substituição esgota disco rápido.
   */
  async setVideoAula(aulaId: string, arquivo: { filename: string; mimetype: string; size: number }) {
    const aulaAtual = await this.findOneAulaBruta(aulaId);
    if (aulaAtual.videoArquivo) this.apagarArquivoVideo(aulaAtual.videoArquivo);

    try {
      const aula = await this.prisma.aulaBoost.update({
        where: { id: aulaId },
        data: {
          tipo: 'video',
          videoArquivo: arquivo.filename,
          videoTamanho: BigInt(arquivo.size),
          videoMimeType: arquivo.mimetype,
        },
      });
      return this.serializeAula(aula);
    } catch (error) {
      this.handleError(error, 'salvar vídeo da aula');
    }
  }

  async removeVideoAula(aulaId: string) {
    const aula = await this.findOneAulaBruta(aulaId);
    if (aula.videoArquivo) this.apagarArquivoVideo(aula.videoArquivo);
    try {
      const atualizada = await this.prisma.aulaBoost.update({
        where: { id: aulaId },
        data: { videoArquivo: null, videoTamanho: null, videoMimeType: null },
      });
      return this.serializeAula(atualizada);
    } catch (error) {
      this.handleError(error, 'remover vídeo da aula');
    }
  }

  /** Aula sem serialização de material — usado internamente por setVideoAula/removeVideoAula. */
  private async findOneAulaBruta(id: string) {
    const aula = await this.prisma.aulaBoost.findUnique({ where: { id } });
    if (!aula) throw new NotFoundException(`Aula com id ${id} não encontrada.`);
    return aula;
  }

  private apagarArquivoVideo(nomeArquivo: string) {
    const caminho = join(PASTAS.videosBoost(), nomeArquivo);
    if (existsSync(caminho)) unlinkSync(caminho);
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
      include: { boostUsuario: { select: { id: true, nome: true, email: true, usuarioId: true } }, certificado: true },
    });
  }

  // ===================== Conversas aluno ↔ orientador (lado orientador) =====================
  // Uma conversa contínua por (curso, aluno), atendida por qualquer orientador do curso. A única
  // "posse" do módulo é o vínculo de orientador: quem não está vinculado ao curso recebe 404.

  private static readonly INCLUDE_AUTORES = {
    boostUsuario: { select: { id: true, nome: true } },
    professor: { select: { id: true, usuario: { select: { id: true, nome: true } } } },
  } as const;

  /** Caixa de entrada do orientador: só as conversas dos cursos em que ele está vinculado. */
  async findConversasDoOrientador(professorId: string) {
    const conversas = await this.prisma.conversaBoost.findMany({
      where: { curso: { orientadores: { some: { professorId } } } },
      orderBy: { ultimaMensagemEm: 'desc' },
      include: {
        boostUsuario: { select: { id: true, nome: true } },
        curso: { select: { id: true, titulo: true } },
        mensagens: { orderBy: { criadoEm: 'desc' }, take: 1 },
        _count: { select: { mensagens: { where: { boostUsuarioId: { not: null }, lidaEm: null } } } },
      },
    });
    return conversas.map(({ mensagens, _count, ...conversa }) => ({
      ...conversa,
      ultimaMensagem: mensagens[0]?.mensagem ?? null,
      naoLidas: _count.mensagens,
    }));
  }

  /** Devolve a conversa se o professor orienta o curso dela; senão 404 (não revela que existe). */
  async exigirConversaDoOrientador(conversaId: string, professorId: string) {
    const conversa = await this.prisma.conversaBoost.findFirst({
      where: { id: conversaId, curso: { orientadores: { some: { professorId } } } },
      include: { boostUsuario: { select: { id: true, nome: true } }, curso: { select: { id: true, titulo: true } } },
    });
    if (!conversa) throw new NotFoundException('Conversa não encontrada.');
    return conversa;
  }

  findMensagensDaConversa(conversaId: string) {
    return this.prisma.mensagemBoost.findMany({
      where: { conversaId },
      orderBy: { criadoEm: 'asc' },
      include: BoostService.INCLUDE_AUTORES,
    });
  }

  async createMensagemComoOrientador(conversaId: string, professorId: string, mensagem: string) {
    const agora = new Date();
    return this.prisma.$transaction(async (tx) => {
      const criada = await tx.mensagemBoost.create({
        data: { conversaId, professorId, mensagem, criadoEm: agora },
        include: BoostService.INCLUDE_AUTORES,
      });
      await tx.conversaBoost.update({ where: { id: conversaId }, data: { ultimaMensagemEm: agora } });
      return criada;
    });
  }

  /** O orientador abriu a conversa: as mensagens do aluno passam a contar como lidas. */
  async marcarConversaLidaPeloOrientador(conversaId: string) {
    const r = await this.prisma.mensagemBoost.updateMany({
      where: { conversaId, boostUsuarioId: { not: null }, lidaEm: null },
      data: { lidaEm: new Date() },
    });
    return { atualizadas: r.count };
  }

  // ===================== Contas externas (BoostUsuario) — painel admin =====================
  // Gestão entre cursos, por isso fora do modelo de posse "dono do curso"
  // usado no resto deste service — checagem de permissão fica só no controller.

  async findAllBoostUsuarios(paginacao: PaginacaoQueryDto = {}) {
    const consulta = {
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true, nome: true, email: true, ativo: true, criadoEm: true, usuarioId: true,
        _count: { select: { matriculas: true } },
      },
    } satisfies Prisma.BoostUsuarioFindManyArgs;

    if (!pediuPaginacao(paginacao)) {
      return this.prisma.boostUsuario.findMany(consulta);
    }
    const [total, dados] = await this.prisma.$transaction([
      this.prisma.boostUsuario.count(),
      this.prisma.boostUsuario.findMany({ ...consulta, ...prismaSkipTake(paginacao) }),
    ]);
    return montarPagina(dados, total, paginacao);
  }

  /**
   * `BoostUsuario` não tem uma tabela de token de redefinição por e-mail
   * (equivalente a `RedefinicaoSenha`, do Hub) — construir esse fluxo
   * inteiro só para a conta externa não se pagava neste momento. Em vez
   * disso, gera uma senha temporária aleatória, salva o hash e devolve o
   * valor em texto plano **uma única vez** — o admin repassa por fora, mesmo
   * espírito informal de `PATCH /usuarios/:id` com `senhaHash` no Hub.
   */
  async redefinirSenhaBoostUsuario(id: string, atorId?: string) {
    const existente = await this.prisma.boostUsuario.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException(`Aluno externo com id ${id} não encontrado.`);
    if (existente.usuarioId) {
      throw new ConflictException('A conta utiliza o login institucional; a senha é a mesma do sistema e é redefinida no Rooster Hub.');
    }

    const senhaTemporaria = randomBytes(9).toString('base64url'); // 12 chars, sem caractere ambíguo
    await this.prisma.boostUsuario.update({
      where: { id },
      data: { senhaHash: await bcrypt.hash(senhaTemporaria, SALT_ROUNDS) },
    });
    await this.auditoria.registrar({
      usuarioId: atorId, modulo: 'Rooster Boost', acao: 'conta_externa_senha_redefinida', entidade: 'boost_usuario', entidadeId: id,
    });
    return { id, email: existente.email, senhaTemporaria };
  }

  /**
   * Cadastro de conta externa pela administração. Sem senha informada, gera senha temporária,
   * devolvida uma única vez, no mesmo padrão de `redefinirSenhaBoostUsuario`.
   */
  async criarBoostUsuario(dto: { nome: string; email: string; senha?: string }, atorId?: string) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.boostUsuario.findUnique({ where: { email } })) {
      throw new ConflictException('Já existe uma conta com este e-mail no Rooster Boost.');
    }
    const senhaTemporaria = dto.senha ? undefined : randomBytes(9).toString('base64url');
    let criado;
    try {
      criado = await this.prisma.boostUsuario.create({
        data: {
          nome: dto.nome.trim(), email, criadoEm: new Date(),
          senhaHash: await bcrypt.hash(dto.senha ?? (senhaTemporaria as string), SALT_ROUNDS),
        },
        select: { id: true, nome: true, email: true, ativo: true, criadoEm: true, usuarioId: true },
      });
    } catch (error) {
      this.handleError(error, 'cadastrar o aluno externo');
    }
    await this.auditoria.registrar({
      usuarioId: atorId, modulo: 'Rooster Boost', acao: 'conta_externa_criada', entidade: 'boost_usuario', entidadeId: criado.id,
    });
    return { ...criado, senhaTemporaria };
  }

  /**
   * Edição de nome, e-mail e situação. A conta vinculada à conta institucional tem nome e e-mail
   * derivados do Rooster Hub e não os aceita por aqui (seriam sobrescritos no login seguinte).
   */
  async atualizarBoostUsuario(id: string, dto: { nome?: string; email?: string; ativo?: boolean }, atorId?: string) {
    const existente = await this.prisma.boostUsuario.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException(`Aluno externo com id ${id} não encontrado.`);
    if (existente.usuarioId && (dto.nome !== undefined || dto.email !== undefined)) {
      throw new ConflictException('Nome e e-mail da conta institucional são mantidos no Rooster Hub.');
    }
    const data: Prisma.BoostUsuarioUpdateInput = {};
    if (dto.nome !== undefined) data.nome = dto.nome.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    let atualizado;
    try {
      atualizado = await this.prisma.boostUsuario.update({
        where: { id }, data,
        select: { id: true, nome: true, email: true, ativo: true, criadoEm: true, usuarioId: true },
      });
    } catch (error) {
      this.handleError(error, 'atualizar o aluno externo');
    }
    const acao = dto.ativo === undefined || dto.ativo === existente.ativo
      ? 'conta_externa_editada'
      : dto.ativo ? 'conta_externa_ativada' : 'conta_externa_desativada';
    await this.auditoria.registrar({ usuarioId: atorId, modulo: 'Rooster Boost', acao, entidade: 'boost_usuario', entidadeId: id });
    return atualizado;
  }

  /** Exclusão apenas de conta sem matrícula; com histórico, a conta deve ser desativada. */
  async excluirBoostUsuario(id: string, atorId?: string) {
    const existente = await this.prisma.boostUsuario.findUnique({
      where: { id }, include: { _count: { select: { matriculas: true } } },
    });
    if (!existente) throw new NotFoundException(`Aluno externo com id ${id} não encontrado.`);
    if (existente._count.matriculas > 0) {
      throw new ConflictException('A conta possui matrículas e não pode ser excluída; desative-a para preservar o histórico.');
    }
    try {
      await this.prisma.boostUsuario.delete({ where: { id } });
    } catch (error) {
      this.handleError(error, 'excluir o aluno externo');
    }
    await this.auditoria.registrar({
      usuarioId: atorId, modulo: 'Rooster Boost', acao: 'conta_externa_excluida', entidade: 'boost_usuario', entidadeId: id,
    });
    return { id };
  }

  // ===================== Conta institucional no portal =====================

  /**
   * Obtém a conta do portal vinculada ao usuário institucional, criando-a quando não existe. Conta
   * externa preexistente com o mesmo e-mail é vinculada (mesma pessoa, preservando as matrículas) e tem a
   * senha própria invalidada: como o cadastro externo não confirma o e-mail, manter a senha permitiria
   * que terceiro que o tivesse registrado acessasse a conta. Nome e e-mail acompanham o Rooster Hub.
   */
  async obterContaInstitucional(usuario: { id: string; nome: string; email: string }) {
    const senhaInutilizavel = () => bcrypt.hash(randomBytes(32).toString('hex'), SALT_ROUNDS);
    const vinculada = await this.prisma.boostUsuario.findUnique({ where: { usuarioId: usuario.id } });
    if (vinculada) {
      if (vinculada.nome === usuario.nome && vinculada.email === usuario.email) return vinculada;
      const emailLivre = vinculada.email === usuario.email
        || !(await this.prisma.boostUsuario.findUnique({ where: { email: usuario.email } }));
      return this.prisma.boostUsuario.update({
        where: { id: vinculada.id },
        data: { nome: usuario.nome, ...(emailLivre && { email: usuario.email }) },
      });
    }
    const porEmail = await this.prisma.boostUsuario.findUnique({ where: { email: usuario.email } });
    if (porEmail) {
      return this.prisma.boostUsuario.update({
        where: { id: porEmail.id },
        data: { usuarioId: usuario.id, nome: usuario.nome, senhaHash: await senhaInutilizavel() },
      });
    }
    return this.prisma.boostUsuario.create({
      data: {
        nome: usuario.nome, email: usuario.email, usuarioId: usuario.id,
        senhaHash: await senhaInutilizavel(), criadoEm: new Date(),
      },
    });
  }

  // ===================== Matrícula pela gestão =====================

  /**
   * Candidatos à matrícula manual: contas externas ativas e alunos do Academy (contas institucionais
   * ativas), excluídos os que já possuem matrícula ativa ou concluída no curso.
   */
  async findCandidatosMatricula(cursoId: string, busca?: string) {
    await this.findOneCurso(cursoId);
    const normalizar = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const termo = normalizar(busca?.trim() ?? '');
    const corresponde = (c: { nome: string; email: string }) => !termo || normalizar(`${c.nome} ${c.email}`).includes(termo);
    const matriculados = await this.prisma.matriculaBoost.findMany({
      where: { cursoId, status: { not: 'cancelada' } },
      select: { boostUsuario: { select: { id: true, usuarioId: true } } },
    });
    const contasMatriculadas = new Set(matriculados.map((m) => m.boostUsuario.id));
    const usuariosMatriculados = new Set(matriculados.map((m) => m.boostUsuario.usuarioId).filter(Boolean));

    // Filtragem textual em memória: mantém a mesma consulta no PostgreSQL e no SQLite dos testes
    // (sem `mode: "insensitive"`) e ignora acentos; o volume de contas de uma instituição é compatível.
    const [externos, internos] = await Promise.all([
      this.prisma.boostUsuario.findMany({
        where: { ativo: true, usuarioId: null },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, email: true },
      }),
      this.prisma.usuario.findMany({
        where: { ativo: true, alunoAcademico: { isNot: null } },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, email: true, alunoAcademico: { select: { ra: true } } },
      }),
    ]);
    return {
      externos: externos.filter((c) => !contasMatriculadas.has(c.id) && corresponde(c)).slice(0, 50),
      internos: internos
        .filter((u) => !usuariosMatriculados.has(u.id) && corresponde(u))
        .slice(0, 50)
        .map((u) => ({ usuarioId: u.id, nome: u.nome, email: u.email, ra: u.alunoAcademico?.ra ?? null })),
    };
  }

  /**
   * Matrícula feita pela gestão, de conta externa (`boostUsuarioId`) ou de usuário institucional
   * (`usuarioId`, com criação ou vínculo automático da conta do portal). Matrícula cancelada é reativada.
   */
  async matricularPelaGestao(cursoId: string, dto: { boostUsuarioId?: string; usuarioId?: string }, atorId?: string) {
    if (!dto.boostUsuarioId === !dto.usuarioId) {
      throw new BadRequestException('Informe exatamente um destinatário: boostUsuarioId (conta externa) ou usuarioId (conta institucional).');
    }
    await this.findOneCurso(cursoId);

    let boostUsuarioId: string;
    if (dto.usuarioId) {
      const usuario = await this.prisma.usuario.findUnique({ where: { id: dto.usuarioId } });
      if (!usuario || !usuario.ativo) throw new NotFoundException('Usuário institucional não encontrado ou inativo.');
      boostUsuarioId = (await this.obterContaInstitucional(usuario)).id;
    } else {
      const conta = await this.prisma.boostUsuario.findUnique({ where: { id: dto.boostUsuarioId } });
      if (!conta) throw new NotFoundException('Conta do portal Boost não encontrada.');
      if (!conta.ativo) throw new ConflictException('A conta do portal Boost está desativada.');
      boostUsuarioId = conta.id;
    }

    const existente = await this.prisma.matriculaBoost.findUnique({
      where: { boostUsuarioId_cursoId: { boostUsuarioId, cursoId } },
    });
    if (existente && existente.status !== 'cancelada') {
      throw new ConflictException('O aluno já possui matrícula neste curso.');
    }
    const matricula = existente
      ? await this.prisma.matriculaBoost.update({ where: { id: existente.id }, data: { status: 'ativa', matriculadoEm: new Date() } })
      : await this.prisma.matriculaBoost.create({ data: { boostUsuarioId, cursoId, status: 'ativa', matriculadoEm: new Date() } });
    await this.auditoria.registrar({
      usuarioId: atorId, modulo: 'Rooster Boost', acao: 'matricula_boost_pela_gestao', entidade: 'matricula_boost', entidadeId: matricula.id,
    });
    return matricula;
  }

  async cancelarMatriculaPelaGestao(matriculaId: string, atorId?: string) {
    const matricula = await this.prisma.matriculaBoost.findUnique({ where: { id: matriculaId } });
    if (!matricula) throw new NotFoundException('Matrícula não encontrada.');
    if (matricula.status === 'concluida') throw new ConflictException('A matrícula concluída não pode ser cancelada.');
    if (matricula.status === 'cancelada') return matricula;
    const atualizada = await this.prisma.matriculaBoost.update({ where: { id: matriculaId }, data: { status: 'cancelada' } });
    await this.auditoria.registrar({
      usuarioId: atorId, modulo: 'Rooster Boost', acao: 'matricula_boost_cancelada', entidade: 'matricula_boost', entidadeId: matriculaId,
    });
    return atualizada;
  }

  private handleError(error: unknown, action: string): never {
    return traduzirErroPrisma(error, action);
  }
}
