import { Injectable } from '@nestjs/common';
import { PrismaService } from './roster-hub/shared/prisma.service';

export interface HealthResult {
  status: 'ok' | 'degradado';
  banco: 'ok' | 'fora';
  uptimeSegundos: number;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Rooster One API is running';
  }

  /**
   * Health check com verificação real de dependência.
   *
   * O processo responder não significa que a aplicação está utilizável: sem
   * banco, toda rota de negócio falha. Por isso o check abre uma consulta
   * trivial (`SELECT 1`) em vez de só devolver "ok" — é a diferença entre
   * "o Node está de pé" e "a aplicação está servindo".
   *
   * Disco e outras dependências não são verificados aqui de propósito: hoje
   * o único ponto de falha externo é o PostgreSQL (upload grava em disco
   * local, que cai junto com o processo se faltar espaço). Ver
   * `docs/operations/` para o que falta antes de produção.
   */
  async getHealth(): Promise<HealthResult> {
    let banco: HealthResult['banco'] = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      banco = 'fora';
    }

    return {
      status: banco === 'ok' ? 'ok' : 'degradado',
      banco,
      uptimeSegundos: Math.floor(process.uptime()),
    };
  }
}
