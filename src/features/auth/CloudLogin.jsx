import React, { useState } from 'react';
import styles from './CloudLogin.module.css';
import { supabase } from '../../utils/database';

export function CloudLogin({ onSessionReady }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Iniciar Sesión
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        if (data.session) {
          onSessionReady(data.session);
        }
      } else {
        // Registrarse
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        
        if (data.session) {
          // Registro exitoso e inicio automático
          onSessionReady(data.session);
        } else {
          setError('Registro exitoso. Revisa tu correo para confirmar tu cuenta.');
        }
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.cloudLogin}>
      <div className={styles.cloudLogin__container}>
        <h2 className={`${styles.cloudLogin__title} texto-dorado`}>
          Soberana Cloud
        </h2>
        <p className={styles.cloudLogin__subtitle}>
          Acceso Maestra para Negocios (SaaS)
        </p>

        {error && <div className={styles.cloudLogin__error}>{error}</div>}

        <form className={styles.cloudLogin__form} onSubmit={handleSubmit}>
          <div className={styles.cloudLogin__inputGroup}>
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@negocio.com"
              required
              className={styles.cloudLogin__input}
            />
          </div>

          <div className={styles.cloudLogin__inputGroup}>
            <label>Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className={styles.cloudLogin__input}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.cloudLogin__btn}>
            {loading ? 'Cargando...' : (isLogin ? 'Ingresar a mi Negocio' : 'Crear mi Negocio')}
          </button>
        </form>

        <div className={styles.cloudLogin__switch}>
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Regístrate aquí' : 'Inicia Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
