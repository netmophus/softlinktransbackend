export const getDateRange = (period) => {
    const end = new Date(); // Date actuelle
    let start = new Date();
  
    switch (period) {
      case "day":
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start.setDate(end.getDate() - 7);
        break;
      case "month":
        start.setDate(end.getDate() - 30);
        break;
      default:
        start.setDate(end.getDate() - 30); // par défaut = mois
    }
  
    return { start, end };
  };
  