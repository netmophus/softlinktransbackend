import { COMMISSION_RULES, TAX_RATE, APPLY_COMMISSIONS_AND_TAXES } from "../config/commissionConfig.js";

export const calculateCommission = (amount) => {
  if (!APPLY_COMMISSIONS_AND_TAXES) {
    return { commission: 0, tax: 0 }; // ✅ Si désactivé, pas de commission ni taxe
  }

  const rule = COMMISSION_RULES.find(rule => amount >= rule.min && amount <= rule.max);
  if (!rule) {
    throw new Error("Montant hors des limites des commissions définies.");
  }

  const commission = rule.commission;
  const tax = commission * TAX_RATE;
  return { commission, tax };
};
