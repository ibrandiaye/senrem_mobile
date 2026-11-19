import { Injectable } from '@angular/core';

export type FicheType = 'ventes' | 'animations' | 'demonstrations' | 'caravanes' | 'emissions' | 'leaders' | 'gpfs' | 'lmes';
export type SyncStatus = 'brouillon' | 'en_attente' | 'synchronise';

export const ALL_FICHE_TYPES: FicheType[] = [
  'ventes',
  'animations',
  'demonstrations',
  'caravanes',
  'emissions',
  'leaders',
  'gpfs',
  'lmes'
];

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
    (item as any).updated_at = new Date().toISOString();

    const items = this.getItems<T>(type);
    const existingIndex = items.findIndex((i) => i.uuid === item.uuid);

    if (existingIndex >= 0) {
      const prev = items[existingIndex];
      const wasValidatedOrSynced =
        prev.sync_status === 'synchronise' ||
        prev.sync_status === 'en_attente' ||
        !!(prev as any).already_synced;

      items[existingIndex] = { ...prev, ...item };

      if (wasValidatedOrSynced) {
        (items[existingIndex] as any).already_synced = true;
        // Toute modification d'une fiche déjà validée/synchronisée la remet en file d'attente de synchronisation
        items[existingIndex].sync_status = 'en_attente';
      }
      item = items[existingIndex];
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
   * Supprime un enregistrement local et l'enregistre dans la file de suppression serveur
   */
  deleteItem(type: FicheType, uuid: string): boolean {
    const items = this.getItems(type);
    const target = items.find((i) => i.uuid === uuid);
    const filtered = items.filter((i) => i.uuid !== uuid);
    localStorage.setItem(this.PREFIX + type, JSON.stringify(filtered));

    // Si la fiche n'était pas un simple brouillon jamais envoyé, on l'ajoute à la file de suppression serveur
    if (!target || target.sync_status !== 'brouillon' || !!(target as any).already_synced) {
      this.enqueueDeletedItem(type, uuid);
    }

    return true;
  }

  /**
   * Ajoute un UUID à la file d'attente des suppressions à synchroniser avec le serveur
   */
  enqueueDeletedItem(type: FicheType, uuid: string): void {
    if (!uuid) return;
    const queue = this.getDeletedQueue();
    if (!queue.some((q) => q.uuid === uuid)) {
      queue.push({
        type,
        uuid,
        deleted_at: new Date().toISOString(),
      });
      localStorage.setItem(this.PREFIX + 'deleted_queue', JSON.stringify(queue));
    }
  }

  /**
   * Récupère la liste des fiches supprimées en attente de suppression sur le serveur
   */
  getDeletedQueue(): { type: FicheType; uuid: string; deleted_at: string }[] {
    try {
      const raw = localStorage.getItem(this.PREFIX + 'deleted_queue');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Retire de la file de suppression les UUIDs déjà supprimés sur le serveur
   */
  clearDeletedUuids(uuids: string[]): void {
    if (!uuids || uuids.length === 0) return;
    const queue = this.getDeletedQueue().filter((q) => !uuids.includes(q.uuid));
    localStorage.setItem(this.PREFIX + 'deleted_queue', JSON.stringify(queue));
  }

  /**
   * Récupère tous les enregistrements en attente de synchronisation pour tous les types
   */
  getAllPending(): { [key in FicheType]: BaseFiche[] } {
    const result: any = {};

    for (const t of ALL_FICHE_TYPES) {
      result[t] = this.getItems(t).filter((item) => item.sync_status === 'en_attente');
    }

    return result;
  }

  /**
   * Nombre total de fiches (ou suppressions) en attente de synchronisation
   */
  getPendingCount(): number {
    const pending = this.getAllPending();
    let count = 0;
    for (const key of Object.keys(pending)) {
      count += (pending as any)[key].length;
    }
    count += this.getDeletedQueue().length;
    return count;
  }

  /**
   * Nombre total de brouillons non finalisés
   */
  getDraftCount(): number {
    let count = 0;
    for (const t of ALL_FICHE_TYPES) {
      count += this.getItems(t).filter((item) => item.sync_status === 'brouillon').length;
    }
    return count;
  }

  /**
   * Recherche une fiche par son UUID à travers tous les types
   */
  findFicheByUuid(uuid: string): { type: FicheType; fiche: BaseFiche } | null {
    for (const t of ALL_FICHE_TYPES) {
      const item = this.getItemByUuid(t, uuid);
      if (item) {
        return { type: t, fiche: item };
      }
    }
    return null;
  }

  /**
   * Nombre total de fiches enregistrées en local
   */
  getTotalLocalCount(): number {
    let count = 0;
    for (const t of ALL_FICHE_TYPES) {
      count += this.getItems(t).length;
    }
    return count;
  }

  /**
   * Récupère tous les UUIDs présents localement sur l'appareil
   */
  getAllLocalUuids(): string[] {
    const uuids: string[] = [];
    for (const t of ALL_FICHE_TYPES) {
      for (const item of this.getItems(t)) {
        if (item.uuid) {
          uuids.push(item.uuid);
        }
      }
    }
    return uuids;
  }

  /**
   * Synchronise l'état local avec la base de données du serveur (modifications et suppressions effectuées sur le backend web)
   */
  reconcileWithServer(
    serverFiches?: { [key in FicheType]?: any[] },
    serverUuids?: { [key in FicheType]?: string[] }
  ): { updatedCount: number; deletedCount: number; importedCount: number } {
    let updatedCount = 0;
    let deletedCount = 0;
    let importedCount = 0;

    const pendingDeleteUuids = new Set(this.getDeletedQueue().map((d) => d.uuid));

    for (const type of ALL_FICHE_TYPES) {
      const localItems = this.getItems<any>(type);
      const serverList: any[] = serverFiches && Array.isArray(serverFiches[type]) ? (serverFiches[type] as any[]) : [];
      const serverByUuid = new Map<string, any>(
        serverList.filter((s) => s && s.uuid).map((s) => [s.uuid, s])
      );
      const activeUuidSet: Set<string> | null =
        serverUuids && Array.isArray(serverUuids[type]) ? new Set(serverUuids[type] as string[]) : null;

      const nextItems: any[] = [];
      const seenUuids = new Set<string>();

      for (const localItem of localItems) {
        if (!localItem || !localItem.uuid) continue;

        // Ne jamais écraser ni supprimer un brouillon local ou une fiche ayant une modification locale non encore envoyée
        if (localItem.sync_status === 'brouillon' || localItem.sync_status === 'en_attente') {
          nextItems.push(localItem);
          seenUuids.add(localItem.uuid);
          continue;
        }

        // Pour une fiche déjà synchronisée : vérifier si elle a été supprimée sur le backend
        const deletedOnServer = activeUuidSet
          ? !activeUuidSet.has(localItem.uuid)
          : serverFiches
            ? !serverByUuid.has(localItem.uuid)
            : false;

        if (deletedOnServer) {
          deletedCount++;
          continue;
        }

        // Si le serveur renvoie la version à jour de la fiche, appliquer toutes les modifications du backend
        if (serverByUuid.has(localItem.uuid)) {
          const serverData = serverByUuid.get(localItem.uuid);
          nextItems.push({
            ...localItem,
            ...serverData,
            type,
            sync_status: 'synchronise',
            already_synced: true,
          });
          updatedCount++;
        } else {
          nextItems.push(localItem);
        }

        seenUuids.add(localItem.uuid);
      }

      // Importer les fiches présentes sur le serveur pour cet agent mais absentes du stockage local
      for (const serverItem of serverList) {
        if (
          serverItem &&
          serverItem.uuid &&
          !seenUuids.has(serverItem.uuid) &&
          !pendingDeleteUuids.has(serverItem.uuid)
        ) {
          nextItems.push({
            ...serverItem,
            type,
            sync_status: 'synchronise',
            already_synced: true,
          });
          seenUuids.add(serverItem.uuid);
          importedCount++;
        }
      }

      localStorage.setItem(this.PREFIX + type, JSON.stringify(nextItems));
    }

    return { updatedCount, deletedCount, importedCount };
  }

  /**
   * Marque une liste d'UUID comme synchronisés
   */
  markUuidsAsSynced(syncedUuids: string[]) {
    for (const t of ALL_FICHE_TYPES) {
      const items = this.getItems(t);
      let changed = false;
      for (const item of items) {
        if (syncedUuids.includes(item.uuid)) {
          item.sync_status = 'synchronise';
          (item as any).already_synced = true;
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

  /**
   * Supprime un élément ou tous les éléments du cache local
   */
  clearCache(key?: string) {
    if (key) {
      localStorage.removeItem(this.PREFIX + 'cache_' + key);
    } else {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.PREFIX + 'cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  }

  /**
   * Supprime toutes les fiches et caches stockés localement sur cet appareil
   */
  clearAllLocalData() {
    ALL_FICHE_TYPES.forEach((t) => localStorage.removeItem(this.PREFIX + t));
    this.clearCache();
    localStorage.removeItem('senrm_last_sync');
  }
}
