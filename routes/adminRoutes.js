import express from "express";
import { authenticateUser } from "../middleware/auth.js";
import { authorizeRoles } from "../middleware/role.js";
import { createSupervisor,  getSupervisors, toggleSupervisorStatus} from "../controllers/adminController.js";
import { getDepositsGroupedByCity, 
    getWithdrawalsGroupedByCity , 
    getSummaryTransactionsByCity, 
    getCommissionsAndTaxesByCity, 
    getInterCityTransfersByReceiverCity, 
    getInterCityTransfersBySupervisor,
    getAllInterUserTransfers,
    getOpenCashRegisters,
        getCommissionsAndTaxesIntercity,
        getCommissionsAndTaxesInteruser,
        getCommissionsAndTaxesTontine,
    
        getAllInterCityTransfers
} from "../controllers/reportingController.js";


const router = express.Router();

router.put("/toggle-supervisor-status/:id", authenticateUser, authorizeRoles("admin"), toggleSupervisorStatus);


// Route pour récupérer les superviseurs
router.get("/supervisors", authenticateUser, authorizeRoles("admin"), getSupervisors);


// ✅ Route pour créer un superviseur (Seul l'administrateur peut le faire)
router.post("/create-supervisor", authenticateUser, authorizeRoles("admin"), createSupervisor);

// ✅ Route pour activer un superviseur (Seul l'administrateur peut activer un compte)
// router.put("/activate-supervisor/:id", authenticateUser, authorizeRoles("admin"), activateSupervisor);



router.get("/reports/deposits", authenticateUser, authorizeRoles("admin"), getDepositsGroupedByCity);

router.get("/reports/withdrawals", authenticateUser, authorizeRoles("admin"), getWithdrawalsGroupedByCity);


router.get("/reports/summary-transactions", authenticateUser, authorizeRoles("admin"), getSummaryTransactionsByCity);



router.get("/reports/commissions-taxes", authenticateUser, authorizeRoles("admin"), getCommissionsAndTaxesByCity);



  
  router.get("/reports/commissions-taxes/intercity", authenticateUser, authorizeRoles("admin"), getCommissionsAndTaxesIntercity);
  router.get("/reports/commissions-taxes/interuser", authenticateUser, authorizeRoles("admin"), getCommissionsAndTaxesInteruser);
  router.get("/reports/commissions-taxes/tontine", authenticateUser, authorizeRoles("admin"), getCommissionsAndTaxesTontine);
  

router.get("/reports/intercity-by-city", authenticateUser, authorizeRoles("admin"), getInterCityTransfersByReceiverCity);



router.get("/reports/intercity-by-supervisor", authenticateUser, authorizeRoles("admin"), getInterCityTransfersBySupervisor);


router.get("/reports/user-to-user", authenticateUser, authorizeRoles("admin"), getAllInterUserTransfers);


router.get("/reports/open-cash-registers", authenticateUser, authorizeRoles("admin"), getOpenCashRegisters);


// routes/adminRoutes.js ou reportRoutes.js

router.get("/reports/intercity-all", authenticateUser, authorizeRoles("admin"), getAllInterCityTransfers);




export default router;
