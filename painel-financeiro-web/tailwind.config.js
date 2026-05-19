/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        receita: '#2ecc71',
        despesa: '#e74c3c',
        parcela: '#e67e22',
        darf: '#9b59b6',
        pjParcela: '#3498db',
        pontual: '#f39c12',
        saldo: '#1abc9c',
        alerta: '#f1c40f',
        surface: '#1c2333',
        surfaceAlt: '#232d3f',
        bdr: '#2d3748',
      },
    },
  },
  plugins: [],
}

