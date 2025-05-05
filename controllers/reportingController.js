import UserTransaction from "../models/UserTransaction.js";

import InterCityTransfer from "../models/InterCityTransfer.js";

import InterUserTransfer from "../models/InterUserTransfer.js";

import CashRegister from "../models/CashRegister.js";

import TontineFeeHistory from "../models/CommissionHistory.js";

import TontineCommissionHistory from "../models/TontineCommissionHistory.js";



// Utilitaire pour période (à adapter à ton projet)

// 🟩 Commissions et taxes INTERVILLE
// export const getCommissionsAndTaxesIntercity = async (req, res) => {
//   try {
//     const { period = "month" } = req.query;
//     const { start, end } = getDateRange(period);

//     const result = await InterCityTransfer.aggregate([
//       {
//         $match: {
//           status: "completed",
//           createdAt: { $gte: start, $lte: end },
//         },
//       },
//       {
//         $lookup: {
//           from: "cities",
//           localField: "receiverCity",
//           foreignField: "_id",
//           as: "cityInfo",
//         },
//       },
//       { $unwind: "$cityInfo" },
//       {
//         $group: {
//           _id: "$cityInfo.name",
//           totalCommission: { $sum: "$commission" },
//           totalTax: { $sum: "$tax" },
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { totalCommission: -1 } },
//     ]);
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("❌ Erreur commission/taxe intercity :", error);
//     res.status(500).json({ msg: "Erreur du serveur" });
//   }
// };


// controllers/reportingController.js



export const getCommissionsAndTaxesIntercity = async (req, res) => {
  try {
    // ⚠️ Aucun filtre sur la période, on prend tout ce qui est "completed"
    const result = await InterCityTransfer.aggregate([
      {
        $match: { status: "completed" },
      },
      {
        $lookup: {
          from: "cities", // Le nom de ta collection MongoDB pour les villes !
          localField: "receiverCity",
          foreignField: "_id",
          as: "cityInfo",
        },
      },
      { $unwind: "$cityInfo" },
      {
        $group: {
          _id: "$cityInfo.name",
          totalCommission: { $sum: "$commission" },
          totalTax: { $sum: "$tax" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCommission: -1 } },
    ]);
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur commission/taxe intercity :", error);
    res.status(500).json({ msg: "Erreur du serveur" });
  }
};


// 🟦 Commissions et taxes ENTRE UTILISATEURS
// export const getCommissionsAndTaxesInteruser = async (req, res) => {
//   try {
//     const { period = "month" } = req.query;
//     const { start, end } = getDateRange(period);

//     const result = await InterUserTransfer.aggregate([
//       {
//         $match: {
//           status: "completed",
//           createdAt: { $gte: start, $lte: end },
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "sender",
//           foreignField: "_id",
//           as: "senderInfo",
//         },
//       },
//       { $unwind: "$senderInfo" },
//       {
//         $lookup: {
//           from: "cities",
//           localField: "senderInfo.city",
//           foreignField: "_id",
//           as: "cityInfo",
//         },
//       },
//       { $unwind: "$cityInfo" },
//       {
//         $group: {
//           _id: "$cityInfo.name",
//           totalCommission: { $sum: "$commission" },
//           totalTax: { $sum: "$tax" },
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { totalCommission: -1 } },
//     ]);
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("❌ Erreur commission/taxe interuser :", error);
//     res.status(500).json({ msg: "Erreur du serveur" });
//   }
// };




export const getCommissionsAndTaxesInteruser = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const { start, end } = getDateRange(period);

    // Agrégation avec gestion des utilisateurs sans ville
    const result = await InterUserTransfer.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "senderInfo",
        },
      },
      { $unwind: "$senderInfo" },
      {
        $lookup: {
          from: "cities",
          localField: "senderInfo.city",
          foreignField: "_id",
          as: "cityInfo",
        },
      },
      {
        // On gère le cas où cityInfo peut être vide (= pas de ville)
        $addFields: {
          cityName: {
            $cond: [
              { $gt: [ { $size: "$cityInfo" }, 0 ] },
              { $arrayElemAt: ["$cityInfo.name", 0] },
              "Utilisateurs sans ville"
            ]
          }
        }
      },
      {
        $group: {
          _id: "$cityName",
          totalCommission: { $sum: "$commission" },
          totalTax: { $sum: "$tax" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCommission: -1 } },
    ]);
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur commission/taxe interuser :", error);
    res.status(500).json({ msg: "Erreur du serveur" });
  }
};


