import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSpinner, IonToast
} from '@ionic/angular';
import { StorageService } from '../services/storage.service';
import { SyncService, SyncResult } from '../services/sync.service';
import { AuthService, AuthUser } from '../services/auth.service';
import { LocationService } from '../services/location.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSpinner, IonToast
  ],
})
export class HomePage implements OnInit {
  isOnline = true;
  isSyncing = false;
  pendingCount = 0;
  totalLocalCount = 0;
  draftCount = 0;
  lastSyncTime: string | null = null;
  macroStats: any = null;
  currentUser: AuthUser | null = null;
  selectedRegionView: 'auto' | 'Tambacounda' | 'Kédougou' = 'auto';

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'danger' | 'warning' = 'success';

  private normalizeRegion(val?: string | null): 'tamba' | 'kedougou' | '' {
    if (!val) return '';
    const clean = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (clean.includes('tamba')) return 'tamba';
    if (clean.includes('kedougou')) return 'kedougou';
    return '';
  }

  setRegionView(view: 'auto' | 'Tambacounda' | 'Kédougou') {
    this.selectedRegionView = view;
    this.cdr.detectChanges();
  }

  get canSwitchRegionView(): boolean {
    const userReg = this.normalizeRegion(this.currentUser?.region);
    return !userReg || this.currentUser?.role === 'admin' || this.currentUser?.role === 'superviseur';
  }

  get userRegion(): string {
    return this.currentUser?.region || '';
  }

  get effectiveRegion(): 'Tambacounda' | 'Kédougou' {
    if (this.selectedRegionView === 'Tambacounda' || this.selectedRegionView === 'Kédougou') {
      return this.selectedRegionView;
    }
    const userReg = this.normalizeRegion(this.userRegion);
    if (userReg === 'kedougou') return 'Kédougou';
    if (userReg === 'tamba') return 'Tambacounda';

    const activeReg = this.normalizeRegion(this.macroStats?.region_active);
    if (activeReg === 'kedougou') return 'Kédougou';
    return 'Tambacounda';
  }

  get isRegional(): boolean {
    return true;
  }

  get targetRegionName(): 'Tambacounda' | 'Kédougou' {
    return this.effectiveRegion;
  }

  get targetRegionShortName(): string {
    return this.effectiveRegion === 'Tambacounda' ? 'Tamba' : 'Kédougou';
  }

  get targetCibleFoyers(): number {
    if (this.effectiveRegion === 'Kédougou') {
      return Number(this.macroStats?.regions_objectifs?.['Kédougou']?.cible_foyers ?? 40000);
    }
    return Number(this.macroStats?.regions_objectifs?.Tambacounda?.cible_foyers ?? 60000);
  }

  get totalFoyersDiffuses(): number {
    if (this.effectiveRegion === 'Kédougou') {
      if (this.macroStats?.regions_objectifs?.['Kédougou']?.total_foyers_diffuses != null) {
        return Number(this.macroStats.regions_objectifs['Kédougou'].total_foyers_diffuses);
      }
      if (this.normalizeRegion(this.macroStats?.region_active) === 'kedougou' && this.macroStats?.total_foyers_diffuses_region != null) {
        return Number(this.macroStats.total_foyers_diffuses_region);
      }
      return 0;
    }

    // Région Tambacounda (60 000 FA)
    if (this.macroStats?.regions_objectifs?.Tambacounda?.total_foyers_diffuses != null) {
      return Number(this.macroStats.regions_objectifs.Tambacounda.total_foyers_diffuses);
    }
    if (this.normalizeRegion(this.macroStats?.region_active) === 'tamba' && this.macroStats?.total_foyers_diffuses_region != null) {
      return Number(this.macroStats.total_foyers_diffuses_region);
    }
    // Fallback si le cache local provient d'une ancienne synchronisation avant découpage régional
    return this.macroStats?.total_foyers_diffuses != null ? Number(this.macroStats.total_foyers_diffuses) : 0;
  }

