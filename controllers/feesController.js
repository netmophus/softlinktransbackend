import { calculateFees } from "../utils/feeCalculator.js";

export const getFees = (req, res) => {
  const { amount } = req.body;

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ msg: "Montant invalide." });
  }

  const fees = calculateFees(numericAmount);
  res.status(200).json(fees);
};
