import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService, FicheType } from './storage.service';
import { ReferentielService } from './referentiel.service';

export interface SyncResult {
  success: boolean;
  message: string;
  processedCount: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private apiUrl = environment.apiUrl;

  private isOnlineSubject = new BehaviorSubject<boolean>(window.navigator.onLine);
  public isOnline$: Observable<boolean> = this.isOnlineSubject.asObservable();

  private isSyncingSubject = new BehaviorSubject<boolean>(false);
  public isSyncing$: Observable<boolean> = this.isSyncingSubject.asObservable();
  private activeSyncPromise: Promise<SyncResult> | null = null;

  private lastSyncSubject = new BehaviorSubject<string | null>(localStorage.getItem('senrm_last_sync'));
  public lastSync$: Observable<string | null> = this.lastSyncSubject.asObservable();

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private referentiel: ReferentielService
  ) {
    this.initNetworkListeners();
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Connectivité rétablie (Online)');
      this.isOnlineSubject.next(true);
      // Synchronisation automatique silencieuse lors du retour de la connexion
      if (this.storage.getPendingCount() > 0) {
        this.synchronize().catch(err => console.warn('Sync auto online warn:', err));
      }
    });

    window.addEventListener('offline', () => {
      console.log('Perte de connectivité (Offline)');
      this.isOnlineSubject.next(false);
    });
  }

  get isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  get isSyncing(): boolean {
    return this.isSyncingSubject.value;
  }

  /**
   * Enregistre une fiche en local et la transmet DIRECTEMENT au serveur si l'appareil est connecté.
   * Si l'appareil est hors-ligne ou si le réseau échoue, elle reste sauvegardée localement avec le statut 'en_attente'.
   */
  async saveAndSync(type: FicheType, payload: any, isDraft: boolean = false): Promise<{ success: boolean; message: string; syncedDirectly: boolean }> {
    const existing = payload.uuid ? this.storage.getItemByUuid<any>(type, payload.uuid) : null;
    const wasAlreadyValidatedOrSynced = existing && (
      existing.sync_status === 'synchronise' ||
      existing.sync_status === 'en_attente' ||
      !!existing.already_synced
    );

    if (isDraft && !wasAlreadyValidatedOrSynced) {
      payload.sync_status = 'brouillon';
      this.storage.saveItem(type, payload);
      return {
        success: true,
        message: 'Fiche enregistrée comme brouillon local.',
        syncedDirectly: false,
      };
    }

    // 1. Sauvegarde locale immédiate sécurisée avec statut 'en_attente' (pour création ou modification)
    payload.sync_status = 'en_attente';
    if (wasAlreadyValidatedOrSynced) {
      payload.already_synced = true;
    }
    this.storage.saveItem(type, payload);

    // 2. Si connecté, envoi direct immédiat au backend
    if (this.isOnline) {
      try {
        const syncRes = await this.synchronize();
        if (syncRes.success) {
          return {
            success: true,
            message: wasAlreadyValidatedOrSynced
              ? '✓ Modifications enregistrées et synchronisées sur le serveur !'
              : '✓ Fiche enregistrée et synchronisée directement sur le serveur !',
            syncedDirectly: true,
          };
        } else {
          return {
            success: true,
            message: 'Modifications enregistrées en local. Elles seront synchronisées au retour de la connexion.',
            syncedDirectly: false,
          };
        }
      } catch (err) {
        return {
          success: true,
          message: 'Modifications enregistrées en local. Elles seront synchronisées dès que le réseau sera disponible.',
          syncedDirectly: false,
        };
      }
    } else {
      return {
        success: true,
        message: 'Modifications enregistrées en local (mode hors-ligne). Elles seront synchronisées dès le retour de la connexion.',
        syncedDirectly: false,
      };
    }
  }

  /**
   * Supprime une fiche en local et propage immédiatement la suppression sur la base de données du serveur
   * (ou la met en file d'attente si l'appareil est hors-ligne).
   */
  async deleteAndSync(type: FicheType, uuid: string): Promise<{ success: boolean; message: string; syncedDirectly: boolean }> {
    this.storage.deleteItem(type, uuid);

    if (this.isOnline || window.navigator.onLine) {
      try {
        const syncRes = await this.synchronize();
        if (syncRes.success) {
          return {
            success: true,
            message: '✓ Fiche supprimée sur l’appareil et dans la base de données du serveur !',
            syncedDirectly: true,
          };
        }
      } catch (err) {
        console.warn('Suppression différée (hors-ligne ou erreur réseau) :', err);
      }
    }

    return {
      success: true,
      message: 'Fiche supprimée sur l’appareil. La suppression sur le serveur sera appliquée à la prochaine synchronisation.',
      syncedDirectly: false,
    };
  }

  /**
   * Lance la synchronisation bidirectionnelle (Push des fiches locales + Pull des données fraîches)
   */
  async synchronize(): Promise<SyncResult> {
    if (!this.isOnline && !window.navigator.onLine) {
      return {
        success: false,
        message: 'Impossible de synchroniser : vous êtes actuellement hors-ligne.',
        processedCount: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Si une synchronisation est déjà en cours, attendre sa fin puis relancer si des fiches sont toujours en attente
    if (this.activeSyncPromise) {
      const prevResult = await this.activeSyncPromise;
      if (this.storage.getPendingCount() > 0) {
        return this.executeSync();
      }
      return prevResult;
    }

    return this.executeSync();
  }

  private async executeSync(): Promise<SyncResult> {
    this.isSyncingSubject.next(true);

    this.activeSyncPromise = (async (): Promise<SyncResult> => {
      try {
        const pending = this.storage.getAllPending();
        const deletedQueue = this.storage.getDeletedQueue();
        let pushedCount = 0;

        // 1. PUSH des données en attente + suppressions en attente
        const payload: any = {
          animations: pending.animations,
          demonstrations: pending.demonstrations,
          caravanes: pending.caravanes,
          emissions: pending.emissions,
          leaders: pending.leaders,
          ventes_distributeurs: pending.ventes,
          gpfs: pending.gpfs,
          lmes: pending.lmes,
          deleted_uuids: deletedQueue.map((d) => d.uuid),
          deleted_items: deletedQueue,
        };

        const token = localStorage.getItem('senrm_mobile_token');
        const httpOptions = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};

        const hasItemsToPush = this.storage.getPendingCount() > 0;

        if (hasItemsToPush) {
          const pushRes: any = await firstValueFrom(
            this.http.post(`${this.apiUrl}/sync/push`, payload, httpOptions).pipe(timeout(15000))
          );

          if (pushRes && pushRes.processed_uuids) {
            this.storage.markUuidsAsSynced(pushRes.processed_uuids);
            this.storage.clearDeletedUuids(pushRes.deleted_uuids || pushRes.processed_uuids);
            pushedCount = pushRes.processed_uuids.length;
          }
        }

        // 2. PULL des données fraîches, fiches modifiées/supprimées sur le backend et indicateurs macro du projet
        const localUuids = this.storage.getAllLocalUuids();
        const pullOptions: any = {
          ...httpOptions,
          params: localUuids.length > 0 ? { local_uuids: localUuids.join(',') } : {},
        };

        const pullRes: any = await firstValueFrom(
          this.http.get(`${this.apiUrl}/sync/pull`, pullOptions).pipe(timeout(15000))
        );

        if (pullRes && (pullRes.fiches || pullRes.server_uuids)) {
          this.storage.reconcileWithServer(pullRes.fiches, pullRes.server_uuids);
        }

        if (pullRes && pullRes.user) {
          localStorage.setItem('senrm_mobile_user', JSON.stringify(pullRes.user));
        }

        if (pullRes && pullRes.referentiels) {
          this.referentiel.updateReferentiels(
            pullRes.referentiels.regions,
            pullRes.referentiels.foyer_types,
            pullRes.referentiels.distributeurs,
            pullRes.referentiels.animateurs
          );
        }

        if (pullRes && pullRes.indicateurs_macro) {
          this.storage.setCache('indicateurs_macro', pullRes.indicateurs_macro);
        }

        const syncTime = new Date().toISOString();
        localStorage.setItem('senrm_last_sync', syncTime);
        this.lastSyncSubject.next(syncTime);

        return {
          success: true,
          message: hasItemsToPush
            ? `Synchronisation terminée ! ${pushedCount} fiche(s) transmise(s) au serveur.`
            : 'Synchronisation terminée ! Référentiels et statistiques mis à jour.',
          processedCount: pushedCount,
          timestamp: syncTime
        };

      } catch (error: any) {
        console.error('Erreur lors de la synchronisation :', error);
        const serverMsg = error?.error?.message || error?.message || 'Serveur injoignable';
        return {
          success: false,
          message: 'Erreur de synchronisation : ' + serverMsg,
          processedCount: 0,
          timestamp: new Date().toISOString()
        };
      } finally {
        this.activeSyncPromise = null;
        this.isSyncingSubject.next(false);
      }
    })();

    return this.activeSyncPromise;
  }
}
