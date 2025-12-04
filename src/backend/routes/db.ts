import express from "express";
import pool from "../db/connection";


const router = express.Router();

// query all tables in db and show contents
router.get("/", async (req, res, next) => {
  try {
    // MUST BE tablesResult, not "tables"
    const tablesResult = await pool.any(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);


    const data: Record<string, any[]> = {};

    // tablesResults is an array returned bu pool.any()???
    // iterate over whatever tf it is...
    for (const row of tablesResult) {
      const tableName = row.table_name;

      // Fetch all rows from this table
      const rows = await pool.any(`SELECT * FROM ${tableName}`);
      data[tableName] = rows;
    }

    res.render("db/db", { data });

  } catch (err) {
    next(err);
  }
});

export default router;
