import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Rede de segurança global — todo service já mapeia os erros conhecidos do
 * Prisma (P2002/P2025) pra uma exceção HTTP própria, com uma mensagem
 * contextual ("ao criar usuário", "ao remover turma"...), via um `handleError`
 * privado replicado em cada um. Este filtro só existe pra cobrir o que
 * escapar dessa camada (um service novo que esqueça o `try/catch`, um erro
 * do Prisma fora dos dois códigos mapeados) — sem contexto de ação, por isso
 * a mensagem aqui é sempre genérica.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'P2002') {
      const conflict = new ConflictException('Já existe um registro com esses dados.');
      const body = conflict.getResponse();
      return response.status(conflict.getStatus()).json(body);
    }
    if (exception.code === 'P2025') {
      const notFound = new NotFoundException('Registro não encontrado.');
      const body = notFound.getResponse();
      return response.status(notFound.getStatus()).json(body);
    }

    response.status(500).json({ statusCode: 500, message: 'Erro inesperado ao acessar o banco de dados.' });
  }
}
