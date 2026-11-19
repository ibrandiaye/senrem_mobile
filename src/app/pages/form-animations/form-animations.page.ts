import { Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonToast 
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { ReferentielService, RegionData, DepartementData, CommuneData, DistributeurData } from '../../services/referentiel.service';
import { AuthService } from '../../services/auth.service';
import { SyncService } from '../../services/sync.service';
import { LocationService } from '../../services/location.service';

export interface SelectedDistributeur {
  id?: number | null;
  nom: string;
  telephone?: string;
  adresse?: string;
  statut?: string;
}

@Component({
  selector: 'app-form-animations',
  templateUrl: './form-animations.page.html',
  styleUrls: ['./form-animations.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormAnimationsPage implements OnInit {
  @ViewChild('signatureCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  regions: RegionData[] = [];
  departements: DepartementData[] = [];
  communes: CommuneData[] = [];
  distributeursCommune: DistributeurData[] = [];
  autresDistributeurs: DistributeurData[] = [];
  
  // Gestion multi-distributeurs
  selectedDistributeurs: SelectedDistributeur[] = [];
  pickerDistributeurId: string = '';
  showManualDistForm = false;
  manualDist = { nom: '', telephone: '', adresse: '', statut: 'LME' };

  isRegionLocked = false;
  isEditingDraft = false;
  currentUuid: string | null = null;

  formData: any = {
    uuid: '',
    region: '',
    departement: '',
    commune: '',
    village_quartier: '',
    lieu_animation: '',
    date_animation: new Date().toISOString().split('T')[0],
    distributeur_nom: '',
    distributeur_adresse: '',
    distributeur_contact: '',
    distributeurs: [],
    materiel_utilise: '',
    animateur_nom: '',
    animateur_contact: '',
    nb_fa_vendus: 0,
    distributeur_signature: null,
    latitude: null,
    longitude: null,
  };

  toastMessage = '';
  isToastOpen = false;
  toastColor: 'success' | 'warning' | 'danger' = 'success';
  isCapturingGps = false;
  isSaving = false;

  private isDrawing = false;
  private ctx!: CanvasRenderingContext2D | null;

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
      this.selectedDistributeurs = [];
      this.formData = {
        uuid: '',
        region: '',
        departement: '',
        commune: '',
        village_quartier: '',
        lieu_animation: '',
        date_animation: new Date().toISOString().split('T')[0],
        distributeur_nom: '',
        distributeur_adresse: '',
        distributeur_contact: '',
        distributeurs: [],
        materiel_utilise: '',
        animateur_nom: '',
        animateur_contact: '',
        nb_fa_vendus: 0,
        distributeur_signature: null,
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
    const draft = this.storage.getItemByUuid<any>('animations', uuid);
    if (!draft) return;

    this.isEditingDraft = true;
    this.currentUuid = uuid;
    this.selectedDistributeurs = [];

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

    this.updateDistributeursList();

    // Raccrocher les distributeurs choisis ou déjà saisis
    if (draft.distributeurs && Array.isArray(draft.distributeurs) && draft.distributeurs.length > 0) {
      this.selectedDistributeurs = [...draft.distributeurs];
    } else if (this.formData.distributeur_nom) {
      const noms = this.formData.distributeur_nom.split(',').map((s: string) => s.trim()).filter((s: string) => !!s);
      const contacts = (this.formData.distributeur_contact || '').split(',').map((s: string) => s.trim());
      const adresses = (this.formData.distributeur_adresse || '').split('|').map((s: string) => s.trim());
      const all = this.referentiel.getDistributeurs();

      this.selectedDistributeurs = noms.map((nom: string, idx: number) => {
        const match = all.find(d => d.nom.trim().toLowerCase() === nom.toLowerCase());
        if (match) {
          return {
            id: match.id,
            nom: match.nom,
            telephone: contacts[idx] || match.telephone || '',
            adresse: adresses[idx] || match.village_quartier || match.commune_nom || '',
            statut: match.statut,
          };
        }
        return {
          nom: nom,
          telephone: contacts[idx] || '',
          adresse: adresses[idx] || '',
          statut: 'LME',
        };
      });
    }
    this.syncDistributeursData();

    if (this.formData.distributeur_signature) {
      setTimeout(() => {
        this.restoreCanvasSignature(this.formData.distributeur_signature);
      }, 350);
    }

    this.cdr.detectChanges();
  }

  private restoreCanvasSignature(dataUrl: string) {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
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

  onCommuneChange() {
    this.updateDistributeursList();
  }

  /**
   * Met à jour en cascade la liste des distributeurs affiliés à la Région, au Département et à la Commune sélectionnés.
   */
  updateDistributeursList() {
    this.pickerDistributeurId = '';
    if (this.formData.commune) {
      this.distributeursCommune = this.referentiel.getDistributeursByCommune(
        this.formData.commune,
        this.formData.region,
        this.formData.departement
      );
      this.autresDistributeurs = [];
    } else {
      this.distributeursCommune = [];
      this.autresDistributeurs = [];
    }
  }

  /**
   * Action lorsqu'un distributeur est choisi dans le menu déroulant
   */
  onDistributeurPicked() {
    if (this.pickerDistributeurId === '__NOUVEAU__') {
      this.showManualDistForm = true;
      this.pickerDistributeurId = '';
      return;
    }
    if (!this.pickerDistributeurId) return;

    const all = this.referentiel.getDistributeurs();
    const d = all.find(item => String(item.id) === String(this.pickerDistributeurId));
    if (d) {
      const exists = this.selectedDistributeurs.some(
        sd => (sd.id && sd.id === d.id) || sd.nom.trim().toLowerCase() === d.nom.trim().toLowerCase()
      );
      if (exists) {
        this.showToast(`« ${d.nom} » est déjà ajouté à la liste.`, 'warning');
      } else {
        const parts: string[] = [];
        if (d.village_quartier) parts.push(d.village_quartier);
        if (d.commune_nom) parts.push(d.commune_nom);
        this.selectedDistributeurs.push({
          id: d.id,
          nom: d.nom,
          telephone: d.telephone || '',
          adresse: parts.join(', ') || d.commune_nom || '',
          statut: d.statut || 'LME',
        });
        this.syncDistributeursData();
        this.showToast(`Distributeur « ${d.nom} » ajouté.`, 'success');
      }
    }
    this.pickerDistributeurId = '';
  }

  /**
   * Valide l'ajout d'un distributeur saisi manuellement
   */
  confirmManualDist() {
    if (!this.manualDist.nom || !this.manualDist.nom.trim()) {
      this.showToast('Veuillez renseigner le nom du distributeur.', 'warning');
      return;
    }

    const trimmedNom = this.manualDist.nom.trim();
    const exists = this.selectedDistributeurs.some(
      sd => sd.nom.trim().toLowerCase() === trimmedNom.toLowerCase()
    );
    if (exists) {
      this.showToast(`« ${trimmedNom} » est déjà dans la liste.`, 'warning');
      return;
    }

    this.selectedDistributeurs.push({
      nom: trimmedNom,
      telephone: this.manualDist.telephone ? this.manualDist.telephone.trim() : '',
      adresse: this.manualDist.adresse ? this.manualDist.adresse.trim() : (this.formData.commune || ''),
      statut: this.manualDist.statut || 'LME',
    });
    this.syncDistributeursData();
    this.manualDist = { nom: '', telephone: '', adresse: '', statut: 'LME' };
    this.showManualDistForm = false;
    this.showToast(`Distributeur « ${trimmedNom} » ajouté.`, 'success');
  }

  cancelManualDist() {
    this.showManualDistForm = false;
    this.manualDist = { nom: '', telephone: '', adresse: '', statut: 'LME' };
  }

  removeDistributeur(index: number) {
    if (index >= 0 && index < this.selectedDistributeurs.length) {
      const removed = this.selectedDistributeurs.splice(index, 1);
      this.syncDistributeursData();
      if (removed.length > 0) {
        this.showToast(`« ${removed[0].nom} » retiré.`, 'warning');
      }
    }
  }

  /**
   * Synchronise les distributeurs sélectionnés avec formData pour stockage et affichage
   */
  syncDistributeursData() {
    this.formData.distributeurs = [...this.selectedDistributeurs];
    this.formData.distributeur_nom = this.selectedDistributeurs.map(d => d.nom).join(', ');
    this.formData.distributeur_contact = this.selectedDistributeurs.map(d => d.telephone).filter(t => !!t).join(', ');
    this.formData.distributeur_adresse = this.selectedDistributeurs.map(d => d.adresse).filter(a => !!a).join(' | ');
  }

  async captureGps() {
    this.isCapturingGps = true;
    try {
      const pos = await this.location.getCurrentPosition();
      this.formData.latitude = pos.latitude;
      this.formData.longitude = pos.longitude;
      this.showToast('Position GPS acquise !', 'success');
    } catch (err: any) {
      this.showToast(err.message || 'Erreur GPS', 'warning');
    } finally {
      this.isCapturingGps = false;
      this.cdr.detectChanges();
    }
  }

  // Signature Pad Handlers
  startDrawing(e: MouseEvent | TouchEvent) {
    this.isDrawing = true;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#0f172a';

    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = 'clientY' in e ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(e: MouseEvent | TouchEvent) {
    if (!this.isDrawing || !this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = 'clientY' in e ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const canvas = this.canvasRef.nativeElement;
    this.formData.distributeur_signature = canvas.toDataURL();
  }

  clearSignature() {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      this.formData.distributeur_signature = null;
    }
  }

  async save(isDraft: boolean) {
    this.syncDistributeursData();

    if (!isDraft) {
      if (!this.formData.lieu_animation) {
        this.showToast('Veuillez renseigner le lieu précis de l\'animation.', 'danger');
        return;
      }
      if (this.selectedDistributeurs.length === 0 && !this.formData.distributeur_nom) {
        this.showToast('Veuillez choisir ou ajouter au moins un distributeur bénéficiaire.', 'danger');
        return;
      }
      if (!this.formData.animateur_nom) {
        this.showToast('Veuillez renseigner le nom de l\'animateur sono.', 'danger');
        return;
      }
    } else {
      if (!this.formData.lieu_animation) {
        this.formData.lieu_animation = 'Brouillon Animation - ' + (this.formData.commune || 'Sans lieu');
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

      const res = await this.sync.saveAndSync('animations', payload, isDraft);
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
