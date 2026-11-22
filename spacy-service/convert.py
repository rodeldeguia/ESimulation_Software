import pandas as pd
import mysql.connector

# 1. Read the parquet
df = pd.read_parquet('phrasal_verbs.parquet')

# 2. Select and clean
df = df[['phrasal', 'base_verb', 'particle', 'meaning']].copy()
df['phrasal'] = df['phrasal'].astype(str).str.lower().str.strip()
df['base_verb'] = df['base_verb'].astype(str).str.lower().str.strip()
df['particle'] = df['particle'].astype(str).str.lower().str.strip()
df['meaning'] = df['meaning'].astype(str).str.replace('\n', ' ').str.strip()

# 3. Remove duplicates and empties
df = df[df['phrasal'] != ''].drop_duplicates(subset=['phrasal'])

# 4. Connect to MySQL
conn = mysql.connector.connect(
    host='localhost',
    port = 3307,
    user='root',
    password='21Sql20Server43',  # <-- change this
    database='grammar_simulation'
)
cursor = conn.cursor()

# 5. Clear the table
cursor.execute("TRUNCATE TABLE phrasal_verbs_dictionary")

# 6. Insert rows
for _, row in df.iterrows():
    cursor.execute(
        "INSERT IGNORE INTO phrasal_verbs_dictionary (phrasal, base_verb, particle, meaning, is_approved, created_by) VALUES (%s, %s, %s, %s, 1, 7)",
        (row['phrasal'], row['base_verb'], row['particle'], row['meaning'])
    )

conn.commit()
print(f"✅ Inserted {cursor.rowcount} rows")

cursor.execute("SELECT COUNT(*) FROM phrasal_verbs_dictionary")
print("Total rows:", cursor.fetchone()[0])

cursor.close()
conn.close()