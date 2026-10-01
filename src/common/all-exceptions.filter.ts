import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpException, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LogsErroService } from '../roster-hub/logs-erro/logs-erro.service';
import { ehErroConhecidoPrisma } from './prisma-erro';

/**
 * Proteção global de tratamento de exceções. Os services convertem os erros
 * conhecidos do Prisma (P2002 e P2025) em exceção HTTP com mensagem
 * contextualizada ("ao criar usuário", "ao remover turma" etc.), por meio de
 * `handleError`, que delega a `traduzirErroPrisma`. Este filtro trata o que não
 * passa por essa camada (service sem `try/catch`, código do Prisma não mapeado
 * ou exceção não prevista), com mensagem genérica por não dispor do contexto da
 * ação. Além de responder, registra em `logs_erro` toda resposta com status
 * igual ou superior a 500, que indica defeito; as recusas esperadas
 * (400, 401, 403, 404 e 409) não são registradas.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logsErro: LogsErroService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    const { status, body } = this.resolver(exception);

    if (status >= 500) {
      const usuarioId = (request.user as { id?: string } | undefined)?.id ?? null;
      void this.logsErro.registrar({
        usuarioId,
        metodo: request.method,
        rota: request.originalUrl ?? request.url,
        statusCode: status,
        mensagem: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? (exception.stack ?? null) : null,
      });
    }

    response.status(status).json(body);
  }

  private resolver(exception: unknown): { status: number; body: unknown } {
    if (ehErroConhecidoPrisma(exception)) {
      if (exception.code === 'P2002') {
        const conflict = new ConflictException('Já existe um registro com esses dados.');
        return { status: conflict.getStatus(), body: conflict.getResponse() };
      }
      if (exception.code === 'P2025') {
        const notFound = new NotFoundException('Registro não encontrado.');
        return { status: notFound.getStatus(), body: notFound.getResponse() };
      }
      return { status: 500, body: { statusCode: 500, message: 'Erro inesperado ao acessar o banco de dados.' } };
    }

    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), body: exception.getResponse() };
    }

    return { status: 500, body: { statusCode: 500, message: 'Erro interno inesperado.' } };
  }
}
