import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { LogsErroService } from './roster-hub/logs-erro/logs-erro.service';

/**
 * Configuração compartilhada entre a aplicação real (`main.ts`) e a suíte e2e.
 *
 * Existe para impedir uma divergência que já era real: antes disso, `main.ts`
 * registrava o `ValidationPipe` global e os testes e2e **não** — ou seja, a
 * suíte passava por payloads que a aplicação de verdade recusaria, e nenhuma
 * validação de DTO era de fato exercitada. O versionamento teria criado a
 * mesma divergência (rotas `/v1` em produção, sem prefixo nos testes).
 *
 * Regra: tudo que muda o comportamento de request/response entra aqui, nunca
 * só no `main.ts`. O que é específico de processo (Helmet, CORS, Swagger,
 * porta) continua no `main.ts`, porque não afeta o contrato exercitado pelos
 * testes.
 */
export function configurarApp(app: INestApplication): void {
  // Versionamento por URI: toda rota responde sob /v1 (ex.: /v1/chamados).
  // O health check é VERSION_NEUTRAL — ver src/app.controller.ts.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Rede de segurança: cada service já mapeia P2002/P2025 com mensagem
  // contextual antes disso — ver src/common/all-exceptions.filter.ts. Toda
  // exceção com status >= 500 também é persistida em logs_erro.
  app.useGlobalFilters(new AllExceptionsFilter(app.get(LogsErroService)));
}
