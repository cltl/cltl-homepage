import os
import pandas as pd
import re
import shutil
import sqlite3


def register_tables(con, path):
    for track in ['langAI', 'HLT', 'PhD']:
        pd.read_excel(path, sheet_name=track).to_sql(track, con)


def copy_files(con):
    os.makedirs('data/theses', exist_ok=True)
    for track in ['langAI', 'HLT', 'PhD']:
        data = con.cursor().execute(f"SELECT author, year, filename FROM {track}").fetchall()
        for item in data:
            target = f"static/data/theses/thesis_{item[0].replace(" ", "_")}_{item[1]}.pdf"
            if not os.path.exists(target) and item[2] is not None and not re.match(" +", item[2]):
                shutil.copy2(f'static/data/theses_alltracks/{item[2]}', target)


def setup():
    if os.path.exists('static/data/theses.db'):
        os.replace('static/data/theses.db', 'static/data/theses.db.bck')
    con = sqlite3.connect("static/data/theses.db")
    register_tables(con, "static/data/theses_inventory.xlsx")
    copy_files(con)
    

if __name__ == '__main__':
    setup()