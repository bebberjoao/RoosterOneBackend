import 'dotenv/config';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configurarApp } from './app-config';
import { chaveMestraDeArquivos } from './common/file-encryption.util';
import { origensConfiguradas, validarOrigemCors } from './common/cors';

async function bootstrap() {
  // Falha cedo se FILE_ENCRYPTION_KEY estiver ausente/inválida — mesma disciplina do
  // JWT_SECRET (que já falha sozinho na linha de baixo, via JwtModule.register). Não há um
  // hook de "registro de módulo" equivalente aqui (não é um NestJS Module com factory), por
  // isso a checagem é forçada explicitamente, só pelo efeito colateral do lançamento: a
  // aplicação nunca deve subir prestes a gravar arquivo sem conseguir cifrá-lo depois.
  chaveMestraDeArquivos();

  const producao = process.env.NODE_ENV === 'production';
  // Em produção, a documentação interativa fica desabilitada salvo habilitação explícita: ela
  // expõe a estrutura completa de rotas e DTOs (achado do pentest interno de setembro/2026).
  const swaggerHabilitado = !producao || process.env.SWAGGER_ENABLED === 'true';

  const app = await NestFactory.create(AppModule, {
    // Em produção, log estruturado em JSON (uma linha por evento, com nível, contexto e data),
    // apto à ingestão por um agregador de logs; em desenvolvimento, o formato legível padrão.
    logger: new ConsoleLogger({ json: producao }),
  });
  const logger = new Logger('Bootstrap');

  app.use(
    helmet({
      // O Swagger UI (api/docs) depende de <script>/<style> inline, incompatível com a
      // Content-Security-Policy padrão do Helmet. A política fica desativada somente quando a
      // documentação interativa está exposta; nos demais casos, vale a configuração padrão.
      contentSecurityPolicy: swaggerHabilitado ? false : undefined,
    }),
  );

  // Versionamento, ValidationPipe e filtro de exceção ficam em app-config.ts,
  // compartilhados com a suíte e2e — ver o comentário naquele arquivo.
  configurarApp(app);

  if (swaggerHabilitado) {
    const config = new DocumentBuilder()
      .setTitle('Rooster One API')
      .setDescription('Documentação da API do backend do Rooster One')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  if (producao && origensConfiguradas().length === 0) {
    logger.warn(
      'Nenhuma origem de CORS configurada para produção (CORS_ORIGINS/FRONTEND_URL): requisições de navegador serão recusadas.',
    );
  }

  app.enableCors({
    origin: validarOrigemCors,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
