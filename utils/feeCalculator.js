import { COMMISSION_RULES, TAX_RATE, APPLY_COMMISSIONS_AND_TAXES } from "../config/commissionConfig.js";

// ✅ Fonction de calcul des frais (commission et taxe)
export const calculateFees = (amount) => {
  if (!APPLY_COMMISSIONS_AND_TAXES || amount <= 0) {
    console.log("🔹 [FEE CALCULATOR] Commission et taxe désactivées ou montant invalide.");
    return { commission: 0, tax: 0 };
  }

  // 🔍 Trouver la commission applicable
  const rule = COMMISSION_RULES.find((r) => amount >= r.min && amount <= r.max);
  const commission = rule ? rule.commission : 0;
  const tax = commission * TAX_RATE;

  console.log(`✅ [FEE CALCULATOR] Montant: ${amount} | Commission: ${commission} | Taxe: ${tax.toFixed(2)}`);

  return { commission, tax };
};
