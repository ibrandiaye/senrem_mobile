import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast 
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ReferentielService, RegionData, DepartementData, CommuneData, AnimateurData } from '../../services/referentiel.service';
import { AuthService } from '../../services/auth.service';
import { SyncService } from '../../services/sync.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-form-demonstrations',
  templateUrl: './form-demonstrations.page.html',
  styleUrls: ['./form-demonstrations.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormDemonstrationsPage implements OnInit {
  regions: RegionData[] = [];
  departements: DepartementData[] = [];
  communes: CommuneData[] = [];
  isRegionLocked = false;
  isEditingDraft = false;
  currentUuid: string | null = null;

  animateursRegion: AnimateurData[] = [];
  selectedResponsable: string = '';
  isAutreResponsable: boolean = false;

  formData: any = {
    uuid: '',
    region: '',
    departement: '',
    commune: '',
    village_quartier: '',
    date_demonstration: new Date().toISOString().split('T')[0],
    gpf_nom: '',
    activites_principales_gpf: '',
    nb_presents: 0,
    nb_hommes: 0,
    nb_femmes: 0,
    presidente_nom: '',
    presidente_contact: '',
    presidente_age: '35 ans et plus',
    consent_photo_video: true,
    consent_interview: true,
    responsable_nom: '',
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
    if (uuid) {
      this.loadDraft(uuid);
    } else {
      this.isEditingDraft = false;
      this.currentUuid = null;
      this.formData = {
        uuid: '',
        region: '',
        departement: '',
        commune: '',
        village_quartier: '',
        date_demonstration: new Date().toISOString().split('T')[0],
        gpf_nom: '',
        activites_principales_gpf: '',
        nb_presents: 0,
        nb_hommes: 0,
        nb_femmes: 0,
        presidente_nom: '',
        presidente_contact: '',
        presidente_age: '35 ans et plus',
        consent_photo_video: true,
        consent_interview: true,
        responsable_nom: '',
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
      this.onRegionChange();

      if (user && user.name) {
        this.selectedResponsable = user.name;
        this.formData.responsable_nom = user.name;
      }
      this.cdr.detectChanges();
    }
  }

  loadDraft(uuid: string) {
    const draft = this.storage.getItemByUuid<any>('demonstrations', uuid);
    if (!draft) return;

    this.isEditingDraft = true;
    this.currentUuid = uuid;

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
      this.animateursRegion = this.referentiel.getAnimateursByRegion(this.formData.region);
    }
    if (this.formData.departement) {
      this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
    }

    if (this.formData.responsable_nom) {
      const match = this.animateursRegion.find(a => a.nom === this.formData.responsable_nom);
      if (match) {
        this.selectedResponsable = match.nom;
        this.isAutreResponsable = false;
      } else {
        this.selectedResponsable = '__autre__';
        this.isAutreResponsable = true;
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
    }

    // Chargement des animateurs pré-enregistrés de la région
    this.animateursRegion = this.referentiel.getAnimateursByRegion(this.formData.region);
    const user = this.auth.currentUser;
    if (user && user.name && (!this.selectedResponsable || this.selectedResponsable === '__autre__')) {
      const match = this.animateursRegion.find(a => a.nom.toLowerCase() === user.name.toLowerCase());
      if (match) {
        this.selectedResponsable = match.nom;
        this.formData.responsable_nom = match.nom;
        this.isAutreResponsable = false;
      } else if (!this.formData.responsable_nom) {
        this.selectedResponsable = user.name;
        this.formData.responsable_nom = user.name;
      }
    }
  }

  onResponsableChange() {
    if (this.selectedResponsable === '__autre__') {
      this.isAutreResponsable = true;
      this.formData.responsable_nom = '';
    } else {
      this.isAutreResponsable = false;
      this.formData.responsable_nom = this.selectedResponsable;
    }
  }

  setAge(age: string) {
    this.formData.presidente_age = age;
  }

  onDepartementChange() {
    this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
    if (this.communes.length > 0) {
      this.formData.commune = this.communes[0].nom;
    } else {
      this.communes = [];
    }
  }

  updateTotalPresents() {
    this.formData.nb_presents = (Number(this.formData.nb_hommes) || 0) + (Number(this.formData.nb_femmes) || 0);
  }

  async captureGps() {
    this.isCapturingGps = true;
    try {
      const pos = await this.location.getCurrentPosition();
      this.formData.latitude = pos.latitude;
      this.formData.longitude = pos.longitude;
      this.showToast('Position GPS capturée !', 'success');
    } catch (err: any) {
      this.showToast(err.message || 'Erreur GPS', 'warning');
    } finally {
      this.isCapturingGps = false;
      this.cdr.detectChanges();
    }
  }

  async save(isDraft: boolean) {
    if (!isDraft) {
      if (!this.formData.gpf_nom || !this.formData.presidente_nom) {
        this.showToast('Veuillez renseigner le nom du GPF et de la présidente.', 'danger');
        return;
      }
      if (!this.formData.responsable_nom) {
        this.showToast('Veuillez sélectionner ou renseigner le responsable de l\'activité.', 'danger');
        return;
      }
    } else {
      if (!this.formData.gpf_nom) {
        this.formData.gpf_nom = 'Brouillon Démo - ' + (this.formData.commune || 'Sans lieu');
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
      };

      const res = await this.sync.saveAndSync('demonstrations', payload, isDraft);
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
