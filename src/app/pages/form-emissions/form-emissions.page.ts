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
  selector: 'app-form-emissions',
  templateUrl: './form-emissions.page.html',
  styleUrls: ['./form-emissions.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormEmissionsPage implements OnInit {
  regions: RegionData[] = [];
  departements: DepartementData[] = [];
  communes: CommuneData[] = [];
  isRegionLocked = false;
  isEditingDraft = false;
  currentUuid: string | null = null;

  formData: any = {
    uuid: '',
    region: '',
    departement: '',
    commune: '',
    radio_nom: '',
    radio_frequence: '',
    date_emission: new Date().toISOString().split('T')[0],
    heure_debut: '10:00',
    heure_fin: '11:30',
    theme: '',
    format: 'direct',
    lieu: 'studio',
    animateur_nom: '',
    responsable_radio_nom: '',
    latitude: null,
    longitude: null,
  };

  participants: { prenom_nom: string; sexe: 'M' | 'F'; profession: string }[] = [
    { prenom_nom: '', sexe: 'M', profession: '' }
  ];

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
      this.participants = [{ prenom_nom: '', sexe: 'M', profession: '' }];
      this.formData = {
        uuid: '',
        region: '',
        departement: '',
        commune: '',
        radio_nom: '',
        radio_frequence: '',
        date_emission: new Date().toISOString().split('T')[0],
        heure_debut: '10:00',
        heure_fin: '11:30',
        theme: '',
        format: 'direct',
        lieu: 'studio',
        animateur_nom: '',
        responsable_radio_nom: '',
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
      this.cdr.detectChanges();
    }
  }

  loadDraft(uuid: string) {
    const draft = this.storage.getItemByUuid<any>('emissions', uuid);
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
      if (!this.formData.departement && this.formData.commune) {
        const matchingDept = this.departements.find(d =>
          d.communes && d.communes.some(c => c.nom.toLowerCase() === this.formData.commune.toLowerCase())
        );
        if (matchingDept) {
          this.formData.departement = matchingDept.nom;
        }
      }
      if (!this.formData.departement && this.departements.length > 0) {
        this.formData.departement = this.departements[0].nom;
      }
    }
    if (this.formData.departement) {
      this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
      if (!this.formData.commune && this.communes.length > 0) {
        this.formData.commune = this.communes[0].nom;
      }
    }

    if (draft.participants && Array.isArray(draft.participants) && draft.participants.length > 0) {
      this.participants = draft.participants.map((p: any) => ({ ...p }));
    } else {
      this.participants = [{ prenom_nom: '', sexe: 'M', profession: '' }];
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
    }
  }

  onDepartementChange() {
    this.communes = this.referentiel.getCommunes(this.formData.region, this.formData.departement);
    if (this.communes.length > 0) {
      this.formData.commune = this.communes[0].nom;
    } else {
      this.communes = [];
      this.formData.commune = '';
    }
  }

  addParticipant() {
    this.participants.push({ prenom_nom: '', sexe: 'F', profession: '' });
  }

  removeParticipant(index: number) {
    if (this.participants.length > 1) {
      this.participants.splice(index, 1);
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
      if (!this.formData.radio_nom || !this.formData.theme || !this.formData.animateur_nom) {
        this.showToast('Veuillez renseigner le nom de la radio, le thème et l\'animateur(rice) radio.', 'danger');
        return;
      }
    } else {
      if (!this.formData.radio_nom) {
        this.formData.radio_nom = 'Brouillon Radio - ' + (this.formData.commune || 'Sans lieu');
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
        participants: this.participants.filter(p => !!p.prenom_nom),
      };

      const res = await this.sync.saveAndSync('emissions', payload, isDraft);
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
