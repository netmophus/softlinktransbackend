export const COMMISSION_RULES = [
    { min: 0, max: 5000, commission: 50 },
    { min: 5001, max: 10000, commission: 80 },
    { min: 10001, max: 25000, commission: 200 },
    { min: 25001, max: 50000, commission: 400 },
    { min: 50001, max: 100000, commission: 800 },
    { min: 100001, max: 250000, commission: 2000 },
    { min: 250001, max: 500000, commission: 4000 },
    { min: 500001, max: 1000000, commission: 8000 },
    { min: 1000001, max: 2000000, commission: 16000 },
  ];
  
  export const TAX_RATE = 0.10; // 🔹 Taxe de 19% appliquée à la commission
  
  // ✅ Activation/Désactivation globale
  export const APPLY_COMMISSIONS_AND_TAXES = true; // Mettre `false` pour les désactiver
  