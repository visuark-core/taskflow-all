import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ThemeProvider } from './context/ThemeContext';
import store from './app/store';
import { Provider } from 'react-redux';


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
          
        <Provider store={store}>
        <App />
        </Provider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);