// 🟧 Commissions et taxes TONTINE (en supposant que tu stockes un historique)
export const getCommissionsAndTaxesTontine = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const { start, end } = getDateRange(period);

    const result = await TontineCommissionHistory.aggregate([
      {
        $match: {
          servedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$fraisGestion" },
          totalTax: { $sum: "$taxe" },
          count: { $sum: 1 },
        },
      }
    ]);
    res.status(200).json(result[0] || {
      totalCommission: 0,
      totalTax: 0,
      count: 0,
    });
  } catch (error) {
    console.error("❌ Erreur commission/taxe tontine :", error);
    res.status(500).json({ msg: "Erreur du serveur" });
  }
};






// 🔧 Fonction utilitaire pour les plages de dates
const getDateRange = (period) => {
  const now = new Date();
  let start;

  switch (period) {
    case "day":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      start = new Date(0); // tout
  }

  return { start, end: now };
};


export const getDepositsGroupedByCity = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const { start, end } = getDateRange(period);

    const deposits = await UserTransaction.aggregate([
      // 1. Filtrer les dépôts sur la période
      {
        $match: {
          type: "deposit",
          date: { $gte: start, $lte: end },
        },
      },
      // 2. Lookup sur CashRegister pour trouver le superviseur
      {
        $lookup: {
          from: "cashregisters",
          localField: "cashRegister",
          foreignField: "_id",
          as: "cashRegisterInfo",
        },
      },
      { $unwind: "$cashRegisterInfo" },

      // 3. Lookup sur User pour trouver le superviseur
      {
        $lookup: {
          from: "users",
          localField: "cashRegisterInfo.supervisor",
          foreignField: "_id",
          as: "supervisorInfo",
        },
      },
      { $unwind: "$supervisorInfo" },

      // 4. Lookup sur City pour trouver la ville
      {
        $lookup: {
          from: "cities",
          localField: "supervisorInfo.city",
          foreignField: "_id",
          as: "cityInfo",
        },
      },
      { $unwind: "$cityInfo" },

      // 5. Grouper par ville
      {
        $group: {
          _id: "$cityInfo.name",
          totalDeposits: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },

      // 6. Trier par montant décroissant
      { $sort: { totalDeposits: -1 } },
    ]);

    res.status(200).json(deposits);
  } catch (error) {
    console.error("❌ Erreur lors du reporting des dépôts :", error);
    res.status(500).json({ msg: "Erreur du serveur" });
  }
};




export const getWithdrawalsGroupedByCity = async (req, res) => {
    try {
      const { period = "month" } = req.query;
      const { start, end } = getDateRange(period);
  
      const withdrawals = await UserTransaction.aggregate([
        { $match: { type: "withdrawal", date: { $gte: start, $lte: end } } },
  
        {
          $lookup: {
            from: "cashregisters",
            localField: "cashRegister",
            foreignField: "_id",
            as: "cashRegisterInfo",
          },
        },
        { $unwind: "$cashRegisterInfo" },
  
        {
          $lookup: {
            from: "users",
            localField: "cashRegisterInfo.supervisor",
            foreignField: "_id",
            as: "supervisorInfo",
          },
        },
        { $unwind: "$supervisorInfo" },
  
        {
          $lookup: {
            from: "cities",
            localField: "supervisorInfo.city",
            foreignField: "_id",
            as: "cityInfo",
          },
        },
        { $unwind: "$cityInfo" },
  
        {
          $group: {
            _id: "$cityInfo.name",
            totalWithdrawals: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalWithdrawals: -1 } },
      ]);
  
      res.status(200).json(withdrawals);
    } catch (error) {
      console.error("❌ Erreur lors du reporting des retraits :", error);
      res.status(500).json({ msg: "Erreur du serveur" });
    }
  };

  

  export const getSummaryTransactionsByCity = async (req, res) => {
    try {
      const { period = "month" } = req.query;
      const { start, end } = getDateRange(period);
  
      const summary = await UserTransaction.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end },
            type: { $in: ["deposit", "withdrawal"] },
          },
        },
        {
          $lookup: {
            from: "cashregisters",
            localField: "cashRegister",
            foreignField: "_id",
            as: "cashRegisterInfo",
          },
        },
        { $unwind: "$cashRegisterInfo" },
        {
          $lookup: {
            from: "users",
            localField: "cashRegisterInfo.supervisor",
            foreignField: "_id",
            as: "supervisorInfo",
          },
        },
        { $unwind: "$supervisorInfo" },
        {
          $lookup: {
            from: "cities",
            localField: "supervisorInfo.city",
            foreignField: "_id",
            as: "cityInfo",
          },
        },
        { $unwind: "$cityInfo" },
  
        {
          $group: {
            _id: {
              city: "$cityInfo.name",
              type: "$type",
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
  
        {
          $group: {
            _id: "$_id.city",
            deposits: {
              $sum: {
                $cond: [{ $eq: ["$_id.type", "deposit"] }, "$total", 0],
              },
            },
            withdrawals: {
              $sum: {
                $cond: [{ $eq: ["$_id.type", "withdrawal"] }, "$total", 0],
              },
            },
            totalTransactions: { $sum: "$count" },
          },
        },
        { $sort: { deposits: -1 } },
      ]);
  
      res.status(200).json(summary);
    } catch (error) {
      console.error("❌ Erreur reporting résumé :", error);
      res.status(500).json({ msg: "Erreur du serveur" });
    }
  };
  


  export const getCommissionsAndTaxesByCity = async (req, res) => {
    try {
      const { period = "month" } = req.query;
      const { start, end } = getDateRange(period);
  
      const result = await UserTransaction.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end },
            applyCommission: true,
          },
        },
        {
          $lookup: {
            from: "cashregisters",
            localField: "cashRegister",
            foreignField: "_id",
            as: "cashRegisterInfo",
          },
        },
        { $unwind: "$cashRegisterInfo" },
        {
          $lookup: {
            from: "users",
            localField: "cashRegisterInfo.supervisor",
            foreignField: "_id",
            as: "supervisorInfo",
          },
        },
        { $unwind: "$supervisorInfo" },
        {
          $lookup: {
            from: "cities",
            localField: "supervisorInfo.city",
            foreignField: "_id",
            as: "cityInfo",
          },
        },
        { $unwind: "$cityInfo" },
  
        {
          $group: {
            _id: "$cityInfo.name",
            totalCommission: { $sum: "$commissionAmount" },
            totalTax: { $sum: "$taxAmount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalCommission: -1 } },
      ]);
  
      res.status(200).json(result);
    } catch (error) {
      console.error("❌ Erreur commission/taxe :", error);
      res.status(500).json({ msg: "Erreur du serveur" });
    }
  };
  





