import { ArgumentsHost, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';
import type { LogsErroService } from '../roster-hub/logs-erro/logs-erro.service';

/**
 * O que este filtro precisa acertar: (1) toda exceção HTTP conhecida continua
 * respondendo exatamente como antes (nenhum teste e2e pode notar diferença);
 * (2) só status >= 500 é persistido em logs_erro — 400/403/404/409 são
 * recusas esperadas, não bugs, e não interessa rastreá-las; (3) erro genuíno
 * (nem HttpException nem Prisma conhecido) vira 500 e é persistido.
 */
describe('AllExceptionsFilter', () => {
  function montar() {
    const registrar = jest.fn().mockResolvedValue(undefined);
    const logsErro = { registrar } as unknown as LogsErroService;
    const filter = new AllExceptionsFilter(logsErro);

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status } as any;
    const request = { method: 'GET', originalUrl: '/v1/exemplo', user: { id: 'user-1' } } as any;

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { filter, registrar, status, json, host };
  }

  it('responde uma HttpException comum (404) sem persistir nada', () => {
    const { filter, registrar, status, json, host } = montar();
    filter.catch(new NotFoundException('Não encontrado.'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(registrar).not.toHaveBeenCalled();
  });

  it('responde uma HttpException de validação (400) sem persistir nada', () => {
    const { filter, registrar, status, host } = montar();
    filter.catch(new BadRequestException('Dado inválido.'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(registrar).not.toHaveBeenCalled();
  });

  it('mapeia Prisma P2002 para 409 sem persistir nada', () => {
    const { filter, registrar, status, host } = montar();
    const erro = new Prisma.PrismaClientKnownRequestError('conflito', { code: 'P2002', clientVersion: '6.19.3' });
    filter.catch(erro, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(registrar).not.toHaveBeenCalled();
  });

  it('mapeia Prisma P2025 para 404 sem persistir nada', () => {
    const { filter, registrar, status, host } = montar();
    const erro = new Prisma.PrismaClientKnownRequestError('não encontrado', { code: 'P2025', clientVersion: '6.19.3' });
    filter.catch(erro, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(registrar).not.toHaveBeenCalled();
  });

  it('erro genuíno (não HttpException, não Prisma conhecido) vira 500 e é persistido com o usuário autenticado', () => {
    const { filter, registrar, status, json, host } = montar();
    filter.catch(new TypeError('algo quebrou'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'user-1',
        metodo: 'GET',
        rota: '/v1/exemplo',
        statusCode: 500,
        mensagem: 'algo quebrou',
      }),
    );
  });

  it('HttpException explicitamente 500 também é persistida', () => {
    const { filter, registrar, status, host } = montar();
    filter.catch(new HttpException('erro interno explícito', 500), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
