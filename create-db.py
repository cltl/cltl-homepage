import sqlite3
import pandas as pd


con = sqlite3.connect("theses.db")
cur = con.cursor()

def register_table(con, name, path):
    pd.read_csv(path).to_sql(name, con)

register_table(con, "hlt", "static/data/hlt_theses.csv")
register_table(con, "tm", "static/data/tm_theses.csv")