export const getInterCityTransfersByReceiverCity = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const { start, end } = getDateRange(period);

    const result = await InterCityTransfer.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "cities",
          localField: "receiverCity",
          foreignField: "_id",
          as: "cityInfo",
        },
      },
      { $unwind: "$cityInfo" },
      {
        $group: {
          _id: "$cityInfo.name",
          totalTransfers: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalTransfers: -1 } },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur reporting interville par ville :", error);
    res.status(500).json({ msg: "Erreur du serveur." });
  }
};




export const getInterCityTransfersBySupervisor = async (req, res) => {
    try {
      const { period = "month" } = req.query;
      const { start, end } = getDateRange(period);
  
      const result = await InterCityTransfer.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $lookup: {
            from: "users", // relie à l'utilisateur caissier
            localField: "createdBy",
            foreignField: "_id",
            as: "cashierInfo",
          },
        },
        { $unwind: "$cashierInfo" },
        {
          $lookup: {
            from: "users", // relie au superviseur
            localField: "cashierInfo.supervisor",
            foreignField: "_id",
            as: "supervisorInfo",
          },
        },
        { $unwind: "$supervisorInfo" },
        {
          $group: {
            _id: "$supervisorInfo.name",
            totalTransfers: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalTransfers: -1 } },
      ]);
      
  
      res.status(200).json(result);
    } catch (error) {
      console.error("❌ Erreur reporting interville superviseur :", error);
      res.status(500).json({ msg: "Erreur serveur." });
    }
  };

  




export const getAllInterUserTransfers = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const { start, end } = getDateRange(period);

    const transfers = await InterUserTransfer.find({
      status: "completed",
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name phone city")
      .populate("receiver", "name phone city");

    res.status(200).json(transfers);
  } catch (error) {
    console.error("❌ Erreur reporting user-to-user :", error);
    res.status(500).json({ msg: "Erreur du serveur" });
  }
};






export const getOpenCashRegisters = async (req, res) => {
  try {
    const registers = await CashRegister.find({ status: "open" })
      .populate({
        path: "cashier",
        select: "name city",
        populate: { path: "city", select: "name" }
      })
      .sort({ openedAt: -1 });

    res.status(200).json(registers);
  } catch (error) {
    console.error("❌ Erreur reporting ouvertures de caisse :", error);
    res.status(500).json({ msg: "Erreur du serveur" });
  }
};





// Fonction pour renvoyer tous les transferts interville
export const getAllInterCityTransfers = async (req, res) => {
  try {
    // Optionnel : filtrage par période, si tu veux un tableau mensuel/annuel
    // (Sinon, retire cette partie et renvoie tout)
    const { period = "month" } = req.query;
    const { start, end } = getDateRange(period); // à adapter si tu utilises une utilitaire

    const transfers = await InterCityTransfer.find(
      period
        ? { createdAt: { $gte: start, $lte: end } }
        : {}
    )
      .populate("receiverCity", "name")
      .populate("createdBy", "name phone role"); // Optionnel : infos du créateur

    res.status(200).json(transfers);
  } catch (error) {
    console.error("❌ Erreur getAllInterCityTransfers :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};
