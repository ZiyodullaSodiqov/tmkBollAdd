import React, { useEffect, useState } from "react";
import initSqlJs from "sql.js";

export default function Base() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    const loadDb = async () => {
      // Load sql.js
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });

      // Fetch the SQLite database file
      const response = await fetch("/file_tracker.db");
      const buffer = await response.arrayBuffer();
      const db = new SQL.Database(new Uint8Array(buffer));

      // Query the DB
      const result = db.exec("SELECT * FROM files LIMIT 100");
      if (result.length > 0) {
        setColumns(result[0].columns);
        setRows(result[0].values);
      }
    };

    loadDb();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>SQLite Viewer (React only)</h1>
      {rows.length > 0 ? (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Loading database...</p>
      )}
    </div>
  );
}
