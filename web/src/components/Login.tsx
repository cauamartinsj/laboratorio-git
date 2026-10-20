import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { api } from '../api';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@central.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      if (user.role !== 'ADMIN') {
        setError('Apenas administradores podem acessar esta central.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user, token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(37, 99, 235, 0.2)', width: '60px', height: '60px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '1rem' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Central de Rastreamento</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>Painel Administrativo de Monitoramento</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@central.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Acessar Central'}
          </button>
        </form>
      </div>
    </div>
  );
};
