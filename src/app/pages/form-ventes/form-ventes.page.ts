import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast 
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ReferentielService, FoyerModel, RegionData, DepartementData, CommuneData, DistributeurData } from '../../services/referentiel.service';
import { AuthService } from '../../services/auth.service';
import { SyncService } from '../../services/sync.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-form-ventes',
  templateUrl: './form-ventes.page.html',
  styleUrls: ['./form-ventes.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormVentesPage implements OnInit {
  regions: RegionData[] = [];
  departements: DepartementData[] = [];
  communes: CommuneData[] = [];
  foyers: FoyerModel[] = [];
  distributeursCommune: DistributeurData[] = [];
  selectedDistributeurId: string = '';
  isRegionLocked = false;
  isEditingDraft = false;
  currentUuid: string | null = null;

  // Données du formulaire
  formData: any = {
    uuid: '',
    distributeur_id: null,
    distributeur_nom: '',
    distributeur_statut: 'LME',
    distributeur_telephone: '',
    region: '',
    departement: '',
    commune: '',
    village_quartier: '',
    adresse_client: '',
    date_vente: new Date().toISOString().split('T')[0],
    latitude: null,
    longitude: null,
  };

  quantites: { [foyerId: number]: number } = {};

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'warning' | 'danger' = 'success';
  isCapturingGps = false;
  isSaving = false;

  constructor(
    private storage: StorageService,
    private referentiel: ReferentielService,
    private auth: AuthService,
    private sync: SyncService,
    private location: LocationService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initFormFromRoute();
  }

  ionViewWillEnter() {
    this.initFormFromRoute();
  }

  private initFormFromRoute() {
    this.regions = this.referentiel.getRegions();
    this.foyers = this.referentiel.getFoyerTypes();

    for (const f of this.foyers) {
      this.quantites[f.id] = 0;
    }

    const uuid = this.route.snapshot.queryParams['uuid'];
    if (uuid) {
      this.loadDraft(uuid);
    } else {
      this.isEditingDraft = false;
      this.currentUuid = null;
      this.formData = {
        uuid: '',
        distributeur_id: null,
        distributeur_nom: '',
        distributeur_statut: 'LME',
        distributeur_telephone: '',
        region: '',
        departement: '',
        commune: '',
        village_quartier: '',
        adresse_client: '',
        date_vente: new Date().toISOString().split('T')[0],
        latitude: null,
        longitude: null,
      };
      const user = this.auth.currentUser;
      if (user && user.region) {
        this.formData.region = user.region;
        this.isRegionLocked = true;
        this.onRegionChange();
      } else if (this.regions.length > 0) {
        this.formData.region = this.regions[0].nom;
        this.onRegionChange();
      }
      this.cdr.detectChanges();
    }
  }

  loadDraft(uuid: string) {
    const draft = this.storage.getItemByUuid<any>('ventes', uuid);
    if (!draft) return;

    this.isEditingDraft = true;
    this.currentUuid = uuid;

    for (const f of this.foyers) {
      this.quantites[f.id] = 0;
    }

    this.formData = {
      ...this.formData,
      ...draft,
      uuid: draft.uuid,
    };

    const user = this.auth.currentUser;
    if (user && user.region) {
      this.isRegionLocked = true;
    }

    if (this.formData.region) {
      this.departements = this.referentiel.getDepartements(this.formData.region);
    }
    if (this.formData.departement) {
      this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
    }
    if (this.formData.commune) {
      this.distributeursCommune = this.referentiel.getDistributeursByCommune(
        this.formData.commune,
        this.formData.region,
        this.formData.departement
      );
      if (this.formData.distributeur_id) {
        this.selectedDistributeurId = String(this.formData.distributeur_id);
      } else {
        const matchDist = this.distributeursCommune.find(
          d => d.nom.trim().toLowerCase() === (this.formData.distributeur_nom || '').trim().toLowerCase()
        );
        this.selectedDistributeurId = matchDist ? String(matchDist.id) : '__NOUVEAU__';
      }
    }

    if (draft.items && Array.isArray(draft.items)) {
      for (const item of draft.items) {
        if (item.foyer_type_id) {
          this.quantites[item.foyer_type_id] = Number(item.quantite) || 0;
        }
      }
    }

    this.cdr.detectChanges();
  }

  onRegionChange() {
    this.departements = this.referentiel.getDepartements(this.formData.region);
    if (this.departements.length > 0) {
      this.formData.departement = this.departements[0].nom;
      this.onDepartementChange();
    } else {
      this.departements = [];
      this.communes = [];
      this.formData.departement = '';
      this.formData.commune = '';
      this.onCommuneChange();
    }
  }

  onDepartementChange() {
    this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
    if (this.communes.length > 0) {
      this.formData.commune = this.communes[0].nom;
      this.onCommuneChange();
    } else {
      this.communes = [];
      this.formData.commune = '';
      this.onCommuneChange();
    }
  }

  /**
   * Dès qu'une commune est choisie, charge automatiquement les distributeurs affiliés à cette commune.
   */
  onCommuneChange() {
    if (this.formData.commune) {
      this.distributeursCommune = this.referentiel.getDistributeursByCommune(
        this.formData.commune,
        this.formData.region,
        this.formData.departement
      );
      if (this.distributeursCommune.length > 0) {
        // Sélectionner par défaut le premier ou laisser le choix à l'utilisateur
        this.selectedDistributeurId = '';
        this.formData.distributeur_id = null;
      } else {
        this.selectedDistributeurId = '__NOUVEAU__';
        this.formData.distributeur_id = null;
      }
    } else {
      this.distributeursCommune = [];
      this.selectedDistributeurId = '__NOUVEAU__';
      this.formData.distributeur_id = null;
    }
  }

  /**
   * Pré-remplit automatiquement les champs distributeur lorsqu'un distributeur répertorié est sélectionné.
   */
  onDistributeurSelected() {
    if (this.selectedDistributeurId === '__NOUVEAU__') {
      this.formData.distributeur_id = null;
      this.formData.distributeur_nom = '';
      this.formData.distributeur_telephone = '';
      this.formData.distributeur_statut = 'LME';
      return;
    }

    if (!this.selectedDistributeurId) {
      this.formData.distributeur_id = null;
      this.formData.distributeur_nom = '';
      this.formData.distributeur_telephone = '';
      return;
    }

    const dist = this.distributeursCommune.find(d => String(d.id) === String(this.selectedDistributeurId));
    if (dist) {
      this.formData.distributeur_id = dist.id;
      this.formData.distributeur_nom = dist.nom;
      this.formData.distributeur_telephone = dist.telephone || '';
      this.formData.distributeur_statut = dist.statut || 'LME';
      if (dist.village_quartier && !this.formData.village_quartier) {
        this.formData.village_quartier = dist.village_quartier;
      }
    }
  }

  increment(foyerId: number) {
    this.quantites[foyerId] = (this.quantites[foyerId] || 0) + 1;
  }

  decrement(foyerId: number) {
    if ((this.quantites[foyerId] || 0) > 0) {
      this.quantites[foyerId]--;
    }
  }

  get totalFoyers(): number {
    let total = 0;
    for (const id of Object.keys(this.quantites)) {
      total += Number(this.quantites[+id] || 0);
    }
    return total;
  }

  async captureGps() {
    this.isCapturingGps = true;
    try {
      const pos = await this.location.getCurrentPosition();
      this.formData.latitude = pos.latitude;
      this.formData.longitude = pos.longitude;
      this.showToast('Position GPS capturée avec succès !', 'success');
    } catch (err: any) {
      this.showToast(err.message || 'Impossible de capturer le GPS.', 'warning');
    } finally {
      this.isCapturingGps = false;
      this.cdr.detectChanges();
    }
  }

  async save(isDraft: boolean) {
    if (!isDraft) {
      if (!this.formData.distributeur_nom) {
        this.showToast('Veuillez renseigner le nom du distributeur.', 'danger');
        return;
      }
      if (this.totalFoyers === 0) {
        this.showToast('Veuillez saisir au moins 1 foyer vendu.', 'danger');
        return;
      }
    } else {
      if (!this.formData.distributeur_nom) {
        this.formData.distributeur_nom = 'Brouillon Vente - ' + (this.formData.commune || 'Sans lieu');
      }
    }

    if (this.isSaving) return;
    this.isSaving = true;

    try {
      const items = [];
      for (const f of this.foyers) {
        const q = this.quantites[f.id] || 0;
        if (q > 0) {
          items.push({
            foyer_type_id: f.id,
            nom_foyer: f.nom,
            quantite: q
          });
        }
      }

      const user = this.auth.currentUser;
      const finalUuid = this.currentUuid || this.formData.uuid || this.storage.generateUuid();
      this.currentUuid = finalUuid;
      this.formData.uuid = finalUuid;

      const payload = {
        ...this.formData,
        uuid: finalUuid,
        user_id: user?.id || null,
        user_name: user?.name || '',
        user_email: user?.email || '',
        region: user?.region || this.formData.region,
        items: items,
        total_fa_vendus: this.totalFoyers,
      };

      const res = await this.sync.saveAndSync('ventes', payload, isDraft);
      if (isDraft && !payload.already_synced) {
        this.showToast('Brouillon sauvegardé avec succès.', 'success');
        setTimeout(() => {
          this.router.navigate(['/mes-fiches'], { queryParams: { status: 'brouillon' } });
        }, 800);
      } else {
        this.showToast(res.message, res.success ? 'success' : 'warning');
        setTimeout(() => {
          this.router.navigate([this.isEditingDraft ? '/mes-fiches' : '/home']);
        }, 1200);
      }
    } catch (err: any) {
      this.showToast('Erreur lors de l\'enregistrement : ' + (err.message || err), 'danger');
    } finally {
      this.isSaving = false;
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
