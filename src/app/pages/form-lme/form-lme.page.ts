import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast 
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ReferentielService, RegionData, DepartementData, CommuneData } from '../../services/referentiel.service';
import { AuthService } from '../../services/auth.service';
import { SyncService } from '../../services/sync.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-form-lme',
  templateUrl: './form-lme.page.html',
  styleUrls: ['./form-lme.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormLmePage implements OnInit {
  regions: RegionData[] = [];
  departements: DepartementData[] = [];
  communes: CommuneData[] = [];

  selectedCommune: string = '';
  isAutreCommune: boolean = false;

  isRegionLocked = false;
  isEditingDraft = false;
  currentUuid: string | null = null;

  formData: any = {
    uuid: '',
    type_indicateur: 'nouveau', // 'nouveau' (Nouveaux LME enrôlés) ou 'redynamise' (LME redynamisés)
    date_action: new Date().toISOString().split('T')[0],
    region: '',
    departement: '',
    commune: '',
    village_quartier: '',
    nom_lme: '',
    activite_principale: '',
    age: '',
    telephone: '',
    latitude: null,
    longitude: null,
  };

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
    const uuid = this.route.snapshot.queryParams['uuid'];
    const typeParam = this.route.snapshot.queryParams['type'];

    if (uuid) {
      this.loadDraft(uuid);
    } else {
      this.isEditingDraft = false;
      this.currentUuid = null;
      this.formData = {
        uuid: '',
        type_indicateur: (typeParam === 'nouveau' || typeParam === 'redynamise') ? typeParam : 'nouveau',
        date_action: new Date().toISOString().split('T')[0],
        region: '',
        departement: '',
        commune: '',
        village_quartier: '',
        nom_lme: '',
        activite_principale: '',
        age: '',
        telephone: '',
        latitude: null,
        longitude: null,
      };
      const user = this.auth.currentUser;
      if (user && user.region) {
        this.formData.region = user.region;
        this.isRegionLocked = true;
      } else if (this.regions.length > 0) {
        this.formData.region = this.regions[0].nom;
      }

      this.departements = this.referentiel.getDepartements(this.formData.region);
      if (this.departements.length > 0) {
        this.formData.departement = this.departements[0].nom;
        this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
        if (this.communes.length > 0) {
          this.selectedCommune = this.communes[0].nom;
          this.formData.commune = this.communes[0].nom;
        }
      }
      this.cdr.detectChanges();
    }
  }

  loadDraft(uuid: string) {
    const draft = this.storage.getItemByUuid<any>('lmes', uuid);
    if (!draft) return;

    this.isEditingDraft = true;
    this.currentUuid = uuid;

    this.formData = {
      ...this.formData,
      ...draft,
      type_indicateur: draft.type_indicateur || (draft.type === 'redynamise' ? 'redynamise' : 'nouveau'),
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
    } else if (this.formData.region) {
      this.communes = this.referentiel.getCommunesByRegion(this.formData.region);
    }

    if (draft.commune) {
      const match = this.communes.find(c => c.nom.toLowerCase() === draft.commune.toLowerCase());
      if (match) {
        this.selectedCommune = match.nom;
        this.formData.commune = match.nom;
        this.isAutreCommune = false;
      } else {
        this.communes.unshift({ id: 0, nom: draft.commune });
        this.selectedCommune = draft.commune;
        this.formData.commune = draft.commune;
        this.isAutreCommune = false;
      }
    }

    this.cdr.detectChanges();
  }

  setType(type: 'nouveau' | 'redynamise') {
    this.formData.type_indicateur = type;
  }

  setAge(age: string) {
    this.formData.age = age;
  }

  onRegionChange() {
    this.departements = this.referentiel.getDepartements(this.formData.region);
    this.formData.departement = this.departements.length > 0 ? this.departements[0].nom : '';
    this.onDepartementChange();
  }

  onDepartementChange() {
    if (this.formData.departement) {
      this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
    } else {
      this.communes = this.referentiel.getCommunesByRegion(this.formData.region);
    }

    if (this.communes.length > 0) {
      this.selectedCommune = this.communes[0].nom;
      this.formData.commune = this.communes[0].nom;
      this.isAutreCommune = false;
    } else {
      this.selectedCommune = '';
      this.formData.commune = '';
      this.isAutreCommune = false;
    }
  }

  onCommuneChange() {
    if (this.selectedCommune === '__autre__') {
      this.isAutreCommune = true;
      this.formData.commune = '';
    } else {
      this.isAutreCommune = false;
      this.formData.commune = this.selectedCommune;
    }
  }

  async captureGps() {
    this.isCapturingGps = true;
    try {
      const pos = await this.location.getCurrentPosition();
      this.formData.latitude = pos.latitude;
      this.formData.longitude = pos.longitude;
      this.showToast('Position GPS capturée !', 'success');
    } catch (err: any) {
      this.showToast(err.message || 'Erreur lors de la capture GPS', 'warning');
    } finally {
      this.isCapturingGps = false;
      this.cdr.detectChanges();
    }
  }

  async save(isDraft: boolean) {
    if (!isDraft) {
      if (!this.formData.nom_lme || !this.formData.region) {
        this.showToast('Veuillez renseigner au moins le nom du LME et la région.', 'danger');
        return;
      }
    } else {
      if (!this.formData.nom_lme) {
        this.formData.nom_lme = 'Brouillon LME - ' + (this.formData.village_quartier || 'Sans nom');
      }
    }

    if (this.isSaving) return;
    this.isSaving = true;

    try {
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
        type: this.formData.type_indicateur,
        type_indicateur: this.formData.type_indicateur,
      };

      const res = await this.sync.saveAndSync('lmes', payload, isDraft);
      if (isDraft && !payload.already_synced) {
        this.showToast('Brouillon LME sauvegardé.', 'success');
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
      this.showToast('Erreur : ' + (err.message || err), 'danger');
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
