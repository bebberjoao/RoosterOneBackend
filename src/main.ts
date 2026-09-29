import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configurarApp } from './app-config';
import { chaveMestraDeArquivos } from './common/file-encryption.util';

async function bootstrap() {
  // Falha cedo se FILE_ENCRYPTION_KEY estiver ausente/inválida — mesma disciplina do
  // JWT_SECRET (que já falha sozinho na linha de baixo, via JwtModule.register). Não há um
  // hook de "registro de módulo" equivalente aqui (não é um NestJS Module com factory), por
  // isso a checagem é forçada explicitamente, só pelo efeito colateral do lançamento: a
  // aplicação nunca deve subir prestes a gravar arquivo sem conseguir cifrá-lo depois.
  chaveMestraDeArquivos();

  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      // Swagger UI (api/docs) usa <script>/<style> inline — CSP teria que ser
      // customizado especificamente pra essa rota; desligado por ora pra não
      // quebrar a doc interativa. Os demais headers do Helmet ficam ativos.
      contentSecurityPolicy: false,
    }),
  );

  // Versionamento, ValidationPipe e filtro de exceção ficam em app-config.ts,
  // compartilhados com a suíte e2e — ver o comentário naquele arquivo.
  configurarApp(app);

  const config = new DocumentBuilder()
    .setTitle('Rooster One API')
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
