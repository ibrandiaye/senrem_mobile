import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  selector: 'app-form-caravanes',
  templateUrl: './form-caravanes.page.html',
  styleUrls: ['./form-caravanes.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
    IonBackButton, IonToast
  ]
})
export class FormCaravanesPage implements OnInit {
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

  moyensDisponibles = ['Véhicule', 'Sonorisation', 'Audiovisuel', 'Motos', 'Autres'];
  supportsDisponibles = ['Tee-shirt', 'Casquettes', 'Seaux', 'Bassines', 'Autre'];

  formData: any = {
    uuid: '',
    region: '',
    departement: '',
    commune: '',
    date_caravane: new Date().toISOString().split('T')[0],
    heure_debut: '09:00',
    heure_fin: '17:00',
    distributeurs_beneficiaires: '',
    distributeurs_contacts: '',
    distributeurs_adresses: '',
    distributeurs: [],
    itineraire: '',
    moyens_logistiques: ['Véhicule', 'Sonorisation'],
    moyens_autres: '',
    nb_villages_sillonnes: 1,
    supports_communication: [] as string[],
    supports_tshirts: 0,
    supports_casquettes: 0,
    supports_seaux: 0,
    supports_bassines: 0,
    supports_affiches: 0,
    supports_depliants: 0,
    supports_autres_libelle: '',
    supports_autres_nb: 0,
    nb_fa_vendus: 0,
    responsable_nom: '',
    responsable_contact: '',
    latitude: null,
    longitude: null,
  };

