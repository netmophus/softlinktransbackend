import CommissionHistory from "../models/CommissionHistory.js";
import { getDateRange } from "../utils/dateUtils.js";
import InterCityTransfer from "../models/InterCityTransfer.js";
import InterUserTransfer from "../models/InterUserTransfer.js";
import TontineCommissionHistory from "../models/TontineCommissionHistory.js";


// Récupérer toutes les commissions
export const getAllCommissions = async (req, res) => {
  try {
    const data = await CommissionHistory.find()
      .populate("user", "name phone")
      .populate("city", "name")
      .sort({ date: -1 });
    res.json(data);
  } catch (error) {
    console.error("Erreur getAllCommissions :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};

// Détail d’une commission
export const getCommissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const commission = await CommissionHistory.findById(id)
      .populate("user", "name phone")
      .populate("city", "name");
    if (!commission) return res.status(404).json({ msg: "Commission non trouvée." });
    res.json(commission);
  } catch (error) {
    console.error("Erreur getCommissionById :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};

// // Reporting global : agrégation par ville/type/période
// export const getCommissionsReport = async (req, res) => {
//   try {
//     const { period = "month", type } = req.query;

//     // Option : appliquer ton utilitaire getDateRange si tu veux filtrer sur la période
//     // ex: const { start, end } = getDateRange(period);
//     // puis ajouter: date: { $gte: start, $lte: end }

//     let match = {};
//     if (type) match.transactionType = type;

//     const data = await CommissionHistory.aggregate([
//       { $match: match },
//       {
//         $lookup: {
//           from: "cities",
//           localField: "city",
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
//     res.json(data);
//   } catch (error) {
//     console.error("Erreur getCommissionsReport :", error);
//     res.status(500).json({ msg: "Erreur serveur." });
//   }
// };







// export const getGlobalCommissionsReport = async (req, res) => {
//   try {
//     const { period = "month" } = req.query;
//     const { start, end } = getDateRange(period);

//     // Helper pour factoriser l’agrégation
//     const aggregateByCity = async (Model, match, commissionField = "commission", taxField = "tax", cityField = "receiverCity") => {
//       return await Model.aggregate([
//         { $match: { ...match, createdAt: { $gte: start, $lte: end } } },
//         {
//           $lookup: {
//             from: "cities",
//             localField: cityField,
//             foreignField: "_id",
//             as: "cityInfo",
//           },
//         },
//         { $unwind: "$cityInfo" },
//         {
//           $group: {
//             _id: "$cityInfo.name",
//             totalCommission: { $sum: `$${commissionField}` },
//             totalTax: { $sum: `$${taxField}` },
//             count: { $sum: 1 },
//           },
//         },
//         { $sort: { totalCommission: -1 } },
//       ]);
//     };

//     // Intercity
//     const intercity = await aggregateByCity(
//       InterCityTransfer,
//       { status: "completed" },
//       "commission",
//       "tax",
//       "receiverCity"
//     );

//     // Interuser
//     const interuser = await aggregateByCity(
//       InterUserTransfer,
//       { status: "completed" },
//       "commission",
//       "tax",
//       "sender" // tu peux aussi mettre "receiver" si tu veux regrouper par ville du bénéficiaire
//     );

//     // Tontine
//     const tontine = await aggregateByCity(
//       TontineCommissionHistory,
//       {},
//       "fraisGestion",
//       "taxe",
//       "city" // adapte selon ton modèle (sinon supprime le lookup/group si pas de ville !)
//     );

//     res.json({ intercity, interuser, tontine });
//   } catch (error) {
//     console.error("❌ Erreur global commissions :", error);
//     res.status(500).json({ msg: "Erreur serveur." });
//   }
// };


export const getGlobalCommissionsReport = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    const { start, end } = getDateRange(period);

    // ---- INTERCITY ----
    const intercity = await InterCityTransfer.aggregate([
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
          totalCommission: { $sum: "$commission" },
          totalTax: { $sum: "$tax" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCommission: -1 } },
    ]);

    // ---- INTERUSER ----
    // const interuser = await InterUserTransfer.aggregate([
    //   {
    //     $match: {
    //       status: "completed",
    //       createdAt: { $gte: start, $lte: end },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "sender",
    //       foreignField: "_id",
    //       as: "senderInfo",
    //     },
    //   },
    //   { $unwind: "$senderInfo" },
    //   {
    //     $lookup: {
    //       from: "cities",
    //       localField: "senderInfo.city",
    //       foreignField: "_id",
    //       as: "cityInfo",
    //     },
    //   },
    //   { $unwind: "$cityInfo" },
    //   {
    //     $group: {
    //       _id: "$cityInfo.name",
    //       totalCommission: { $sum: "$commission" },
    //       totalTax: { $sum: "$tax" },
    //       count: { $sum: 1 },
    //     },
    //   },
    //   { $sort: { totalCommission: -1 } },
    // ]);

    const interuser = await InterUserTransfer.aggregate([
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
      // ⚠️ Permet de ne pas perdre les lignes sans ville
      { $unwind: { path: "$cityInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$cityInfo.name", "Sans ville"] },
          totalCommission: { $sum: "$commission" },
          totalTax: { $sum: "$tax" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCommission: -1 } },
    ]);
    

    // ---- TONTINE ----
    const tontine = await TontineCommissionHistory.aggregate([
      {
        $match: {
          servedAt: { $gte: start, $lte: end },
        },
      },
      // ⚠️ Si tu as une référence à la ville, décommente et adapte ce $lookup
      // {
      //   $lookup: {
      //     from: "cities",
      //     localField: "city",
      //     foreignField: "_id",
      //     as: "cityInfo",
      //   },
      // },
      // { $unwind: "$cityInfo" },
      {
        $group: {
          _id: null, // Pas de ville, si tu veux par ville, change ici !
          totalCommission: { $sum: "$fraisGestion" },
          totalTax: { $sum: "$taxe" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalCommission: -1 } },
    ]);

    res.json({ intercity, interuser, tontine });
  } catch (error) {
    console.error("❌ Erreur getGlobalCommissionsReport :", error);
    res.status(500).json({ msg: "Erreur serveur." });
  }
};
