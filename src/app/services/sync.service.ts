import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';
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
        this.synchronize();
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
   * Lance la synchronisation bidirectionnelle (Push des fiches locales + Pull des données fraîches)
   */
  async synchronize(): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        success: false,
        message: 'Impossible de synchroniser : vous êtes actuellement hors-ligne.',
        processedCount: 0,
        timestamp: new Date().toISOString()
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        message: 'Une synchronisation est déjà en cours.',
        processedCount: 0,
        timestamp: new Date().toISOString()
      };
    }

    this.isSyncingSubject.next(true);

    try {
      const pending = this.storage.getAllPending();
      let pushedCount = 0;

      // 1. PUSH des données en attente
      const payload: any = {
        animations: pending.animations,
        demonstrations: pending.demonstrations,
        caravanes: pending.caravanes,
        emissions: pending.emissions,
        leaders: pending.leaders,
        ventes_distributeurs: pending.ventes
      };

      const token = localStorage.getItem('senrm_mobile_token');
      const httpOptions = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};

      const hasItemsToPush = this.storage.getPendingCount() > 0;

      if (hasItemsToPush) {
        const pushRes: any = await firstValueFrom(
          this.http.post(`${this.apiUrl}/sync/push`, payload, httpOptions)
        );

        if (pushRes && pushRes.processed_uuids) {
          this.storage.markUuidsAsSynced(pushRes.processed_uuids);
          pushedCount = pushRes.processed_uuids.length;
        }
      }

      // 2. PULL des données fraîches et indicateurs macro du projet
      const pullRes: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/sync/pull`, httpOptions)
      );

      if (pullRes && pullRes.user) {
        localStorage.setItem('senrm_mobile_user', JSON.stringify(pullRes.user));
      }

      if (pullRes && pullRes.referentiels) {
        this.referentiel.updateReferentiels(
          pullRes.referentiels.regions,
          pullRes.referentiels.foyer_types
        );
      }

      if (pullRes && pullRes.indicateurs_macro) {
        this.storage.setCache('indicateurs_macro', pullRes.indicateurs_macro);
      }

      const syncTime = new Date().toISOString();
      localStorage.setItem('senrm_last_sync', syncTime);
      this.lastSyncSubject.next(syncTime);
      this.isSyncingSubject.next(false);

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
      this.isSyncingSubject.next(false);
      return {
        success: false,
        message: 'Erreur de connexion au serveur : ' + (error.message || 'Serveur injoignable'),
        processedCount: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}
