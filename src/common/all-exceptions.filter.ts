import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, HttpException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { LogsErroService } from '../roster-hub/logs-erro/logs-erro.service';

/**
 * Rede de segurança global — todo service já mapeia os erros conhecidos do
 * Prisma (P2002/P2025) pra uma exceção HTTP própria, com uma mensagem
 * contextual ("ao criar usuário", "ao remover turma"...), via um `handleError`
 * privado replicado em cada um. Este filtro cobre o que escapar dessa camada
 * (um service novo que esqueça o `try/catch`, um erro do Prisma fora dos dois
 * códigos mapeados, ou qualquer exceção não prevista) — sem contexto de ação,
 * por isso a mensagem genérica — e, além de responder, persiste em `logs_erro`
 * toda vez que o status final for >= 500: são bugs de verdade, não recusas
 * esperadas (400/401/403/404/409), que não interessa rastrear aqui.
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
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
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
