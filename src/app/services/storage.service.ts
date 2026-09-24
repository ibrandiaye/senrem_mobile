import { Injectable } from '@angular/core';

export type FicheType = 'ventes' | 'animations' | 'demonstrations' | 'caravanes' | 'emissions' | 'leaders';
export type SyncStatus = 'brouillon' | 'en_attente' | 'synchronise';

export interface BaseFiche {
  uuid: string;
  type: FicheType;
  sync_status: SyncStatus;
  client_created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  photo_url?: string | null;
  signature?: string | null;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly PREFIX = 'senrm_';

  constructor() {}

  /**
   * Génère un identifiant unique universel (UUID v4) pour chaque saisie hors-ligne
   */
  generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Récupère tous les enregistrements d'un type de fiche
   */
  getItems<T extends BaseFiche>(type: FicheType): T[] {
    try {
      const data = localStorage.getItem(this.PREFIX + type);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erreur lecture storage pour ' + type, e);
      return [];
    }
  }

  /**
   * Sauvegarde ou met à jour un enregistrement
   */
  saveItem<T extends BaseFiche>(type: FicheType, item: T): T {
    if (!item.uuid) {
      item.uuid = this.generateUuid();
    }
    if (!item.client_created_at) {
      item.client_created_at = new Date().toISOString();
    }
    item.type = type;

    const items = this.getItems<T>(type);
    const existingIndex = items.findIndex((i) => i.uuid === item.uuid);

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...item };
    } else {
      items.unshift(item);
    }

    localStorage.setItem(this.PREFIX + type, JSON.stringify(items));
    return item;
  }

  /**
   * Récupère un enregistrement par son UUID
   */
  getItemByUuid<T extends BaseFiche>(type: FicheType, uuid: string): T | undefined {
    const items = this.getItems<T>(type);
    return items.find((i) => i.uuid === uuid);
  }

  /**
   * Supprime un enregistrement
   */
  deleteItem(type: FicheType, uuid: string): boolean {
    const items = this.getItems(type);
    const filtered = items.filter((i) => i.uuid !== uuid);
    localStorage.setItem(this.PREFIX + type, JSON.stringify(filtered));
    return true;
  }

  /**
   * Récupère tous les enregistrements en attente de synchronisation pour tous les types
   */
  getAllPending(): { [key in FicheType]: BaseFiche[] } {
    const types: FicheType[] = ['ventes', 'animations', 'demonstrations', 'caravanes', 'emissions', 'leaders'];
    const result: any = {};

    for (const t of types) {
      result[t] = this.getItems(t).filter((item) => item.sync_status === 'en_attente');
    }

    return result;
  }

  /**
   * Nombre total de fiches en attente de synchronisation
   */
  getPendingCount(): number {
    const pending = this.getAllPending();
    let count = 0;
    for (const key of Object.keys(pending)) {
      count += (pending as any)[key].length;
    }
    return count;
  }

  /**
   * Nombre total de fiches enregistrées en local
   */
  getTotalLocalCount(): number {
    const types: FicheType[] = ['ventes', 'animations', 'demonstrations', 'caravanes', 'emissions', 'leaders'];
    let count = 0;
    for (const t of types) {
      count += this.getItems(t).length;
    }
    return count;
  }

  /**
   * Marque une liste d'UUID comme synchronisés
   */
  markUuidsAsSynced(syncedUuids: string[]) {
    const types: FicheType[] = ['ventes', 'animations', 'demonstrations', 'caravanes', 'emissions', 'leaders'];
    for (const t of types) {
      const items = this.getItems(t);
      let changed = false;
      for (const item of items) {
        if (syncedUuids.includes(item.uuid)) {
          item.sync_status = 'synchronise';
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(this.PREFIX + t, JSON.stringify(items));
      }
    }
  }

  /**
   * Sauvegarde un cache pour les référentiels géographiques et foyers
   */
  setCache(key: string, data: any) {
    localStorage.setItem(this.PREFIX + 'cache_' + key, JSON.stringify(data));
  }

  getCache<T>(key: string): T | null {
    const data = localStorage.getItem(this.PREFIX + 'cache_' + key);
    return data ? JSON.parse(data) : null;
  }
}
