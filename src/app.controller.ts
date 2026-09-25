import { Controller, Get, HttpCode, HttpStatus, Res, VERSION_NEUTRAL } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

// VERSION_NEUTRAL: o health check responde em `GET /`, fora do versionamento.
// Quem monitora a aplicação precisa de um endereço estável, que não mude
// quando a API ganhar uma v2 — ver docs/api/01-visao-geral.md.
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * `GET /health` — para monitoramento externo. Responde 200 quando a
   * aplicação está servindo de fato (banco alcançável) e 503 quando está de
   * pé mas degradada, que é o que um monitor precisa distinguir para decidir
   * se tira a instância do balanceador.
   */
  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getHealth(@Res({ passthrough: true }) response: Response) {
    const resultado = await this.appService.getHealth();
    if (resultado.status !== 'ok') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return resultado;
  }
}