  villagesTouches: { nom_village_quartier: string; commune_ou_zone: string }[] = [
    { nom_village_quartier: '', commune_ou_zone: 'V' }
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
      this.selectedDistributeurs = [];
      this.villagesTouches = [{ nom_village_quartier: '', commune_ou_zone: 'V' }];
      this.formData = {
        uuid: '',
        region: '',
        departement: '',
        commune: '',
        date_caravane: new Date().toISOString().split('T')[0],
        heure_debut: '09:00',
        heure_fin: '17:00',
        distributeurs_beneficiaires: '',
        distributeurs_contacts: '',
        distributeurs_adresses: '',
        distributeurs: [],
        itineraire: '',
        moyens_logistiques: ['Véhicule', 'Sonorisation'],
        moyens_autres: '',
        nb_villages_sillonnes: 1,
        supports_communication: [] as string[],
        supports_tshirts: 0,
        supports_casquettes: 0,
        supports_seaux: 0,
        supports_bassines: 0,
        supports_affiches: 0,
        supports_depliants: 0,
        supports_autres_libelle: '',
        supports_autres_nb: 0,
        nb_fa_vendus: 0,
        responsable_nom: '',
        responsable_contact: '',
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
    const draft = this.storage.getItemByUuid<any>('caravanes', uuid);
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
      if (!this.formData.commune && this.communes.length > 0) {
        this.formData.commune = this.communes[0].nom;
      }
    }

    if (draft.villages_touches && Array.isArray(draft.villages_touches) && draft.villages_touches.length > 0) {
      this.villagesTouches = draft.villages_touches.map((v: any) => ({
        nom_village_quartier: v.nom_village_quartier || '',
        commune_ou_zone: v.commune_ou_zone === 'Q' ? 'Q' : 'V',
      }));
      this.formData.nb_villages_sillonnes = draft.nb_villages_sillonnes || this.villagesTouches.length;
    }
    if (!Array.isArray(this.formData.supports_communication)) {
      this.formData.supports_communication = [];
    }

    this.updateDistributeursList();

    // Raccrocher les distributeurs choisis ou déjà saisis
    if (draft.distributeurs && Array.isArray(draft.distributeurs) && draft.distributeurs.length > 0) {
      this.selectedDistributeurs = [...draft.distributeurs];
    } else if (this.formData.distributeurs_beneficiaires) {
      const noms = this.formData.distributeurs_beneficiaires.split(',').map((s: string) => s.trim()).filter((s: string) => !!s);
      const contacts = (this.formData.distributeurs_contacts || '').split(',').map((s: string) => s.trim());
      const adresses = (this.formData.distributeurs_adresses || '').split('|').map((s: string) => s.trim());
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
   * Ajoute un distributeur depuis la base de données
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
        this.showToast(`« ${d.nom} » est déjà ajouté.`, 'warning');
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
      adresse: this.manualDist.adresse ? this.manualDist.adresse.trim() : (this.formData.commune || this.formData.departement || ''),
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
   * Synchronise les distributeurs sélectionnés avec formData
   */
  syncDistributeursData() {
    this.formData.distributeurs = [...this.selectedDistributeurs];
    this.formData.distributeurs_beneficiaires = this.selectedDistributeurs.map(d => d.nom).join(', ');
    this.formData.distributeurs_contacts = this.selectedDistributeurs.map(d => d.telephone).filter(t => !!t).join(', ');
    this.formData.distributeurs_adresses = this.selectedDistributeurs.map(d => d.adresse).filter(a => !!a).join(' | ');
  }

  toggleMoyen(moyen: string) {
    const idx = this.formData.moyens_logistiques.indexOf(moyen);
    if (idx >= 0) {
      this.formData.moyens_logistiques.splice(idx, 1);
      if (moyen === 'Autres') {
        this.formData.moyens_autres = '';
      }
    } else {
      this.formData.moyens_logistiques.push(moyen);
    }
  }

  hasMoyen(moyen: string): boolean {
    return this.formData.moyens_logistiques.includes(moyen);
  }

  toggleSupport(support: string) {
    if (!Array.isArray(this.formData.supports_communication)) {
      this.formData.supports_communication = [];
    }
    const idx = this.formData.supports_communication.indexOf(support);
    if (idx >= 0) {
      this.formData.supports_communication.splice(idx, 1);
      if (support === 'Tee-shirt') this.formData.supports_tshirts = 0;
      if (support === 'Casquettes') this.formData.supports_casquettes = 0;
      if (support === 'Seaux') this.formData.supports_seaux = 0;
      if (support === 'Bassines') this.formData.supports_bassines = 0;
      if (support === 'Autre') {
        this.formData.supports_autres_libelle = '';
        this.formData.supports_autres_nb = 0;
      }
    } else {
      this.formData.supports_communication.push(support);
    }
  }

  hasSupport(support: string): boolean {
    return Array.isArray(this.formData.supports_communication) && this.formData.supports_communication.includes(support);
  }

  onSupportQtyChange(support: string, val: any) {
    if (!Array.isArray(this.formData.supports_communication)) {
      this.formData.supports_communication = [];
    }
    const num = Number(val) || 0;
    if (num > 0 && !this.formData.supports_communication.includes(support)) {
      this.formData.supports_communication.push(support);
    }
  }

  setVillageType(index: number, type: 'V' | 'Q') {
    if (this.villagesTouches[index]) {
      this.villagesTouches[index].commune_ou_zone = type;
    }
  }

  addVillage() {
    this.villagesTouches.push({ nom_village_quartier: '', commune_ou_zone: 'V' });
    this.formData.nb_villages_sillonnes = this.villagesTouches.length;
  }

  removeVillage(index: number) {
    if (this.villagesTouches.length > 1) {
      this.villagesTouches.splice(index, 1);
      this.formData.nb_villages_sillonnes = this.villagesTouches.length;
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
    this.syncDistributeursData();

    if (!isDraft) {
      if (!this.formData.itineraire) {
        this.showToast('Veuillez renseigner l\'itinéraire de la caravane.', 'danger');
        return;
      }
      if (this.selectedDistributeurs.length === 0 && !this.formData.distributeurs_beneficiaires) {
        this.showToast('Veuillez choisir ou ajouter au moins un distributeur bénéficiaire.', 'danger');
        return;
      }
      if (!this.formData.responsable_nom) {
        this.showToast('Veuillez renseigner le nom de l\'animateur sono.', 'danger');
        return;
      }
    } else {
      if (!this.formData.itineraire) {
        this.formData.itineraire = 'Brouillon Caravane - ' + (this.formData.departement || 'Sans lieu');
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
        villages_touches: this.villagesTouches.filter(v => !!v.nom_village_quartier),
      };

      const res = await this.sync.saveAndSync('caravanes', payload, isDraft);
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

