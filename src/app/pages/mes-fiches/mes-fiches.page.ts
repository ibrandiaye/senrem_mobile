import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast, IonSpinner 
} from '@ionic/angular';
import { StorageService, FicheType, BaseFiche, ALL_FICHE_TYPES } from '../../services/storage.service';
import { SyncService } from '../../services/sync.service';

@Component({
  selector: 'app-mes-fiches',
  templateUrl: './mes-fiches.page.html',
  styleUrls: ['./mes-fiches.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast, IonSpinner
  ]
})
export class MesFichesPage implements OnInit {
  selectedType: string = 'all';
  selectedStatus: string = 'all';

  fiches: (BaseFiche & { typeLabel: string; title: string; subtitle: string })[] = [];

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'warning' | 'danger' = 'success';
  isSyncing = false;

  constructor(
    private storage: StorageService,
    public sync: SyncService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const statusParam = this.route.snapshot.queryParams['status'];
    if (statusParam) {
      this.selectedStatus = statusParam;
    }

    this.loadFiches();
    this.sync.isSyncing$.subscribe(s => {
      this.isSyncing = s;
      if (!s) {
        this.loadFiches();
      }
      this.cdr.detectChanges();
    });
  }

  ionViewWillEnter() {
    const statusParam = this.route.snapshot.queryParams['status'];
    if (statusParam) {
      this.selectedStatus = statusParam;
    }
    this.loadFiches();
    this.cdr.detectChanges();

    if (this.sync.isOnline && !this.sync.isSyncing) {
      this.sync.synchronize().then(() => {
        this.loadFiches();
        this.cdr.detectChanges();
      }).catch(() => {});
    }
  }

  get draftCount(): number {
    return this.fiches.filter(f => f.sync_status === 'brouillon').length;
  }

  get pendingCount(): number {
    return this.fiches.filter(f => f.sync_status === 'en_attente').length;
  }

  openFiche(fiche: any) {
    const routeMap: { [key in FicheType]: string } = {
      'ventes': '/form-ventes',
      'animations': '/form-animations',
      'demonstrations': '/form-demonstrations',
      'caravanes': '/form-caravanes',
      'emissions': '/form-emissions',
      'leaders': '/form-leaders',
      'gpfs': '/form-gpf',
      'lmes': '/form-lme'
    };
    const targetRoute = routeMap[fiche.type as FicheType];
    if (targetRoute) {
      this.router.navigate([targetRoute], { queryParams: { uuid: fiche.uuid } });
    }
  }

  loadFiches() {
    const list: any[] = [];

    for (const t of ALL_FICHE_TYPES) {
      const items = this.storage.getItems(t);
      for (const item of items) {
        let title = '';
        let subtitle = '';
        let typeLabel = '';

        switch (t) {
          case 'ventes':
            typeLabel = 'Vente Distributeur';
            title = item['distributeur_nom'] || 'Distributeur inconnu';
            subtitle = `${item['total_fa_vendus'] || 0} FA vendus • ${item['commune'] || ''} (${item['region'] || ''})`;
            break;
          case 'animations':
            typeLabel = 'Animation-Vente';
            title = item['lieu_animation'] || 'Lieu non précisé';
            subtitle = `Animateur: ${item['animateur_nom']} • ${item['nb_fa_vendus']} FA vendus`;
            break;
          case 'demonstrations':
            typeLabel = 'Démo Culinaire';
            title = item['gpf_nom'] || 'GPF';
            subtitle = `Présidente: ${item['presidente_nom']} • ${item['nb_femmes']} femmes présentes`;
            break;
          case 'caravanes':
            typeLabel = 'Caravane';
            title = item['itineraire'] || 'Caravane';
            subtitle = `${item['nb_villages_sillonnes']} village(s) • ${item['nb_fa_vendus']} FA vendus`;
            break;
          case 'emissions':
            typeLabel = 'Émission Radio';
            title = item['radio_nom'] || 'Radio';
            subtitle = `${item['theme']} • ${item['animateur_nom']}`;
            break;
          case 'leaders':
            typeLabel = 'Leader d\'Opinion';
            title = item['prenom_nom'] || 'Leader';
            subtitle = `${item['titre_profession']} • ${item['telephone']}`;
            break;
          case 'gpfs':
            const isGpfRedyn = (item as any)['type_indicateur'] === 'redynamise' || (item as any)['type'] === 'redynamise';
            typeLabel = isGpfRedyn ? 'GPF redynamisé' : 'Nouveau GPF engagé';
            title = (item as any)['nom_groupement'] || 'Groupement GPF';
            const gpfAge = (item as any)['age'] ? ` • Âge: ${(item as any)['age']}` : '';
            subtitle = `${(item as any)['nb_membres'] || 0} membres • Présidente: ${(item as any)['nom_presidente'] || '-'}${gpfAge} (${(item as any)['region'] || ''})`;
            break;
          case 'lmes':
            const isLmeRedyn = (item as any)['type_indicateur'] === 'redynamise' || (item as any)['type'] === 'redynamise';
            typeLabel = isLmeRedyn ? 'LME redynamisé' : 'Nouveau LME enrôlé';
            title = (item as any)['nom_lme'] || 'Acteur LME';
            const lmeAge = (item as any)['age'] ? ` • ${(item as any)['age']}` : '';
            subtitle = `Activité: ${(item as any)['activite_principale'] || '-'}${lmeAge} • ${(item as any)['telephone'] || ''} (${(item as any)['region'] || ''})`;
            break;
        }

        list.push({
          ...item,
          type: t,
          typeLabel,
          title,
          subtitle,
        });
      }
    }

    // Tri par date décroissante
    list.sort((a, b) => new Date(b.client_created_at).getTime() - new Date(a.client_created_at).getTime());
    this.fiches = list;
  }

  get filteredFiches() {
    return this.fiches.filter(f => {
      const matchType = this.selectedType === 'all' || f.type === this.selectedType;
      const matchStatus = this.selectedStatus === 'all' || f.sync_status === this.selectedStatus;
      return matchType && matchStatus;
    });
  }

  async deleteItem(fiche: any) {
    if (confirm(`Voulez-vous supprimer définitivement cette fiche "${fiche.title}" (sur l'appareil et dans la base de données) ?`)) {
      this.loadFiches();
      const res = await this.sync.deleteAndSync(fiche.type, fiche.uuid);
      this.loadFiches();
      this.showToast(res.message, 'success');
    }
  }

  clearAllLocalFiches() {
    if (confirm('Voulez-vous réinitialiser et effacer toutes les fiches stockées localement sur ce téléphone ?')) {
      this.storage.clearAllLocalData();
      this.loadFiches();
      this.showToast('Toutes les fiches et le cache local ont été réinitialisés.', 'success');
    }
  }

  async triggerSync() {
    try {
      this.isSyncing = true;
      this.cdr.detectChanges();
      const res = await this.sync.synchronize();
      this.showToast(res.message, res.success ? 'success' : 'danger');
    } catch (err: any) {
      this.showToast('Erreur inattendue : ' + (err.message || err), 'danger');
    } finally {
      this.isSyncing = false;
      this.loadFiches();
      this.cdr.detectChanges();
    }
  }

  showToast(message: string, color: 'success' | 'warning' | 'danger') {
    this.toastMessage = message;
    this.toastColor = color;
    this.isToastOpen = true;
    this.cdr.detectChanges();
  }
}
