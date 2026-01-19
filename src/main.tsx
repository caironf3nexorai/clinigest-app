import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  document.body.innerHTML = '<div style="color:red; padding: 20px;"><h1>Erro Fatal na Inicialização</h1><pre>' + error + '</pre></div>';
  console.error(error);
}
