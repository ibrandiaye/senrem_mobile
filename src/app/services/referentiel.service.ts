import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

export interface FoyerModel {
  id: number;
  code: string;
  nom: string;
  combustible: string;
  capacite_kg: string;
}

export interface RegionData {
  id: number;
  code: string;
  nom: string;
  departements: DepartementData[];
}

export interface DepartementData {
  id: number;
  nom: string;
  communes: CommuneData[];
}

export interface CommuneData {
  id: number;
  nom: string;
}

export interface DistributeurData {
  id: number;
  nom: string;
  telephone: string;
  statut: string;
  commune_id: number;
  commune_nom: string;
  departement_nom?: string;
  region_nom?: string;
  village_quartier?: string;
}

export interface AnimateurData {
  id: number;
  nom: string;
  region: string;
  role?: string;
  telephone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReferentielService {
  // Les 10 modèles officiels de Foyers Améliorés
  private defaultFoyers: FoyerModel[] = [
    { id: 1, code: 'JAMBAR_JEEG_CHARBON_4KG', nom: 'Jambar simple / Tak si Rip JEEG (CHARBON-KERIGNE) 4kg', combustible: 'Charbon', capacite_kg: '4 kg' },
    { id: 2, code: 'JAMBAR_JABOOT_CHARBON_7KG', nom: 'Jambar simple / Tak Si Rip JABOOT (CHARBON-KERIGNE) 7 kg', combustible: 'Charbon', capacite_kg: '7 kg' },
    { id: 3, code: 'JAMBAR_JONGOMA_CHARBON_10KG', nom: 'Jambar simple JONGOMA (CHARBON-KERIGNE) 10 kg', combustible: 'Charbon', capacite_kg: '10 kg' },
    { id: 4, code: 'TAKSIRIP_JONGOMA_CHARBON_15KG', nom: 'Tak Si Rip JONGOMA (CHARBON-KERIGNE) 15 kg', combustible: 'Charbon', capacite_kg: '15 kg' },
    { id: 5, code: 'JAMBAR_JEEG_BOIS_4KG', nom: 'Jambar JEEG (BOIS-MATT) 4 kg', combustible: 'Bois', capacite_kg: '4 kg' },
    { id: 6, code: 'JAMBAR_JABOOT_BOIS_7KG', nom: 'Jambar JABOOT (BOIS-MATT) 7 kg', combustible: 'Bois', capacite_kg: '7 kg' },
    { id: 7, code: 'JAMBAR_JONGOMA_BOIS_10KG', nom: 'Jambar JONGOMA (BOIS-MATT) 10 kg', combustible: 'Bois', capacite_kg: '10 kg' },
    { id: 8, code: 'TAARU_CHARBON_7KG', nom: 'TAARU (CHARBON) 7 kg', combustible: 'Charbon', capacite_kg: '7 kg' },
    { id: 9, code: 'SAKKANAL_MULTI_4_7KG', nom: 'Sakkanal multi marmites (Charbon et bois) 4 à 7 kg', combustible: 'Bois/Charbon', capacite_kg: '4 à 7 kg' },
    { id: 10, code: 'SAKKANAL_MONO_7KG', nom: 'Sakkanal mono marmites (Charbon et bois) 7 kg', combustible: 'Bois/Charbon', capacite_kg: '7 kg' },
  ];

  // Référentiel officiel exhaustif des 2 régions SENRM (Tambacounda 60%, Kédougou 40%) : 7 Départements et 65 Communes
  private defaultRegions: RegionData[] = [
    {
      id: 10, code: 'TC', nom: 'Tambacounda',
      departements: [
        {
          id: 31, nom: 'Tambacounda',
          communes: [
            { id: 174, nom: 'Tambacounda' }, { id: 175, nom: 'Koussanar' }, { id: 176, nom: 'Makacolibantang' }, { id: 177, nom: 'Missirah' },
            { id: 178, nom: 'Dialacoto' }, { id: 272, nom: 'Sinthiou Malème' }, { id: 273, nom: 'Ndoga Babacar' }, { id: 274, nom: 'Néttéboulou' },
            { id: 275, nom: 'Niani Toucouleur' },
          ]
        },
        {
          id: 32, nom: 'Bakel',
          communes: [
            { id: 179, nom: 'Bakel' }, { id: 180, nom: 'Diawara' }, { id: 181, nom: 'Kidira' }, { id: 182, nom: 'Bélé' },
            { id: 183, nom: 'Gathiary' }, { id: 184, nom: 'Moudéry' }, { id: 185, nom: 'Sadatou' }, { id: 276, nom: 'Gabou' },
            { id: 277, nom: 'Ballou' }, { id: 278, nom: 'Madina Foulbé' }, { id: 279, nom: 'Sinthiou Fissa' }, { id: 280, nom: 'Toumboura' },
          ]
        },
        {
          id: 33, nom: 'Goudiry',
          communes: [
            { id: 186, nom: 'Goudiry' }, { id: 187, nom: 'Bala' }, { id: 188, nom: 'Boynguel Bamba' }, { id: 189, nom: 'Dianké Makha' },
            { id: 190, nom: 'Koar' }, { id: 191, nom: 'Kothiary' }, { id: 281, nom: 'Bani Israël' }, { id: 282, nom: 'Dougué' },
            { id: 283, nom: 'Koulor' }, { id: 284, nom: 'Sinthiou Mamadou Boubou' }, { id: 285, nom: 'Komoti' }, { id: 286, nom: 'Koussan' },
            { id: 287, nom: 'Goumbayel' }, { id: 288, nom: 'Sinthiou Bocar Aly' }, { id: 289, nom: 'Boutoucoufara' },
          ]
        },
        {
          id: 34, nom: 'Koumpentoum',
          communes: [
            { id: 192, nom: 'Koumpentoum' }, { id: 193, nom: 'Malem Niani' }, { id: 194, nom: 'Bamba Thialène' }, { id: 195, nom: 'Kouthiaba Wolof' },
            { id: 196, nom: 'Pass Koto' }, { id: 290, nom: 'Kahène' }, { id: 291, nom: 'Mérétou' }, { id: 292, nom: 'Kouthia Guaydi' },
            { id: 293, nom: 'Ndamé' }, { id: 294, nom: 'Payar' },
          ]
        },
      ]
    },
    {
      id: 11, code: 'KD', nom: 'Kédougou',
      departements: [
        {
          id: 35, nom: 'Kédougou',
          communes: [
            { id: 197, nom: 'Kédougou' }, { id: 198, nom: 'Bandafassi' }, { id: 199, nom: 'Dindéfélo' }, { id: 200, nom: 'Fongolimbi' },
            { id: 201, nom: 'Ninéfécha' }, { id: 295, nom: 'Dimboli' }, { id: 296, nom: 'Tomboronkoto' },
          ]
        },
        {
          id: 36, nom: 'Salémata',
          communes: [
            { id: 202, nom: 'Salémata' }, { id: 203, nom: 'Dakateli' }, { id: 204, nom: 'Kévoye' }, { id: 205, nom: 'Oubadji' },
            { id: 297, nom: 'Dar Salam' }, { id: 298, nom: 'Ethiolo' },
          ]
        },
        {
          id: 37, nom: 'Saraya',
          communes: [
            { id: 206, nom: 'Saraya' }, { id: 207, nom: 'Bembou' }, { id: 208, nom: 'Khossanto' }, { id: 209, nom: 'Médina Baffé' },
            { id: 210, nom: 'Sabodala' }, { id: 299, nom: 'Missirah Sirimana' },
          ]
        },
      ]
    }
  ];

  private defaultDistributeurs: DistributeurData[] = [
    { id: 1, nom: 'Moussa Tamba Diouf', telephone: '+221 77 123 45 67', statut: 'LME', commune_id: 174, commune_nom: 'Tambacounda', departement_nom: 'Tambacounda', region_nom: 'Tambacounda', village_quartier: 'Quartier Dépôt' },
    { id: 2, nom: 'Aïssatou Ba', telephone: '+221 78 234 56 78', statut: 'GPF', commune_id: 174, commune_nom: 'Tambacounda', departement_nom: 'Tambacounda', region_nom: 'Tambacounda', village_quartier: 'Médinacoura' },
    { id: 3, nom: 'Ousmane Traoré', telephone: '+221 76 345 67 89', statut: 'Grossiste', commune_id: 175, commune_nom: 'Koussanar', departement_nom: 'Tambacounda', region_nom: 'Tambacounda', village_quartier: 'Koussanar Centre' },
    { id: 4, nom: 'Mamadou Sow', telephone: '+221 77 456 78 90', statut: 'LME', commune_id: 179, commune_nom: 'Bakel', departement_nom: 'Bakel', region_nom: 'Tambacounda', village_quartier: 'Bakel Escale' },
    { id: 5, nom: 'Fatou Danfakha', telephone: '+221 77 567 89 01', statut: 'GPF', commune_id: 197, commune_nom: 'Kédougou', departement_nom: 'Kédougou', region_nom: 'Kédougou', village_quartier: 'Dandé Mayo' },
    { id: 6, nom: 'Mamadou Baldé', telephone: '+221 77 555 12 34', statut: 'LME', commune_id: 206, commune_nom: 'Saraya', departement_nom: 'Saraya', region_nom: 'Kédougou', village_quartier: 'Saraya Ville' },
    { id: 7, nom: 'Demba Cissé', telephone: '+221 77 888 99 00', statut: 'Autre détaillant', commune_id: 202, commune_nom: 'Salémata', departement_nom: 'Salémata', region_nom: 'Kédougou', village_quartier: 'Salémata Marché' },
  ];

  constructor(private storage: StorageService) {}

  getRegions(): RegionData[] {
    const cached = this.storage.getCache<RegionData[]>('regions');
    return cached && cached.length ? cached : this.defaultRegions;
  }

  getDepartements(nomRegion: string): DepartementData[] {
    if (!nomRegion) return [];
    const regions = this.getRegions();
    const normTarget = this.cleanCommuneName(nomRegion);
    const region = regions.find(r => r.nom === nomRegion || this.cleanCommuneName(r.nom) === normTarget);
    return region ? region.departements : [];
  }

  getCommunes(nomRegion: string, nomDepartement: string): CommuneData[] {
    if (!nomDepartement) return [];
    const depts = this.getDepartements(nomRegion);
    const normDept = this.cleanCommuneName(nomDepartement);
    const dept = depts.find(d => d.nom === nomDepartement || this.cleanCommuneName(d.nom) === normDept);
    return dept ? dept.communes : [];
  }

  getCommunesByRegion(nomRegion: string): CommuneData[] {
    const depts = this.getDepartements(nomRegion);
    const list: CommuneData[] = [];
    for (const d of depts) {
      if (d.communes) {
        list.push(...d.communes);
      }
    }
    return list;
  }

  getFoyerTypes(): FoyerModel[] {
    const cached = this.storage.getCache<FoyerModel[]>('foyer_types');
    return cached && cached.length ? cached : this.defaultFoyers;
  }

  getDistributeurs(): DistributeurData[] {
    const cached = this.storage.getCache<DistributeurData[]>('distributeurs');
    return cached && cached.length ? cached : this.defaultDistributeurs;
  }

  /**
   * Normalise un nom de commune pour la comparaison hors-ligne en retirant le mot 'Ville'
   */
  cleanCommuneName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(ville|commune de|commune d'|commune)\b/gi, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Retourne les distributeurs affiliés à une commune en cascade (Région -> Département -> Commune)
   */
  getDistributeursByCommune(nomCommune: string, nomRegion?: string, nomDepartement?: string): DistributeurData[] {
    if (!nomCommune) return [];
    const targetNorm = this.cleanCommuneName(nomCommune);
    const regionNorm = nomRegion ? this.cleanCommuneName(nomRegion) : '';
    const deptNorm = nomDepartement ? this.cleanCommuneName(nomDepartement) : '';

    // Identifier l'ID de la commune dans la hiérarchie Région -> Département -> Commune si disponible
    let targetCommuneId: number | null = null;
    if (nomRegion && nomDepartement) {
      const communes = this.getCommunes(nomRegion, nomDepartement);
      const foundCommune = communes.find(
        c => c.nom === nomCommune || this.cleanCommuneName(c.nom) === targetNorm
      );
      if (foundCommune) {
        targetCommuneId = foundCommune.id;
      }
    }

    const all = this.getDistributeurs();

    return all.filter(d => {
      // Filtrage par région si renseignée sur le distributeur
      if (regionNorm && d.region_nom) {
        const dRegNorm = this.cleanCommuneName(d.region_nom);
        if (dRegNorm && dRegNorm !== regionNorm && !dRegNorm.includes(regionNorm) && !regionNorm.includes(dRegNorm)) {
          return false;
        }
      }

      // Filtrage par département si renseigné sur le distributeur
      if (deptNorm && d.departement_nom) {
        const dDeptNorm = this.cleanCommuneName(d.departement_nom);
        if (dDeptNorm && dDeptNorm !== deptNorm && !dDeptNorm.includes(deptNorm) && !deptNorm.includes(dDeptNorm)) {
          return false;
        }
      }

      // Correspondance directe par ID de commune si disponible
      if (targetCommuneId !== null && d.commune_id === targetCommuneId) {
        return true;
      }

      if (!d.commune_nom) return false;
      const dNorm = this.cleanCommuneName(d.commune_nom);
      return dNorm === targetNorm || 
             d.commune_nom.toLowerCase() === nomCommune.toLowerCase() ||
             (targetNorm !== '' && (dNorm.includes(targetNorm) || targetNorm.includes(dNorm)));
    });
  }

  // Répertoire des animateurs par région
  private defaultAnimateurs: AnimateurData[] = [
    { id: 1, nom: 'Moussa Tamba', region: 'Tambacounda', role: 'animateur', telephone: '771234567' },
    { id: 2, nom: 'Fatou Ndiaye', region: 'Tambacounda', role: 'animateur', telephone: '772345678' },
    { id: 3, nom: 'Ibrahima Diallo', region: 'Tambacounda', role: 'animateur', telephone: '773456789' },
    { id: 4, nom: 'Ousmane Danfakha', region: 'Kédougou', role: 'animateur', telephone: '774567890' },
    { id: 5, nom: 'Aïssatou Cissé', region: 'Kédougou', role: 'animateur', telephone: '775678901' },
    { id: 6, nom: 'Mamadou Ba', region: 'Kédougou', role: 'animateur', telephone: '776789012' },
    { id: 7, nom: 'Superviseur National', region: 'Kaolack', role: 'superviseur', telephone: '777890123' },
    { id: 8, nom: 'Animateur Relais 1', region: 'Thiès', role: 'animateur', telephone: '778901234' },
    { id: 9, nom: 'Animateur Relais 2', region: 'Fatick', role: 'animateur', telephone: '779012345' },
  ];

  getAnimateurs(): AnimateurData[] {
    const cached = this.storage.getCache<AnimateurData[]>('animateurs');
    return cached && cached.length ? cached : this.defaultAnimateurs;
  }

  /**
   * Retourne la liste des animateurs d'une région donnée
   */
  getAnimateursByRegion(nomRegion: string): AnimateurData[] {
    if (!nomRegion) return this.getAnimateurs();
    const all = this.getAnimateurs();
    const regionNorm = nomRegion.toLowerCase().trim();
    const filtered = all.filter(a => a.region && a.region.toLowerCase().includes(regionNorm));
    return filtered.length ? filtered : all;
  }

  updateReferentiels(regions: RegionData[], foyers: FoyerModel[], distributeurs?: DistributeurData[], animateurs?: AnimateurData[]) {
    if (regions && regions.length) {
      this.storage.setCache('regions', regions);
    }
    if (foyers && foyers.length) {
      this.storage.setCache('foyer_types', foyers);
    }
    if (distributeurs && distributeurs.length) {
      this.storage.setCache('distributeurs', distributeurs);
    }
    if (animateurs && animateurs.length) {
      this.storage.setCache('animateurs', animateurs);
    }
  }
}
