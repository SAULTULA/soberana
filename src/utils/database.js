import localforage from 'localforage';
import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'Soberana_Offline_Secret_Key_2026';

function encryptData(data) {
  const jsonStr = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonStr, ENCRYPTION_KEY).toString();
}

function decryptData(data) {
  try {
    // Si no es string, es data antigua sin cifrar (localforage guarda objetos)
    if (typeof data !== 'string') return data;
    
    const bytes = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedStr) return data; // Fallback
    return JSON.parse(decryptedStr);
  } catch (e) {
    return data; // Fallback si era un string pero no AES
  }
}

// Configuración de LocalForage (Base de datos local rápida)
localforage.config({
  name: 'SoberanaERP',
  storeName: 'business_data',
  description: 'Base de datos local primaria para alta velocidad y uso offline'
});

// Configuración de Supabase (Base de datos en la nube para backup permanente)
// Nota: Deberás reemplazar con tus credenciales de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'tu-anon-key';
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Eventos de la Base de Datos para notificar a React
 */
export const dbEvents = new EventTarget();

/**
 * Servicio de Base de Datos Dual
 */
export const DatabaseService = {
  _realtimeChannel: null,

  // 1. Escribir en base local y encolar para la nube
  async saveRecord(collection, record) {
    try {
      const dataKey = `${collection}_${record.id || Date.now()}`;
      
      // Guardar en local cifrado (Alta velocidad y seguridad)
      const encryptedRecord = encryptData(record);
      await localforage.setItem(dataKey, encryptedRecord);
      console.log(`[Local DB] Guardado cifrado exitoso: ${dataKey}`);

      // Intentar enviar a Supabase (Segundo plano)
      this.syncToCloud(collection, record).catch(err => {
        console.warn('[Nube] Falló sincronización inmediata. Queda en local para reintento futuro.', err);
      });

      return true;
    } catch (error) {
      console.error('[Local DB] Error guardando dato', error);
      throw error;
    }
  },

  async syncToCloud(collection, record) {
    // Si no hay sesión activa de Supabase, no podemos sincronizar (modo 100% offline)
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.log(`[Nube] Ignorando sincronización de ${collection}: No hay sesión de cliente maestra iniciada.`);
      return;
    }

    const payload = {
      id: record.id,
      collection: collection,
      data: record,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('app_data')
      .upsert(payload, { onConflict: 'collection,id,tenant_id' }); // tenant_id is implicit via RLS

    if (error) {
      console.error(`[Nube] Error sincronizando ${collection}:`, error);
      throw error;
    }
    console.log(`[Nube] Sincronizado ${collection} con éxito.`);
  },

  // 1.5. Suscripción en Tiempo Real
  async subscribeToRealtime() {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      console.log('[Realtime] No hay sesión, omitiendo suscripción.');
      return;
    }

    if (this._realtimeChannel) return; // Ya está suscrito

    console.log('[Realtime] Iniciando suscripción a cambios en la nube...');
    this._realtimeChannel = supabase
      .channel('app_data_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data' },
        async (payload) => {
          console.log('[Realtime] Cambio detectado:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
          const dataKey = `${newRecord.collection}_${newRecord.id}`;
          const encryptedRecord = encryptData(newRecord.data);
          await localforage.setItem(dataKey, encryptedRecord);
            
            // Notificar a la UI
            dbEvents.dispatchEvent(new CustomEvent('onDataChange', { 
              detail: { collection: newRecord.collection, type: eventType, data: newRecord.data }
            }));
          } else if (eventType === 'DELETE') {
            const dataKey = `${oldRecord.collection}_${oldRecord.id}`;
            await localforage.removeItem(dataKey);
            
            // Notificar a la UI
            dbEvents.dispatchEvent(new CustomEvent('onDataChange', { 
              detail: { collection: oldRecord.collection, type: eventType, id: oldRecord.id }
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Estado:', status);
      });
  },
  
  unsubscribeFromRealtime() {
    if (this._realtimeChannel) {
      supabase.removeChannel(this._realtimeChannel);
      this._realtimeChannel = null;
      console.log('[Realtime] Desuscrito de cambios.');
    }
  },

  // Eliminar un registro
  async deleteRecord(collection, id) {
    try {
      const dataKey = `${collection}_${id}`;
      await localforage.removeItem(dataKey);
      
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        await supabase.from('app_data').delete().match({ collection, id });
      }
      return true;
    } catch (error) {
      console.error('[Local DB] Error eliminando dato', error);
      throw error;
    }
  },

  // 2. Obtener datos (Prioriza local para velocidad)
  async getRecords(collection) {
    try {
      const keys = await localforage.keys();
      const collectionKeys = keys.filter(k => k.startsWith(collection + '_'));
      
      const records = [];
      for (const key of collectionKeys) {
        const item = await localforage.getItem(key);
        if (item) {
          records.push(decryptData(item));
        }
      }
      return records;
    } catch (error) {
      console.error('[Local DB] Error obteniendo datos', error);
      return [];
    }
  },

  // 2.5 Descargar todo desde la Nube (Recuperación en caso de pérdida de PC local)
  async fetchCloudRecords() {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      alert('Debes iniciar sesión con la cuenta maestra del negocio para descargar la copia de seguridad de la nube.');
      return;
    }

    try {
      console.log('[Nube] Descargando base de datos completa...');
      const { data, error } = await supabase.from('app_data').select('*');
      if (error) throw error;

      await localforage.clear();
      for (const row of data) {
        const dataKey = `${row.collection}_${row.id}`;
        const encryptedRecord = encryptData(row.data);
        await localforage.setItem(dataKey, encryptedRecord);
      }
      console.log('[Nube] Descarga y restauración cifrada exitosa.');
      return true;
    } catch (err) {
      console.error('[Nube] Error descargando base de datos:', err);
      throw err;
    }
  },

  // 3. Sistema de Backup Manual
  async exportBackup() {
    try {
      const keys = await localforage.keys();
      const backupData = {};
      
      for (const key of keys) {
        const item = await localforage.getItem(key);
        backupData[key] = decryptData(item);
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `soberana_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      console.log('[Backup] Archivo generado exitosamente.');
    } catch (error) {
      console.error('[Backup] Error exportando base de datos', error);
      throw error;
    }
  },

  // 4. Restauración de Respaldo (Si la app queda en blanco)
  async importBackup(jsonFile) {
    try {
      const text = await jsonFile.text();
      const backupData = JSON.parse(text);
      
      await localforage.clear(); // Limpiar antes de restaurar
      
      for (const [key, value] of Object.entries(backupData)) {
        const encryptedRecord = encryptData(value);
        await localforage.setItem(key, encryptedRecord);
      }
      
      console.log('[Backup] Restauración completa.');
      return true;
    } catch (error) {
      console.error('[Backup] Error importando archivo', error);
      throw error;
    }
  }
};
