import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app';
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(AuthProvider, null, React.createElement(App))
  )
);
