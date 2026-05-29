/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        receita: '#16a34a',
        despesa: '#dc2626',
        parcela: '#ea580c',
        darf: '#7c3aed',
        pjParcela: '#2563eb',
        pontual: '#d97706',
        saldo: '#0891b2',
        alerta: '#ca8a04',
        surface: '#ffffff',
        surfaceAlt: '#f8fafc',
        bdr: '#e2e8f0',
      },
    },
  },
  plugins: [],
}

