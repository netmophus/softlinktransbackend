// utils/atomicCreateMany.js

/**
 * Exécute une série de créations MongoDB atomiquement, avec rollback manuel si erreur.
 * @param {Array} operations - [{ model, data }]
 * @returns {Array} - Les documents créés
 * @throws {Error} - Rollback si erreur
 */
export default async function atomicCreateMany(operations) {
    const created = [];
    try {
      for (const op of operations) {
        if (Array.isArray(op.data)) {
          const docs = await op.model.insertMany(op.data, { ordered: true });
          docs.forEach(doc => created.push({ model: op.model, doc }));
        } else {
          const doc = await op.model.create(op.data);
          created.push({ model: op.model, doc });
        }
      }
      return created.map(item => item.doc);
    } catch (error) {
      await Promise.all(
        created.map(item => item.model.deleteOne({ _id: item.doc._id }))
      );
      throw error;
    }
  }
  