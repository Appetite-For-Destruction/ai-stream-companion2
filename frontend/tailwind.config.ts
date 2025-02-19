import type { Config } from 'tailwindcss';

const config: Config = {
  // Tailwindの設定をここに追加
  content: [
    './src/**/*.{js,jsx,ts,tsx}', // 対象ファイル
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
