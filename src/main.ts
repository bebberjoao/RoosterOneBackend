import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      // Swagger UI (api/docs) usa <script>/<style> inline — CSP teria que ser
      // customizado especificamente pra essa rota; desligado por ora pra não
      // quebrar a doc interativa. Os demais headers do Helmet ficam ativos.
      contentSecurityPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Rede de segurança: cada service já mapeia P2002/P2025 com mensagem contextual
  // antes disso — ver `src/common/prisma-exception.filter.ts`.
  app.useGlobalFilters(new PrismaExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Roster One API')
    .setDescription('Documentação da API do backend do Rooster One')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableCors({
    // Dev: aceita qualquer porta em localhost/127.0.0.1 — o Vite/Lovable muda
    // de porta (5173, 8080, 8081...) conforme o que já está ocupado.
    origin: (origin, callback) => {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida pelo CORS.'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
