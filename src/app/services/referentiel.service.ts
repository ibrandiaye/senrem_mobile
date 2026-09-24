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

  // Référentiel des 14 régions du Sénégal avec départements et communes
  private defaultRegions: RegionData[] = [
    {
      id: 1, code: 'DK', nom: 'Dakar',
      departements: [
        { id: 1, nom: 'Dakar', communes: [{ id: 1, nom: 'Plateau' }, { id: 2, nom: 'Médina' }, { id: 3, nom: 'Grand Dakar' }, { id: 4, nom: 'Parcelles Assainies' }, { id: 5, nom: 'Almadies' }, { id: 6, nom: 'Ouakam' }, { id: 7, nom: 'Ngor' }, { id: 8, nom: 'Yoff' }] },
        { id: 2, nom: 'Pikine', communes: [{ id: 9, nom: 'Pikine Nord' }, { id: 10, nom: 'Pikine Ouest' }, { id: 11, nom: 'Pikine Est' }, { id: 12, nom: 'Thiaroye' }, { id: 13, nom: 'Mbao' }] },
        { id: 3, nom: 'Guédiawaye', communes: [{ id: 14, nom: 'Golf Sud' }, { id: 15, nom: 'Sam Notaire' }, { id: 16, nom: 'Ndiarème Limamoulaye' }, { id: 17, nom: 'Wakhinane Nimzatt' }] },
        { id: 4, nom: 'Rufisque', communes: [{ id: 18, nom: 'Rufisque Est' }, { id: 19, nom: 'Rufisque Ouest' }, { id: 20, nom: 'Rufisque Nord' }, { id: 21, nom: 'Bargny' }, { id: 22, nom: 'Sébikotane' }, { id: 23, nom: 'Diamniadio' }] },
        { id: 5, nom: 'Keur Massar', communes: [{ id: 24, nom: 'Keur Massar Nord' }, { id: 25, nom: 'Keur Massar Sud' }, { id: 26, nom: 'Malika' }, { id: 27, nom: 'Yeumbeul Nord' }, { id: 28, nom: 'Yeumbeul Sud' }] }
      ]
    },
    {
      id: 2, code: 'TH', nom: 'Thiès',
      departements: [
        { id: 6, nom: 'Thiès', communes: [{ id: 29, nom: 'Thiès Ville' }, { id: 30, nom: 'Khombole' }, { id: 31, nom: 'Pout' }, { id: 32, nom: 'Fandène' }, { id: 33, nom: 'Kayar' }] },
        { id: 7, nom: 'Mbour', communes: [{ id: 34, nom: 'Mbour Ville' }, { id: 35, nom: 'Saly Portudal' }, { id: 36, nom: 'Nguékhokh' }, { id: 37, nom: 'Joal-Fadiouth' }, { id: 38, nom: 'Popenguine' }, { id: 39, nom: 'Sindia' }] },
        { id: 8, nom: 'Tivaouane', communes: [{ id: 40, nom: 'Tivaouane Ville' }, { id: 41, nom: 'Méouane' }, { id: 42, nom: 'Mékhé' }, { id: 43, nom: 'Pékesse' }, { id: 44, nom: 'Pire Goureye' }] }
      ]
    },
    {
      id: 3, code: 'DB', nom: 'Diourbel',
      departements: [
        { id: 9, nom: 'Diourbel', communes: [{ id: 45, nom: 'Diourbel Ville' }, { id: 46, nom: 'Ndindy' }, { id: 47, nom: 'Ndoulo' }] },
        { id: 10, nom: 'Bambey', communes: [{ id: 48, nom: 'Bambey Ville' }, { id: 49, nom: 'Baba Garage' }, { id: 50, nom: 'Lambaye' }, { id: 51, nom: 'Ngoye' }] },
        { id: 11, nom: 'Mbacké', communes: [{ id: 52, nom: 'Mbacké Ville' }, { id: 53, nom: 'Touba Mosquée' }, { id: 54, nom: 'Dalla Ngabou' }, { id: 55, nom: 'Kael' }] }
      ]
    },
    {
      id: 4, code: 'FK', nom: 'Fatick',
      departements: [
        { id: 12, nom: 'Fatick', communes: [{ id: 56, nom: 'Fatick Ville' }, { id: 57, nom: 'Diofior' }, { id: 58, nom: 'Diakhao' }, { id: 59, nom: 'Fimela' }, { id: 60, nom: 'Niakhar' }] },
        { id: 13, nom: 'Foundiougne', communes: [{ id: 61, nom: 'Foundiougne Ville' }, { id: 62, nom: 'Passy' }, { id: 63, nom: 'Sokone' }, { id: 64, nom: 'Toubacouta' }, { id: 65, nom: 'Djilor' }] },
        { id: 14, nom: 'Gossas', communes: [{ id: 66, nom: 'Gossas Ville' }, { id: 67, nom: 'Colobane' }, { id: 68, nom: 'Mbar' }, { id: 69, nom: 'Ouadiour' }] }
      ]
    },
    {
      id: 5, code: 'KL', nom: 'Kaolack',
      departements: [
        { id: 15, nom: 'Kaolack', communes: [{ id: 70, nom: 'Kaolack Ville' }, { id: 71, nom: 'Kahone' }, { id: 72, nom: 'Ndoffane' }, { id: 73, nom: 'Latmingué' }] },
        { id: 16, nom: 'Guinguinéo', communes: [{ id: 74, nom: 'Guinguinéo Ville' }, { id: 75, nom: 'Fass' }, { id: 76, nom: 'Mboss' }] },
        { id: 17, nom: 'Nioro du Rip', communes: [{ id: 77, nom: 'Nioro Ville' }, { id: 78, nom: 'Keur Madiabel' }, { id: 79, nom: 'Medina Sabakh' }, { id: 80, nom: 'Paoskoto' }, { id: 81, nom: 'Porokhane' }] }
      ]
    },
    {
      id: 6, code: 'KF', nom: 'Kaffrine',
      departements: [
        { id: 18, nom: 'Kaffrine', communes: [{ id: 82, nom: 'Kaffrine Ville' }, { id: 83, nom: 'Nganda' }, { id: 84, nom: 'Diamagadio' }] },
        { id: 19, nom: 'Birkelane', communes: [{ id: 85, nom: 'Birkelane Ville' }, { id: 86, nom: 'Mabo' }] },
        { id: 20, nom: 'Koungheul', communes: [{ id: 87, nom: 'Koungheul Ville' }, { id: 88, nom: 'Ida Mouride' }, { id: 89, nom: 'Lour Escale' }] },
        { id: 21, nom: 'Malem Hodar', communes: [{ id: 90, nom: 'Malem Hodar Ville' }, { id: 91, nom: 'Darou Minam' }] }
      ]
    },
    {
      id: 7, code: 'LG', nom: 'Louga',
      departements: [
        { id: 22, nom: 'Louga', communes: [{ id: 92, nom: 'Louga Ville' }, { id: 93, nom: 'Coki' }, { id: 94, nom: 'Sakal' }] },
        { id: 23, nom: 'Kébémer', communes: [{ id: 95, nom: 'Kébémer Ville' }, { id: 96, nom: 'Darou Mousty' }, { id: 97, nom: 'Guéoul' }] },
        { id: 24, nom: 'Linguère', communes: [{ id: 98, nom: 'Linguère Ville' }, { id: 99, nom: 'Dahra' }, { id: 100, nom: 'Barkedji' }] }
      ]
    },
    {
      id: 8, code: 'SL', nom: 'Saint-Louis',
      departements: [
        { id: 25, nom: 'Saint-Louis', communes: [{ id: 101, nom: 'Saint-Louis Ville' }, { id: 102, nom: 'Mpal' }] },
        { id: 26, nom: 'Dagana', communes: [{ id: 103, nom: 'Dagana Ville' }, { id: 104, nom: 'Richard-Toll' }, { id: 105, nom: 'Ross Béthio' }] },
        { id: 27, nom: 'Podor', communes: [{ id: 106, nom: 'Podor Ville' }, { id: 107, nom: 'Ndioum' }, { id: 108, nom: 'Guédé Chantier' }] }
      ]
    },
    {
      id: 9, code: 'MT', nom: 'Matam',
      departements: [
        { id: 28, nom: 'Matam', communes: [{ id: 109, nom: 'Matam Ville' }, { id: 110, nom: 'Ourossogui' }, { id: 111, nom: 'Ogo' }] },
        { id: 29, nom: 'Kanel', communes: [{ id: 112, nom: 'Kanel Ville' }, { id: 113, nom: 'Semmé' }] },
        { id: 30, nom: 'Ranérou Ferlo', communes: [{ id: 114, nom: 'Ranérou Ville' }] }
      ]
    },
    {
      id: 10, code: 'TC', nom: 'Tambacounda',
      departements: [
        { id: 31, nom: 'Tambacounda', communes: [{ id: 115, nom: 'Tambacounda Ville' }, { id: 116, nom: 'Missirah' }, { id: 117, nom: 'Dialacoto' }] },
        { id: 32, nom: 'Bakel', communes: [{ id: 118, nom: 'Bakel Ville' }, { id: 119, nom: 'Kidira' }] },
        { id: 33, nom: 'Goudiry', communes: [{ id: 120, nom: 'Goudiry Ville' }] },
        { id: 34, nom: 'Koumpentoum', communes: [{ id: 121, nom: 'Koumpentoum Ville' }] }
      ]
    },
    {
      id: 11, code: 'KD', nom: 'Kédougou',
      departements: [
        { id: 35, nom: 'Kédougou', communes: [{ id: 122, nom: 'Kédougou Ville' }, { id: 123, nom: 'Dindéfélo' }] },
        { id: 36, nom: 'Salémata', communes: [{ id: 124, nom: 'Salémata Ville' }] },
        { id: 37, nom: 'Saraya', communes: [{ id: 125, nom: 'Saraya Ville' }, { id: 126, nom: 'Sabodala' }] }
      ]
    },
    {
      id: 12, code: 'KL2', nom: 'Kolda',
      departements: [
        { id: 38, nom: 'Kolda', communes: [{ id: 127, nom: 'Kolda Ville' }, { id: 128, nom: 'Dabo' }, { id: 129, nom: 'Salikégné' }] },
        { id: 39, nom: 'Médina Yoro Foulah', communes: [{ id: 130, nom: 'Médina Yoro Foulah Ville' }] },
        { id: 40, nom: 'Vélingara', communes: [{ id: 131, nom: 'Vélingara Ville' }, { id: 132, nom: 'Diaobé-Kabendou' }] }
      ]
    },
    {
      id: 13, code: 'SD', nom: 'Sédhiou',
      departements: [
        { id: 41, nom: 'Sédhiou', communes: [{ id: 133, nom: 'Sédhiou Ville' }, { id: 134, nom: 'Marsassoum' }] },
        { id: 42, nom: 'Bounkiling', communes: [{ id: 135, nom: 'Bounkiling Ville' }, { id: 136, nom: 'Madina Wandifa' }] },
        { id: 43, nom: 'Goudomp', communes: [{ id: 137, nom: 'Goudomp Ville' }, { id: 138, nom: 'Tanaff' }] }
      ]
    },
    {
      id: 14, code: 'ZG', nom: 'Ziguinchor',
      departements: [
        { id: 44, nom: 'Ziguinchor', communes: [{ id: 139, nom: 'Ziguinchor Ville' }, { id: 140, nom: 'Niaguis' }, { id: 141, nom: 'Enampore' }] },
        { id: 45, nom: 'Bignona', communes: [{ id: 142, nom: 'Bignona Ville' }, { id: 143, nom: 'Thionck Essyl' }, { id: 144, nom: 'Diouloulou' }] },
        { id: 46, nom: 'Oussouye', communes: [{ id: 145, nom: 'Oussouye Ville' }, { id: 146, nom: 'Cap Skirring' }, { id: 147, nom: 'Mlomp' }] }
      ]
    }
  ];

  constructor(private storage: StorageService) {}

  getRegions(): RegionData[] {
    const cached = this.storage.getCache<RegionData[]>('regions');
    return cached && cached.length ? cached : this.defaultRegions;
  }

  getDepartements(nomRegion: string): DepartementData[] {
    const region = this.getRegions().find(r => r.nom === nomRegion);
    return region ? region.departements : [];
  }

  getCommunes(nomRegion: string, nomDepartement: string): CommuneData[] {
    const depts = this.getDepartements(nomRegion);
    const dept = depts.find(d => d.nom === nomDepartement);
    return dept ? dept.communes : [];
  }

  getFoyerTypes(): FoyerModel[] {
    const cached = this.storage.getCache<FoyerModel[]>('foyer_types');
    return cached && cached.length ? cached : this.defaultFoyers;
  }

  updateReferentiels(regions: RegionData[], foyers: FoyerModel[]) {
    if (regions && regions.length) {
      this.storage.setCache('regions', regions);
    }
    if (foyers && foyers.length) {
      this.storage.setCache('foyer_types', foyers);
    }
  }
}
