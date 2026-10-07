import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS ayarını da şimdiden açalım, React (Vite) frontend ile haberleşirken hata vermesin
  app.enableCors(); 
  await app.listen(3000);
}
bootstrap();