  get tauxRealisationPct(): number {
    const cible = this.targetCibleFoyers;
    if (cible > 0) {
      const pct = (this.totalFoyersDiffuses / cible) * 100;
      return Math.round(pct * 100) / 100;
    }
    return 0;
  }

  get ecartFoyers(): number {
    return Math.max(0, this.targetCibleFoyers - this.totalFoyersDiffuses);
  }

  get totalNationalFoyersDiffuses(): number {
    return this.macroStats?.total_foyers_diffuses != null ? Number(this.macroStats.total_foyers_diffuses) : 0;
  }

  get tauxNationalPct(): number {
    return this.macroStats?.taux_realisation_pct != null ? Number(this.macroStats.taux_realisation_pct) : 0;
  }

  get pendingLocalFaRegion(): number {
    const targetKey = this.effectiveRegion === 'Kédougou' ? 'kedougou' : 'tamba';
    const pendingVentes = this.storage.getItems('ventes').filter(v => v.sync_status === 'en_attente');
    return pendingVentes
      .filter((v: any) => {
        const regKey = this.normalizeRegion(v.region);
        return !regKey || regKey === targetKey;
      })
      .reduce((sum, item: any) => sum + (Number(item.total_fa_vendus) || 0), 0);
  }

  constructor(
    public storage: StorageService,
    public sync: SyncService,
    public auth: AuthService,
    private location: LocationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.currentUser;
    this.refreshCounts();

    // Demande proactive des permissions de géolocalisation
    this.location.requestPermission().catch(() => {});

    this.auth.currentUser$.subscribe((user: AuthUser | null) => {
      this.currentUser = user;
      this.cdr.detectChanges();
    });

    this.sync.isOnline$.subscribe(online => {
      this.isOnline = online;
      if (online && !this.isSyncing) {
        this.silentSync();
      }
      this.cdr.detectChanges();
    });

    this.sync.isSyncing$.subscribe(syncing => {
      this.isSyncing = syncing;
      if (!syncing) {
        this.refreshCounts();
      }
      this.cdr.detectChanges();
    });

    this.sync.lastSync$.subscribe(time => {
      this.lastSyncTime = time;
      this.cdr.detectChanges();
    });

    if (this.isOnline) {
      this.silentSync();
    }
  }

  ionViewWillEnter() {
    this.currentUser = this.auth.currentUser;
    this.refreshCounts();
    this.cdr.detectChanges();

    if (this.isOnline && !this.isSyncing) {
      this.silentSync();
    }
  }

  private async silentSync() {
    try {
      await this.sync.synchronize();
      this.refreshCounts();
      this.cdr.detectChanges();
    } catch {
      // Échec silencieux, conserver les valeurs en cache local
    }
  }

  logout() {
    if (confirm('Confirmez-vous la déconnexion de l’application ?')) {
      this.auth.logout();
    }
  }

  refreshCounts() {
    this.currentUser = this.auth.reloadUserFromStorage() || this.auth.currentUser;
    this.pendingCount = this.storage.getPendingCount();
    this.totalLocalCount = this.storage.getTotalLocalCount();
    this.draftCount = this.storage.getDraftCount();
    this.macroStats = this.storage.getCache('indicateurs_macro');
  }

  async triggerSync() {
    if (!this.isOnline) {
      this.showToast('Vous êtes actuellement hors-ligne. Les fiches sont conservées localement.', 'warning');
      return;
    }

    try {
      this.isSyncing = true;
      this.cdr.detectChanges();
      const result: SyncResult = await this.sync.synchronize();
      if (result.success) {
        this.showToast(result.message, 'success');
      } else {
        this.showToast(result.message, 'danger');
      }
    } catch (err: any) {
      this.showToast('Erreur inattendue : ' + (err.message || err), 'danger');
    } finally {
      this.isSyncing = false;
      this.refreshCounts();
      this.cdr.detectChanges();
    }
  }

  showToast(message: string, color: 'success' | 'danger' | 'warning') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
    this.cdr.detectChanges();
  }
}
