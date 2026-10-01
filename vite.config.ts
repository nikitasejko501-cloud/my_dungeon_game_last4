import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    hmr: { clientPort: 5173 },
    // Инструменты разработки (artpreview, balance, stripeprobe, smoke) пишут
    // свои артефакты ВНУТРЬ проекта, а Vite по умолчанию следит за всем корнем.
    // Любая перезапись .png/.txt в preview/ или out/ вызывала полную
    // перезагрузку страницы прямо посреди боя — игра «перезагружалась сама».
    // Там же лог самого dev-сервера: Vite пишет в stdout при каждом событии,
    // а редирект в файл меняет mtime — и вотчер видит это как правку кода.
    watch: {
      ignored: [
        '**/preview/**',
        '**/out/**',
        '**/.smoke/**',
        '**/devserver.log',
        '**/*.log',
      ],
    },
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
  },
});
