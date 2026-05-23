import localforage from 'localforage';
import { createClient } from '@supabase/supabase-js';

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
 * Servicio de Base de Datos Dual
 */
export const DatabaseService = {
  // 1. Escribir en base local y encolar para la nube
  async saveRecord(collection, record) {
    try {
      const dataKey = `${collection}_${record.id || Date.now()}`;
      
      // Guardar en local primero (Alta velocidad)
      await localforage.setItem(dataKey, record);
      console.log(`[Local DB] Guardado exitoso: ${dataKey}`);

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
        records.push(item);
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
        await localforage.setItem(dataKey, row.data);
      }
      console.log('[Nube] Descarga y restauración local exitosa.');
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
        backupData[key] = await localforage.getItem(key);
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
        await localforage.setItem(key, value);
      }
      
      console.log('[Backup] Restauración completa.');
      return true;
    } catch (error) {
      console.error('[Backup] Error importando archivo', error);
      throw error;
    }
  }
};
