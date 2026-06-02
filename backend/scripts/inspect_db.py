import sqlite3
import os
import sys

DB = "hrms.db"

if not os.path.exists(DB):
    print("DB not found:", DB)
    sys.exit(1)

con = sqlite3.connect(DB)
cur = con.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
tables = [r[0] for r in cur.fetchall()]
print('Tables:', tables)
for t in tables:
    print('\n==', t)
    cur.execute(f"PRAGMA table_info('{t}')")
    cols = [r[1] for r in cur.fetchall()]
    print('Columns:', cols)
    try:
        cur.execute(f"SELECT * FROM {t} LIMIT 5")
        rows = cur.fetchall()
    except Exception as e:
        print('Query error:', e)
        rows = []
    for row in rows:
        print(row)
con.close()
