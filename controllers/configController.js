import { COMMISSION_RULES, TAX_RATE } from "../config/commissionConfig.js";

export const getCommissionConfig = (req, res) => {
  res.json({
    commissionRules: COMMISSION_RULES,
    taxRate: TAX_RATE,
  });
};
