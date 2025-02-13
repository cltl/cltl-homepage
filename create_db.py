import logging
import os
import pandas as pd
import sqlite3
logger = logging.getLogger(__name__)

def register_tables(con, path):
    for track in ['langAI', 'HLT', 'PhD']:
        pd.read_excel(path, sheet_name=track).to_sql(track, con)


def check_files(con):
    # os.makedirs('data/theses', exist_ok=True)
    flag = True
    for track in ['langAI', 'HLT', 'PhD']:
        data = con.cursor().execute(f"SELECT author, year, filename FROM {track}").fetchall()
        faulty_entries = [x for x in data if x[2] is not None and len(x[2]) > 0 and x[2] != f"thesis_{x[0].replace(' ', '_')}_{x[1]}.pdf" for x in data]
        if len(faulty_entries) > 0:
            logger.warning(f"Check thesis filenames in track {track}, one or more filenames may be wrong")
            logger.warning(faulty_entries)
            flag = False
    return flag


def setup():
    if os.path.exists('static/data/theses.db'):
        os.replace('static/data/theses.db', 'static/data/theses.db.bck')
    con = sqlite3.connect("static/data/theses.db")
    register_tables(con, "static/data/theses_inventory.xlsx")
    filenames_ok = check_files(con)
    if not filenames_ok:
        os.replace('static/data/theses.db.bck', 'static/data/theses.db')
        logger.error("Refusing to replace database because of possible filename formatting errors. Double-check theses_inventory file.")
    

if __name__ == '__main__':
    setup()